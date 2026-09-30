'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import sharp from 'sharp'
import { luuAnhCV, xoaAnhCV } from '@/lib/anhCV'
import { guiTelegram, thoat } from '@/lib/telegram'
import { daDangNhap, dangNhap } from '@/lib/xacThuc'

export type KetQuaLienHe = { ok: boolean; thongBao: string } | null

// Form "Liên hệ" trên website CV: gửi lời nhắn của nhà tuyển dụng về Telegram của chủ trang.
// Ô "website" ẩn với người thật; máy spam hay điền vào → bỏ qua (vẫn báo thành công để nó không thử lại).
export async function guiLienHe(_: KetQuaLienHe, form: FormData): Promise<KetQuaLienHe> {
  const lay = (k: string, toiDa: number) => String(form.get(k) ?? '').trim().slice(0, toiDa)
  if (lay('website', 100)) return { ok: true, thongBao: 'Đã gửi, cảm ơn anh/chị!' }

  const ten = lay('ten', 80)
  const lienHe = lay('lien_he', 80)
  const noiDung = lay('noi_dung', 1500)
  if (!ten || !lienHe) return { ok: false, thongBao: 'Vui lòng điền tên và số điện thoại / email.' }

  const daGui = await guiTelegram(
    `📩 <b>Liên hệ mới từ trang CV</b>\n` +
      `<b>Tên:</b> ${thoat(ten)}\n<b>Liên hệ:</b> ${thoat(lienHe)}\n` +
      (noiDung ? `<b>Lời nhắn:</b>\n${thoat(noiDung)}` : ''),
  )
  return daGui
    ? { ok: true, thongBao: 'Đã gửi! Tôi sẽ liên hệ lại sớm nhất.' }
    : { ok: false, thongBao: 'Chưa gửi được, anh/chị vui lòng gọi hoặc nhắn Zalo giúp tôi.' }
}

// ——— Trang /cv/doi-anh: chủ trang tự thay ảnh đại diện ———

export async function dangNhapDoiAnh(_: string | null, form: FormData) {
  if (!(await dangNhap(String(form.get('mat_khau') ?? '')))) return 'Sai mật khẩu'
  redirect('/cv/doi-anh')
}

export type KetQuaDoiAnh = { ok: boolean; thongBao: string } | null

export async function doiAnhCV(_: KetQuaDoiAnh, form: FormData): Promise<KetQuaDoiAnh> {
  if (!(await daDangNhap())) return { ok: false, thongBao: 'Phiên đăng nhập đã hết, tải lại trang và đăng nhập lại.' }
  const tep = form.get('anh')
  if (!(tep instanceof File) || !tep.size) return { ok: false, thongBao: 'Chưa chọn ảnh.' }
  if (tep.size > 4 * 1024 * 1024) return { ok: false, thongBao: 'Ảnh quá lớn (tối đa 4MB).' }
  try {
    // Xoay đúng chiều theo máy chụp, cắt khung 4:5 giữ phần trên (đầu), nén còn ~50KB
    const anh = await sharp(Buffer.from(await tep.arrayBuffer()))
      .rotate()
      .resize(640, 800, { fit: 'cover', position: 'north' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer()
    await luuAnhCV(anh)
  } catch (e) {
    return { ok: false, thongBao: `Không đọc được ảnh (${(e as Error).message}). Thử ảnh JPG hoặc PNG khác.` }
  }
  revalidatePath('/cv', 'layout')
  return { ok: true, thongBao: 'Đã đổi ảnh! Mở trang CV để xem.' }
}

export async function khoiPhucAnhCV(): Promise<KetQuaDoiAnh> {
  if (!(await daDangNhap())) return { ok: false, thongBao: 'Phiên đăng nhập đã hết.' }
  await xoaAnhCV()
  revalidatePath('/cv', 'layout')
  return { ok: true, thongBao: 'Đã quay về ảnh mặc định.' }
}
