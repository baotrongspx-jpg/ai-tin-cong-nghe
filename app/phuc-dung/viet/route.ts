import { z } from 'zod'
import { vietKichBan } from '@/lib/phucDung'
import { daDangNhap } from '@/lib/xacThuc'
import { chuanHoa } from '../ghep'

// AI xem nhiều ảnh nên có thể lâu
export const maxDuration = 60

const YeuCau = z.object({
  ghiChu: z.string().max(1000).default(''),
  // Làm tiếp đợt sau: bộ nhận dạng đã dùng ở các cảnh trước, AI phải giữ nguyên
  nhanDang: z.unknown().optional(),
  anh: z
    .array(
      z.object({
        ten: z.string().regex(/^doan_\d{3}_(dau|giua|cuoi)$/),
        doan: z.number().int().positive(),
        giay: z.number().nonnegative(),
        jpg: z.string().max(200_000),
      }),
    )
    .min(1)
    .max(90),
})

export async function POST(req: Request) {
  if (!(await daDangNhap())) return Response.json({ loi: 'Phiên đăng nhập đã hết, tải lại trang.' }, { status: 401 })
  const duLieu = YeuCau.safeParse(await req.json().catch(() => null))
  if (!duLieu.success) return Response.json({ loi: 'Dữ liệu ảnh không hợp lệ.' }, { status: 400 })

  const { anh, ghiChu, nhanDang } = duLieu.data
  const ndCu = nhanDang ? JSON.stringify(chuanHoa({ nhan_dang: nhanDang }).nhan_dang).slice(0, 30_000) : ''
  const kq = await vietKichBan(anh, ghiChu, ndCu).catch(() => null)
  if (!kq) return Response.json({ loi: 'AI chưa viết được (quá tải hoặc hết lượt miễn phí). Đợi 1 phút rồi thử lại.' }, { status: 502 })
  return Response.json({ duAn: chuanHoa(kq) })
}
