import { tongHopTin } from '@/lib/tongHop'

// Vercel Cron gọi route này theo lịch trong vercel.json (6h sáng giờ VN), kèm header Authorization: Bearer CRON_SECRET.
// Mặc định soạn xong đăng thẳng lên Fanpage; đặt TU_DONG_DANG=0 để chỉ lưu nháp chờ duyệt.
// Thêm ?chi_soan=1 để chạy thử: chỉ soạn nháp, không đăng.
export const maxDuration = 300

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    const chiSoan = new URL(req.url).searchParams.get('chi_soan') === '1'
    return Response.json(await tongHopTin(!chiSoan && process.env.TU_DONG_DANG !== '0'))
  } catch (e) {
    console.error(e)
    return Response.json({ loi: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
