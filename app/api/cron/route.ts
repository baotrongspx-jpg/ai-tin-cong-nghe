import { tongHopTin } from '@/lib/tongHop'
import { capNhatSoLieu } from '@/lib/soLieu'
import { guiTelegram, thoat } from '@/lib/telegram'

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
  const q = new URL(req.url).searchParams
  const lich = q.get('lich') ?? 'chạy tay'
  try {
    const chiSoan = q.get('chi_soan') === '1'
    const soBai = Math.min(5, Math.max(1, Number(q.get('so_bai') ?? process.env.SO_BAI_MOI_LAN ?? 3) || 3))
    const kq = await tongHopTin(!chiSoan && process.env.TU_DONG_DANG !== '0', soBai)
    // Tiện thể cập nhật lượt tương tác các bài 7 ngày gần đây cho trang Thống kê
    const soLieu = await capNhatSoLieu(7).catch((e: Error) => ({ soBai: 0, loi: e.message }))

    // Chỉ nhắn Telegram khi có lỗi, để khỏi làm phiền mỗi lần chạy êm
    if (kq.loi.length) {
      await guiTelegram(
        `⚠️ <b>Lịch ${thoat(lich)}</b>: soạn ${kq.daViet}/${kq.daChon} bài, đăng ${kq.daDang} Facebook, ${kq.daDangTikTok} TikTok.\n` +
          `<b>${kq.loi.length} lỗi:</b>\n` +
          kq.loi.slice(0, 5).map((l) => `• ${thoat(l.slice(0, 300))}`).join('\n'),
      )
    }
    return Response.json({ ...kq, soLieu })
  } catch (e) {
    console.error(e)
    const loi = e instanceof Error ? e.message : String(e)
    await guiTelegram(`🚨 <b>Lịch ${thoat(lich)} hỏng hẳn</b>, không soạn được bài nào:\n${thoat(loi.slice(0, 500))}`)
    return Response.json({ loi }, { status: 500 })
  }
}
