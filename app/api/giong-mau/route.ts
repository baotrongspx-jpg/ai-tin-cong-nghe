import { layGiongMau } from '@/lib/giongMau'
import { daDangNhap } from '@/lib/xacThuc'

// Nghe thử giọng đọc (chỉ người đã đăng nhập trang duyệt bài)
export const maxDuration = 120

export async function GET() {
  if (!(await daDangNhap())) return new Response('Chưa đăng nhập', { status: 401 })
  try {
    const mp3 = await layGiongMau()
    return new Response(new Uint8Array(mp3), {
      headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(mp3.length), 'Cache-Control': 'private, max-age=604800' },
    })
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'Lỗi', { status: 500 })
  }
}
