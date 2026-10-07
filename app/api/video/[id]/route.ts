import { db, type BaiViet } from '@/lib/db'
import { dungSanVideoBai, linkVideoBai } from '@/lib/video'
import { daDangNhap } from '@/lib/xacThuc'

// Xem trước video TikTok lồng tiếng của một bài (chỉ người đã đăng nhập trang duyệt bài): trả { url } là link tạm
// tải thẳng từ kho (video thường nặng hơn 4,5 MB, quá giới hạn trả về của Vercel).
// Video dựng xong được lưu lại, nên bấm Đăng sau đó dùng đúng video này.
// ?san=1: dựng sẵn trong nền (chỉ giọng VieNeu, không tốn lượt Gemini), trả 204 không kèm video.
export const maxDuration = 300

export async function GET(req: Request, ctx: RouteContext<'/api/video/[id]'>) {
  if (!(await daDangNhap())) return new Response('Chưa đăng nhập', { status: 401 })
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Không tìm thấy', { status: 404 })
  const { data: bai } = await db().from('bai_viet').select('*').eq('id', id).maybeSingle<BaiViet>()
  if (!bai) return new Response('Không tìm thấy', { status: 404 })
  if (new URL(req.url).searchParams.get('san') === '1')
    return dungSanVideoBai(bai).then(
      () => new Response(null, { status: 204 }),
      (e) => new Response(e instanceof Error ? e.message : 'Dựng video lỗi', { status: 503 }),
    )
  try {
    return Response.json({ url: await linkVideoBai(bai) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'Dựng video lỗi', { status: 500 })
  }
}
