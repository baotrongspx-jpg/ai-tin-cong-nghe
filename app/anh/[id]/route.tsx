import sharp from 'sharp'
import { db } from '@/lib/db'
import { veAnhBai } from '@/lib/anh'

// Link ảnh công khai (xem trước, tải ảnh). Chỉ lộ tiêu đề ảnh, không lộ gì khác.
// /anh/<id>.jpg trả ảnh JPG cho TikTok (TikTok không nhận PNG).
export async function GET(_req: Request, ctx: RouteContext<'/anh/[id]'>) {
  const { id: ten } = await ctx.params
  const jpg = ten.endsWith('.jpg')
  const id = jpg ? ten.slice(0, -4) : ten
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Không tìm thấy', { status: 404 })

  const { data } = await db()
    .from('bai_viet')
    .select('tieu_de_anh, chu_de, nguon_ten, ngay_bao, tao_luc, mau_anh')
    .eq('id', id)
    .maybeSingle()
  if (!data) return new Response('Không tìm thấy', { status: 404 })

  const png = await veAnhBai(data)
  if (!jpg) return png

  const anh = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 92 }).toBuffer()
  return new Response(new Uint8Array(anh), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300' },
  })
}
