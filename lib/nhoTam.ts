import 'server-only'

// Nhớ tạm kết quả trong bộ nhớ máy chủ vài phút cho dữ liệu ít đổi (giờ vàng, tài khoản TikTok),
// để mỗi lần mở trang không phải hỏi lại. Mỗi máy chủ Vercel nhớ riêng, khởi động lại là quên: chỉ để tăng tốc.
const kho = new Map<string, { het: number; giaTri: Promise<unknown> }>()

export function nhoTam<T>(khoa: string, ms: number, lay: () => Promise<T>): Promise<T> {
  const cu = kho.get(khoa)
  if (cu && cu.het > Date.now()) return cu.giaTri as Promise<T>
  const giaTri = lay()
  kho.set(khoa, { het: Date.now() + ms, giaTri })
  // Lỗi thì quên ngay để lần sau hỏi lại
  giaTri.catch(() => kho.delete(khoa))
  return giaTri
}
