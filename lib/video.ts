import 'server-only'
import { spawn } from 'node:child_process'
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'
import { veAnhBai } from './anh'
import type { BaiViet } from './db'
import { docThanhGiong } from './giongDoc'

// Video dọc 1080x1920 cho TikTok: ảnh bài ở giữa trên nền mờ, giọng AI đọc bài, phụ đề chạy theo từng đoạn.
const RONG = 1080
const CAO = 1920
const TREN = 330 // mép trên của ảnh bài (ảnh vuông 1080)
const DONG_DAU = 1530 // vị trí dòng phụ đề đầu tiên
const CAO_DONG = 78
const MAX_KY_TU = 26 // ký tự mỗi dòng phụ đề
const DUOI = 0.8 // giây im lặng thêm ở cuối

// Phần AI đọc: tiêu đề + nội dung, bỏ link, hashtag, emoji
export function chuDeDoc(b: Pick<BaiViet, 'tieu_de_anh' | 'noi_dung'>) {
  const chu = `${b.tieu_de_anh.trim().replace(/([^.!?…])$/, '$1.')}\n${b.noi_dung}`
    .normalize('NFC')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
  if (chu.length <= 1500) return chu
  // Bài dài: cắt ở cuối câu gần mốc 1500 ký tự
  const cat = chu.slice(0, 1500)
  const cuoiCau = Math.max(cat.lastIndexOf('. '), cat.lastIndexOf('.\n'), cat.lastIndexOf('! '), cat.lastIndexOf('? '))
  return cuoiCau > 800 ? cat.slice(0, cuoiCau + 1) : cat
}

// Chia chữ thành các đoạn phụ đề, mỗi đoạn tối đa 2 dòng, không vắt qua hai câu
function tachPhuDe(chu: string) {
  const doan: string[][] = []
  for (const cau of chu.split(/(?<=[.!?…])\s+|\n+/)) {
    let dong: string[] = []
    let hienTai = ''
    for (const tu of cau.trim().split(/\s+/).filter(Boolean)) {
      if (hienTai && `${hienTai} ${tu}`.length > MAX_KY_TU) {
        dong.push(hienTai)
        hienTai = tu
        if (dong.length === 2) {
          doan.push(dong)
          dong = []
        }
      } else hienTai = hienTai ? `${hienTai} ${tu}` : tu
    }
    if (hienTai) dong.push(hienTai)
    if (dong.length) doan.push(dong)
  }
  return doan
}

// Độ dài (giây) của file WAV: tìm khối "data", chia cho số byte mỗi giây ghi ở đầu file
function doDaiWav(wav: Buffer) {
  const byteMoiGiay = wav.readUInt32LE(28)
  for (let i = 12; i + 8 <= wav.length; ) {
    const ten = wav.toString('ascii', i, i + 4)
    const co = wav.readUInt32LE(i + 4)
    if (ten === 'data') return Math.min(co, wav.length - i - 8) / byteMoiGiay
    i += 8 + co + (co % 2)
  }
  return (wav.length - 44) / byteMoiGiay
}

function chayFfmpeg(args: string[], cwd: string) {
  return new Promise<void>((xong, loi) => {
    if (!ffmpeg) return loi(new Error('Máy chủ thiếu ffmpeg để dựng video'))
    const p = spawn(ffmpeg, args, { cwd, stdio: ['ignore', 'ignore', 'pipe'] })
    let log = ''
    p.stderr.on('data', (d: Buffer) => (log = (log + d.toString()).slice(-2000)))
    const hen = setTimeout(() => p.kill('SIGKILL'), 150_000)
    p.on('error', (e) => (clearTimeout(hen), loi(e)))
    p.on('close', (ma) => {
      clearTimeout(hen)
      if (ma === 0) xong()
      else loi(new Error(`Dựng video lỗi (ffmpeg ${ma}): ${log.trim().split('\n').slice(-3).join(' | ')}`))
    })
  })
}

// Dựng video MP4 (H.264 + AAC) lồng tiếng AI cho một bài
export async function taoVideoBai(bai: BaiViet) {
  const chu = chuDeDoc(bai)
  if (!chu) throw new Error('Bài không có chữ để đọc')
  const [wav, anh] = await Promise.all([docThanhGiong(chu), veAnhBai(bai).then(async (r) => Buffer.from(await r.arrayBuffer()))])
  const tong = doDaiWav(wav)

  const thuMuc = await mkdtemp(join(tmpdir(), 'video-'))
  try {
    // Khung nền vẽ sẵn một lần bằng sharp: ảnh phóng to làm mờ phủ kín, ảnh bài đặt giữa
    const nen = await sharp(anh).resize(RONG, CAO, { fit: 'cover' }).blur(40).modulate({ brightness: 0.5 }).toBuffer()
    const khung = await sharp(nen)
      .composite([{ input: await sharp(anh).resize(RONG, RONG).toBuffer(), top: TREN, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer()

    // Mỗi đoạn phụ đề hiện trong khoảng thời gian tỉ lệ với số chữ (cộng chút cho chỗ ngắt)
    const doan = tachPhuDe(chu)
    const nang = doan.map((d) => d.join(' ').length + 6)
    const tongNang = nang.reduce((a, b) => a + b, 0)
    const loc: string[] = []
    let moc = 0
    for (const [i, dong] of doan.entries()) {
      const den = moc + (nang[i] / tongNang) * tong
      for (const [j, d] of dong.entries()) {
        const tep = `c${i}_${j}.txt`
        await writeFile(join(thuMuc, tep), d)
        loc.push(
          `drawtext=fontfile=font.ttf:textfile=${tep}:expansion=none:fontsize=58:fontcolor=white:borderw=6:bordercolor=black@0.85` +
            `:x=(w-text_w)/2:y=${DONG_DAU + j * CAO_DONG}:enable='between(t,${moc.toFixed(2)},${(i === doan.length - 1 ? tong + DUOI : den).toFixed(2)})'`,
        )
      }
      moc = den
    }

    await Promise.all([
      writeFile(join(thuMuc, 'khung.jpg'), khung),
      writeFile(join(thuMuc, 'giong.wav'), wav),
      copyFile(join(process.cwd(), 'assets/fonts/BeVietnamPro-Bold.ttf'), join(thuMuc, 'font.ttf')),
      writeFile(join(thuMuc, 'loc.txt'), `[0:v]${loc.length ? loc.join(',') : 'null'}[v];[1:a]apad=pad_dur=${DUOI}[a]`),
    ])
    await chayFfmpeg(
      [
        '-hide_banner', '-y',
        '-loop', '1', '-framerate', '24', '-i', 'khung.jpg',
        '-i', 'giong.wav',
        '-filter_complex_script', 'loc.txt',
        '-map', '[v]', '-map', '[a]',
        '-t', (tong + DUOI).toFixed(2),
        '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '24', '-g', '48',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
        '-movflags', '+faststart',
        'video.mp4',
      ],
      thuMuc,
    )
    return await readFile(join(thuMuc, 'video.mp4'))
  } finally {
    await rm(thuMuc, { recursive: true, force: true }).catch(() => {})
  }
}
