import 'server-only'
import { db } from './db'

const API = 'https://open.tiktokapis.com/v2'
const KHOA_TOKEN = 'tiktok_token'

type Token = { access_token: string; refresh_token: string; het_han: number; open_id: string }

export const coTikTok = () => !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET)

// Link gốc công khai của web (tên miền này phải được xác minh trong TikTok Developer để TikTok tải ảnh về)
export const urlWeb = () =>
  (process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  ).replace(/\/$/, '')

export const urlCallback = () => `${urlWeb()}/api/tiktok/callback`

// Link đăng nhập TikTok để cấp quyền đăng bài
export function urlCapQuyen(state: string) {
  const q = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: 'user.info.basic,video.publish',
    response_type: 'code',
    redirect_uri: urlCallback(),
    state,
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`
}

async function goiToken(params: Record<string, string>) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      ...params,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  const data = (await res.json()) as {
    access_token?: string; refresh_token?: string; expires_in?: number; open_id?: string
    error?: string; error_description?: string
  }
  if (!res.ok || !data.access_token) throw new Error(`TikTok: ${data.error_description || data.error || res.status}`)
  const token: Token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token!,
    het_han: Date.now() + (data.expires_in ?? 86400) * 1000,
    open_id: data.open_id ?? '',
  }
  const { error } = await db()
    .from('cai_dat')
    .upsert({ khoa: KHOA_TOKEN, gia_tri: token, cap_nhat_luc: new Date().toISOString() })
  if (error) throw new Error(`Lỗi lưu token TikTok: ${error.message}`)
  return token
}

// Đổi mã từ trang cấp quyền lấy token và lưu lại
export const luuTokenTuMa = (code: string) =>
  goiToken({ grant_type: 'authorization_code', code, redirect_uri: urlCallback() })

export async function daKetNoiTikTok() {
  const { data } = await db().from('cai_dat').select('khoa').eq('khoa', KHOA_TOKEN).maybeSingle()
  return !!data
}

// Access token sống 24 giờ, refresh token 365 ngày: gần hết hạn thì tự làm mới
async function layAccessToken() {
  const { data } = await db().from('cai_dat').select('gia_tri').eq('khoa', KHOA_TOKEN).maybeSingle()
  const token = data?.gia_tri as Token | undefined
  if (!token) throw new Error('Chưa kết nối TikTok (bấm "Kết nối TikTok" ở trang duyệt bài)')
  if (token.het_han - Date.now() > 5 * 60_000) return token.access_token
  return (await goiToken({ grant_type: 'refresh_token', refresh_token: token.refresh_token })).access_token
}

async function goiApi<T>(duongDan: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${duongDan}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const kq = (await res.json()) as { data?: T; error?: { code: string; message: string } }
  if (!res.ok || (kq.error && kq.error.code !== 'ok')) {
    throw new Error(`TikTok: ${kq.error?.message || kq.error?.code || res.status}`)
  }
  return kq.data as T
}

// Cắt chuỗi theo số ký tự UTF-16 (giới hạn của TikTok)
const cat = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`)

// Đăng bài ảnh lên TikTok. TikTok tự tải ảnh từ `urlAnh` (JPG, tên miền đã xác minh).
// Đăng xong TikTok còn xử lý thêm: chờ tối đa ~15 giây để bắt lỗi sớm, quá thì coi như đã gửi.
export async function dangAnhLenTikTok(urlAnh: string, tieuDe: string, moTa: string): Promise<string> {
  const token = await layAccessToken()

  // Chế độ hiển thị phải nằm trong danh sách tài khoản cho phép. App chưa được TikTok duyệt chỉ đăng riêng tư được.
  const { privacy_level_options: cheDo } = await goiApi<{ privacy_level_options: string[] }>(
    '/post/publish/creator_info/query/', token, {},
  )
  const muonDung = process.env.TIKTOK_CHE_DO ?? 'PUBLIC_TO_EVERYONE'
  const privacy = cheDo.includes(muonDung) ? muonDung : cheDo.includes('SELF_ONLY') ? 'SELF_ONLY' : cheDo[0]

  const { publish_id } = await goiApi<{ publish_id: string }>('/post/publish/content/init/', token, {
    media_type: 'PHOTO',
    post_mode: 'DIRECT_POST',
    post_info: {
      title: cat(tieuDe, 90),
      description: cat(moTa, 4000),
      privacy_level: privacy,
      disable_comment: false,
      auto_add_music: true,
    },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [urlAnh] },
  })

  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const { status, fail_reason } = await goiApi<{ status: string; fail_reason?: string }>(
      '/post/publish/status/fetch/', token, { publish_id },
    )
    if (status === 'FAILED') throw new Error(`TikTok đăng lỗi: ${fail_reason ?? 'không rõ lý do'}`)
    if (status === 'PUBLISH_COMPLETE') break
  }
  return publish_id
}
