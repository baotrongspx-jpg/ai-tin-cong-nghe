import 'server-only'

const PHIEN_BAN = process.env.FB_GRAPH_VERSION ?? 'v26.0'

export const coFacebook = () => !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN)

// Đăng một ảnh kèm chú thích lên Fanpage. Gửi thẳng file ảnh (không cần link công khai,
// nên chạy được cả trên máy lẫn trên Vercel).
export async function dangAnhLenPage(anh: Blob, chuThich: string): Promise<string> {
  const form = new FormData()
  form.append('source', anh, 'anh.png')
  form.append('caption', chuThich)
  form.append('access_token', process.env.FB_PAGE_TOKEN!)

  const res = await fetch(`https://graph.facebook.com/${PHIEN_BAN}/${process.env.FB_PAGE_ID}/photos`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  })
  const data = (await res.json()) as { id?: string; post_id?: string; error?: { message: string } }
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `Facebook trả lỗi ${res.status}`)
  return data.post_id ?? data.id ?? ''
}
