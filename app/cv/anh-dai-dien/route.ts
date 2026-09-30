import { ANH_MAC_DINH, layAnhCV } from '@/lib/anhCV'

// Ảnh đại diện CV do chủ trang tải lên. Link có ?v= (đổi mỗi lần thay ảnh) nên cho trình duyệt nhớ lâu.
export async function GET(req: Request) {
  const anh = await layAnhCV()
  if (!anh) return Response.redirect(new URL(ANH_MAC_DINH, req.url), 307)
  const coPhien = new URL(req.url).searchParams.has('v')
  return new Response(new Uint8Array(anh), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': coPhien ? 'public, max-age=31536000, immutable' : 'no-cache',
    },
  })
}
