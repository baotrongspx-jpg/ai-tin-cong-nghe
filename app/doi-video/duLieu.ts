// Dữ liệu đội agent làm video quảng cáo sản phẩm.
// Thư mục làm việc của đội trên máy: Desktop/doi-video-quang-cao
// Cơ cấu từ 19/10/2026: 6 agent (đội trưởng + 5 thành viên). Video tạo bằng dịch vụ AI trả phí, mỗi đoạn tối đa 10 giây.

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
  vai: 'Đội trưởng · Đạo diễn sản xuất',
  ten: 'doi-truong',
  viec:
    'Nhận lệnh của chủ, tự chia việc và giao thẳng cho từng thành viên, không qua tổ trưởng. Mọi quyết định đều ghi lý do vào sổ và báo tiến độ lên trang trực tiếp.',
  quyen: [
    'Tự lập kế hoạch và giao việc cho từng thành viên',
    'Chốt thông điệp chính và chọn phương án kịch bản',
    'Chọn ứng viên do tuyển dụng tìm về, trình chủ duyệt trước khi cài',
    'Trả bài về sửa khi kiểm duyệt báo lỗi, mỗi bài tối đa một lần',
    'Duyệt bộ câu lệnh và video ghép cuối trước khi giao cho chủ',
  ],
}

export const THANH_VIEN: ThanhVien[] = [
  {
    vai: 'Biên kịch · Câu lệnh video AI',
    ten: 'bien-kich',
    viec: 'Viết kịch bản chia thành từng đoạn 10 giây. Mỗi đoạn có một bộ câu lệnh tiếng Anh để dán vào Kling, Hailuo, Runway hoặc Veo. Mọi đoạn chép chung một bảng gốc để nhân vật, sản phẩm và màu sắc giống nhau.',
    nguon: 'Kỹ năng ad-creative, copywriting, marketing-psychology',
    linkNguon: 'https://github.com/coreyhaines31/marketingskills',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Lồng tiếng tiếng Việt',
    ten: 'long-tieng',
    viec: 'Đọc lời thoại của từng đoạn thành file giọng nói, đo thời lượng để vừa 10 giây. Giọng HoaiMy (nữ) và NamMinh (nam).',
    nguon: 'Do agent tuyển dụng tìm về: kỹ năng ai-voiceover-edge-tts, 73/100 điểm',
    linkNguon: 'https://github.com/xianyu110/ecommerce-video-skills',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Dựng phim',
    ten: 'dung-phim',
    viec: 'Ghép các đoạn 10 giây chủ tải về, nối chuyển cảnh, chèn lồng tiếng, nhạc, chữ và logo, xuất bản dọc 9:16 cho TikTok và Reels. Kiêm chỉ chủ chụp ảnh sản phẩm làm ảnh tham chiếu.',
    nguon: 'Kỹ năng ffmpeg-skill và video-shotcraft, chạy trên máy',
    linkNguon: 'https://github.com/kajisho5/ffmpeg-skill',
    giayPhep: 'MIT · Apache-2.0',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Tuyển dụng',
    ten: 'tuyen-dung',
    viec: 'Lên GitHub tìm agent và kỹ năng đúng chức năng khi đội cần, chấm điểm, soát an toàn, kiểm giấy phép, rồi trình chủ duyệt trước khi cài.',
    nguon: 'Viết cho đội. Tìm trong VoltAgent, wshobson/agents, marketingskills, anthropics/skills và GitHub.',
    trangThai: 'da-tuyen',
  },
  {
    vai: 'Kiểm duyệt chung',
    ten: 'kiem-duyet',
    viec: 'Một người soát cho cả đội. Chạy công cụ soát trên máy trước, không tốn token: từ cấm, số liệu ngoài đơn, tốc độ thoại, số chữ trên màn hình, bảng gốc chép đúng. Chỉ dùng Claude cho phần cần hiểu nghĩa.',
    nguon: 'Công cụ soat-cau-lenh và Vale (MIT), kèm luật quảng cáo Việt Nam',
    linkNguon: 'https://github.com/errata-ai/vale',
    giayPhep: 'MIT',
    trangThai: 'da-tuyen',
  },
]

export const QUY_TRINH = [
  { buoc: 'Nhận đơn', ai: 'Đội trưởng', chiTiet: 'Chủ cho biết sản phẩm, nơi đăng, số đoạn 10 giây và gửi ảnh sản phẩm nếu có.', quyetDinh: false },
  { buoc: 'Chốt thông điệp', ai: 'Đội trưởng', chiTiet: 'Chọn một điều duy nhất video phải nói được.', quyetDinh: true },
  { buoc: 'Viết câu lệnh', ai: 'Biên kịch', chiTiet: 'Kịch bản chia đoạn 10 giây, mỗi đoạn một bộ câu lệnh, chung một bảng gốc.', quyetDinh: false },
  { buoc: 'Soát', ai: 'Kiểm duyệt chung', chiTiet: 'Công cụ soát chạy trước. Có lỗi thì trả về biên kịch, tối đa một lần.', quyetDinh: false },
  { buoc: 'Duyệt câu lệnh', ai: 'Đội trưởng', chiTiet: 'Giao bộ câu lệnh và hướng dẫn bấm từng bước cho chủ.', quyetDinh: true },
  { buoc: 'Tạo video', ai: 'Chủ', chiTiet: 'Dán câu lệnh vào dịch vụ AI trả phí, tải từng đoạn 10 giây về thư mục của dự án.', quyetDinh: false },
  { buoc: 'Lồng tiếng và ghép', ai: 'Lồng tiếng · Dựng phim', chiTiet: 'Đọc lời thoại, ghép các đoạn, chèn chữ, nhạc, logo, xuất bản dọc 9:16.', quyetDinh: false },
  { buoc: 'Duyệt cuối', ai: 'Đội trưởng', chiTiet: 'Giao video hoàn chỉnh cho chủ tự đăng.', quyetDinh: true },
]

export const VIEC_CON_LAI = [
  'Duyệt kỹ năng giữ đồng nhất câu lệnh cho biên kịch. Ứng viên hạng 1 là DirectorSKILL (MIT, 86 điểm), chưa cài.',
  'Chọn ngôn ngữ câu lệnh cho Kling (tiếng Anh hay tiếng Trung), và cách dùng Veo vì Veo chỉ tạo tối đa 8 giây.',
  'Làm thử video đầu tiên với một sản phẩm thật.',
]
