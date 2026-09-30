'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, type BaiViet } from '@/lib/db'
import { daDangNhap, dangNhap, dangXuat } from '@/lib/xacThuc'
import { tongHopTin, type KetQuaTongHop } from '@/lib/tongHop'
import { coFacebook } from '@/lib/facebook'
import { coTikTok } from '@/lib/tiktok'
import { dangLenFacebook, dangLenTikTok } from '@/lib/dangBai'
import { tachHashtag } from '@/lib/chuThich'

type KetQua = { ok: boolean; loi?: string }

async function chanChuaDangNhap() {
  if (!(await daDangNhap())) throw new Error('Chưa đăng nhập')
}

export async function dangNhapAction(_: string | null, form: FormData) {
  if (!(await dangNhap(String(form.get('mat_khau') ?? '')))) return 'Sai mật khẩu'
  redirect('/')
}

export async function dangXuatAction() {
  await dangXuat()
  redirect('/dang-nhap')
}

export async function tongHopNgay(): Promise<KetQuaTongHop | { loi: string }> {
  await chanChuaDangNhap()
  try {
    const kq = await tongHopTin()
    refresh()
    return kq
  } catch (e) {
    return { loi: e instanceof Error ? e.message : String(e) }
  }
}

export type SuaBai = Pick<BaiViet, 'tieu_de_anh' | 'chu_de' | 'noi_dung'> & { hashtag: string }

export async function luuBai(id: string, sua: SuaBai): Promise<KetQua> {
  await chanChuaDangNhap()
  const { error } = await db()
    .from('bai_viet')
    .update({
      tieu_de_anh: sua.tieu_de_anh.trim(),
      chu_de: sua.chu_de.trim(),
      noi_dung: sua.noi_dung.trim(),
      hashtag: tachHashtag(sua.hashtag),
    })
    .eq('id', id)
  if (error) return { ok: false, loi: error.message }
  refresh()
  return { ok: true }
}

export async function doiMauAnh(id: string, mau: number): Promise<KetQua> {
  await chanChuaDangNhap()
  const { error } = await db().from('bai_viet').update({ mau_anh: mau }).eq('id', id)
  if (error) return { ok: false, loi: error.message }
  refresh()
  return { ok: true }
}

export async function doiTrangThai(id: string, trangThai: 'nhap' | 'bo_qua'): Promise<KetQua> {
  await chanChuaDangNhap()
  const { error } = await db().from('bai_viet').update({ trang_thai: trangThai }).eq('id', id).neq('trang_thai', 'da_dang')
  if (error) return { ok: false, loi: error.message }
  refresh()
  return { ok: true }
}

export async function dangBai(id: string, sua: SuaBai): Promise<KetQua> {
  await chanChuaDangNhap()
  if (!coFacebook()) return { ok: false, loi: 'Chưa cấu hình FB_PAGE_ID / FB_PAGE_TOKEN' }

  const luu = await luuBai(id, sua)
  if (!luu.ok) return luu

  const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).single<BaiViet>()
  if (!bai) return { ok: false, loi: 'Không tìm thấy bài' }
  if (bai.fb_post_id) return { ok: false, loi: 'Bài này đã đăng Facebook rồi' }

  try {
    await dangLenFacebook(bai)
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

export async function dangTikTok(id: string, sua: SuaBai): Promise<KetQua> {
  await chanChuaDangNhap()
  if (!coTikTok()) return { ok: false, loi: 'Chưa cấu hình TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET' }

  // Bài đã đăng Facebook thì khóa sửa, đăng nguyên nội dung đã lưu
  const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).single<BaiViet>()
  if (!bai) return { ok: false, loi: 'Không tìm thấy bài' }
  if (bai.tiktok_publish_id) return { ok: false, loi: 'Bài này đã đăng TikTok rồi' }

  let moi = bai
  if (bai.trang_thai !== 'da_dang') {
    const luu = await luuBai(id, sua)
    if (!luu.ok) return luu
    moi = (await db().from('bai_viet').select('*').eq('id', id).single<BaiViet>()).data ?? bai
  }

  try {
    await dangLenTikTok(moi)
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}
