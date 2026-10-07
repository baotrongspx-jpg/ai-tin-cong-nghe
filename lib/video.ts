import 'server-only'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'
import { veAnhBai, vePhuDe } from './anh'
import { db, type BaiViet } from './db'
import { GIONG, GIONG_DU_PHONG } from './dsGiong'
import { coVieNeu, docBangVieNeu, docThanhGiong } from './giongDoc'

// Video dọc 1080x1920 cho TikTok: ảnh bài ở giữa trên nền mờ, giọng AI đọc bài, phụ đề chạy theo từng đoạn.
const RONG = 1080
const CAO = 1920
const TREN = 330 // mép trên của ảnh bài (ảnh vuông 1080)
const DONG_DAU = 1530 // vị trí dòng phụ đề đầu tiên (ảnh phụ đề ở lib/anh.tsx)
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

// Tách chữ thành từng câu (VieNeu đọc từng câu, phụ đề không vắt qua hai câu)
const tachCau = (chu: string) => chu.split(/(?<=[.!?…])\s+|\n+/).map((c) => c.trim()).filter((c) => /[\p{L}\p{N}]/u.test(c))

// Chia một câu thành các đoạn phụ đề, mỗi đoạn tối đa 2 dòng
function tachPhuDe(cau: string) {
  const doan: string[][] = []
  let dong: string[] = []
  let hienTai = ''
  for (const tu of cau.split(/\s+/).filter(Boolean)) {
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

// Video đã dựng được lưu ở Supabase Storage (kho riêng tư), tên gồm mã băm của mọi thứ làm video thay đổi:
// xem trước rồi bấm Đăng dùng lại đúng video đó, không phải đọc lại. Sửa bài thì tự dựng lại.
// Giọng đọc lưu riêng (theo chữ được đọc): đổi ảnh, chủ đề, cách dựng video... thì dựng lại mà không phải đọc lại.
export const KHO = 'video-tiktok'
const PHIEN_BAN = 3 // tăng khi đổi cách dựng video để bỏ video cũ

const bam = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16)

const tenTep = (bai: BaiViet) =>
  `${bai.id}/${bam([PHIEN_BAN, GIONG, chuDeDoc(bai), bai.chu_de, bai.mau_anh, bai.anh_nen ?? null, bai.nguon_ten, bai.ngay_bao])}.mp4`

async function layVideoDaLuu(ten: string) {
  const { data } = await db().storage.from(KHO).download(ten)
  return data ? Buffer.from(await data.arrayBuffer()) : null
}

// Lần đầu dùng: tạo kho riêng tư
export async function damBaoKho() {
  const kho = db().storage
  const { error: chuaCo } = await kho.getBucket(KHO)
  if (chuaCo) await kho.createBucket(KHO, { public: false })
  return kho.from(KHO)
}

type GiongBai = { wav: Buffer; doDai: number[] | null; luu: boolean } // doDai: giây mỗi câu (chỉ VieNeu có)

// Giọng đọc đã lưu của bài (WAV + thời lượng từng câu). Chưa có thì đọc một lần rồi lưu lại, bỏ các bản đọc cũ của bài.
// Giọng chính VieNeu; VieNeu lỗi thì đọc tạm bằng Gemini và không lưu (`luu: false`), lần sau thử lại VieNeu.
// `chiGiongChinh`: không dùng giọng dự phòng (dựng sẵn trong nền, không tốn lượt Gemini).
async function layGiongBai(bai: BaiViet, chu: string, cau: string[], chiGiongChinh = false): Promise<GiongBai> {
  const thuMuc = `giong/${bai.id}`
  const vieNeu = coVieNeu()
  if (chiGiongChinh && !vieNeu) throw new Error('Chưa cài giọng VieNeu')
  const ten = `${thuMuc}/${vieNeu ? bam(['vieneu', GIONG, cau]) : bam([GIONG_DU_PHONG, chu])}`
  const [wav, meta] = await Promise.all([layVideoDaLuu(`${ten}.wav`), layVideoDaLuu(`${ten}.json`)]).catch(() => [null, null])
  if (wav && meta) return { wav, doDai: JSON.parse(meta.toString()).doDai ?? null, luu: true }

  let kq: GiongBai
  let loiVieNeu = ''
  try {
    if (!vieNeu) throw null
    kq = { ...(await docBangVieNeu(cau)), luu: true }
  } catch (e) {
    if (e) {
      loiVieNeu = e instanceof Error ? e.message : String(e)
      console.error(loiVieNeu)
    }
    if (chiGiongChinh) throw e
    try {
      kq = { wav: await docThanhGiong(chu), doDai: null, luu: !vieNeu }
    } catch (e2) {
      throw new Error([loiVieNeu, e2 instanceof Error ? e2.message : String(e2)].filter(Boolean).join(' · Dự phòng: '))
    }
  }
  if (kq.luu)
    try {
      const kho = await damBaoKho()
      const { data: cu } = await kho.list(thuMuc)
      const xoa = (cu ?? []).map((f) => `${thuMuc}/${f.name}`).filter((t) => !t.startsWith(`${ten}.`))
      if (xoa.length) await kho.remove(xoa)
      await kho.upload(`${ten}.wav`, kq.wav, { contentType: 'audio/wav', upsert: true })
      await kho.upload(`${ten}.json`, JSON.stringify({ doDai: kq.doDai }), { contentType: 'application/json', upsert: true })
    } catch (e) {
      console.error('Không lưu được giọng đọc:', e)
    }
  return kq
}

async function luuVideo(bai: BaiViet, ten: string, video: Buffer) {
  const kho = db().storage
  await damBaoKho()
  // Bỏ các bản cũ của bài này (trước khi sửa bài) cho đỡ tốn dung lượng
  const { data: cu } = await kho.from(KHO).list(bai.id)
  const xoa = (cu ?? []).map((f) => `${bai.id}/${f.name}`).filter((t) => t !== ten)
  if (xoa.length) await kho.from(KHO).remove(xoa)
  await kho.from(KHO).upload(ten, video, { contentType: 'video/mp4', upsert: true })
}

// Video lồng tiếng của bài: lấy bản đã lưu nếu bài chưa đổi, không thì dựng mới rồi lưu lại.
export async function taoVideoBai(bai: BaiViet) {
  const ten = tenTep(bai)
  const daLuu = await layVideoDaLuu(ten).catch(() => null)
  if (daLuu) return daLuu
  return (await dungVaLuu(bai, ten)).video
}

const daCoVideo = async (bai: BaiViet, ten: string) => {
  const { data } = await db().storage.from(KHO).list(bai.id, { search: ten.slice(bai.id.length + 1) })
  return !!data?.some((f) => `${bai.id}/${f.name}` === ten)
}

// Dựng sẵn trong nền (mở trang TikTok): đã có video thì thôi, chưa có thì dựng bằng giọng chính rồi lưu.
// Không trả video về cho đỡ tốn băng thông.
export async function dungSanVideoBai(bai: BaiViet) {
  const ten = tenTep(bai)
  if (!(await daCoVideo(bai, ten))) await dungVaLuu(bai, ten, true)
}

// Xem trước: link tạm (1 giờ) tải thẳng video từ kho, vì Vercel chỉ cho trả tối đa 4,5 MB mỗi lần
export async function linkVideoBai(bai: BaiViet) {
  let ten = tenTep(bai)
  if (!(await daCoVideo(bai, ten))) ten = (await dungVaLuu(bai, ten, false, true)).ten
  const { data, error } = await db().storage.from(KHO).createSignedUrl(ten, 3600)
  if (error || !data) throw new Error(`Không tạo được link video: ${error?.message ?? 'lỗi'}`)
  return data.signedUrl
}

// `batBuocLuu`: lưu được mới thôi (xem trước cần link từ kho). Video đọc bằng giọng dự phòng lưu tên "-tam",
// lần sau không khớp tên chính nên dựng lại bằng giọng chính.
async function dungVaLuu(bai: BaiViet, ten: string, chiGiongChinh = false, batBuocLuu = false) {
  const { video, luu } = await dungVideo(bai, chiGiongChinh)
  const tenLuu = luu ? ten : ten.replace(/.mp4$/, '-tam.mp4')
  const viec = luuVideo(bai, tenLuu, video)
  if (batBuocLuu) await viec
  else await viec.catch((e) => console.error('Không lưu được video TikTok:', e))
  return { video, ten: tenLuu }
}

// WAV → MP3 nhỏ gọn (giọng mẫu để nghe thử)
export async function wavSangMp3(wav: Buffer) {
  const thuMuc = await mkdtemp(join(tmpdir(), 'mp3-'))
  try {
    await writeFile(join(thuMuc, 'vao.wav'), wav)
    await chayFfmpeg(['-hide_banner', '-y', '-i', 'vao.wav', '-c:a', 'libmp3lame', '-b:a', '64k', 'ra.mp3'], thuMuc)
    return await readFile(join(thuMuc, 'ra.mp3'))
  } finally {
    await rm(thuMuc, { recursive: true, force: true }).catch(() => {})
  }
}

// Dựng video MP4 (H.264 + AAC) lồng tiếng AI cho một bài
async function dungVideo(bai: BaiViet, chiGiongChinh = false) {
  const chu = chuDeDoc(bai)
  if (!chu) throw new Error('Bài không có chữ để đọc')
  const cau = tachCau(chu)
  const [{ wav, doDai, luu }, anh] = await Promise.all([
    layGiongBai(bai, chu, cau, chiGiongChinh),
    veAnhBai(bai).then(async (r) => Buffer.from(await r.arrayBuffer())),
  ])
  const tong = doDaiWav(wav)

  const thuMuc = await mkdtemp(join(tmpdir(), 'video-'))
  try {
    // Khung nền vẽ sẵn một lần bằng sharp: ảnh phóng to làm mờ phủ kín, ảnh bài đặt giữa
    const nen = await sharp(anh).resize(RONG, CAO, { fit: 'cover' }).blur(40).modulate({ brightness: 0.5 }).toBuffer()
    const khung = await sharp(nen)
      .composite([{ input: await sharp(anh).resize(RONG, RONG).toBuffer(), top: TREN, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer()

    // Thời gian mỗi câu: VieNeu báo đúng từng câu; giọng dự phòng đọc cả bài một lần thì chia theo số chữ.
    // Trong một câu, mỗi đoạn phụ đề hiện trong khoảng thời gian tỉ lệ với số chữ (cộng chút cho chỗ ngắt).
    const doanCau = cau.map(tachPhuDe)
    const nang = doanCau.map((ds) => ds.map((d) => d.join(' ').length + 6))
    const tongCau = nang.map((n) => n.reduce((a, b) => a + b, 0))
    const tongNang = tongCau.reduce((a, b) => a + b, 0)
    const giayCau = doDai ?? tongCau.map((n) => (n / tongNang) * tong)
    // Mốc thời gian từng đoạn phụ đề; đoạn cuối kéo tới hết video
    const lich: { dong: string[]; giay: number }[] = []
    for (const [c, ds] of doanCau.entries())
      for (const [k, dong] of ds.entries()) lich.push({ dong, giay: (nang[c][k] / tongCau[c]) * giayCau[c] })
    if (lich.length) lich[lich.length - 1].giay += Math.max(0, tong - lich.reduce((x, d) => x + d.giay, 0)) + DUOI

    // Mỗi đoạn phụ đề là một khung hình tĩnh (khung nền + ảnh phụ đề), ffmpeg chỉ việc nối các khung theo thời gian
    const khungHinh = lich.length
      ? await Promise.all(
          lich.map(async ({ dong }) => {
            const phuDe = Buffer.from(await (await vePhuDe(dong)).arrayBuffer())
            return sharp(khung).composite([{ input: phuDe, top: DONG_DAU - 20, left: 0 }]).jpeg({ quality: 88 }).toBuffer()
          }),
        )
      : [khung]
    const ds = (lich.length ? lich : [{ giay: tong + DUOI }]).map((d, i) => `file 'f${i}.jpg'\nduration ${d.giay.toFixed(3)}`)
    ds.push(`file 'f${khungHinh.length - 1}.jpg'`) // concat cần nhắc lại khung cuối để giữ đúng thời lượng

    await Promise.all([
      ...khungHinh.map((k, i) => writeFile(join(thuMuc, `f${i}.jpg`), k)),
      writeFile(join(thuMuc, 'giong.wav'), wav),
      writeFile(join(thuMuc, 'ds.txt'), ds.join('\n')),
    ])
    await chayFfmpeg(
      [
        '-hide_banner', '-y',
        '-f', 'concat', '-safe', '0', '-i', 'ds.txt',
        '-i', 'giong.wav',
        '-map', '0:v', '-map', '1:a',
        '-af', `apad=pad_dur=${DUOI}`,
        '-t', (tong + DUOI).toFixed(2),
        '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '24', '-g', '48',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
        '-movflags', '+faststart',
        'video.mp4',
      ],
      thuMuc,
    )
    return { video: await readFile(join(thuMuc, 'video.mp4')), luu }
  } finally {
    await rm(thuMuc, { recursive: true, force: true }).catch(() => {})
  }
}
