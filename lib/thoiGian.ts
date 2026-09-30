// Giờ theo múi Việt Nam, dùng được cả server lẫn trình duyệt
export const gio = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })

// "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước", quá 1 tuần thì ghi ngày giờ
export function truoc(s: string) {
  const phut = Math.round((Date.now() - new Date(s).getTime()) / 60_000)
  if (phut < 1) return 'vừa xong'
  if (phut < 60) return `${phut} phút trước`
  if (phut < 24 * 60) return `${Math.floor(phut / 60)} giờ trước`
  if (phut < 7 * 24 * 60) return `${Math.floor(phut / 1440)} ngày trước`
  return gio(s)
}

// Giờ hiện tại cho Server Component: mỗi lượt tải trang chỉ chạy một lần nên đọc giờ ở đây không sao
export const bayGio = () => Date.now()
