import { chayHenGioTikTok } from '@/lib/henGio'
import { baoBaiHot, capNhatSoLieu } from '@/lib/soLieu'
import { anSpamTuDong } from '@/lib/binhLuan'

// "Nhịp" GitHub Actions gọi 10 phút một lần (.github/workflows/nhip.yml), kèm Authorization: Bearer CRON_SECRET.
// Mỗi nhịp: đăng bài TikTok hẹn giờ đã tới giờ.
// Nhịp đầu mỗi giờ (phút 0–9, hoặc ?tat_ca=1): thêm cập nhật số liệu 2 ngày, báo bài đang lên, ẩn spam.
export const maxDuration = 300

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const tatCa = new URL(req.url).searchParams.get('tat_ca') === '1' || new Date().getUTCMinutes() < 10
  const loi = (e: unknown) => ({ loi: e instanceof Error ? e.message : String(e) })

  const henGio = await chayHenGioTikTok().catch(loi)
  if (!tatCa) return Response.json({ henGio })

  const soLieu = await capNhatSoLieu(2).catch(loi)
  const [baoHot, anSpam] = await Promise.all([baoBaiHot().catch(loi), anSpamTuDong().catch(loi)])
  return Response.json({ henGio, soLieu, baoHot, anSpam })
}
