import { db } from '@/lib/db'
import { veAnhBai } from '@/lib/anh'

// Link ảnh công khai (xem trước, tải ảnh). Chỉ lộ tiêu đề ảnh, không lộ gì khác.
export async function GET(_req: Request, ctx: RouteContext<'/anh/[id]'>) {
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Không tìm thấy', { status: 404 })

  const { data } = await db()
    .from('bai_viet')
    .select('tieu_de_anh, chu_de, nguon_ten, ngay_bao, tao_luc, mau_anh')
    .eq('id', id)
    .maybeSingle()
  if (!data) return new Response('Không tìm thấy', { status: 404 })

  return veAnhBai(data)
}
