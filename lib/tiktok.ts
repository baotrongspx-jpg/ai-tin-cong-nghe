import 'server-only'
import { db } from './db'
import { dichLoiTikTok } from './loiTikTok'
import { nhoTam } from './nhoTam'

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
    // Ghép mã lỗi vào để dịch được cả khi TikTok đổi câu chữ
    throw new Error(`TikTok: ${dichLoiTikTok(`${kq.error?.code ?? ''} ${kq.error?.message ?? res.status}`.trim())}`)
  }
  return kq.data as T
}

// Cắt chuỗi theo số ký tự UTF-16 (giới hạn của TikTok)
const cat = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`)

export type TaiKhoanTikTok = {
  creator_nickname: string
  creator_username: string
  creator_avatar_url: string
  privacy_level_options: string[]
  comment_disabled: boolean
}

// Thông tin tài khoản đang kết nối: tên, ảnh đại diện, các chế độ hiển thị được phép
export async function layTaiKhoanTikTok(token?: string) {
  return goiApi<TaiKhoanTikTok>('/post/publish/creator_info/query/', token ?? (await layAccessToken()), {})
}

// Cho trang TikTok: nhớ 5 phút để mở trang không phải gọi TikTok mỗi lần
export const layTaiKhoanTikTokNhanh = () => nhoTam('tai_khoan_tiktok', 5 * 60_000, () => layTaiKhoanTikTok())

// `longTieng`: đăng dạng video có giọng AI đọc bài thay vì bài ảnh. Bỏ trống thì theo TIKTOK_LONG_TIENG (mặc định bật).
// `choHoatHinh`: số giây chờ máy nhà dựng video hoạt hình (mặc định 200; lịch tự đăng / hẹn giờ đặt 0: chỉ dùng nếu đã có sẵn)
export type TuyChonDang = { privacy?: string; tatBinhLuan?: boolean; longTieng?: boolean; choHoatHinh?: number }

export const batLongTieng = (tuyChon: TuyChonDang = {}) => tuyChon.longTieng ?? process.env.TIKTOK_LONG_TIENG !== '0'

// Chế độ hiển thị phải nằm trong danh sách tài khoản cho phép. App chưa được TikTok duyệt chỉ đăng riêng tư được.
// Không chọn chế độ hiển thị (lịch tự đăng) thì dùng TIKTOK_CHE_DO.
async function chuanBiDang(tuyChon: TuyChonDang) {
  const token = await layAccessToken()
  const { privacy_level_options: cheDo, comment_disabled } = await layTaiKhoanTikTok(token)
  const muonDung = tuyChon.privacy ?? process.env.TIKTOK_CHE_DO ?? 'PUBLIC_TO_EVERYONE'
  const privacy = cheDo.includes(muonDung) ? muonDung : cheDo.includes('SELF_ONLY') ? 'SELF_ONLY' : cheDo[0]
  return { token, privacy, tatBinhLuan: comment_disabled || !!tuyChon.tatBinhLuan }
}

// Đăng xong TikTok còn xử lý thêm: chờ tối đa `lan` x 3 giây để bắt lỗi sớm, quá thì coi như đã gửi.
async function choXuLy(token: string, publish_id: string, lan: number) {
  for (let i = 0; i < lan; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const { status, fail_reason } = await goiApi<{ status: string; fail_reason?: string }>(
      '/post/publish/status/fetch/', token, { publish_id },
    )
    if (status === 'FAILED') throw new Error(`TikTok đăng lỗi: ${fail_reason ?? 'không rõ lý do'}`)
    if (status === 'PUBLISH_COMPLETE') break
  }
}

// Đăng video (MP4) lên TikTok: tải thẳng file lên (không cần xác minh tên miền). `moTa` tối đa 2200 ký tự.
export async function dangVideoLenTikTok(video: Buffer, moTa: string, tuyChon: TuyChonDang = {}) {
  const { token, privacy, tatBinhLuan } = await chuanBiDang(tuyChon)
  // Video dưới 64MB tải một lần (video tin ~1 phút chỉ vài MB)
  if (video.length > 64 * 1024 * 1024) throw new Error('Video lớn hơn 64MB')
  const { publish_id, upload_url } = await goiApi<{ publish_id: string; upload_url: string }>('/post/publish/video/init/', token, {
    post_info: {
      title: cat(moTa, 2200),
      privacy_level: privacy,
      disable_comment: tatBinhLuan,
      disable_duet: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000,
    },
    source_info: { source: 'FILE_UPLOAD', video_size: video.length, chunk_size: video.length, total_chunk_count: 1 },
  })
  const res = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes 0-${video.length - 1}/${video.length}` },
    body: new Uint8Array(video),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`TikTok: tải video lên lỗi (${res.status}) ${(await res.text().catch(() => '')).slice(0, 200)}`)
  await choXuLy(token, publish_id, 8)
  return publish_id
}

// Đăng bài ảnh lên TikTok. TikTok tự tải ảnh từ `urlAnh` (JPG, tên miền đã xác minh).
export async function dangAnhLenTikTok(urlAnh: string, tieuDe: string, moTa: string, tuyChon: TuyChonDang = {}) {
  const { token, privacy, tatBinhLuan } = await chuanBiDang(tuyChon)

  const { publish_id } = await goiApi<{ publish_id: string }>('/post/publish/content/init/', token, {
    media_type: 'PHOTO',
    post_mode: 'DIRECT_POST',
    post_info: {
      title: cat(tieuDe, 90),
      description: cat(moTa, 4000),
      privacy_level: privacy,
      disable_comment: tatBinhLuan,
      auto_add_music: true,
    },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [urlAnh] },
  })
  await choXuLy(token, publish_id, 5)
  return publish_id
}
