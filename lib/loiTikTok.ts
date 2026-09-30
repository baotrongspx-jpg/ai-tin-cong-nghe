// Dịch các lỗi TikTok hay gặp sang tiếng Việt kèm cách xử lý. Dùng được cả server lẫn trình duyệt
// (bài cũ còn lưu lỗi tiếng Anh vẫn hiện được bản dịch).
const BANG: [RegExp, string][] = [
  [/too many posts|spam_risk_too_many_posts/i,
    'TikTok tạm chặn vì tài khoản đã đăng quá nhiều bài qua app trong 24 giờ (kể cả bài đã xóa). Đợi vài giờ rồi thử lại, hoặc đăng tay bằng app TikTok.'],
  [/rate limit|rate_limit_exceeded/i, 'Bấm đăng quá nhanh. Đợi khoảng 1 phút rồi thử lại.'],
  [/private account|unaudited_client/i,
    'App chưa được TikTok duyệt nên chỉ đăng được khi tài khoản TikTok để riêng tư. Bật "Tài khoản riêng tư" trong app TikTok rồi thử lại.'],
  [/banned from posting|user_banned/i, 'Tài khoản TikTok đang bị cấm đăng bài. Kiểm tra thông báo trong app TikTok.'],
  [/access.?token|token.*(invalid|expired)|scope_not_authorized/i, 'Kết nối TikTok đã hết hạn. Bấm "Kết nối lại" ở trang TikTok.'],
  [/url_ownership|not verified|domain/i, 'TikTok không tải được ảnh vì tên miền chưa được xác minh trong TikTok Developer.'],
  [/privacy_level/i, 'Chế độ hiển thị (TIKTOK_CHE_DO) không hợp lệ với tài khoản này.'],
]

export function dichLoiTikTok(loi: string) {
  const goc = loi.replace(/^TikTok:\s*/, '')
  return BANG.find(([mau]) => mau.test(goc))?.[1] ?? goc
}
