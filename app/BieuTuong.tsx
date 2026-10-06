// Biểu tượng SVG nhỏ dùng chung (kế thừa màu chữ qua currentColor)
type P = { className?: string }
const svg = (d: React.ReactNode, className = 'h-4 w-4', fill = false) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {d}
  </svg>
)

export const IconFacebook = ({ className }: P) =>
  svg(<path d="M14 8h2.5V4.5H14c-2.5 0-4 1.6-4 4V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V8.8c0-.5.3-.8.5-.8Z" />, className, true)
export const IconTikTok = ({ className }: P) =>
  svg(<path d="M16.5 3c.4 2.2 1.8 3.7 4 4v3.3c-1.5 0-2.9-.4-4-1.2v6.4a5.6 5.6 0 1 1-5.6-5.6h.6v3.4a2.3 2.3 0 1 0 1.7 2.2V3h3.3Z" />, className, true)
export const IconSao = ({ className }: P) =>
  svg(<><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" /></>, className)
export const IconTai = ({ className }: P) => svg(<><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>, className)
export const IconChep = ({ className }: P) =>
  svg(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>, className)
export const IconMo = ({ className }: P) => svg(<><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>, className)
export const IconXong = ({ className }: P) => svg(<path d="m5 12 5 5 9-10" />, className)
export const IconThoat = ({ className }: P) => svg(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="m10 17-5-5 5-5" /><path d="M5 12h11" /></>, className)
export const IconLai = ({ className }: P) => svg(<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>, className)
export const IconLuu = ({ className }: P) => svg(<><path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z" /><path d="M8 4v5h7V4" /><path d="M8 20v-6h8v6" /></>, className)
export const IconBo = ({ className }: P) => svg(<><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>, className)
export const IconNhac = ({ className }: P) => svg(<><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>, className)

// Vòng xoay khi đang xử lý
export const Xoay = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={`${className} animate-spin`} fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)
export const IconBieuDo = ({ className }: P) => svg(<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>, className)
export const IconBinhLuan = ({ className }: P) => svg(<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12Z" />, className)
export const IconHop = ({ className }: P) => svg(<><path d="M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" /><path d="M4 13h4l1.5 3h5L16 13h4v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /></>, className)
export const IconDongHo = ({ className }: P) => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, className)
export const IconLich = ({ className }: P) => svg(<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>, className)
export const IconBoQua = ({ className }: P) => svg(<><path d="m5 6 6 6-6 6" /><path d="m13 6 6 6-6 6" /></>, className)
export const IconCanhBao = ({ className }: P) => svg(<><path d="M12 3 2 20h20Z" /><path d="M12 10v4M12 17h.01" /></>, className)
export const IconAn = ({ className }: P) =>
  svg(<><path d="M3 3l18 18" /><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3 3.5M6.4 7.6C4.3 9.2 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 3.5-.8" /><path d="M9.9 10a3 3 0 0 0 4.1 4.1" /></>, className)
export const IconTimKiem = ({ className }: P) => svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>, className)
export const IconNguoi = ({ className }: P) => svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, className)
export const IconLienKet = ({ className }: P) => svg(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>, className)
export const IconMenu = ({ className }: P) => svg(<path d="M4 6h16M4 12h16M4 18h16" />, className)
export const IconTep = ({ className }: P) => svg(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>, className)
export const IconBongDen = ({ className }: P) => svg(<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" /></>, className)
export const IconLop = ({ className }: P) => svg(<><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 13 9 5 9-5" /></>, className)
export const IconXongTron = ({ className }: P) => svg(<><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>, className)
export const IconBut = ({ className }: P) => svg(<><path d="M4 20h4L19 9l-4-4L4 16Z" /><path d="m13 7 4 4" /></>, className)
