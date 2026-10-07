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
import { coVieNeu, docBangVieNeu, docThanhGiong, mayNhaTat } from './giongDoc'
import { batHoatHinh, choHoatHinh, datViecHoatHinh, tenVideoHoatHinh, trangThaiHoatHinh, uuTienHoatHinh, viTriHoatHinh } from './hoatHinh'
import { chonNhac, taiNhac } from './nhacNen'

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

// `nhac`: bản nhạc nền (lib/nhacNen.ts), đổi nhạc thì video dựng lại
const tenTep = (bai: BaiViet, nhac: string | null) =>
  `${bai.id}/${bam([PHIEN_BAN, GIONG, chuDeDoc(bai), bai.chu_de, bai.mau_anh, bai.anh_nen ?? null, bai.nguon_ten, bai.ngay_bao, nhac])}.mp4`

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

// doDai: giây mỗi câu (chỉ VieNeu có); canhBao: lý do phải đọc bằng giọng dự phòng
type GiongBai = { wav: Buffer; doDai: number[] | null; luu: boolean; canhBao?: string }

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
      // Không chờ khi Gemini báo hết lượt theo phút: đang có người chờ xem trước
      kq = { wav: await docThanhGiong(chu, false), doDai: null, luu: !vieNeu }
      if (loiVieNeu) kq.canhBao = `Đọc tạm bằng giọng dự phòng ${GIONG_DU_PHONG} vì ${loiVieNeu}`
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
  // Giữ video hoạt hình (hh-...) do máy nhà dựng, chỉ bỏ các bản video thường cũ
  const xoa = (cu ?? []).filter((f) => !f.name.startsWith('hh-')).map((f) => `${bai.id}/${f.name}`).filter((t) => t !== ten)
  if (xoa.length) await kho.from(KHO).remove(xoa)
  await kho.from(KHO).upload(ten, video, { contentType: 'video/mp4', upsert: true })
}

// Video lồng tiếng của bài: lấy bản đã lưu nếu bài chưa đổi, không thì dựng mới rồi lưu lại.
// Video hoạt hình (lib/hoatHinh.ts) được ưu tiên: đã có thì dùng, chưa có thì nhờ máy nhà dựng và chờ tối đa
// `choHoatHinh` giây (0: không chờ). Máy nhà tắt / chưa xong / lỗi thì dùng video thường bên dưới.
export async function taoVideoBai(bai: BaiViet, { choHoatHinh: cho = 200 }: { choHoatHinh?: number } = {}) {
  const nhac = await chonNhac(bai.id)
  if (batHoatHinh() && !(await mayNhaTat().catch(() => 'lỗi'))) {
    const tenHH = tenVideoHoatHinh(bai, chuDeDoc(bai), nhac)
    try {
      // Không chờ thì cũng không đặt việc mới (bài sẽ đăng bằng video thường ngay), chỉ dùng nếu đã có sẵn
      const tt = cho > 0 ? await datViecHoatHinh(bai, tenHH, nhac, undefined, false) : await trangThaiHoatHinh(tenHH)
      if (tt.loai === 'xong' || (cho > 0 && (await choHoatHinh(tenHH, cho)))) {
        const v = await layVideoDaLuu(tenHH)
        if (v) return v
      }
    } catch (e) {
      console.error('Video hoạt hình lỗi, dùng video thường:', e)
    }
  }
  const ten = tenTep(bai, nhac)
  const daLuu = await layVideoDaLuu(ten).catch(() => null)
  if (daLuu) return daLuu
  return (await dungVaLuu(bai, ten, nhac)).video
}

const daCoVideo = async (bai: BaiViet, ten: string) => {
  const { data } = await db().storage.from(KHO).list(bai.id, { search: ten.slice(bai.id.length + 1) })
  return !!data?.some((f) => `${bai.id}/${f.name}` === ten)
}

// Dựng sẵn trong nền (mở trang TikTok): đã có video thì thôi, chưa có thì dựng bằng giọng chính rồi lưu.
// Không trả video về cho đỡ tốn băng thông.
// Video hoạt hình: chỉ đặt việc cho máy nhà rồi thôi (trả 'dang_dung'), không chờ.
export async function dungSanVideoBai(bai: BaiViet): Promise<'xong' | 'dang_dung'> {
  const nhac = await chonNhac(bai.id)
  if (batHoatHinh()) {
    const tat = await mayNhaTat()
    if (tat) throw new Error(tat)
    const tt = await datViecHoatHinh(bai, tenVideoHoatHinh(bai, chuDeDoc(bai), nhac), nhac)
    return tt.loai === 'xong' ? 'xong' : 'dang_dung'
  }
  const ten = tenTep(bai, nhac)
  if (!(await daCoVideo(bai, ten))) await dungVaLuu(bai, ten, nhac, true)
  return 'xong'
}

// Xem trước: link tạm (1 giờ) tải thẳng video từ kho, vì Vercel chỉ cho trả tối đa 4,5 MB mỗi lần
// Link tạm (1 giờ) để xem và để tải về máy (kèm tên tệp theo tiêu đề bài, không dấu)
async function linkVideo(bai: BaiViet, ten: string) {
  const tenTai = `${bai.tieu_de_anh.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'video'}${ten.includes('/hh-') ? '-hoat-hinh' : ''}.mp4`
  const [xem, tai] = await Promise.all([
    db().storage.from(KHO).createSignedUrl(ten, 3600),
    db().storage.from(KHO).createSignedUrl(ten, 3600, { download: tenTai }),
  ])
  if (xem.error || !xem.data || tai.error || !tai.data) throw new Error(`Không tạo được link video: ${(xem.error ?? tai.error)?.message ?? 'lỗi'}`)
  return { url: xem.data.signedUrl, urlTai: tai.data.signedUrl }
}

// Video hoạt hình chưa xong thì trả { dangDung } (trình duyệt hỏi lại sau ít giây); máy nhà tắt / lỗi thì dùng video thường.
export async function linkVideoBai(bai: BaiViet): Promise<{
  url?: string
  urlTai?: string
  dangDung?: { trangThai: 'cho' | 'dang_lam'; truoc?: number; phanTram?: number; buoc?: string }
  buoc?: Record<string, number> | null
  canhBao?: string
}> {
  const nhac = await chonNhac(bai.id)
  let canhBao: string | undefined
  if (batHoatHinh()) {
    const tat = await mayNhaTat()
    if (!tat) {
      const tenHH = tenVideoHoatHinh(bai, chuDeDoc(bai), nhac)
      const tt = await trangThaiHoatHinh(tenHH)
      if (tt.loai === 'xong') {
        return linkVideo(bai, tenHH)
      }
      // Xem trước: chen bài này lên đầu hàng đợi, báo còn bao nhiêu video phía trước
      if (tt.loai === 'cho') {
        await uuTienHoatHinh(tenHH)
        return { dangDung: { trangThai: 'cho', truoc: await viTriHoatHinh(tenHH), ...tt.tienDo } }
      }
      if (tt.loai === 'dang_lam') return { dangDung: { trangThai: 'dang_lam', ...tt.tienDo } }
      try {
        const moi = await datViecHoatHinh(bai, tenHH, nhac, tt)
        if (moi.loai === 'cho' || moi.loai === 'dang_lam') {
          await uuTienHoatHinh(tenHH)
          return { dangDung: { trangThai: moi.loai, phanTram: 5, buoc: 'AI đang viết lời thoại' } }
        }
      } catch (e) {
        canhBao = `Chưa dựng được video hoạt hình (${e instanceof Error ? e.message : 'lỗi'}), đang xem video thường`
      }
      if (tt.loai === 'loi') canhBao = `Lần trước dựng video hoạt hình lỗi: ${tt.loi}. Đã gửi dựng lại; đang xem video thường`
    } else canhBao = `Video hoạt hình cần máy nhà: ${tat}. Đang xem video thường`
  }
  let ten = tenTep(bai, nhac)
  let buoc: Record<string, number> | null = null
  let canhBaoThuong: string | undefined
  if (!(await daCoVideo(bai, ten))) ({ ten, buoc, canhBao: canhBaoThuong } = await dungVaLuu(bai, ten, nhac, false, true))
  return { ...(await linkVideo(bai, ten)), buoc, canhBao: [canhBao, canhBaoThuong].filter(Boolean).join(' · ') || undefined }
}

// `batBuocLuu`: lưu được mới thôi (xem trước cần link từ kho). Video đọc bằng giọng dự phòng lưu tên "-tam",
// lần sau không khớp tên chính nên dựng lại bằng giọng chính.
async function dungVaLuu(bai: BaiViet, ten: string, nhac: string | null, chiGiongChinh = false, batBuocLuu = false) {
  const { video, luu, buoc, canhBao } = await dungVideo(bai, nhac, chiGiongChinh)
  const tenLuu = luu ? ten : ten.replace(/.mp4$/, '-tam.mp4')
  const viec = luuVideo(bai, tenLuu, video)
  if (batBuocLuu) await viec
  else await viec.catch((e) => console.error('Không lưu được video TikTok:', e))
  return { video, ten: tenLuu, buoc, canhBao }
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
async function dungVideo(bai: BaiViet, nhac: string | null, chiGiongChinh = false) {
  // Tải nhạc nền song song với các bước khác; lỗi thì dựng không nhạc
  const taiNhacNen = nhac ? taiNhac(nhac).catch(() => null) : Promise.resolve(null)
  // Thời gian từng bước (giây), trả kèm link xem trước để biết chậm ở đâu
  const buoc: Record<string, number> = {}
  let luc = Date.now()
  const ghi = (ten: string) => {
    buoc[ten] = (Date.now() - luc) / 1000
    luc = Date.now()
  }
  const chu = chuDeDoc(bai)
  if (!chu) throw new Error('Bài không có chữ để đọc')
  const cau = tachCau(chu)
  const doanCau = cau.map(tachPhuDe)

  // Khung hình không cần giọng nên vẽ cùng lúc với lúc máy đọc giọng:
  // khung nền (ảnh bài phóng to làm mờ phủ kín, ảnh bài đặt giữa) + mỗi đoạn phụ đề là một khung hình tĩnh
  const veKhung = async () => {
    const anh = Buffer.from(await (await veAnhBai(bai)).arrayBuffer())
    const nen = await sharp(anh).resize(RONG, CAO, { fit: 'cover' }).blur(40).modulate({ brightness: 0.5 }).toBuffer()
    const khung = await sharp(nen)
      .composite([{ input: await sharp(anh).resize(RONG, RONG).toBuffer(), top: TREN, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer()
    const doan = doanCau.flat()
    if (!doan.length) return [khung]
    return Promise.all(
      doan.map(async (dong) => {
        const phuDe = Buffer.from(await (await vePhuDe(dong)).arrayBuffer())
        return sharp(khung).composite([{ input: phuDe, top: DONG_DAU - 20, left: 0 }]).jpeg({ quality: 88 }).toBuffer()
      }),
    )
  }
  const [{ wav, doDai, luu, canhBao }, khungHinh] = await Promise.all([layGiongBai(bai, chu, cau, chiGiongChinh), veKhung()])
  const tong = doDaiWav(wav)
  ghi('giong_va_khung_hinh')

  const thuMuc = await mkdtemp(join(tmpdir(), 'video-'))
  try {
    // Thời gian mỗi câu: VieNeu báo đúng từng câu; giọng dự phòng đọc cả bài một lần thì chia theo số chữ.
    // Trong một câu, mỗi đoạn phụ đề hiện trong khoảng thời gian tỉ lệ với số chữ (cộng chút cho chỗ ngắt).
    const nang = doanCau.map((ds) => ds.map((d) => d.join(' ').length + 6))
    const tongCau = nang.map((n) => n.reduce((a, b) => a + b, 0))
    const tongNang = tongCau.reduce((a, b) => a + b, 0)
    const giayCau = doDai ?? tongCau.map((n) => (n / tongNang) * tong)
    // Mốc thời gian từng đoạn phụ đề (cùng thứ tự với khungHinh); đoạn cuối kéo tới hết video
    const lich: { giay: number }[] = []
    for (const [c, ds] of doanCau.entries()) for (const k of ds.keys()) lich.push({ giay: (nang[c][k] / tongCau[c]) * giayCau[c] })
    if (lich.length) lich[lich.length - 1].giay += Math.max(0, tong - lich.reduce((x, d) => x + d.giay, 0)) + DUOI

    const ds = (lich.length ? lich : [{ giay: tong + DUOI }]).map((d, i) => `file 'f${i}.jpg'\nduration ${d.giay.toFixed(3)}`)
    ds.push(`file 'f${khungHinh.length - 1}.jpg'`) // concat cần nhắc lại khung cuối để giữ đúng thời lượng

    const nhacNen = await taiNhacNen
    const tepNhac = nhac && nhacNen ? `nhac${nhac.slice(nhac.lastIndexOf('.'))}` : null
    await Promise.all([
      ...khungHinh.map((k, i) => writeFile(join(thuMuc, `f${i}.jpg`), k)),
      writeFile(join(thuMuc, 'giong.wav'), wav),
      writeFile(join(thuMuc, 'ds.txt'), ds.join('\n')),
      tepNhac && nhacNen && writeFile(join(thuMuc, tepNhac), nhacNen),
    ])
    const het = tong + DUOI
    // Nhạc nền lặp lại cho đủ dài, nhỏ dưới giọng đọc, to dần ở đầu và nhỏ dần ở cuối
    const amThanh = tepNhac
      ? [
          '-stream_loop', '-1', '-i', tepNhac,
          '-filter_complex',
          `[1:a]apad=pad_dur=${DUOI}[g];[2:a]volume=0.12,afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, het - 2).toFixed(2)}:d=2[n];` +
            '[g][n]amix=inputs=2:duration=first:normalize=0[a]',
          '-map', '0:v', '-map', '[a]',
        ]
      : ['-map', '0:v', '-map', '1:a', '-af', `apad=pad_dur=${DUOI}`]
    await chayFfmpeg(
      [
        '-hide_banner', '-y',
        '-f', 'concat', '-safe', '0', '-i', 'ds.txt',
        '-i', 'giong.wav',
        ...amThanh,
        '-t', (tong + DUOI).toFixed(2),
        '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '24', '-g', '48',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
        '-movflags', '+faststart',
        'video.mp4',
      ],
      thuMuc,
    )
    ghi('ffmpeg')
    return { video: await readFile(join(thuMuc, 'video.mp4')), luu, buoc, canhBao }
  } finally {
    await rm(thuMuc, { recursive: true, force: true }).catch(() => {})
  }
}

// Bài đã lên TikTok: TikTok đã nhận file (FILE_UPLOAD) nên xoá mọi video + giọng đọc của bài khỏi kho cho đỡ đầy
// (gói Supabase miễn phí 1 GB). Video hoạt hình vẫn còn bản lưu trên máy nhà (Desktop\Video-Hoat-Hinh).
export async function xoaVideoBai(baiId: string) {
  const kho = db().storage.from(KHO)
  const [{ data: video }, { data: giong }] = await Promise.all([kho.list(baiId, { limit: 100 }), kho.list(`giong/${baiId}`, { limit: 100 })])
  const xoa = [...(video ?? []).map((f) => `${baiId}/${f.name}`), ...(giong ?? []).map((f) => `giong/${baiId}/${f.name}`)]
  if (xoa.length) await kho.remove(xoa)
  return xoa.length
}

// Lưới an toàn (lịch tự đăng): xoá video còn sót của các bài đã lên TikTok (vd video dựng sẵn gửi lên sau khi đã đăng)
// và của các bài đã bị xoá khỏi trang
export async function donKhoDaDang() {
  const { data: thuMuc } = await db().storage.from(KHO).list('', { limit: 1000 })
  const ids = (thuMuc ?? []).map((f) => f.name).filter((n) => /^[0-9a-f-]{36}$/i.test(n))
  if (!ids.length) return 0
  const [{ data: daDang }, { data: conLai }] = await Promise.all([
    db().from('bai_viet').select('id').in('id', ids).not('tiktok_publish_id', 'is', null),
    db().from('bai_viet').select('id').in('id', ids),
  ])
  const con = new Set(((conLai ?? []) as { id: string }[]).map((b) => b.id))
  const xoa = [...((daDang ?? []) as { id: string }[]).map((b) => b.id), ...ids.filter((id) => !con.has(id))]
  let so = 0
  for (const id of xoa) so += await xoaVideoBai(id).catch(() => 0)
  return so
}
