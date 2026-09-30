import { cookies } from 'next/headers'
import { daDangNhap } from '@/lib/xacThuc'
import { luuTokenTuMa } from '@/lib/tiktok'

// TikTok chuyển về đây sau khi cấp quyền: đổi mã lấy token, lưu vào Supabase
export async function GET(req: Request) {
  if (!(await daDangNhap())) return Response.redirect(new URL('/dang-nhap', req.url))

  const q = new URL(req.url).searchParams
  const kho = await cookies()
  const state = kho.get('tiktok_state')?.value
  kho.delete('tiktok_state')

  const code = q.get('code')
  if (!code || !state || q.get('state') !== state) {
    return new Response(`Kết nối TikTok thất bại: ${q.get('error_description') ?? q.get('error') ?? 'sai mã xác nhận'}`, {
      status: 400,
    })
  }
  try {
    await luuTokenTuMa(code)
  } catch (e) {
    return new Response(e instanceof Error ? e.message : String(e), { status: 500 })
  }
  return Response.redirect(new URL('/', req.url))
}
