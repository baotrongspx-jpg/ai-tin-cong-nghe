import { randomUUID, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { layTienDo, lyDoLoi, MaDuAn, SuKienTienDo, TIEN_TO } from '@/lib/tienDo'

// POST: lệnh cong-cu/bao-tien-do.mjs của đội gửi một sự kiện tiến độ (Bearer CRON_SECRET).
// GET: trang /doi-video/tien-do đọc bản tổng hợp, công khai, không lưu đệm.
export const dynamic = 'force-dynamic'

const GIOI_HAN_BYTE = 4 * 1024
const KHONG_LUU_DEM = { 'Cache-Control': 'no-store' }

const loi = (status: number, lyDo: string) => Response.json({ loi: lyDo }, { status, headers: KHONG_LUU_DEM })

// So mã theo thời gian cố định; độ dài khác hoặc chưa đặt CRON_SECRET thì coi là sai
function dungMa(req: Request) {
  const ma = process.env.CRON_SECRET
  const tieuDe = req.headers.get('authorization') ?? ''
  if (!ma || !tieuDe.startsWith('Bearer ')) return false
  const gui = Buffer.from(tieuDe.slice('Bearer '.length))
  const that = Buffer.from(ma)
  return gui.length === that.length && timingSafeEqual(gui, that)
}

export async function POST(req: Request) {
  if (!dungMa(req)) return loi(401, 'Sai mã xác thực')

  const doDai = Number(req.headers.get('content-length') ?? 0)
  if (doDai > GIOI_HAN_BYTE) return loi(413, 'Sự kiện quá 4 KB')
  const than = await req.text()
  if (Buffer.byteLength(than) > GIOI_HAN_BYTE) return loi(413, 'Sự kiện quá 4 KB')

  let tho: unknown
  try {
    tho = JSON.parse(than)
  } catch {
    return loi(400, 'Thân yêu cầu không phải JSON hợp lệ')
  }
  const kq = SuKienTienDo.safeParse(tho)
  if (!kq.success) return loi(400, lyDoLoi(kq.error))

  const nhan = new Date()
  const luc = nhan.toISOString()
  const khoa = `${TIEN_TO}${kq.data.duAn}:${nhan.getTime()}:${randomUUID().replaceAll('-', '').slice(0, 8)}`

  try {
    // insert (không upsert): mỗi sự kiện một dòng, khóa trùng thì báo lỗi chứ không ghi đè
    const { error } = await db().from('cai_dat').insert({ khoa, gia_tri: { ...kq.data, luc }, cap_nhat_luc: luc })
    if (error) return loi(500, 'Không lưu được sự kiện')
  } catch {
    return loi(500, 'Không lưu được sự kiện')
  }

  return Response.json({ ok: true, khoa }, { status: 201, headers: KHONG_LUU_DEM })
}

export async function GET(req: Request) {
  const tham = new URL(req.url).searchParams.get('duAn')
  let duAn: string | undefined
  if (tham) {
    const kq = MaDuAn.safeParse(tham)
    if (!kq.success) return loi(400, 'duAn phải là chữ thường không dấu, số hoặc gạch ngang, 1–60 ký tự')
    duAn = kq.data
  }
  try {
    return Response.json(await layTienDo(duAn), { headers: KHONG_LUU_DEM })
  } catch {
    return loi(500, 'Không đọc được tiến độ')
  }
}
