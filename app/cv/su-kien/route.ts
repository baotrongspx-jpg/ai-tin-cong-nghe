import { after } from 'next/server'
import { z } from 'zod'
import { guiTelegram, thoat } from '@/lib/telegram'
import { layViTri } from '../duLieu'

// Báo về Telegram khi có người mở trang CV ("mo") và khi họ rời trang ("roi": xem bao lâu, cuộn tới đâu).
// Trình duyệt gửi bằng sendBeacon nên thân yêu cầu là chữ, tự đọc JSON.
const SuKien = z.object({
  loai: z.enum(['mo', 'roi']),
  congTy: z.string().max(80).default(''),
  viTri: z.string().max(40).default(''),
  nguon: z.string().max(200).default(''),
  giay: z.number().min(0).max(86_400).default(0),
  cuon: z.number().min(0).max(100).default(0),
})

// Sự kiện gửi từ JavaScript nên máy xem trước link (Zalo, Facebook) không kích hoạt; chỉ lọc trình duyệt tự động
const MAY_TU_DONG = /bot|crawl|spider|headless|lighthouse|vercel/i

function thietBi(ua: string) {
  const loai = /ipad|tablet/i.test(ua) ? 'Máy tính bảng' : /mobi|android|iphone/i.test(ua) ? 'Điện thoại' : 'Máy tính'
  const tinh = /edg\//i.test(ua) ? 'Edge' : /coc_coc/i.test(ua) ? 'Cốc Cốc' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : /firefox/i.test(ua) ? 'Firefox' : ''
  return [loai, tinh].filter(Boolean).join(' · ')
}

function viTri(h: Headers) {
  const doc = (k: string) => {
    const v = h.get(k)
    try {
      return v ? decodeURIComponent(v) : ''
    } catch {
      return v ?? ''
    }
  }
  return [doc('x-vercel-ip-city'), doc('x-vercel-ip-country')].filter(Boolean).join(', ')
}

const doiThoiGian = (giay: number) =>
  giay < 60 ? `${Math.round(giay)} giây` : `${Math.floor(giay / 60)} phút ${Math.round(giay % 60)} giây`

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? ''
  let tho: unknown = null
  try {
    tho = JSON.parse(await req.text())
  } catch {}
  const duLieu = SuKien.safeParse(tho)
  if (!duLieu.success || MAY_TU_DONG.test(ua)) return new Response(null, { status: 204 })

  const { loai, congTy, viTri: maViTri, nguon, giay, cuon } = duLieu.data
  const banCV = maViTri ? ` (bản CV ${layViTri(maViTri).ten})` : ''
  const ai = congTy ? `<b>${thoat(congTy)}</b>` : 'Một người'

  let tin = ''
  if (loai === 'mo') {
    let tuDau = ''
    try {
      tuDau = nguon ? new URL(nguon).hostname.replace(/^www\./, '') : ''
    } catch {}
    tin =
      `👀 ${ai} vừa mở CV của anh${banCV}\n` +
      [viTri(req.headers) && `📍 ${thoat(viTri(req.headers))}`, `📱 ${thietBi(ua)}`, tuDau && `🔗 Đến từ: ${thoat(tuDau)}`]
        .filter(Boolean)
        .join('\n')
  } else if (giay >= 15) {
    // Xem dưới 15 giây thì thôi, đỡ nhắn nhiều
    tin = `⏱ ${ai} đã xem CV${banCV} <b>${doiThoiGian(giay)}</b>, đọc tới ${Math.round(cuon)}% trang`
  }

  if (tin) after(() => guiTelegram(tin))
  return new Response(null, { status: 204 })
}
