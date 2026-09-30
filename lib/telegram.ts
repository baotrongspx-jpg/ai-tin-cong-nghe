import 'server-only'
import { db } from './db'

// Báo động qua Telegram. Cần TELEGRAM_BOT_TOKEN (tạo bot với @BotFather) và TELEGRAM_CHAT_ID
// (nhắn cho bot một tin rồi mở https://api.telegram.org/bot<token>/getUpdates để lấy "chat":{"id":...}).
export const coTelegram = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)

// Gửi tin nhắn (HTML đơn giản: <b>, <i>, <a>). Chưa cấu hình hoặc lỗi thì bỏ qua, không làm hỏng việc khác.
export async function guiTelegram(noiDung: string) {
  if (!coTelegram()) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: noiDung.slice(0, 4000),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    return res.ok
  } catch {
    return false
  }
}

// Chữ lấy từ bài báo / lỗi có thể chứa < > &, phải thoát trước khi ghép vào tin HTML
export const thoat = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Báo token Facebook hỏng / thiếu quyền, tối đa 6 giờ một lần để khỏi nhắn liên tục mỗi nhịp
export async function baoLoiToken(loi: string) {
  if (!coTelegram()) return
  const { data } = await db().from('cai_dat').select('cap_nhat_luc').eq('khoa', 'bao_loi_token').maybeSingle()
  if (data && Date.now() - new Date(data.cap_nhat_luc).getTime() < 6 * 3600_000) return
  await guiTelegram(
    `🔑 <b>Token Facebook có vấn đề</b>, web không đọc được số liệu / bình luận (có thể cả đăng bài):\n${thoat(loi.slice(0, 300))}\n\n` +
      'Kiểm tra FB_PAGE_TOKEN trên Vercel, hoặc tạo lại token (npm run token-fb).',
  )
  await db().from('cai_dat').upsert({ khoa: 'bao_loi_token', gia_tri: loi.slice(0, 300), cap_nhat_luc: new Date().toISOString() })
}

// Lỗi Facebook do token hết hạn / thiếu quyền (mã #10, #190, #200).
// "Object does not exist" cũng mã 10 nhưng là bài đã bị xóa, không phải lỗi token.
export const laLoiToken = (loi: string) =>
  !/object does not exist/i.test(loi) && /\(#(10|190|200)\)|access token|session has expired/i.test(loi)
