import 'server-only'
import { createHash } from 'node:crypto'
import { db } from './db'

// Nhạc nền trộn dưới giọng đọc trong video TikTok / Facebook. Người dùng tự tải nhạc (miễn phí bản quyền) lên
// kho video ở thư mục nhac/ từ trang TikTok. Không có bài nào, hoặc NHAC_NEN=0, thì video chỉ có giọng đọc.
const KHO = 'video-tiktok' // cùng kho với video (lib/video.ts)
const THU_MUC = 'nhac'
export const DUOI_NHAC = /\.(mp3|m4a|aac|wav|ogg)$/i

export const batNhacNen = () => process.env.NHAC_NEN !== '0'

export async function dsNhac() {
  const { data } = await db().storage.from(KHO).list(THU_MUC, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
  return (data ?? []).filter((f) => DUOI_NHAC.test(f.name)).map((f) => ({ ten: f.name, kichThuoc: Number(f.metadata?.size) || 0 }))
}

// Mỗi bài cố định một bản nhạc (theo mã bài) để video đã lưu không đổi nhạc giữa các lần xem
export async function chonNhac(baiId: string) {
  if (!batNhacNen()) return null
  const ds = await dsNhac().catch(() => [])
  if (!ds.length) return null
  const so = parseInt(createHash('sha256').update(baiId).digest('hex').slice(0, 8), 16)
  return ds[so % ds.length].ten
}

export async function taiNhac(ten: string) {
  const { data, error } = await db().storage.from(KHO).download(`${THU_MUC}/${ten}`)
  if (error || !data) throw new Error(`Không tải được nhạc nền ${ten}`)
  return Buffer.from(await data.arrayBuffer())
}

// Tên tệp an toàn cho kho (không dấu, không khoảng trắng)
export const tenAnToan = (ten: string) =>
  ten
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-80)

// Link tải nhạc thẳng lên kho từ trình duyệt (tệp nhạc thường nặng hơn 4,5 MB, quá giới hạn gửi qua Vercel)
export async function linkTaiLenNhac(tenGoc: string) {
  const ten = tenAnToan(tenGoc)
  if (!DUOI_NHAC.test(ten)) throw new Error('Chỉ nhận tệp nhạc .mp3, .m4a, .aac, .wav, .ogg')
  const { data, error } = await db().storage.from(KHO).createSignedUploadUrl(`${THU_MUC}/${ten}`, { upsert: true })
  if (error || !data) throw new Error(`Không tạo được link tải lên: ${error?.message ?? 'lỗi'}`)
  return data.signedUrl
}

export async function xoaNhac(ten: string) {
  const { error } = await db().storage.from(KHO).remove([`${THU_MUC}/${tenAnToan(ten)}`])
  if (error) throw new Error(error.message)
}

// Link tạm (1 giờ) để nghe thử trên trang
export async function linkNgheNhac(ten: string) {
  const { data, error } = await db().storage.from(KHO).createSignedUrl(`${THU_MUC}/${tenAnToan(ten)}`, 3600)
  if (error || !data) throw new Error(`Không mở được nhạc: ${error?.message ?? 'lỗi'}`)
  return data.signedUrl
}
