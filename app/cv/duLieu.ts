// Nội dung CV dùng chung cho website /cv và bản in 1 trang /cv/ban-in

export const DIEN_THOAI = '0856 984 948'
export const EMAIL = 'baotrongspx@gmail.com'

export const KINH_NGHIEM = [
  {
    chucDanh: 'Trợ lý Giám đốc (Phát triển vùng trồng & Ngoại giao)',
    noi: 'Công ty TNHH Trái Cây 001 · Krông Pắk, Đắk Lắk',
    thoiGian: '07/2026 – nay',
    viec: [
      'Theo dõi số liệu từng công đoạn tại Kho lột múi 001, tính tỷ lệ hao hụt và báo cáo định kỳ cho Giám đốc.',
      'Soạn thảo hợp đồng mua bán, vận chuyển, dịch vụ và văn bản pháp lý; làm việc với hợp tác xã, đối tác.',
      'Tự xây Durian Frozen System đối chiếu nguyên liệu đầu vào với thành phẩm, thay sổ sách thủ công.',
    ],
  },
  {
    chucDanh: 'Nhân viên Vận hành',
    noi: 'SPX Express · Cụm kho Đắk Lắk (12 kho)',
    thoiGian: '08/2024 – 06/2026',
    viec: [
      'Đối soát số liệu cuối ngày cho toàn cụm 12 kho.',
      'Phân bổ nhân lực theo khối lượng hàng, theo dõi tiến độ trong ngày, dự báo nhu cầu lao động ngày kế tiếp.',
      'Cảnh báo nhân sự dưới chỉ tiêu, báo cáo kèm đề xuất cho quản lý cụm.',
    ],
  },
  {
    chucDanh: 'Nhân viên Vận hành',
    noi: 'Giao Hàng Tiết Kiệm (GHTK)',
    thoiGian: '2024',
    viec: ['Điều phối nhân sự, xử lý sự cố phát sinh để giữ chất lượng dịch vụ cho khách hàng.'],
  },
  {
    chucDanh: 'Nhân viên Kiểm tra Chất lượng (QC)',
    noi: 'Thaco Trường Hải',
    thoiGian: '2023 – 2024',
    viec: ['Kiểm tra chất lượng xe theo quy trình và tiêu chuẩn nhà máy: cẩn thận, tư duy checklist.'],
  },
]

export const DU_AN: { ten: string; link?: string; moTa: string; nhan: string }[] = [
  {
    ten: 'Fanpage & TikTok Công Nghệ 24H',
    link: 'https://www.facebook.com/102093421307437',
    moTa: 'Tự xây kênh tin công nghệ: 3 lượt bài mỗi ngày, hẹn giờ theo giờ vàng, thống kê tương tác, trả lời bình luận.',
    nhan: 'Mạng xã hội',
  },
  {
    ten: 'Daily Report Hub',
    moTa: 'Báo cáo ngày tự động; được chọn dự thi AI Innovator Awards của SPX.',
    nhan: 'Báo cáo',
  },
  {
    ten: 'SPX Command Center',
    moTa: 'Điều hành cụm 12 kho: dashboard, đối soát dữ liệu, cảnh báo nhân sự dưới chỉ tiêu.',
    nhan: 'Vận hành',
  },
  {
    ten: 'Durian Frozen System',
    moTa: 'Quản lý kho cấp đông, sản lượng, tỷ lệ thu hồi; đang dùng thực tế.',
    nhan: 'Đối soát',
  },
]

export const KY_NANG = [
  'Theo dõi tiến độ, nhắc việc',
  'Báo cáo kèm đề xuất',
  'Đối soát số liệu',
  'Soạn hợp đồng, văn bản',
  'Chăm sóc khách hàng',
  'Vận hành Fanpage, TikTok',
]
export const CONG_CU = ['Excel / Sheets', 'Google Workspace', 'Word', 'Apps Script', 'AI (Gemini, Claude)', 'Next.js', 'Supabase']
export const SAN_SANG = [
  'T2 – sáng T7, 8h–17h tại Buôn Ma Thuột',
  'Học nhanh CapCut, quay chụp nội dung',
  'Học ghi sổ thu – chi theo quy trình công ty',
  'Tăng ca khi công việc cần',
]

export const NGAY_SINH = '03/04/2001'
export const DIA_CHI = 'TP. Buôn Ma Thuột, Đắk Lắk'
export const HOC_VAN = 'Trường Cao đẳng Phương Đông, Đà Nẵng · Cao đẳng Công nghệ Ô tô · Tốt nghiệp 2022'
export const MUC_TIEU: [string, string][] = [
  ['Ngắn hạn', 'Nắm nhanh quy trình công ty, hỗ trợ Giám đốc theo dõi tiến độ, báo cáo và giấy tờ chính xác, đúng hạn.'],
  ['Trung hạn', 'Học thêm quay dựng video (CapCut) và ghi sổ thu – chi để hỗ trợ được nhiều việc hơn.'],
  ['Dài hạn', 'Trở thành trợ lý đáng tin cậy, gắn bó lâu dài và cùng công ty phát triển tại Buôn Ma Thuột.'],
]

// Toàn bộ hồ sơ dạng chữ, làm "tài liệu" cho robot trả lời câu hỏi của nhà tuyển dụng
export function hoSoDangChu() {
  return [
    `Họ tên: Nông Bảo Trọng. Ngày sinh: ${NGAY_SINH}. Nơi ở: ${DIA_CHI}.`,
    `Điện thoại / Zalo: ${DIEN_THOAI}. Email: ${EMAIL}.`,
    'Vị trí ứng tuyển: Trợ lý (Trợ lý Giám đốc / Trợ lý văn phòng) tại Buôn Ma Thuột.',
    `Học vấn: ${HOC_VAN}.`,
    'Kinh nghiệm:',
    ...KINH_NGHIEM.map((k) => `- ${k.chucDanh}, ${k.noi} (${k.thoiGian}): ${k.viec.join(' ')}`),
    'Dự án tự làm:',
    ...DU_AN.map((d) => `- ${d.ten}: ${d.moTa}`),
    `Kỹ năng: ${KY_NANG.join('; ')}.`,
    `Công cụ: ${CONG_CU.join(', ')}.`,
    `Sẵn sàng: ${SAN_SANG.join('; ')}.`,
    'Mục tiêu nghề nghiệp:',
    ...MUC_TIEU.map(([moc, nd]) => `- ${moc}: ${nd}`),
    'Sở thích: du lịch, thể thao, công nghệ, âm nhạc.',
  ].join('\n')
}
