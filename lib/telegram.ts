import 'server-only'

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
