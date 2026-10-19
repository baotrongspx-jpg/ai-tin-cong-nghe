import 'server-only'
import { z } from 'zod'
import { db } from './db'
import {
  TONG_HOP_TRONG,
  TRANG_THAI,
  type DongNhatKy,
  type TongHop,
  type Vai,
  type ViecTomTat,
} from '@/app/doi-video/tien-do/kieu'

// Tiến độ đội video: mỗi sự kiện là một dòng riêng trong cai_dat, khoa = tien_do:<duAn>:<ms>:<ngẫu nhiên>.
// Dùng chung cho route /doi-video/tien-do/su-kien và trang /doi-video/tien-do.

export const TIEN_TO = 'tien_do:'
const MAU = /^[a-z0-9-]+$/

export const MaDuAn = z.string().min(1).max(60).regex(MAU)

export const SuKienTienDo = z.object({
  duAn: MaDuAn,
  viec: z.string().min(1).max(120),
  to: z.string().min(1).max(40).regex(MAU),
  nguoi: z.string().min(1).max(60).regex(MAU),
  trangThai: z.enum(TRANG_THAI),
  phanTram: z.int().min(0).max(100).optional(),
  ghiChu: z.string().max(500).default(''),
})
export type SuKienTienDo = z.infer<typeof SuKienTienDo>

// Lý do trả về khi sai, theo trường đầu tiên bị lỗi
const LOI_TRUONG: Record<string, string> = {
  duAn: 'duAn phải là chữ thường không dấu, số hoặc gạch ngang, 1–60 ký tự',
  viec: 'viec phải là chuỗi 1–120 ký tự',
  to: 'to phải là chữ thường không dấu, số hoặc gạch ngang, 1–40 ký tự',
  nguoi: 'nguoi phải là chữ thường không dấu, số hoặc gạch ngang, 1–60 ký tự',
  trangThai: `trangThai phải là một trong: ${TRANG_THAI.join(', ')}`,
  phanTram: 'phanTram phải là số nguyên 0–100',
  ghiChu: 'ghiChu tối đa 500 ký tự',
}

export function lyDoLoi(loi: z.ZodError) {
  const truong = loi.issues[0]?.path[0]
  return (typeof truong === 'string' && LOI_TRUONG[truong]) || 'Dữ liệu sự kiện không hợp lệ'
}

// Dòng đã lưu có thêm giờ máy chủ nhận
const DongDaLuu = SuKienTienDo.extend({ luc: z.iso.datetime({ offset: true }) })
type DongDaLuu = z.infer<typeof DongDaLuu>

// Giờ Việt Nam cố định, định dạng ở máy chủ nên trình duyệt hiện đúng chuỗi này
const DINH_DANG_GIO = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  day: '2-digit',
  month: '2-digit',
  hour12: false,
})

const vaiCua = (nguoi: string): Vai =>
  nguoi.startsWith('truong-') ? 'truong' : nguoi.startsWith('kd-') ? 'kiem-duyet' : 'thanh-vien'

const duAnCuaKhoa = (khoa: string) => khoa.slice(TIEN_TO.length).split(':')[0] ?? ''

function thanhDong(d: DongDaLuu): DongNhatKy {
  return {
    viec: d.viec,
    to: d.to,
    nguoi: d.nguoi,
    trangThai: d.trangThai,
    phanTram: d.phanTram ?? null,
    ghiChu: d.ghiChu,
    luc: d.luc,
    gio: DINH_DANG_GIO.format(new Date(d.luc)),
  }
}

type Dong = { khoa: string; gia_tri?: unknown; cap_nhat_luc: string }

// Danh sách dự án đã có sự kiện, mới nhất trước (các dòng đã xếp theo cap_nhat_luc giảm dần)
function danhSachDuAn(dong: Dong[]) {
  const thay = new Set<string>()
  for (const d of dong) {
    const ma = duAnCuaKhoa(d.khoa)
    if (MAU.test(ma)) thay.add(ma)
  }
  return [...thay]
}

function tongHop(duAnDaCo: string[], duAn: string, dong: Dong[]): TongHop {
  const suKien: DongDaLuu[] = []
  for (const d of dong) {
    const kq = DongDaLuu.safeParse(d.gia_tri)
    if (kq.success && kq.data.duAn === duAn) suKien.push(kq.data)
  }
  suKien.sort((a, b) => Date.parse(b.luc) - Date.parse(a.luc))

  // Gom theo việc: sự kiện đầu tiên gặp là mới nhất; phần trăm lấy lần gửi phanTram mới nhất
  const theoViec = new Map<string, { moiNhat: DongDaLuu; phanTram: number | null }>()
  for (const s of suKien) {
    const co = theoViec.get(s.viec)
    if (!co) theoViec.set(s.viec, { moiNhat: s, phanTram: s.phanTram ?? null })
    else if (co.phanTram === null && s.phanTram !== undefined) co.phanTram = s.phanTram
  }

  const hang = (v: ViecTomTat) => (v.trangThai === 'ket' ? 0 : v.trangThai === 'xong' ? 2 : 1)
  const viec: ViecTomTat[] = [...theoViec.values()]
    .map(({ moiNhat, phanTram }) => {
      const phanTramTinh = moiNhat.trangThai === 'xong' ? 100 : (phanTram ?? 0)
      return {
        ...thanhDong(moiNhat),
        phanTram: moiNhat.trangThai === 'xong' ? 100 : phanTram,
        vai: vaiCua(moiNhat.nguoi),
        phanTramTinh,
      }
    })
    .sort((a, b) => hang(a) - hang(b) || Date.parse(b.luc) - Date.parse(a.luc))

  const phanTram = viec.length ? Math.round(viec.reduce((t, v) => t + v.phanTramTinh, 0) / viec.length) : 0

  return { duAnDaCo, duAn, phanTram, viec, nhatKy: suKien.slice(0, 50).map(thanhDong) }
}

// duAnYeuCau đã qua MaDuAn (không chứa % hay _ nên dùng được trong like). Không có hoặc chưa có sự kiện thì lấy dự án mới nhất.
export async function layTienDo(duAnYeuCau?: string): Promise<TongHop> {
  const bang = () => db().from('cai_dat')

  if (duAnYeuCau) {
    const [ds, rieng] = await Promise.all([
      bang().select('khoa, cap_nhat_luc').like('khoa', `${TIEN_TO}%`).order('cap_nhat_luc', { ascending: false }).limit(500),
      bang()
        .select('khoa, gia_tri, cap_nhat_luc')
        .like('khoa', `${TIEN_TO}${duAnYeuCau}:%`)
        .order('cap_nhat_luc', { ascending: false })
        .limit(500),
    ])
    if (ds.error || rieng.error) throw new Error('Không đọc được tiến độ')
    const duAnDaCo = danhSachDuAn(ds.data)
    if (rieng.data.length) {
      if (!duAnDaCo.includes(duAnYeuCau)) duAnDaCo.push(duAnYeuCau)
      return tongHop(duAnDaCo, duAnYeuCau, rieng.data)
    }
  }

  const { data, error } = await bang()
    .select('khoa, gia_tri, cap_nhat_luc')
    .like('khoa', `${TIEN_TO}%`)
    .order('cap_nhat_luc', { ascending: false })
    .limit(500)
  if (error) throw new Error('Không đọc được tiến độ')
  const duAnDaCo = danhSachDuAn(data)
  if (!duAnDaCo.length) return TONG_HOP_TRONG
  return tongHop(duAnDaCo, duAnDaCo[0], data)
}
