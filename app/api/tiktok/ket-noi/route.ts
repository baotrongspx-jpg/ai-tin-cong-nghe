import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { daDangNhap } from '@/lib/xacThuc'
import { coTikTok, urlCapQuyen } from '@/lib/tiktok'

// Bấm "Kết nối TikTok" → chuyển sang trang đăng nhập TikTok để cấp quyền đăng bài
export async function GET(req: Request) {
  if (!(await daDangNhap())) return Response.redirect(new URL('/dang-nhap', req.url))
  if (!coTikTok()) return new Response('Chưa cấu hình TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET', { status: 400 })

  const state = randomBytes(16).toString('hex')
  ;(await cookies()).set('tiktok_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 })
  return Response.redirect(urlCapQuyen(state))
}
