import { daDangNhap } from '@/lib/xacThuc'
import { demChuaTikTok, demTheoTab } from '@/lib/locBai'
import KhungQuanLy from '@/app/KhungQuanLy'

// Khung chung của các trang quản lý: thanh bên (có đếm bài) + thanh trên. Khung giữ nguyên khi chuyển trang,
// số đếm làm mới sau mỗi lần đăng / lưu (revalidatePath('/', 'layout')).
export default async function LayoutQuanLy({ children }: LayoutProps<'/'>) {
  // Chưa đăng nhập: trang tự chuyển sang /dang-nhap, không đọc dữ liệu
  if (!(await daDangNhap())) return children
  const [dem, chuaTikTok] = await Promise.all([demTheoTab().catch(() => null), demChuaTikTok().catch(() => null)])
  return (
    <KhungQuanLy dem={dem} chuaTikTok={chuaTikTok} tenTrang={process.env.TEN_TRANG || 'Tin Công Nghệ'}>
      {children}
    </KhungQuanLy>
  )
}
