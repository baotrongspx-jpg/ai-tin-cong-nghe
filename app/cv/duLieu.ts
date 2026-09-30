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
    'Đang tìm việc tại Đắk Lắk: vị trí Trợ lý Giám đốc / Trợ lý văn phòng, hoặc Quản lý / điều hành kho.',
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
    'Về kho: đã dùng hệ thống vận hành kho nội bộ của SPX; đang tự phát triển phần mềm quản lý kho đông lạnh (Durian Frozen System); đã hướng dẫn nhân viên dùng hệ thống và quy trình mới.',
    'Về nhập – xuất – tồn: nắm và đối soát số liệu nhập – xuất – tồn, hao hụt; chưa trực tiếp làm thủ kho hay tự tổ chức kiểm kê.',
    'Sẵn sàng đi công tác, kể cả tỉnh xa (ví dụ Bến Tre) khi công ty cần.',
    'Sở thích: du lịch, thể thao, công nghệ, âm nhạc.',
  ].join('\n')
}

// ——— CV theo vị trí ứng tuyển ———
// Mở /cv?vt=<mã> (và /cv/ban-in?vt=<mã>) để trang nhấn đúng kinh nghiệm hợp với tin tuyển dụng.
// Không có mã hoặc mã lạ → bản chung (Trợ lý). Chỉ viết những gì có thật trong hồ sơ.

export type BieuTuong = 'bieuDo' | 'chuong' | 'bongDen' | 'hop' | 'congCu' | 'cap' | 'ghim' | 'dongHo' | 'lich'
// Đoạn tóm tắt: chuỗi thường, hoặc { dam } để in đậm
export type DoanChu = string | { dam: string }

export type HoSoViTri = {
  ma: string
  ten: string
  ungTuyen: string
  nhanSanSang: string
  chucDanh: string[]
  tomTat: DoanChu[]
  soLieu: [number, string, string][]
  gioiThieu: { tieuDe: string; moTa: string }
  theManh: [BieuTuong, string, string][]
  thongTinNhanh: [BieuTuong, string, string][]
  phuHop?: { tieuDe: string; moTa: string; ds: [string, string][] }
  kyNang: string[]
  congCu: string[]
  sanSang: string[]
  mucTieu: [string, string][]
  phongCach: string[]
  thuTuDuAn: string[]
}

const TRO_LY: HoSoViTri = {
  ma: 'tro-ly',
  ten: 'Trợ lý',
  ungTuyen: 'Trợ lý – Buôn Ma Thuột',
  nhanSanSang: 'Sẵn sàng nhận việc tại Buôn Ma Thuột',
  chucDanh: ['Trợ lý Giám đốc', 'Vận hành & Báo cáo số liệu', 'Đối soát · Điều phối · Soạn văn bản'],
  tomTat: [
    { dam: 'Đang làm Trợ lý Giám đốc' },
    ' tại Công ty TNHH Trái Cây 001: kiểm soát sản lượng, báo cáo định kỳ, soạn hợp đồng với đối tác. Gần 2 năm vận hành ',
    { dam: 'cụm 12 kho SPX Express' },
    '. Cẩn thận với số liệu, chủ động nhắc việc, luôn đi kèm đề xuất khi báo cáo.',
  ],
  soLieu: [
    [3, '+', 'Năm đi làm thực tế'],
    [12, '', 'Kho SPX vận hành cùng lúc'],
    [4, '', 'Dự án tự xây, đang dùng'],
    [3, '', 'Bài đăng Fanpage mỗi ngày'],
  ],
  gioiThieu: {
    tieuDe: 'Người trợ lý giúp Giám đốc nắm việc bằng số liệu',
    moTa: 'Từ kiểm tra chất lượng ở nhà máy, điều hành cụm 12 kho, đến trợ lý Giám đốc: mỗi công việc đều xoay quanh số liệu chính xác và tiến độ rõ ràng.',
  },
  theManh: [
    ['bieuDo', 'Chắc số liệu', 'Đối soát cuối ngày cho 12 kho, tính hao hụt từng công đoạn. Số nào cũng có nguồn và được đối chiếu.'],
    ['chuong', 'Chủ động nhắc việc', 'Theo dõi tiến độ trong ngày, cảnh báo sớm khi có vấn đề thay vì chờ được hỏi.'],
    ['bongDen', 'Báo cáo kèm đề xuất', 'Mỗi báo cáo đi kèm hướng xử lý cụ thể để cấp trên quyết định nhanh.'],
  ],
  thongTinNhanh: [
    ['cap', 'Ứng tuyển', 'Trợ lý Giám đốc / Trợ lý văn phòng'],
    ['ghim', 'Nơi làm việc', 'Buôn Ma Thuột, Đắk Lắk'],
    ['dongHo', 'Thời gian', 'T2 – sáng T7, 8h–17h, tăng ca khi cần'],
    ['lich', 'Năm sinh', NGAY_SINH.slice(-4)],
  ],
  kyNang: KY_NANG,
  congCu: CONG_CU,
  sanSang: SAN_SANG,
  mucTieu: MUC_TIEU,
  phongCach: ['Cẩn thận, làm việc có số liệu', 'Chủ động báo cáo kèm đề xuất', 'Kỷ luật, tư duy quy trình', 'Giao tiếp rõ ràng với đối tác, khách hàng'],
  thuTuDuAn: DU_AN.map((d) => d.ten),
}

const QUAN_LY_KHO: HoSoViTri = {
  ma: 'quan-ly-kho',
  ten: 'Quản lý Kho',
  ungTuyen: 'Quản lý Kho – Kho nông sản / đông lạnh',
  nhanSanSang: 'Sẵn sàng làm tại nhà máy Cư M’gar & đi công tác',
  chucDanh: ['Ứng tuyển: Quản lý Kho', 'Kho nông sản · Kho đông lạnh', 'Nhập – xuất – tồn · Kiểm soát hao hụt'],
  tomTat: [
    'Đang theo dõi số liệu ',
    { dam: 'kho cấp đông sầu riêng' },
    ' và tính hao hụt từng công đoạn tại Công ty TNHH Trái Cây 001. Gần 2 năm vận hành ',
    { dam: 'cụm 12 kho SPX Express' },
    ': đối soát số liệu cuối ngày, điều phối nhân lực theo khối lượng hàng. ',
    { dam: 'Tự xây phần mềm quản lý kho đông lạnh' },
    ' đang dùng thực tế.',
  ],
  soLieu: [
    [12, '', 'Kho SPX vận hành cùng lúc'],
    [3, '+', 'Năm đi làm thực tế'],
    [4, '', 'Công cụ quản lý tự xây'],
    [1, '', 'Phần mềm kho đông lạnh đang dùng'],
  ],
  gioiThieu: {
    tieuDe: 'Giữ cho số liệu kho luôn khớp, hao hụt luôn trong tầm kiểm soát',
    moTa: 'Từ cụm 12 kho SPX đến kho cấp đông sầu riêng: công việc của tôi là để số liệu nhập – xuất – tồn rõ ràng, chênh lệch được phát hiện sớm và báo cáo kịp thời.',
  },
  theManh: [
    ['hop', 'Nắm chắc số liệu kho', 'Theo dõi sản lượng từng công đoạn, đối chiếu nguyên liệu đầu vào với thành phẩm, phát hiện chênh lệch sớm.'],
    ['bieuDo', 'Kiểm soát hao hụt', 'Tính tỷ lệ hao hụt, tỷ lệ thu hồi và báo cáo định kỳ cho cấp trên, luôn kèm đề xuất xử lý.'],
    ['congCu', 'Số hóa quản lý kho', 'Tự xây phần mềm quản lý kho đông lạnh thay sổ sách thủ công, và hướng dẫn nhân viên dùng hệ thống mới.'],
  ],
  thongTinNhanh: [
    ['cap', 'Ứng tuyển', 'Quản lý Kho (kho nông sản / đông lạnh)'],
    ['ghim', 'Nơi làm việc', 'Nhà máy Cư M’gar · sẵn sàng đi công tác'],
    ['dongHo', 'Thời gian', 'T2 – T7, 8h–17h, tăng ca mùa vụ khi cần'],
    ['lich', 'Năm sinh', `${NGAY_SINH.slice(-4)} (nam)`],
  ],
  phuHop: {
    tieuDe: 'Đối chiếu với yêu cầu vị trí Quản lý Kho',
    moTa: 'Từng yêu cầu trong tin tuyển dụng, và kinh nghiệm thực tế tôi đã có.',
    ds: [
      [
        'Quản lý nhập – xuất – tồn kho nông sản / đông lạnh',
        'Đang theo dõi số liệu kho lột múi và kho cấp đông sầu riêng tại Trái Cây 001; đối chiếu nguyên liệu đầu vào với thành phẩm.',
      ],
      [
        'Triển khai phần mềm quản lý kho (ERP), đào tạo nhân viên',
        'Đã dùng hệ thống vận hành kho nội bộ của SPX; tự phát triển phần mềm quản lý kho đông lạnh đang dùng thực tế; đã hướng dẫn nhân viên dùng hệ thống và quy trình mới.',
      ],
      [
        'Kiểm soát hao hụt, thất thoát; báo cáo cấp trên',
        'Tính tỷ lệ hao hụt từng công đoạn, báo cáo định kỳ cho Giám đốc; đối soát số liệu cuối ngày cho cả cụm 12 kho SPX.',
      ],
      [
        'Phối hợp Sản xuất, Kế toán, Vận tải',
        'Làm việc với hợp tác xã, đối tác mua bán và vận chuyển; phân bổ nhân lực theo khối lượng hàng tại SPX.',
      ],
      ['Kinh nghiệm kho 2 – 3 năm', 'Gần 2 năm vận hành cụm 12 kho SPX Express (08/2024 – 06/2026), nay tiếp tục với kho cấp đông tại Trái Cây 001.'],
      ['Tin học văn phòng, phần mềm', 'Thành thạo Excel / Google Sheets, Apps Script; tự xây công cụ báo cáo và quản lý kho.'],
      ['Trung cấp trở lên', 'Cao đẳng Công nghệ Ô tô (2022); quen làm theo quy trình, checklist từ khi làm QC tại Thaco Trường Hải.'],
      ['Nam, trên 22 tuổi, chịu áp lực, đi công tác', 'Nam, sinh năm 2001; quen nhịp cao điểm của kho vận; sẵn sàng đi công tác, kể cả Bến Tre.'],
    ],
  },
  kyNang: [
    'Theo dõi số liệu nhập – xuất – tồn',
    'Kiểm soát hao hụt, tỷ lệ thu hồi',
    'Đối soát số liệu cuối ngày',
    'Điều phối nhân lực theo khối lượng hàng',
    'Hướng dẫn nhân viên dùng hệ thống',
    'Báo cáo định kỳ kèm đề xuất',
    'Phối hợp đối tác, hợp tác xã',
  ],
  congCu: ['Excel / Sheets', 'Hệ thống vận hành kho SPX', 'Phần mềm kho đông lạnh (tự xây)', 'Google Workspace', 'Apps Script', 'Word', 'AI (Gemini, Claude)'],
  sanSang: [
    'T2 – T7, 8h–17h tại nhà máy Cư M’gar (đi xe đưa đón từ Buôn Ma Thuột)',
    'Đi công tác, kể cả Bến Tre khi công ty cần',
    'Chịu áp lực mùa vụ, tăng ca khi cần',
    'Học nhanh phân hệ Kho trên ERP của công ty',
  ],
  mucTieu: [
    ['Ngắn hạn', 'Nắm quy trình nhập – xuất – tồn và phân hệ Kho trên ERP của công ty, để số liệu kho khớp ngay từ tháng đầu.'],
    ['Trung hạn', 'Chuẩn hóa kiểm kê định kỳ, giảm hao hụt và thất thoát, hướng dẫn nhân viên dùng phần mềm thành thạo.'],
    ['Dài hạn', 'Trở thành quản lý kho đáng tin cậy, gắn bó lâu dài và cùng nhà máy phát triển.'],
  ],
  phongCach: ['Cẩn thận, làm việc có số liệu', 'Kỷ luật, trung thực', 'Xử lý sự cố nhanh, dứt khoát', 'Tư duy quy trình, checklist'],
  thuTuDuAn: ['Durian Frozen System', 'SPX Command Center', 'Daily Report Hub', 'Fanpage & TikTok Công Nghệ 24H'],
}

export const VI_TRI: HoSoViTri[] = [TRO_LY, QUAN_LY_KHO]

export function layViTri(ma?: string | string[] | null) {
  return VI_TRI.find((v) => v.ma === ma) ?? TRO_LY
}

// Dự án theo thứ tự ưu tiên của từng vị trí
export const duAnCua = (vt: HoSoViTri) =>
  [...DU_AN].sort((a, b) => vt.thuTuDuAn.indexOf(a.ten) - vt.thuTuDuAn.indexOf(b.ten))

// Phần hồ sơ riêng của vị trí, thêm vào câu hỏi đầu gửi robot
export function boiCanhViTri(vt: HoSoViTri) {
  if (vt.ma === TRO_LY.ma) return ''
  return [
    `Người xem đang đọc bản CV cho vị trí: ${vt.ten}.`,
    ...(vt.phuHop?.ds.map(([yc, dap]) => `- Yêu cầu "${yc}": ${dap}`) ?? []),
  ].join('\n')
}
