'use server'

import { redirect } from 'next/navigation'
import sharp from 'sharp'
import { DonHang, TOI_DA_ANH_CHO, demAnhCho, luuAnh, luuDon } from '@/lib/anhDoiVideo'
import { MaDuAn } from '@/lib/tienDo'
import { daDangNhap, dangNhap } from '@/lib/xacThuc'

export type KetQua = { ok: boolean; thongBao: string }

export async function dangNhapGuiAnh(_: string | null, form: FormData) {
  if (!(await dangNhap(String(form.get('mat_khau') ?? '')))) return 'Sai mật khẩu'
  redirect('/doi-video/gui-anh')
}

// Gửi từng ảnh một (trình duyệt đã thu nhỏ trước), để mỗi lần gửi nằm dưới giới hạn 4MB
export async function guiMotAnh(form: FormData): Promise<KetQua> {
  if (!(await daDangNhap())) return { ok: false, thongBao: 'Phiên đăng nhập đã hết, tải lại trang và đăng nhập lại.' }
  const duAn = MaDuAn.safeParse(String(form.get('duAn') ?? ''))
  if (!duAn.success) return { ok: false, thongBao: 'Tên thư mục sản phẩm chưa hợp lệ.' }
  const tep = form.get('anh')
  if (!(tep instanceof File) || !tep.size) return { ok: false, thongBao: 'Chưa có ảnh.' }
  if (tep.size > 4 * 1024 * 1024) return { ok: false, thongBao: 'Ảnh quá lớn (tối đa 4MB).' }
  try {
    if ((await demAnhCho(duAn.data)) >= TOI_DA_ANH_CHO)
      return { ok: false, thongBao: `Đã có ${TOI_DA_ANH_CHO} ảnh chờ đội tải về. Chờ đội tải xong rồi gửi thêm.` }
    // Xoay đúng chiều, giữ nguyên tỉ lệ (ảnh dọc ra video dọc), cạnh dài tối đa 2048px
    const anh = await sharp(Buffer.from(await tep.arrayBuffer()))
      .rotate()
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()
    const ten = String(form.get('ten') ?? 'anh').slice(0, 80)
    await luuAnh(duAn.data, anh, ten)
  } catch (e) {
    return { ok: false, thongBao: `Không lưu được ảnh (${(e as Error).message}).` }
  }
  return { ok: true, thongBao: 'Đã lưu ảnh.' }
}

export async function guiDon(don: unknown): Promise<KetQua> {
  if (!(await daDangNhap())) return { ok: false, thongBao: 'Phiên đăng nhập đã hết, tải lại trang và đăng nhập lại.' }
  const kq = DonHang.safeParse(don)
  if (!kq.success) return { ok: false, thongBao: 'Thông tin đơn hàng chưa đủ: cần ít nhất tên sản phẩm.' }
  try {
    await luuDon(kq.data)
  } catch (e) {
    return { ok: false, thongBao: `Không lưu được đơn (${(e as Error).message}).` }
  }
  return { ok: true, thongBao: 'Đã lưu đơn hàng.' }
}
