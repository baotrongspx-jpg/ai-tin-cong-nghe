import 'server-only'

const PHIEN_BAN = process.env.FB_GRAPH_VERSION ?? 'v26.0'

export const coFacebook = () => !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN)

// Đăng một ảnh kèm chú thích lên Fanpage. Gửi thẳng file ảnh (không cần link công khai,
// nên chạy được cả trên máy lẫn trên Vercel).
// `henLuc`: nhờ Facebook tự đăng vào giờ đó (phải cách hiện tại 10 phút đến 30 ngày).
export async function dangAnhLenPage(anh: Blob, chuThich: string, henLuc?: Date): Promise<string> {
  const form = new FormData()
  form.append('source', anh, 'anh.png')
  form.append('caption', chuThich)
  form.append('access_token', process.env.FB_PAGE_TOKEN!)
  if (henLuc) {
    form.append('published', 'false')
    form.append('scheduled_publish_time', String(Math.floor(henLuc.getTime() / 1000)))
  }

  const res = await fetch(`https://graph.facebook.com/${PHIEN_BAN}/${process.env.FB_PAGE_ID}/photos`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  })
  const data = (await res.json()) as { id?: string; post_id?: string; error?: { message: string } }
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `Facebook trả lỗi ${res.status}`)
  return data.post_id ?? data.id ?? ''
}

// Xóa bài (dùng để hủy bài đã hẹn giờ mà Facebook chưa đăng)
export async function xoaBaiFb(postId: string) {
  const res = await fetch(`https://graph.facebook.com/${PHIEN_BAN}/${postId}?access_token=${process.env.FB_PAGE_TOKEN}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(20_000),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: { message: string } }
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `Facebook trả lỗi ${res.status}`)
}

export type SoLieuFb = {
  camXuc: number | null // null: token chưa có quyền pages_read_user_content
  binhLuan: number | null
  chiaSe: number
  luotXem: number | null // null: token chưa có quyền read_insights hoặc Facebook chưa có số
  tiepCan: number | null
}

// Gọi Graph API bằng token Fanpage. Lỗi có kèm `ma` (10 hoặc 200: thiếu quyền).
export async function goiFb<T>(duongDan: string, phuongThuc: 'GET' | 'POST' = 'GET', than?: Record<string, string>): Promise<T> {
  const tach = duongDan.includes('?') ? '&' : '?'
  const res = await fetch(`https://graph.facebook.com/${PHIEN_BAN}/${duongDan}${tach}access_token=${process.env.FB_PAGE_TOKEN}`, {
    method: phuongThuc,
    body: than ? new URLSearchParams(than) : undefined,
    signal: AbortSignal.timeout(20_000),
  })
  const data = (await res.json()) as T & { error?: { message: string; code: number } }
  if (!res.ok || data.error) throw Object.assign(new Error(data.error?.message ?? `Facebook trả lỗi ${res.status}`), { ma: data.error?.code })
  return data
}

// Số liệu tương tác một bài. Thiếu quyền đọc cảm xúc / lượt xem thì trả null cho phần đó, không báo lỗi.
export async function laySoLieuBai(postId: string): Promise<SoLieuFb> {
  type Bai = { shares?: { count: number }; reactions?: { summary: { total_count: number } }; comments?: { summary: { total_count: number } } }
  let bai: Bai
  let coCamXuc = true
  try {
    bai = await goiFb<Bai>(`${postId}?fields=shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)`)
  } catch (e) {
    if ((e as { ma?: number }).ma !== 10) throw e // lỗi 10: thiếu quyền → chỉ lấy lượt chia sẻ
    coCamXuc = false
    bai = await goiFb<Bai>(`${postId}?fields=shares`)
  }

  type Insights = { data: { name: string; values: { value: number }[] }[] }
  const xem = await goiFb<Insights>(`${postId}/insights?metric=post_media_view,post_total_media_view_unique&period=lifetime`).catch(
    () => ({ data: [] }) as Insights,
  )
  const chiSo = (ten: string) => xem.data.find((d) => d.name === ten)?.values[0]?.value ?? null

  return {
    camXuc: coCamXuc ? (bai.reactions?.summary.total_count ?? 0) : null,
    binhLuan: coCamXuc ? (bai.comments?.summary.total_count ?? 0) : null,
    chiaSe: bai.shares?.count ?? 0,
    luotXem: chiSo('post_media_view'),
    tiepCan: chiSo('post_total_media_view_unique'),
  }
}
