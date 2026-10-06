import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Font vẽ ảnh được đọc bằng readFile, phải đóng gói kèm khi deploy (route ảnh, lịch tự đăng, nút Đăng)
  // ffmpeg (dựng video TikTok lồng tiếng) là file chạy riêng: không đóng gói chung, chỉ chép kèm khi deploy
  outputFileTracingIncludes: {
    '/**': ['./assets/fonts/**', './node_modules/ffmpeg-static/ffmpeg'],
  },
  serverExternalPackages: ['ffmpeg-static'],
  experimental: {
    // Trình duyệt nhớ trang đã xem 30 giây, trang được tải trước (4 thẻ trên thanh đầu trang) 2 phút,
    // nên chuyển qua lại giữa các trang hiện ngay. Đăng / lưu bài vẫn làm mới dữ liệu tức thì (refresh()).
    staleTimes: { dynamic: 30, static: 120 },
    // Tải ảnh đại diện CV lên (/cv/doi-anh): ảnh đã được thu nhỏ trên trình duyệt, để dư cho ảnh điện thoại
    serverActions: { bodySizeLimit: '4mb' },
  },
}

export default nextConfig
