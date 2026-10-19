import { timingSafeEqual } from 'node:crypto'
import { danhSachCho, laKhoaHopLe, layAnh, xoaKhoa } from '@/lib/anhDoiVideo'

// Cổng cho lệnh cong-cu/tai-anh.mjs của đội (Bearer CRON_SECRET, cùng mã với báo tiến độ).
// GET: danh sách đơn và ảnh chờ tải. GET ?khoa=dv_anh:...: trả về file JPEG. DELETE ?khoa=...: xóa sau khi đã tải.
export const dynamic = 'force-dynamic'

const KHONG_LUU_DEM = { 'Cache-Control': 'no-store' }
const loi = (status: number, lyDo: string) => Response.json({ loi: lyDo }, { status, headers: KHONG_LUU_DEM })

// So mã theo thời gian cố định; chưa đặt CRON_SECRET thì coi là sai
function dungMa(req: Request) {
  const ma = process.env.CRON_SECRET
  const tieuDe = req.headers.get('authorization') ?? ''
  if (!ma || !tieuDe.startsWith('Bearer ')) return false
  const gui = Buffer.from(tieuDe.slice('Bearer '.length))
  const that = Buffer.from(ma)
  return gui.length === that.length && timingSafeEqual(gui, that)
}

export async function GET(req: Request) {
  if (!dungMa(req)) return loi(401, 'Sai mã xác thực')
  const khoa = new URL(req.url).searchParams.get('khoa')
  try {
    if (!khoa) return Response.json(await danhSachCho(), { headers: KHONG_LUU_DEM })
    if (!laKhoaHopLe(khoa) || !khoa.startsWith('dv_anh:')) return loi(400, 'Khóa ảnh không hợp lệ')
    const anh = await layAnh(khoa)
    if (!anh) return loi(404, 'Không có ảnh này')
    return new Response(new Uint8Array(anh), { headers: { 'Content-Type': 'image/jpeg', ...KHONG_LUU_DEM } })
  } catch {
    return loi(500, 'Không đọc được dữ liệu')
  }
}

export async function DELETE(req: Request) {
  if (!dungMa(req)) return loi(401, 'Sai mã xác thực')
  const khoa = new URL(req.url).searchParams.get('khoa') ?? ''
  if (!laKhoaHopLe(khoa)) return loi(400, 'Khóa không hợp lệ')
  try {
    await xoaKhoa(khoa)
  } catch {
    return loi(500, 'Không xóa được')
  }
  return Response.json({ ok: true }, { headers: KHONG_LUU_DEM })
}
