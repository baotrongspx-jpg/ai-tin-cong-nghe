'use server'

import { revalidatePath } from 'next/cache'

// Sau khi đổi dữ liệu: xóa toàn bộ trang trình duyệt đang nhớ (staleTimes), để trang nào mở tiếp cũng thấy dữ liệu mới.
// refresh() chỉ làm mới trang đang xem, trang khác vẫn có thể hiện dữ liệu cũ tới 2 phút.
const lamMoi = () => revalidatePath('/', 'layout')
import { redirect } from 'next/navigation'
import { db, type BaiViet } from '@/lib/db'
import { daDangNhap, dangNhap, dangXuat } from '@/lib/xacThuc'
import { tongHopTin, type KetQuaTongHop } from '@/lib/tongHop'
import { coFacebook, xoaBaiFb } from '@/lib/facebook'
import { henTikTok, huyHenTikTok } from '@/lib/henGio'
import { xoaVideoBai } from '@/lib/video'
import { coTikTok, type TuyChonDang } from '@/lib/tiktok'
import { dangLenFacebook, dangLenTikTok } from '@/lib/dangBai'
import { tachHashtag } from '@/lib/chuThich'
import { layHashtagXuHuong } from '@/lib/xuHuong'
import { capNhatSoLieu } from '@/lib/soLieu'
import { goiYTraLoi } from '@/lib/ai'
import { anTay, hienLai, traLoi } from '@/lib/binhLuan'
import { coPixabay } from '@/lib/pixabay'
import { datAnhNen, timAnhChoBai } from '@/lib/anhNen'
import { linkNgheNhac, linkTaiLenNhac, xoaNhac } from '@/lib/nhacNen'

type KetQua = { ok: boolean; loi?: string; canhBao?: string }

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
    lamMoi()
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
  lamMoi()
  return { ok: true }
}

export async function doiMauAnh(id: string, mau: number): Promise<KetQua> {
  await chanChuaDangNhap()
  const { error } = await db().from('bai_viet').update({ mau_anh: mau }).eq('id', id)
  if (error) return { ok: false, loi: error.message }
  lamMoi()
  return { ok: true }
}

export async function doiTrangThai(id: string, trangThai: 'nhap' | 'bo_qua'): Promise<KetQua> {
  await chanChuaDangNhap()
  const { error } = await db().from('bai_viet').update({ trang_thai: trangThai }).eq('id', id).neq('trang_thai', 'da_dang')
  if (error) return { ok: false, loi: error.message }
  lamMoi()
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
    const { canhBao } = await dangLenFacebook(bai)
    lamMoi()
    return { ok: true, canhBao }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

// Đăng từ trang TikTok. Ai được xem lấy theo TIKTOK_CHE_DO (như lịch tự đăng).
export async function dangTikTok(id: string, tuyChon: TuyChonDang): Promise<KetQua> {
  await chanChuaDangNhap()
  if (!coTikTok()) return { ok: false, loi: 'Chưa cấu hình TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET' }

  const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).single<BaiViet>()
  if (!bai) return { ok: false, loi: 'Không tìm thấy bài' }
  if (bai.tiktok_publish_id) return { ok: false, loi: 'Bài này đã đăng TikTok rồi' }

  try {
    const { canhBao } = await dangLenTikTok(bai, tuyChon)
    lamMoi()
    return { ok: true, canhBao }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

// Đã xóa bài trên TikTok → bỏ đánh dấu để đăng lại được
export async function boDanhDauTikTok(id: string): Promise<KetQua> {
  await chanChuaDangNhap()
  const { error } = await db()
    .from('bai_viet')
    .update({ tiktok_publish_id: null, tiktok_dang_luc: null, tiktok_loi: null })
    .eq('id', id)
  if (error) return { ok: false, loi: error.message }
  lamMoi()
  return { ok: true }
}

// Đăng một lần lên cả Facebook và TikTok: lưu chỉnh sửa, đăng Facebook rồi TikTok.
// Hai nơi độc lập: bên này lỗi vẫn thử bên kia, báo lại kết quả từng nơi.
export async function dangCaHai(id: string, sua: SuaBai, tuyChon: TuyChonDang): Promise<KetQua> {
  await chanChuaDangNhap()
  if (!coFacebook()) return { ok: false, loi: 'Chưa cấu hình FB_PAGE_ID / FB_PAGE_TOKEN' }
  if (!coTikTok()) return { ok: false, loi: 'Chưa cấu hình TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET' }

  const luu = await luuBai(id, sua)
  if (!luu.ok) return luu
  const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).single<BaiViet>()
  if (!bai) return { ok: false, loi: 'Không tìm thấy bài' }

  const loi: string[] = []
  let canhBao: string | undefined
  const chay = async (ten: string, daCo: boolean, viec: () => Promise<unknown>) => {
    if (daCo) return
    await viec().catch((e: Error) => loi.push(`${ten}: ${e.message}`))
  }
  const canhBaoFb: string[] = []
  // Ô "Lồng tiếng AI đọc bài" áp dụng cho cả hai nơi: Facebook đăng video thì TikTok dùng lại đúng video đó
  await chay('Facebook', !!bai.fb_post_id, async () => {
    const kq = await dangLenFacebook(bai, undefined, tuyChon.longTieng ?? undefined)
    if (kq.canhBao) canhBaoFb.push(kq.canhBao)
  })
  await chay('TikTok', !!bai.tiktok_publish_id, async () => ({ canhBao } = await dangLenTikTok(bai, tuyChon)))
  lamMoi()
  const tatCaCanhBao = [...canhBaoFb, canhBao].filter(Boolean).join(' · ') || undefined
  return loi.length ? { ok: false, loi: loi.join(' · ') } : { ok: true, canhBao: tatCaCanhBao }
}

// Nút "Tìm lại" trên trang TikTok: tìm hashtag xu hướng mới ngay, không chờ hết 24 giờ
export async function timLaiXuHuong(): Promise<KetQua> {
  await chanChuaDangNhap()
  await layHashtagXuHuong(true)
  lamMoi()
  return { ok: true }
}

// Nút "Cập nhật số liệu" trên trang Thống kê: lấy lại lượt tương tác các bài 30 ngày gần đây
export async function capNhatSoLieuNgay(): Promise<KetQua & { soBai?: number }> {
  await chanChuaDangNhap()
  try {
    const kq = await capNhatSoLieu(30)
    lamMoi()
    return { ok: true, soBai: kq.soBai, loi: kq.loi ?? undefined }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

export type NoiHen = 'fb' | 'tt' | 'ca_hai'

// Hẹn giờ đăng: Facebook tự đăng đúng giờ (cách hiện tại 10 phút đến 30 ngày),
// TikTok được "nhịp" 10 phút một lần đăng khi tới giờ.
export async function henGio(id: string, sua: SuaBai, noi: NoiHen, lucIso: string): Promise<KetQua> {
  await chanChuaDangNhap()
  const luc = new Date(lucIso)
  if (Number.isNaN(luc.getTime())) return { ok: false, loi: 'Giờ hẹn không hợp lệ' }
  const conPhut = (luc.getTime() - Date.now()) / 60_000
  const coFb = noi !== 'tt'
  const coTt = noi !== 'fb'
  if (coFb && !coFacebook()) return { ok: false, loi: 'Chưa cấu hình Facebook' }
  if (coTt && !coTikTok()) return { ok: false, loi: 'Chưa cấu hình TikTok' }
  if (coFb && (conPhut < 10 || conPhut > 30 * 24 * 60))
    return { ok: false, loi: 'Facebook chỉ cho hẹn giờ cách hiện tại từ 10 phút đến 30 ngày' }
  if (coTt && conPhut < 1) return { ok: false, loi: 'Chọn giờ ở tương lai' }

  const luu = await luuBai(id, sua)
  if (!luu.ok) return luu
  const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).single<BaiViet>()
  if (!bai) return { ok: false, loi: 'Không tìm thấy bài' }

  try {
    if (coFb && !bai.fb_post_id) await dangLenFacebook(bai, luc)
    if (coTt && !bai.tiktok_publish_id) await henTikTok(id, luc)
    lamMoi()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

// Hủy hẹn: Facebook xóa bài đang chờ đăng và đưa bài về chờ duyệt; TikTok bỏ khỏi lịch
export async function huyHen(id: string, noi: 'fb' | 'tt'): Promise<KetQua> {
  await chanChuaDangNhap()
  try {
    if (noi === 'tt') await huyHenTikTok(id)
    else {
      const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).single<BaiViet>()
      if (!bai?.fb_post_id || !bai.dang_luc || new Date(bai.dang_luc).getTime() <= Date.now())
        return { ok: false, loi: 'Bài này đã lên Facebook rồi, không hủy hẹn được' }
      await xoaBaiFb(bai.fb_post_id)
      await db().from('bai_viet').update({ trang_thai: 'nhap', fb_post_id: null, dang_luc: null }).eq('id', id)
    }
    lamMoi()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

// ---------- Bình luận Facebook ----------

export async function goiYTraLoiAction(baiId: string, binhLuan: string): Promise<KetQua & { tra_loi?: string }> {
  await chanChuaDangNhap()
  const { data: bai } = await db().from('bai_viet').select('noi_dung').eq('id', baiId).single<Pick<BaiViet, 'noi_dung'>>()
  try {
    const tra_loi = await goiYTraLoi(bai?.noi_dung ?? '', binhLuan)
    return tra_loi ? { ok: true, tra_loi } : { ok: false, loi: 'AI không gợi ý được, thử lại hoặc tự viết' }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

export async function traLoiAction(commentId: string, noiDung: string): Promise<KetQua> {
  await chanChuaDangNhap()
  if (!noiDung.trim()) return { ok: false, loi: 'Chưa viết câu trả lời' }
  try {
    await traLoi(commentId, noiDung.trim())
    lamMoi()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

export async function anBinhLuanAction(
  c: { id: string; noiDung: string; nguoi: string; luc: string; baiId: string; tieuDe: string },
  an: boolean,
): Promise<KetQua> {
  await chanChuaDangNhap()
  try {
    if (an) await anTay(c)
    else await hienLai(c.id)
    lamMoi()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

// ---------- Ảnh nền Pixabay ----------

export async function timAnhNenAction(
  id: string,
  tuKhoa?: string,
): Promise<KetQua & { tuKhoa?: string; ds?: { id: number; xemTruoc: string; tacGia: string }[] }> {
  await chanChuaDangNhap()
  if (!coPixabay()) return { ok: false, loi: 'Chưa cấu hình PIXABAY_KEY trên Vercel' }
  try {
    const kq = await timAnhChoBai(id, tuKhoa)
    return { ok: true, tuKhoa: kq.tuKhoa, ds: kq.ds.map(({ id, xemTruoc, tacGia }) => ({ id, xemTruoc, tacGia })) }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

export async function datAnhNenAction(id: string, anhNen: number): Promise<KetQua> {
  await chanChuaDangNhap()
  try {
    await datAnhNen(id, anhNen)
    lamMoi()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

// Nhạc nền video: trình duyệt xin link rồi tải tệp nhạc thẳng lên kho (tệp thường nặng hơn giới hạn 4,5 MB của Vercel)
export async function xinLinkTaiNhac(tenTep: string): Promise<KetQua & { url?: string }> {
  await chanChuaDangNhap()
  try {
    return { ok: true, url: await linkTaiLenNhac(tenTep) }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

export async function xongTaiNhac(): Promise<KetQua> {
  await chanChuaDangNhap()
  lamMoi()
  return { ok: true }
}

export async function xoaNhacNen(ten: string): Promise<KetQua> {
  await chanChuaDangNhap()
  try {
    await xoaNhac(ten)
    lamMoi()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

export async function xinLinkNgheNhac(ten: string): Promise<KetQua & { url?: string }> {
  await chanChuaDangNhap()
  try {
    return { ok: true, url: await linkNgheNhac(ten) }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}

// Xoá hẳn bài khỏi trang: huỷ lịch hẹn chưa tới giờ (TikTok, Facebook) để bài không tự đăng sau đó, xoá video + giọng đọc
// trong kho, rồi xoá dòng dữ liệu. Bài đã đăng trên Facebook / TikTok vẫn giữ nguyên ở đó.
export async function xoaBai(id: string): Promise<KetQua> {
  await chanChuaDangNhap()
  const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).maybeSingle<BaiViet>()
  if (!bai) return { ok: false, loi: 'Không tìm thấy bài' }
  try {
    await huyHenTikTok(id).catch(() => {})
    // Facebook hẹn giờ mà chưa tới giờ: xoá bài chờ đăng trên Fanpage
    if (bai.fb_post_id && bai.dang_luc && new Date(bai.dang_luc).getTime() > Date.now()) await xoaBaiFb(bai.fb_post_id).catch(() => {})
    await xoaVideoBai(id).catch(() => {})
    const { error } = await db().from('bai_viet').delete().eq('id', id)
    if (error) return { ok: false, loi: error.message }
    lamMoi()
    return { ok: true }
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) }
  }
}
