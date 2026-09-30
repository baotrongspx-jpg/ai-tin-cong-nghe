import { tongHopTin } from '@/lib/tongHop'

// Vercel Cron gọi route này theo lịch trong vercel.json (6h, 12h, 18h giờ VN), kèm header Authorization: Bearer CRON_SECRET.
// ?so_bai=2: số bài mỗi lần (1–5), không có thì dùng SO_BAI_MOI_LAN.
// Mặc định soạn xong đăng thẳng lên Fanpage và TikTok (nếu đã cấu hình); đặt TU_DONG_DANG=0 để chỉ lưu nháp chờ duyệt.
// Thêm ?chi_soan=1 để chạy thử: chỉ soạn nháp, không đăng.
export const maxDuration = 300

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    const q = new URL(req.url).searchParams
    const chiSoan = q.get('chi_soan') === '1'
    const soBai = Math.min(5, Math.max(1, Number(q.get('so_bai') ?? process.env.SO_BAI_MOI_LAN ?? 3) || 3))
    return Response.json(await tongHopTin(!chiSoan && process.env.TU_DONG_DANG !== '0', soBai))
  } catch (e) {
    console.error(e)
    return Response.json({ loi: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
