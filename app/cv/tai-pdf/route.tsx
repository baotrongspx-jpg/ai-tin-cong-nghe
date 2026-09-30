import { renderToBuffer } from '@react-pdf/renderer'
import { layAnhCV } from '@/lib/anhCV'
import { layViTri } from '../duLieu'
import CVPdf from './CVPdf'

// /cv/tai-pdf?vt=<mã vị trí>: tải thẳng file CV PDF, không phải qua hộp thoại in của trình duyệt
export async function GET(req: Request) {
  const url = new URL(req.url)
  const vt = layViTri(url.searchParams.get('vt'))

  // Ảnh chân dung: ảnh chủ trang đã đổi (lưu trong cơ sở dữ liệu), không có thì ảnh mặc định trong /public
  let anh = await layAnhCV().catch(() => null)
  if (!anh) {
    const res = await fetch(new URL('/cv/chan-dung.jpg', url.origin)).catch(() => null)
    anh = res?.ok ? Buffer.from(await res.arrayBuffer()) : null
  }

  const pdf = await renderToBuffer(<CVPdf vt={vt} anh={anh} trangWeb={`${url.origin}/cv`} />)
  const tenFile = `CV-Nong-Bao-Trong-${vt.ten.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/\s+/g, '-')}.pdf`

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${tenFile}"`,
      'Cache-Control': 'no-store',
    },
  })
}
