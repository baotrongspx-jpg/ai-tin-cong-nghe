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

// Cài đặt nhạc nền (bảng cai_dat): âm lượng chung (% so với giọng đọc) + lựa chọn riêng từng bài
// (tên bản nhạc, hoặc 'khong' = không nhạc; không có thì tự chọn theo mã bài)
const KHOA_CAI_DAT = 'nhac_nen'
export const AM_LUONG_MAC_DINH = 12
export type CaiDatNhac = { amLuong: number; theoBai: Record<string, string> }
export async function docCaiDatNhac(): Promise<CaiDatNhac> {
  const { data } = await db().from('cai_dat').select('gia_tri').eq('khoa', KHOA_CAI_DAT).maybeSingle()
  const g = (data?.gia_tri ?? {}) as Partial<CaiDatNhac>
  return { amLuong: Number.isFinite(g.amLuong) ? Number(g.amLuong) : AM_LUONG_MAC_DINH, theoBai: g.theoBai ?? {} }
}
async function luuCaiDatNhac(cd: CaiDatNhac) {
  const { error } = await db().from('cai_dat').upsert({ khoa: KHOA_CAI_DAT, gia_tri: cd, cap_nhat_luc: new Date().toISOString() })
  if (error) throw new Error(error.message)
}
export async function datAmLuongNhac(amLuong: number) {
  const cd = await docCaiDatNhac()
  await luuCaiDatNhac({ ...cd, amLuong: Math.round(Math.min(40, Math.max(0, amLuong))) })
}
// `chon`: tên bản nhạc, 'khong' (không nhạc) hoặc 'tu_dong' (bỏ lựa chọn riêng)
export async function datNhacChoBai(baiId: string, chon: string) {
  const cd = await docCaiDatNhac()
  const theoBai = { ...cd.theoBai }
  if (chon === 'tu_dong') delete theoBai[baiId]
  else theoBai[baiId] = chon
  await luuCaiDatNhac({ ...cd, theoBai })
}

// Nhạc nền của một video: bản nhạc + âm lượng (cả hai nằm trong mã tên video: đổi nhạc / âm lượng thì dựng lại)
export type Nhac = { ten: string; amLuong: number } | null

// Bài có chọn riêng thì theo lựa chọn; không thì cố định một bản theo mã bài để video đã lưu không đổi nhạc
export async function chonNhac(baiId: string): Promise<Nhac> {
  if (!batNhacNen()) return null
  const [ds, cd] = await Promise.all([dsNhac().catch(() => []), docCaiDatNhac().catch((): CaiDatNhac => ({ amLuong: AM_LUONG_MAC_DINH, theoBai: {} }))])
  if (!ds.length || cd.amLuong <= 0) return null
  const rieng = cd.theoBai[baiId]
  if (rieng === 'khong') return null
  if (rieng && ds.some((n) => n.ten === rieng)) return { ten: rieng, amLuong: cd.amLuong }
  const so = parseInt(createHash('sha256').update(baiId).digest('hex').slice(0, 8), 16)
  return { ten: ds[so % ds.length].ten, amLuong: cd.amLuong }
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

// Phần nhạc trong mã tên video: âm lượng mặc định giữ đúng mã cũ (chỉ tên bản nhạc) để video đã dựng không phải dựng lại
export const maNhac = (nhac: Nhac) => (nhac ? (nhac.amLuong === AM_LUONG_MAC_DINH ? nhac.ten : `${nhac.ten}@${nhac.amLuong}`) : null)
