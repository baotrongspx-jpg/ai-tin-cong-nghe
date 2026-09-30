import 'server-only'
import { db } from './db'

// Ảnh đại diện trên website CV: lưu base64 trong cai_dat (ảnh đã thu nhỏ ~50KB), đổi ảnh không cần deploy lại.
// Chưa có bản ghi → dùng ảnh mặc định public/cv/chan-dung.jpg
const KHOA = 'cv_anh_dai_dien'
export const ANH_MAC_DINH = '/cv/chan-dung.jpg'

// Địa chỉ ảnh hiện tại, kèm ?v= theo giờ cập nhật để trình duyệt không giữ ảnh cũ
export async function diaChiAnhCV() {
  try {
    const { data } = await db().from('cai_dat').select('cap_nhat_luc').eq('khoa', KHOA).maybeSingle()
    return data ? `/cv/anh-dai-dien?v=${Date.parse(data.cap_nhat_luc)}` : ANH_MAC_DINH
  } catch {
    return ANH_MAC_DINH
  }
}

export async function layAnhCV() {
  const { data } = await db().from('cai_dat').select('gia_tri').eq('khoa', KHOA).maybeSingle()
  const anh = (data?.gia_tri as { anh?: string } | null)?.anh
  return anh ? Buffer.from(anh, 'base64') : null
}

export async function luuAnhCV(anh: Buffer) {
  const { error } = await db()
    .from('cai_dat')
    .upsert({ khoa: KHOA, gia_tri: { anh: anh.toString('base64') }, cap_nhat_luc: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function xoaAnhCV() {
  const { error } = await db().from('cai_dat').delete().eq('khoa', KHOA)
  if (error) throw new Error(error.message)
}
