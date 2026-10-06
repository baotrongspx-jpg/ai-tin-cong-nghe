import { layGiongMau } from '@/lib/giongMau'
import { daDangNhap } from '@/lib/xacThuc'

// Nghe thử một giọng đọc (chỉ người đã đăng nhập trang duyệt bài)
export const maxDuration = 120

export async function GET(_req: Request, ctx: RouteContext<'/api/giong-mau/[ma]'>) {
  if (!(await daDangNhap())) return new Response('Chưa đăng nhập', { status: 401 })
  const { ma } = await ctx.params
  try {
    const mp3 = await layGiongMau(ma)
    return new Response(new Uint8Array(mp3), {
      headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(mp3.length), 'Cache-Control': 'private, max-age=604800' },
    })
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'Lỗi', { status: 500 })
  }
}
