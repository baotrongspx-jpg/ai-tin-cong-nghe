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
// Không có mã hoặc mã lạ → bản đầu tiên trong VI_TRI. Chỉ viết những gì có thật trong hồ sơ.

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

// VIMID Đắk Lắk (đại lý xe tải HOWO, JAC): Thủ kho Phụ tùng, ưu tiên tốt nghiệp CĐ Ô tô
const THU_KHO_PHU_TUNG: HoSoViTri = {
  ma: 'thu-kho-phu-tung',
  ten: 'Thủ kho Phụ tùng',
  ungTuyen: 'Thủ kho Phụ tùng – VIMID Đắk Lắk',
  nhanSanSang: 'Sẵn sàng làm 8h–17h, T2 – sáng T7 tại VIMID Đắk Lắk',
  chucDanh: ['Ứng tuyển: Thủ kho Phụ tùng', 'Cao đẳng Công nghệ Ô tô · Từng làm QC tại Thaco', 'Nhập – xuất – tồn · 5S / Kaizen'],
  tomTat: [
    'Tốt nghiệp ',
    { dam: 'Cao đẳng Công nghệ Ô tô' },
    ', từng làm ',
    { dam: 'QC tại Thaco Trường Hải' },
    ' (kiểm tra chất lượng xe theo quy trình nhà máy). Gần 2 năm Quản lý Vận hành ',
    { dam: 'kho vận' },
    ' tại SPX Express và GHTK: điều phối đội 20 – 50 nhân sự theo khối lượng hàng, áp dụng 5S / Kaizen. ',
    'Hiện theo dõi số liệu, tính hao hụt từng công đoạn tại kho sầu riêng của Công ty TNHH Trái Cây 001.',
  ],
  soLieu: [
    [3, '+', 'Năm đi làm thực tế'],
    [50, '', 'Nhân sự từng điều phối', '20–'],
    [12, '', 'Kho SPX dùng phần mềm tôi xây'],
    [4, '', 'Công cụ quản lý tự xây'],
  ],
  gioiThieu: {
    tieuDe: 'Hàng vào đúng, ra đủ, kho gọn gàng, số liệu luôn khớp',
    moTa: 'Nền tảng Công nghệ Ô tô, thói quen kiểm tra theo checklist từ nhà máy Thaco và kinh nghiệm vận hành kho vận ở SPX, GHTK: tôi muốn mang sự cẩn thận và kỷ luật số liệu đó vào kho phụ tùng của VIMID.',
  },
  theManh: [
    ['hop', 'Kiểm tra hàng theo checklist', 'Từng làm QC tại Thaco Trường Hải: kiểm tra chất lượng theo quy trình và tiêu chuẩn nhà máy, cẩn thận từng chi tiết.'],
    ['bieuDo', 'Số liệu nhập – xuất – tồn', 'Đối soát số liệu, tính hao hụt và báo cáo định kỳ; đang tự xây phần mềm quản lý kho để thay sổ sách thủ công.'],
    ['chuong', 'Điều phối & làm việc nhóm', 'Điều phối đội 20 – 50 nhân sự tại SPX, GHTK; áp dụng 5S / Kaizen; hướng dẫn nhân viên dùng hệ thống và quy trình mới.'],
  ],
  thongTinNhanh: [
    ['cap', 'Ứng tuyển', 'Thủ kho Phụ tùng – VIMID Đắk Lắk'],
    ['congCu', 'Chuyên ngành', 'Cao đẳng Công nghệ Ô tô (2022)'],
    ['dongHo', 'Thời gian', '8h–17h, T2 – sáng T7'],
    ['lich', 'Năm sinh', `${NGAY_SINH.slice(-4)} (nam)`],
  ],
  phuHop: {
    tieuDe: 'Đối chiếu với tin tuyển Thủ kho Phụ tùng',
    moTa: 'Từng mô tả công việc và yêu cầu của VIMID, và kinh nghiệm thực tế tôi đã có.',
    ds: [
      [
        'Tốt nghiệp CĐ trở lên (ưu tiên Ô tô / Kế toán)',
        'Cao đẳng Công nghệ Ô tô, Trường Cao đẳng Phương Đông, Đà Nẵng (2022): đúng chuyên ngành ưu tiên, giúp tôi nhanh làm quen tên gọi và mã phụ tùng.',
      ],
      [
        'Kiểm tra chất lượng và số lượng hàng xuất / nhập',
        'Từng làm QC tại Thaco Trường Hải, kiểm tra chất lượng xe theo quy trình, checklist của nhà máy. Tại Trái Cây 001, đối chiếu nguyên liệu đầu vào với thành phẩm từng công đoạn.',
      ],
      ['Sắp xếp hàng hóa theo tiêu chuẩn 5S', 'Đã áp dụng 5S / Kaizen tại nơi làm việc khi làm Quản lý Vận hành ở SPX, GHTK.'],
      [
        'Kiểm kê kho định kỳ (hằng tháng / 6 tháng)',
        'Nắm và đối soát số liệu nhập – xuất – tồn, hao hụt; tự xây công cụ đối soát dữ liệu dùng cho cụm 12 kho SPX. Chưa trực tiếp làm thủ kho, sẵn sàng học quy trình kiểm kê của VIMID.',
      ],
      [
        'Đặt hàng với tổng kho; mua hàng / dịch vụ ngoài',
        'Ở SPX, dự báo nhu cầu nhân lực ngày kế tiếp theo khối lượng hàng; tại Trái Cây 001, soạn hợp đồng mua bán, vận chuyển, dịch vụ và làm việc với đối tác.',
      ],
      [
        'Làm việc với các đơn vị logistics',
        'Gần 2 năm làm trong chính các đơn vị logistics (SPX Express, GHTK), hiểu cách bên vận chuyển nhận, giao và xử lý sự cố hàng hóa.',
      ],
      [
        'Kinh nghiệm kho tối thiểu 3 năm; nghiệp vụ quản lý kho',
        'Hơn 3 năm đi làm từ 2023: QC nhà máy ô tô, gần 2 năm Quản lý Vận hành kho vận (GHTK, SPX), nay theo dõi số liệu kho sầu riêng tại Trái Cây 001; đang tự phát triển phần mềm quản lý kho đông lạnh.',
      ],
      [
        'Lập kế hoạch, điều phối; tin học văn phòng; làm việc nhóm',
        'Điều phối đội 20 – 50 nhân sự, theo dõi tiến độ trong ngày; thành thạo Excel / Google Sheets, Apps Script, Word; hướng dẫn nhân viên dùng hệ thống mới.',
      ],
    ],
  },
  keHoach: [
    [
      '30 ngày đầu',
      'Nắm việc',
      [
        'Học danh mục, mã phụ tùng các dòng xe công ty đang bán và vị trí từng mã trong kho.',
        'Học quy trình nhập – xuất, kiểm tra chất lượng, số lượng và phần mềm kho của VIMID.',
        'Đối chiếu số liệu trên phần mềm với hàng thực tế, ghi lại các điểm chênh lệch và báo cáo quản lý.',
      ],
    ],
    [
      '60 ngày',
      'Chuẩn hóa',
      [
        'Sắp xếp kho theo 5S: chia khu vực, kệ, nhãn vị trí rõ ràng để tìm nhanh, xuất đúng mã.',
        'Tham gia kiểm kê định kỳ, xử lý chênh lệch ngay sau mỗi lần kiểm kê.',
        'Đặt hàng với tổng kho dựa trên số liệu tồn và nhu cầu thực tế.',
      ],
    ],
    [
      '90 ngày',
      'Cải thiện',
      [
        'Đặt mức tồn tối thiểu cho các mã phụ tùng hay xuất, báo sớm khi sắp hết.',
        'Bảng theo dõi nhập – xuất – tồn hằng ngày để quản lý xem nhanh.',
        'Đề xuất cách giảm hàng tồn lâu và tránh thiếu hàng dựa trên số liệu 3 tháng.',
      ],
    ],
  ],
  kyNang: [
    'Kiểm tra chất lượng theo quy trình, checklist',
    'Sắp xếp nơi làm việc theo 5S / Kaizen',
    'Theo dõi, đối soát số liệu nhập – xuất – tồn',
    'Kiểm soát hao hụt, báo cáo định kỳ',
    'Lập kế hoạch, điều phối nhân lực theo khối lượng hàng',
    'Soạn hợp đồng mua bán, vận chuyển, dịch vụ',
    'Hướng dẫn nhân viên dùng hệ thống mới',
  ],
  congCu: ['Excel / Sheets', 'Hệ thống vận hành kho SPX', 'Phần mềm kho đông lạnh (tự xây)', 'Google Workspace', 'Apps Script', 'Word', 'AI (Gemini, Claude)'],
  sanSang: [
    'Làm 8h–17h, T2 – sáng T7; đang sống tại Buôn Ma Thuột',
    'Học nhanh danh mục, mã phụ tùng và phần mềm kho của công ty',
    'Học quy trình kiểm kê, đặt hàng với tổng kho',
    'Chịu áp lực, tăng ca khi cần',
  ],
  mucTieu: [
    ['Ngắn hạn', 'Nắm mã phụ tùng và quy trình kho của VIMID, để hàng nhập – xuất đúng chất lượng, đủ số lượng ngay từ tháng đầu.'],
    ['Trung hạn', 'Kho gọn theo 5S, kiểm kê định kỳ khớp số liệu, đặt hàng với tổng kho kịp thời để không thiếu phụ tùng khi cần.'],
    ['Dài hạn', 'Phát triển theo lộ trình công danh của VIMID, gắn bó lâu dài cùng công ty.'],
  ],
  phongCach: ['Cẩn thận, tư duy checklist', 'Kỷ luật, trung thực', 'Gọn gàng, ngăn nắp theo 5S', 'Làm việc có số liệu'],
  thuTuDuAn: ['Durian Frozen System', 'SPX Command Center', 'Daily Report Hub', 'Fanpage & TikTok Công Nghệ 24H'],
  bangKho: true,
}

// Thêm vị trí mới: khai báo như QUAN_LY_KHO rồi thêm vào danh sách này. Bản đầu tiên là bản mặc định của /cv
export const VI_TRI: HoSoViTri[] = [THU_KHO_PHU_TUNG]

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
