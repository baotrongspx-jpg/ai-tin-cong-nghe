import { chayHenGioTikTok } from '@/lib/henGio'
import { baoBaiHot, capNhatSoLieu } from '@/lib/soLieu'
import { anSpamTuDong } from '@/lib/binhLuan'
import { baoLoiToken, laLoiToken } from '@/lib/telegram'
import { layHashtagXuHuong } from '@/lib/xuHuong'

// "Nhịp" GitHub Actions gọi 10 phút một lần (.github/workflows/nhip.yml), kèm Authorization: Bearer CRON_SECRET.
// Mỗi nhịp: đăng bài TikTok hẹn giờ đã tới giờ.
// Nhịp đầu mỗi giờ (phút 0–9, hoặc ?tat_ca=1): thêm cập nhật số liệu 2 ngày, báo bài đang lên, ẩn spam,
// tìm lại hashtag xu hướng khi đã cũ.
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
  if (soLieu.loi && laLoiToken(soLieu.loi)) await baoLoiToken(soLieu.loi)
  const [baoHot, anSpam, xuHuong] = await Promise.all([
    baoBaiHot().catch(loi),
    anSpamTuDong().catch(loi),
    // Tự tìm lại hashtag xu hướng khi bản lưu cũ quá 24 giờ
    layHashtagXuHuong().then((x) => x.luc, loi),
  ])
  return Response.json({ henGio, soLieu, baoHot, anSpam, xuHuong })
}
