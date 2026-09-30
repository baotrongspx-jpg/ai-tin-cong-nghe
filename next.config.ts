import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Font vẽ ảnh được đọc bằng readFile, phải đóng gói kèm khi deploy (route ảnh, lịch tự đăng, nút Đăng)
  outputFileTracingIncludes: {
    '/**': ['./assets/fonts/**'],
  },
  experimental: {
    // Trình duyệt nhớ trang đã xem 30 giây, trang được tải trước (4 thẻ trên thanh đầu trang) 2 phút,
    // nên chuyển qua lại giữa các trang hiện ngay. Đăng / lưu bài vẫn làm mới dữ liệu tức thì (refresh()).
    staleTimes: { dynamic: 30, static: 120 },
  },
}

export default nextConfig
