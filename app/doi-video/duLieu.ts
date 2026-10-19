// Dữ liệu đội agent làm video quảng cáo sản phẩm.
// Thư mục làm việc của đội trên máy: Desktop/doi-video-quang-cao

export type TrangThai = 'da-tuyen' | 'dang-soan' | 'can-cai'

export type ThanhVien = {
  vai: string
  ten: string
  viec: string
  nguon: string
  linkNguon?: string
  giayPhep?: string
  trangThai: TrangThai
}

export const TRUONG_NHOM = {
  vai: 'Trưởng nhóm · Đạo diễn sản xuất',
  ten: 'truong-nhom',
  viec:
    'Nhận đơn hàng, chia việc cho từng thành viên, chọn kịch bản tốt nhất, quyết định quay hay làm đồ họa, duyệt bản cuối. Mọi quyết định đều ghi lý do vào sổ quyết định của dự án.',
  quyen: [
    'Chốt thông điệp chính sau khi đọc báo cáo nghiên cứu',
    'Chọn 1 trong 3 phương án kịch bản',
    'Chọn đường làm: quay thật hay đồ họa chuyển động',
    'Trả bản dựng về sửa nếu kiểm duyệt báo lỗi',
    'Duyệt bản cuối trước khi giao cho bạn',
  ],
}

export const THANH_VIEN: ThanhVien[] = [
  {
    vai: 'Nghiên cứu thị trường',
    ten: 'market-researcher',
    viec: 'Tìm hiểu khách hàng mục tiêu, nỗi đau và lý do họ mua sản phẩm.',
    nguon: 'VoltAgent/awesome-claude-code-subagents',
    linkNguon: 'https://github.com/VoltAgent/awesome-claude-code-subagents',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Phân tích đối thủ',
    ten: 'competitive-analyst',
    viec: 'Xem đối thủ đang quảng cáo thế nào, chỗ nào mình làm khác được.',
    nguon: 'VoltAgent/awesome-claude-code-subagents',
    linkNguon: 'https://github.com/VoltAgent/awesome-claude-code-subagents',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Bắt xu hướng',
    ten: 'trend-analyst',
    viec: 'Tìm kiểu video, nhạc và cách mở đầu đang được xem nhiều trên TikTok, Reels.',
    nguon: 'VoltAgent/awesome-claude-code-subagents',
    linkNguon: 'https://github.com/VoltAgent/awesome-claude-code-subagents',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Chuyên gia nội dung',
    ten: 'content-marketer',
    viec: 'Viết chú thích bài đăng, hashtag và kế hoạch đăng video.',
    nguon: 'VoltAgent/awesome-claude-code-subagents',
    linkNguon: 'https://github.com/VoltAgent/awesome-claude-code-subagents',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Người viết lời bán hàng',
    ten: 'landing-page-copywriter',
    viec: 'Viết câu mở đầu giữ chân người xem và lời kêu gọi mua hàng.',
    nguon: 'VoltAgent/awesome-claude-code-subagents',
    linkNguon: 'https://github.com/VoltAgent/awesome-claude-code-subagents',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Biên kịch quảng cáo',
    ten: 'bien-kich',
    viec: 'Viết 3 phương án kịch bản: 3 giây đầu, lời thoại, chữ trên hình, kêu gọi mua.',
    nguon: 'Kỹ năng ad-creative, copywriting, marketing-psychology',
    linkNguon: 'https://github.com/coreyhaines31/marketingskills',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Đạo diễn hình ảnh',
    ten: 'dao-dien-quay',
    viec: 'Lên bảng phân cảnh và danh sách cảnh quay bằng điện thoại: góc máy, ánh sáng, đạo cụ.',
    nguon: 'Kỹ năng video, social',
    linkNguon: 'https://github.com/coreyhaines31/marketingskills',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Dựng phim',
    ten: 'dung-phim',
    viec: 'Cắt ghép cảnh quay, chèn phụ đề, nhạc, logo, xuất bản dọc 9:16 cho TikTok và Reels.',
    nguon: 'Kỹ năng ffmpeg-skill · 42 công cụ dựng chạy trên máy',
    linkNguon: 'https://github.com/kajisho5/ffmpeg-skill',
    giayPhep: 'MIT',
    trangThai: 'can-cai',
  },
  {
    vai: 'Đồ họa chuyển động',
    ten: 'dong-hoa',
    viec: 'Làm video sản phẩm từ ảnh có sẵn: chuyển động máy quay, chữ chạy, nhạc theo nhịp.',
    nguon: 'Kỹ năng video-shotcraft · 124 mẫu cảnh quay',
    linkNguon: 'https://github.com/Vincentwei1021/video-shotcraft',
    giayPhep: 'Apache-2.0',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Kiểm duyệt quảng cáo',
    ten: 'kiem-duyet',
    viec: 'Soát lỗi chính tả, câu chữ quá đà, quy định quảng cáo Việt Nam và luật của Facebook, TikTok.',
    nguon: 'Kỹ năng copy-editing, kèm luật quảng cáo Việt Nam',
    linkNguon: 'https://github.com/coreyhaines31/marketingskills',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
]

export const QUY_TRINH = [
  { buoc: 'Nhận đơn', ai: 'Trưởng nhóm', chiTiet: 'Bạn cho biết sản phẩm, nơi đăng, độ dài, đã có cảnh quay hay chỉ có ảnh.', quyetDinh: false },
  { buoc: 'Nghiên cứu', ai: 'Nghiên cứu · Đối thủ · Xu hướng', chiTiet: 'Ba agent làm cùng lúc rồi nộp báo cáo.', quyetDinh: false },
  { buoc: 'Chốt thông điệp', ai: 'Trưởng nhóm', chiTiet: 'Chọn một điều duy nhất video phải nói được.', quyetDinh: true },
  { buoc: 'Viết kịch bản', ai: 'Biên kịch · Lời bán hàng', chiTiet: 'Ba phương án. Trưởng nhóm chọn một, bạn duyệt.', quyetDinh: true },
  { buoc: 'Lên cảnh quay', ai: 'Đạo diễn hình ảnh', chiTiet: 'Danh sách cảnh để bạn tự quay bằng điện thoại. Nếu chỉ có ảnh thì chuyển sang đồ họa.', quyetDinh: true },
  { buoc: 'Dựng', ai: 'Dựng phim · Đồ họa', chiTiet: 'Ra bản dựng có phụ đề, nhạc, đúng khung hình nơi đăng.', quyetDinh: false },
  { buoc: 'Kiểm duyệt', ai: 'Kiểm duyệt', chiTiet: 'Báo lỗi. Có lỗi thì trưởng nhóm trả về bước dựng.', quyetDinh: false },
  { buoc: 'Duyệt cuối', ai: 'Trưởng nhóm', chiTiet: 'Giao video và chú thích bài đăng cho bạn.', quyetDinh: true },
]

export const VIEC_CON_LAI = [
  'Cài FFmpeg và Python 3 trên máy để thành viên dựng phim chạy được. Bước cài đang chờ bạn đồng ý.',
  'Làm thử video đầu tiên: mở thư mục doi-video-quang-cao trong VS Code và gõ đơn hàng cho trưởng nhóm.',
]
