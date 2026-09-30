import sharp from 'sharp'
import { db } from '@/lib/db'
import { veAnhBai } from '@/lib/anh'

// Link ảnh công khai (xem trước, tải ảnh). Chỉ lộ tiêu đề ảnh, không lộ gì khác.
// /anh/<id>.jpg: ảnh JPG cho TikTok (TikTok không nhận PNG).
// ?w=320: ảnh nhỏ WebP cho trang duyệt bài (ảnh gốc 1080px nặng ~120KB, bản nhỏ chỉ vài KB).
// Link có ?v=<tiêu đề|chủ đề|màu> nên đổi nội dung ảnh là đổi link: cho trình duyệt / CDN lưu lâu dài.
const LUU_LAU = 'public, max-age=31536000, immutable'
const CO_CHO_PHEP = [96, 160, 320, 480, 640]

export async function GET(req: Request, ctx: RouteContext<'/anh/[id]'>) {
  const { id: ten } = await ctx.params
  const jpg = ten.endsWith('.jpg')
  const id = jpg ? ten.slice(0, -4) : ten
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Không tìm thấy', { status: 404 })

  const { data } = await db()
    .from('bai_viet')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!data) return new Response('Không tìm thấy', { status: 404 })

  const png = await veAnhBai(data)
  const q = new URL(req.url).searchParams
  const w = Number(q.get('w'))
  const luu = q.has('v') ? LUU_LAU : 'public, max-age=300'

  if (jpg) {
    const anh = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 92 }).toBuffer()
    return new Response(new Uint8Array(anh), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300' },
    })
  }
  if (CO_CHO_PHEP.includes(w)) {
    const anh = await sharp(Buffer.from(await png.arrayBuffer())).resize(w).webp({ quality: 80 }).toBuffer()
    return new Response(new Uint8Array(anh), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': luu } })
  }
  return new Response(png.body, { headers: { 'Content-Type': 'image/png', 'Cache-Control': luu } })
}
