import 'server-only'
import { db, type BaiViet } from './db'
import { coPixabay, timAnh, type AnhPixabay } from './pixabay'
import { goiYTuKhoaAnh } from './ai'

// Bảng chưa chạy SQL thêm cột anh_nen / tu_khoa_anh thì Supabase báo lỗi nhắc tên cột
export const thieuCot = (loi?: { message: string } | null) => !!loi && /anh_nen|tu_khoa_anh/.test(loi.message)

// Bài mới: lấy ảnh đầu tiên theo từ khóa AI gợi ý làm nền. Không có ảnh / lỗi thì giữ nền màu.
export async function chonAnhTuDong(bai: BaiViet): Promise<number | null> {
  if (!coPixabay() || !bai.tu_khoa_anh) return null
  try {
    const [anh] = await timAnh(bai.tu_khoa_anh, 3)
    if (!anh) return null
    const { error } = await db().from('bai_viet').update({ anh_nen: anh.id }).eq('id', bai.id)
    return error ? null : anh.id
  } catch {
    return null
  }
}

// Danh sách ảnh để chọn trên trang duyệt bài. Bài cũ chưa có từ khóa thì nhờ AI gợi ý rồi lưu lại.
export async function timAnhChoBai(id: string, tuKhoa?: string): Promise<{ tuKhoa: string; ds: AnhPixabay[] }> {
  const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).single<BaiViet>()
  if (!bai) throw new Error('Không tìm thấy bài')
  let tk = tuKhoa?.trim() || bai.tu_khoa_anh || ''
  if (!tk) {
    tk = (await goiYTuKhoaAnh(bai.tieu_de_anh, bai.noi_dung)) ?? 'technology'
    await db().from('bai_viet').update({ tu_khoa_anh: tk }).eq('id', id) // chưa có cột thì bỏ qua
  }
  return { tuKhoa: tk, ds: await timAnh(tk, 12) }
}

// 0 = bỏ ảnh, dùng nền màu
export async function datAnhNen(id: string, anhNen: number) {
  const { error } = await db().from('bai_viet').update({ anh_nen: anhNen }).eq('id', id)
  if (thieuCot(error)) throw new Error('Chưa thêm cột ảnh nền: chạy đoạn SQL "Ảnh nền từ Pixabay" ở cuối supabase/schema.sql trong Supabase')
  if (error) throw new Error(error.message)
}
