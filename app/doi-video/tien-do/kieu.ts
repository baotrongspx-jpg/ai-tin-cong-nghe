// Kiểu và nhãn dùng chung cho trang tiến độ (máy chủ và trình duyệt). Không chứa khóa hay truy cập dữ liệu.

export const TRANG_THAI = ['cho', 'dang-lam', 'cho-duyet', 'tra-ve', 'xong', 'ket'] as const
export type TrangThaiViec = (typeof TRANG_THAI)[number]

export const NHAN_TRANG_THAI: Record<TrangThaiViec, string> = {
  cho: 'Chờ',
  'dang-lam': 'Đang làm',
  'cho-duyet': 'Chờ duyệt',
  'tra-ve': 'Trả về sửa',
  xong: 'Xong',
  ket: 'Bị kẹt',
}

// Vòng tổ: trưởng tổ giao việc → thành viên làm → kiểm duyệt soát
export const VONG_TO = ['truong', 'thanh-vien', 'kiem-duyet'] as const
export type Vai = (typeof VONG_TO)[number]

export const NHAN_VAI: Record<Vai, string> = {
  truong: 'Trưởng tổ',
  'thanh-vien': 'Thành viên',
  'kiem-duyet': 'Kiểm duyệt',
}

export type DongNhatKy = {
  viec: string
  to: string
  nguoi: string
  trangThai: TrangThaiViec
  phanTram: number | null
  ghiChu: string
  luc: string // ISO, giờ máy chủ nhận
  gio: string // giờ Việt Nam đã định dạng sẵn ở máy chủ (tránh lệch hydration)
}

export type ViecTomTat = DongNhatKy & {
  vai: Vai
  phanTramTinh: number // phần trăm dùng để tính: xong = 100, chưa gửi = 0
}

export type TongHop = {
  duAnDaCo: string[] // mới nhất trước
  duAn: string | null
  phanTram: number
  viec: ViecTomTat[] // bị kẹt trước, rồi mới nhất trước, việc xong ở cuối
  nhatKy: DongNhatKy[] // tối đa 50 dòng, mới nhất trước
}

export const TONG_HOP_TRONG: TongHop = { duAnDaCo: [], duAn: null, phanTram: 0, viec: [], nhatKy: [] }
