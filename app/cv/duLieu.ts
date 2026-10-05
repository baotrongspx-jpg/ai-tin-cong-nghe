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
      'Đang tự xây Durian Frozen System để đối chiếu nguyên liệu đầu vào với thành phẩm, thay cho sổ sách thủ công.',
    ],
  },
  {
    chucDanh: 'Quản lý Vận hành',
    noi: 'SPX Express · Đắk Lắk',
    thoiGian: '08/2024 – 06/2026',
    viec: [
      'Điều phối đội 20 – 50 nhân sự: phân bổ theo khối lượng hàng, theo dõi tiến độ trong ngày, dự báo nhu cầu lao động ngày kế tiếp.',
      'Tự xây SPX Command Center để cấp trên quản lý cụm 12 kho: dashboard, đối soát dữ liệu, cảnh báo nhân sự dưới chỉ tiêu.',
    ],
  },
  {
    chucDanh: 'Quản lý Vận hành',
    noi: 'Giao Hàng Tiết Kiệm (GHTK)',
    thoiGian: '2024',
    viec: ['Điều phối đội 20 – 50 nhân sự, xử lý sự cố phát sinh để giữ chất lượng dịch vụ cho khách hàng.'],
  },
  {
    chucDanh: 'Nhân viên Kiểm tra Chất lượng (QC)',
    noi: 'Thaco Trường Hải',
    thoiGian: '2023 – 2024',
    viec: ['Kiểm tra chất lượng xe theo quy trình và tiêu chuẩn nhà máy: cẩn thận, tư duy checklist.'],
  },
]

// taiKhoan: tài khoản dùng thử hiện công khai trên CV để nhà tuyển dụng tự đăng nhập xem (chủ trang chọn để công khai)
export const DU_AN: { ten: string; link?: string; moTa: string; nhan: string; taiKhoan?: { ten: string; matKhau: string } }[] = [
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
    moTa: 'Tự xây để cấp trên quản lý cụm 12 kho SPX Đắk Lắk: dashboard, đối soát dữ liệu, cảnh báo nhân sự dưới chỉ tiêu.',
    nhan: 'Vận hành',
  },
  {
    ten: 'Durian Frozen System',
    link: 'https://durian-frozen-system.vercel.app/vi',
    moTa: 'Quản lý kho cấp đông, sản lượng, tỷ lệ thu hồi qua 5 công đoạn; đang phát triển.',
    nhan: 'Kho đông lạnh',
    taiKhoan: { ten: 'admin@gmail.com', matKhau: '123456789' },
  },
]

export const NGAY_SINH = '03/04/2001'
export const DIA_CHI = 'TP. Buôn Ma Thuột, Đắk Lắk'
export const HOC_VAN = 'Trường Cao đẳng Phương Đông, Đà Nẵng · Cao đẳng Công nghệ Ô tô · Tốt nghiệp 2022'
// Toàn bộ hồ sơ dạng chữ, làm "tài liệu" cho robot trả lời câu hỏi của nhà tuyển dụng
export function hoSoDangChu() {
  return [
    `Họ tên: Nông Bảo Trọng. Ngày sinh: ${NGAY_SINH}. Nơi ở: ${DIA_CHI}.`,
    `Điện thoại / Zalo: ${DIEN_THOAI}. Email: ${EMAIL}.`,
    `Học vấn: ${HOC_VAN}.`,
    'Kinh nghiệm:',
    ...KINH_NGHIEM.map((k) => `- ${k.chucDanh}, ${k.noi} (${k.thoiGian}): ${k.viec.join(' ')}`),
    'Dự án tự làm:',
    ...DU_AN.map(
      (d) =>
        `- ${d.ten}: ${d.moTa}` +
        (d.link ? ` Xem tại ${d.link}` : '') +
        (d.taiKhoan ? ` (tài khoản xem thử: ${d.taiKhoan.ten} / mật khẩu ${d.taiKhoan.matKhau})` : ''),
    ),
    'Về kho: đã dùng hệ thống vận hành kho nội bộ của SPX; đang tự phát triển phần mềm quản lý kho đông lạnh (Durian Frozen System); đã hướng dẫn nhân viên dùng hệ thống và quy trình mới.',
    'Về nhập – xuất – tồn: nắm và đối soát số liệu nhập – xuất – tồn, hao hụt; chưa trực tiếp làm thủ kho hay tự tổ chức kiểm kê.',
    'Sẵn sàng đi công tác, kể cả tỉnh xa (ví dụ Bến Tre) khi công ty cần.',
    'Chưa trực tiếp phối hợp với bộ phận sản xuất, kế toán hay vận tải. Ở SPX có phân bổ nhân lực theo khối lượng hàng.',
    'Sở thích: du lịch, thể thao, công nghệ, âm nhạc.',
  ].join('\n')
}

// ——— CV theo vị trí ứng tuyển ———
// Mở /cv?vt=<mã> (và /cv/ban-in?vt=<mã>) để trang nhấn đúng kinh nghiệm hợp với tin tuyển dụng.
// Không có mã hoặc mã lạ → bản đầu tiên (Quản lý Kho). Chỉ viết những gì có thật trong hồ sơ.

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
  // [số đếm tới, chữ sau, nhãn, chữ trước số (vd "20–")]
  soLieu: [number, string, string, string?][]
  gioiThieu: { tieuDe: string; moTa: string }
  theManh: [BieuTuong, string, string][]
  thongTinNhanh: [BieuTuong, string, string][]
  phuHop?: { tieuDe: string; moTa: string; ds: [string, string][] }
  // Kế hoạch nếu được nhận: [mốc, tên giai đoạn, các việc]
  keHoach?: [string, string, string[]][]
  kyNang: string[]
  congCu: string[]
  sanSang: string[]
  mucTieu: [string, string][]
  phongCach: string[]
  thuTuDuAn: string[]
  // Hiện mục bảng số liệu kho mẫu trên website
  bangKho?: boolean
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
    ' và tính hao hụt từng công đoạn tại Công ty TNHH Trái Cây 001. Gần 2 năm Quản lý Vận hành tại ',
    { dam: 'SPX Express' },
    ': điều phối đội 20 – 50 nhân sự theo khối lượng hàng, và tự xây phần mềm giúp cấp trên quản lý cụm 12 kho. ',
    'Đang tự phát triển ',
    { dam: 'phần mềm quản lý kho đông lạnh' },
    '.',
  ],
  soLieu: [
    [50, '', 'Nhân sự từng điều phối', '20–'],
    [12, '', 'Kho SPX dùng phần mềm tôi xây'],
    [3, '+', 'Năm đi làm thực tế'],
    [4, '', 'Công cụ quản lý tự xây'],
  ],
  gioiThieu: {
    tieuDe: 'Giữ cho số liệu kho luôn khớp, hao hụt luôn trong tầm kiểm soát',
    moTa: 'Từ vận hành kho SPX đến kho cấp đông sầu riêng: công việc của tôi là để số liệu nhập – xuất – tồn rõ ràng, chênh lệch được phát hiện sớm và báo cáo kịp thời.',
  },
  theManh: [
    ['hop', 'Nắm chắc số liệu kho', 'Theo dõi sản lượng từng công đoạn, đối chiếu nguyên liệu đầu vào với thành phẩm, phát hiện chênh lệch sớm.'],
    ['bieuDo', 'Kiểm soát hao hụt', 'Tính tỷ lệ hao hụt, tỷ lệ thu hồi và báo cáo định kỳ cho cấp trên, luôn kèm đề xuất xử lý.'],
    ['congCu', 'Số hóa quản lý kho', 'Đang tự phát triển phần mềm quản lý kho đông lạnh để thay sổ sách thủ công; đã hướng dẫn nhân viên dùng hệ thống mới.'],
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
        'Đã dùng hệ thống vận hành kho nội bộ của SPX; tự xây SPX Command Center được cấp trên dùng để quản lý cụm 12 kho; đang tự phát triển phần mềm quản lý kho đông lạnh; đã hướng dẫn nhân viên dùng hệ thống và quy trình mới.',
      ],
      [
        'Kiểm soát hao hụt, thất thoát; báo cáo cấp trên',
        'Tính tỷ lệ hao hụt từng công đoạn, báo cáo định kỳ cho Giám đốc; xây công cụ đối soát dữ liệu cho cụm 12 kho SPX.',
      ],
      ['Kinh nghiệm kho 2 – 3 năm', 'Quản lý Vận hành tại GHTK (2024), rồi gần 2 năm Quản lý Vận hành tại SPX Express (08/2024 – 06/2026); nay theo dõi kho cấp đông tại Trái Cây 001.'],
      ['Tin học văn phòng, phần mềm', 'Thành thạo Excel / Google Sheets, Apps Script; tự xây công cụ báo cáo và quản lý kho.'],
      ['Trung cấp trở lên', 'Cao đẳng Công nghệ Ô tô (2022); quen làm theo quy trình, checklist từ khi làm QC tại Thaco Trường Hải.'],
      ['Nam, trên 22 tuổi, chịu áp lực, đi công tác', 'Nam, sinh năm 2001; quen nhịp cao điểm của kho vận; sẵn sàng đi công tác, kể cả Bến Tre.'],
    ],
  },
  keHoach: [
    [
      '30 ngày đầu',
      'Nắm việc',
      [
        'Đi hết quy trình kho nông sản / đông lạnh tại nhà máy: sơ đồ kho, mã hàng, cách ghi lô.',
        'Học phân hệ Kho trên ERP, đối chiếu số liệu trên hệ thống với hàng thực tế.',
        'Lập danh sách các điểm hay chênh lệch, hao hụt; báo cáo hiện trạng cho cấp trên.',
      ],
    ],
    [
      '60 ngày',
      'Chuẩn hóa',
      [
        'Thống nhất quy trình và mẫu phiếu nhập – xuất – tồn giữa kho và các bộ phận liên quan.',
        'Lên lịch kiểm kê định kỳ, xử lý chênh lệch ngay sau mỗi lần kiểm kê.',
        'Hướng dẫn nhân viên kho dùng ERP đúng quy trình; báo cáo hao hụt hằng tuần kèm nguyên nhân.',
      ],
    ],
    [
      '90 ngày',
      'Cải thiện',
      [
        'Đặt ngưỡng hao hụt cho từng công đoạn, cảnh báo sớm khi vượt.',
        'Bảng số liệu kho hằng ngày để cấp trên theo dõi tồn kho, xuất kho, hao hụt.',
        'Đề xuất cách giảm hao hụt và tồn đọng dựa trên số liệu 3 tháng.',
      ],
    ],
  ],
  kyNang: [
    'Theo dõi số liệu nhập – xuất – tồn',
    'Kiểm soát hao hụt, tỷ lệ thu hồi',
    'Đối soát số liệu cuối ngày',
    'Điều phối nhân lực theo khối lượng hàng',
    'Hướng dẫn nhân viên dùng hệ thống',
    'Báo cáo định kỳ kèm đề xuất',
    'Áp dụng 5S / Kaizen tại nơi làm việc',
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
  bangKho: true,
}

// Hiệp hội Logistics và Cảng biển tỉnh Đắk Lắk (DLP): Executive Project Lead, đồng hành trực tiếp cùng Chủ tịch
const TRUONG_NHOM_DU_AN: HoSoViTri = {
  ma: 'truong-nhom-du-an',
  ten: 'Trưởng nhóm Điều hành & Quản lý Dự án',
  ungTuyen: 'Executive Project Lead – Trưởng nhóm Điều hành & Quản lý Dự án',
  nhanSanSang: 'Sẵn sàng làm hybrid Đắk Lắk – TP.HCM – Tuy Hòa · có thể bắt đầu sớm',
  chucDanh: ['Ứng tuyển: Executive Project Lead', 'Trưởng nhóm Điều hành & Quản lý Dự án', 'Action List · Dashboard · Báo cáo tiến độ'],
  tomTat: [
    'Đang là ',
    { dam: 'Trợ lý Giám đốc' },
    ' tại Công ty TNHH Trái Cây 001: nhận việc trực tiếp từ Giám đốc, theo dõi số liệu, báo cáo định kỳ và làm việc với hợp tác xã, đối tác. Gần 2 năm Quản lý Vận hành ',
    { dam: 'logistics' },
    ' tại SPX Express và GHTK Đắk Lắk: điều phối đội 20 – 50 nhân sự, và tự xây ',
    { dam: 'dashboard điều hành' },
    ' để cấp trên quản lý cụm 12 kho. Thế mạnh: biến chỉ đạo thành đầu việc rõ ràng, theo dõi đến khi có kết quả.',
  ],
  soLieu: [
    [50, '', 'Nhân sự từng điều phối', '20–'],
    [12, '', 'Kho dùng dashboard tôi xây'],
    [3, '+', 'Năm đi làm thực tế'],
    [4, '', 'Công cụ quản lý tự xây'],
  ],
  gioiThieu: {
    tieuDe: 'Chuyển định hướng thành kế hoạch, hành động và kết quả cụ thể',
    moTa: 'Từ điều hành vận hành logistics đến văn phòng Giám đốc: công việc của tôi là nắm rõ chỉ đạo, chia thành đầu việc có người phụ trách và hạn chót, theo dõi trên dashboard và báo cáo kết quả kèm đề xuất.',
  },
  theManh: [
    ['bongDen', 'Chỉ đạo thành Action List', 'Nhận việc trực tiếp từ Giám đốc, tách thành đầu việc, theo dõi tiến độ và báo cáo định kỳ, luôn kèm phương án đề xuất.'],
    ['bieuDo', 'Dashboard & báo cáo', 'Tự xây SPX Command Center, Daily Report Hub: dashboard điều hành, báo cáo ngày tự động, cảnh báo sớm khi chậm chỉ tiêu.'],
    ['chuong', 'Điều phối & kết nối', 'Điều phối đội 20 – 50 nhân sự logistics; làm việc với hợp tác xã, đối tác; soạn hợp đồng mua bán, vận chuyển, dịch vụ.'],
  ],
  thongTinNhanh: [
    ['cap', 'Ứng tuyển', 'Executive Project Lead (Trưởng nhóm Điều hành & QLDA)'],
    ['ghim', 'Nơi làm việc', 'Hybrid Đắk Lắk – TP.HCM – Phú Yên/Tuy Hòa'],
    ['dongHo', 'Bắt đầu', 'Có thể bắt đầu sớm'],
    ['lich', 'Năm sinh', `${NGAY_SINH.slice(-4)} (nam)`],
  ],
  phuHop: {
    tieuDe: 'Đối chiếu với công việc của Executive Project Lead',
    moTa: 'Từng đầu việc trong tin tuyển dụng của Hiệp hội, và kinh nghiệm thực tế tôi đã có.',
    ds: [
      [
        'Chuyển chỉ đạo của Chủ tịch thành Action List và kế hoạch triển khai',
        'Hiện là Trợ lý Giám đốc, nhận việc trực tiếp từ Giám đốc (theo dõi sản lượng, hao hụt, hợp đồng, đối tác) và báo cáo định kỳ. Ở SPX, mỗi ngày chuyển chỉ tiêu của cấp trên thành phân bổ nhân sự và kế hoạch ngày kế tiếp.',
      ],
      [
        'Quản lý Dashboard, theo sát tiến độ và kết quả',
        'Tự xây SPX Command Center (dashboard, đối soát dữ liệu, cảnh báo nhân sự dưới chỉ tiêu) được cấp trên dùng để quản lý cụm 12 kho; Daily Report Hub báo cáo ngày tự động. Có thể dựng dashboard theo dõi đầu việc của Hiệp hội ngay từ tuần đầu.',
      ],
      [
        'Điều phối nhân sự và các đầu việc trọng tâm',
        'Điều phối đội 20 – 50 nhân sự tại SPX Express và GHTK: phân bổ theo khối lượng hàng, theo dõi tiến độ trong ngày, xử lý sự cố phát sinh.',
      ],
      [
        'Tổ chức gặp, kết nối và làm việc với doanh nghiệp; chăm sóc hội viên',
        'Làm việc với hợp tác xã, đối tác vùng trồng tại Trái Cây 001; soạn hợp đồng mua bán, vận chuyển, dịch vụ. Tự xây và vận hành Fanpage, TikTok Công Nghệ 24H, trả lời bình luận, chăm sóc người theo dõi.',
      ],
      [
        'Điều phối Business Matching – kết nối giao thương',
        'Hiểu cả hai phía cung – cầu logistics ở Đắk Lắk: phía vận chuyển (SPX, GHTK) và phía chủ hàng nông sản (sầu riêng cấp đông tại Trái Cây 001). Chưa trực tiếp tổ chức sự kiện Business Matching, sẵn sàng học quy trình của Hiệp hội.',
      ],
      [
        'Chủ trì báo cáo, nghiên cứu về logistics',
        'Gần 2 năm làm logistics chặng cuối tại Đắk Lắk; quen tổng hợp số liệu nhiều nguồn thành báo cáo kèm đề xuất; dùng AI (Gemini, Claude) để tổng hợp tài liệu nhanh.',
      ],
      [
        'Tổng hợp và báo cáo tiến độ, kết quả với Chủ tịch hằng tuần',
        'Đang báo cáo định kỳ cho Giám đốc; Daily Report Hub được chọn dự thi AI Innovator Awards của SPX.',
      ],
      [
        'Hybrid Đắk Lắk – TP.HCM – Phú Yên/Tuy Hòa; tư duy hệ thống; chủ động, trách nhiệm',
        'Sống tại Buôn Ma Thuột, sẵn sàng có mặt khi cần và đi TP.HCM, Tuy Hòa. Tư duy quy trình, checklist từ khi làm QC tại Thaco Trường Hải; tự xây 4 công cụ quản lý để giải bài toán thật.',
      ],
    ],
  },
  keHoach: [
    [
      '30 ngày đầu',
      'Nắm việc',
      [
        'Làm việc với Chủ tịch để nắm định hướng, đầu việc trọng tâm và danh sách hội viên, đối tác của Hiệp hội.',
        'Lập Action List đầu tiên: mỗi đầu việc có người phụ trách, hạn chót, trạng thái.',
        'Dựng dashboard theo dõi đầu việc và mẫu báo cáo tuần gửi Chủ tịch.',
      ],
    ],
    [
      '60 ngày',
      'Vận hành nhịp làm việc',
      [
        'Chạy đều nhịp họp – báo cáo tuần; cảnh báo sớm đầu việc chậm, kèm phương án xử lý.',
        'Lập lịch gặp gỡ, chăm sóc hội viên; ghi lại nhu cầu của từng doanh nghiệp.',
        'Chuẩn bị nội dung cho hoạt động Business Matching đầu tiên cùng Ban Chủ tịch.',
      ],
    ],
    [
      '90 ngày',
      'Ra kết quả',
      [
        'Báo cáo tổng kết 3 tháng: đầu việc đã xong, đang làm, vướng mắc.',
        'Bản tổng hợp hiện trạng, nhu cầu logistics Đắk Lắk từ góp ý của hội viên.',
        'Đề xuất kế hoạch quý tiếp theo cho Hiệp hội.',
      ],
    ],
  ],
  kyNang: [
    'Chuyển chỉ đạo thành Action List, kế hoạch',
    'Dựng và quản lý dashboard tiến độ',
    'Điều phối nhân sự, đầu việc song song',
    'Báo cáo định kỳ kèm đề xuất',
    'Soạn hợp đồng, văn bản',
    'Làm việc với đối tác, hợp tác xã',
    'Vận hành Fanpage, TikTok, chăm sóc cộng đồng',
  ],
  congCu: ['Excel / Sheets', 'Google Workspace', 'Dashboard tự xây (Next.js, Supabase)', 'Apps Script', 'Word', 'AI (Gemini, Claude)'],
  sanSang: [
    'Làm hybrid Đắk Lắk – TP.HCM – Phú Yên/Tuy Hòa',
    'Có mặt tại Đắk Lắk bất cứ khi nào công việc cần',
    'Đi công tác, gặp doanh nghiệp, đối tác',
    'Có thể bắt đầu sớm',
  ],
  mucTieu: [
    ['Ngắn hạn', 'Trở thành đầu mối tin cậy của Chủ tịch: mọi chỉ đạo đều có Action List, người phụ trách và báo cáo đúng hạn.'],
    ['Trung hạn', 'Chuẩn hóa dashboard, quy trình điều phối và chăm sóc hội viên; tổ chức đều các hoạt động kết nối giao thương.'],
    ['Dài hạn', 'Cùng Hiệp hội xây dựng cộng đồng doanh nghiệp và hệ sinh thái logistics – cảng biển Đắk Lắk.'],
  ],
  phongCach: ['Chủ động, báo cáo kèm phương án', 'Làm việc có số liệu, minh bạch', 'Bám việc đến kết quả cuối', 'Tư duy hệ thống, quy trình'],
  thuTuDuAn: ['SPX Command Center', 'Daily Report Hub', 'Durian Frozen System', 'Fanpage & TikTok Công Nghệ 24H'],
}

// Thêm vị trí mới: khai báo như QUAN_LY_KHO rồi thêm vào danh sách này
export const VI_TRI: HoSoViTri[] = [QUAN_LY_KHO, TRUONG_NHOM_DU_AN]

export function layViTri(ma?: string | string[] | null) {
  return VI_TRI.find((v) => v.ma === ma) ?? VI_TRI[0]
}

// Dự án theo thứ tự ưu tiên của từng vị trí
export const duAnCua = (vt: HoSoViTri) =>
  [...DU_AN].sort((a, b) => vt.thuTuDuAn.indexOf(a.ten) - vt.thuTuDuAn.indexOf(b.ten))

// Phần hồ sơ riêng của vị trí, thêm vào câu hỏi đầu gửi robot
export function boiCanhViTri(vt: HoSoViTri) {
  return [
    `Người xem đang đọc bản CV cho vị trí: ${vt.ungTuyen}.`,
    `Kỹ năng: ${vt.kyNang.join('; ')}.`,
    `Công cụ: ${vt.congCu.join(', ')}.`,
    `Sẵn sàng: ${vt.sanSang.join('; ')}.`,
    ...vt.mucTieu.map(([moc, nd]) => `- Mục tiêu ${moc.toLowerCase()}: ${nd}`),
    ...(vt.phuHop?.ds.map(([yc, dap]) => `- Yêu cầu "${yc}": ${dap}`) ?? []),
    ...(vt.keHoach?.map(([moc, ten, viec]) => `- Kế hoạch ${moc} (${ten}): ${viec.join(' ')}`) ?? []),
  ].join('\n')
}
