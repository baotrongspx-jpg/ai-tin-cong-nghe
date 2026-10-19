import 'server-only'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from './db'
import { MaDuAn } from './tienDo'

// Ảnh sản phẩm và đơn hàng chủ gửi cho đội video qua trang /doi-video/gui-anh.
// Mỗi ảnh là một dòng trong cai_dat: khoa = dv_anh:<duAn>:<ms>:<ngẫu nhiên>, gia_tri = { anh: base64 JPEG, ten }.
// Mỗi đơn: khoa = dv_don:<duAn>:<ms>:<ngẫu nhiên>. Đội tải về bằng cong-cu/tai-anh.mjs rồi xóa dòng.

export const TIEN_TO_ANH = 'dv_anh:'
export const TIEN_TO_DON = 'dv_don:'
export const TOI_DA_ANH_CHO = 30

export const DonHang = z.object({
  duAn: MaDuAn,
  sanPham: z.string().trim().min(1).max(120),
  gia: z.string().trim().max(60).default(''),
  banCho: z.string().trim().max(300).default(''),
  diemManh: z.string().trim().max(1000).default(''),
  noiDang: z.string().trim().max(60).default('TikTok'),
  soDoan: z.coerce.number().int().min(1).max(6).default(1),
  ghiChu: z.string().trim().max(1000).default(''),
})
export type DonHang = z.infer<typeof DonHang>

const khoaMoi = (tienTo: string, duAn: string) =>
  `${tienTo}${duAn}:${Date.now()}:${randomUUID().replaceAll('-', '').slice(0, 8)}`

export async function demAnhCho(duAn: string) {
  const { count, error } = await db()
    .from('cai_dat')
    .select('khoa', { count: 'exact', head: true })
    .like('khoa', `${TIEN_TO_ANH}${duAn}:%`)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function luuAnh(duAn: string, anh: Buffer, ten: string) {
  const luc = new Date().toISOString()
  const { error } = await db()
    .from('cai_dat')
    .insert({ khoa: khoaMoi(TIEN_TO_ANH, duAn), gia_tri: { anh: anh.toString('base64'), ten }, cap_nhat_luc: luc })
  if (error) throw new Error(error.message)
}

export async function luuDon(don: DonHang) {
  const luc = new Date().toISOString()
  const { error } = await db()
    .from('cai_dat')
    .insert({ khoa: khoaMoi(TIEN_TO_DON, don.duAn), gia_tri: { ...don, luc }, cap_nhat_luc: luc })
  if (error) throw new Error(error.message)
}

// Danh sách chờ tải: đơn kèm nội dung, ảnh chỉ kèm khóa (ảnh tải riêng từng cái để không vượt giới hạn phản hồi)
export async function danhSachCho() {
  const [don, anh] = await Promise.all([
    db().from('cai_dat').select('khoa, gia_tri').like('khoa', `${TIEN_TO_DON}%`).order('khoa'),
    db().from('cai_dat').select('khoa').like('khoa', `${TIEN_TO_ANH}%`).order('khoa'),
  ])
  if (don.error) throw new Error(don.error.message)
  if (anh.error) throw new Error(anh.error.message)
  return {
    don: don.data.map((d) => ({ khoa: d.khoa as string, ...(d.gia_tri as object) })),
    anh: anh.data.map((a) => ({ khoa: a.khoa as string, duAn: (a.khoa as string).split(':')[1] })),
  }
}

export const laKhoaHopLe = (khoa: string) =>
  /^dv_(anh|don):[a-z0-9-]{1,60}:\d+:[0-9a-f]{8}$/.test(khoa)

export async function layAnh(khoa: string) {
  const { data, error } = await db().from('cai_dat').select('gia_tri').eq('khoa', khoa).maybeSingle()
  if (error) throw new Error(error.message)
  const anh = (data?.gia_tri as { anh?: string } | null)?.anh
  return anh ? Buffer.from(anh, 'base64') : null
}

export async function xoaKhoa(khoa: string) {
  const { error } = await db().from('cai_dat').delete().eq('khoa', khoa)
  if (error) throw new Error(error.message)
}
