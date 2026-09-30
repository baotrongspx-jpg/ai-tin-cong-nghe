import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Kiểm tra cấu hình khi deploy: chỉ báo có / thiếu, không lộ giá trị
const BIEN = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_PASSWORD', 'CRON_SECRET',
  'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'FB_PAGE_ID', 'FB_PAGE_TOKEN', 'TEN_TRANG', 'TU_DONG_DANG',
  'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'SITE_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
]

export async function GET() {
  const font = await readFile(join(process.cwd(), 'assets/fonts/BeVietnamPro-Bold.ttf'))
    .then(() => true)
    .catch(() => false)
  return Response.json({
    bien: Object.fromEntries(BIEN.map((k) => [k, !!process.env[k]])),
    font,
    phien_ban: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  })
}
