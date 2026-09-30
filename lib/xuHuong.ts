import 'server-only'
import { db } from './db'
import { timHashtagXuHuong } from './ai'

const KHOA = 'hashtag_xu_huong'
const MOI = 24 * 3600_000 // mỗi ngày tìm lại một lần

// Dùng khi chưa tìm được hashtag xu hướng
const DU_PHONG = ['CongNghe', 'TinCongNghe', 'AI', 'Tech', 'XuHuong']

export type XuHuong = { ds: string[]; luc: string | null }

// Hashtag công nghệ đang thịnh hành trên TikTok, lưu trong bảng cai_dat, cũ quá 24 giờ (hoặc `timLai`) thì tìm lại
export async function layHashtagXuHuong(timLai = false): Promise<XuHuong> {
  const { data } = await db().from('cai_dat').select('gia_tri, cap_nhat_luc').eq('khoa', KHOA).maybeSingle()
  const cu = data?.gia_tri as string[] | undefined
  if (!timLai && cu?.length && Date.now() - new Date(data!.cap_nhat_luc).getTime() < MOI) return { ds: cu, luc: data!.cap_nhat_luc }

  const moi = locTrung(await timHashtagXuHuong().catch(() => []))
  if (!moi.length) return cu?.length ? { ds: cu, luc: data!.cap_nhat_luc } : { ds: DU_PHONG, luc: null }

  const luc = new Date().toISOString()
  await db().from('cai_dat').upsert({ khoa: KHOA, gia_tri: moi, cap_nhat_luc: luc })
  return { ds: moi, luc }
}

// Cho trang TikTok: chỉ đọc bản đã lưu, không bao giờ gọi Gemini (gọi mất tới vài chục giây).
// Việc tìm lại khi cũ quá 24 giờ để nhịp mỗi giờ làm ngầm.
export async function docHashtagXuHuong(): Promise<XuHuong> {
  const { data } = await db().from('cai_dat').select('gia_tri, cap_nhat_luc').eq('khoa', KHOA).maybeSingle()
  const cu = data?.gia_tri as string[] | undefined
  return cu?.length ? { ds: cu, luc: data!.cap_nhat_luc } : { ds: DU_PHONG, luc: null }
}

// Bỏ trùng không phân biệt hoa thường, giữ thứ tự
function locTrung(ds: string[]) {
  const da = new Set<string>()
  return ds.filter((h) => {
    const k = h.toLowerCase()
    if (da.has(k)) return false
    da.add(k)
    return true
  })
}
