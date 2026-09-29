import 'server-only'
import Parser from 'rss-parser'
import { decodeHTML } from 'entities'

// Thêm / bớt nguồn tin ở đây
export const NGUON_TIN = [
  { ten: 'VnExpress', url: 'https://vnexpress.net/rss/so-hoa.rss' },
  { ten: 'Tuổi Trẻ', url: 'https://tuoitre.vn/rss/nhip-song-so.rss' },
  { ten: 'Thanh Niên', url: 'https://thanhnien.vn/rss/cong-nghe.rss' },
  { ten: 'Dân trí', url: 'https://dantri.com.vn/rss/cong-nghe.rss' },
  { ten: 'GenK', url: 'https://genk.vn/rss/home.rss' },
  { ten: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { ten: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
]

export type TinRss = {
  nguon: string
  tieuDe: string
  link: string
  tomTat: string
  ngay: Date | null
}

const parser = new Parser({
  timeout: 20_000,
  headers: { 'User-Agent': 'Mozilla/5.0 (tin-cong-nghe-bot)' },
})

// Một số báo để sót mã HTML trong RSS (VD "tr&ecirc;n")
const boTheHtml = (s: string) =>
  decodeHTML(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

// Lấy tin trong `soGio` giờ gần nhất từ mọi nguồn. Nguồn lỗi thì bỏ qua.
export async function layTinMoi(soGio = 24): Promise<TinRss[]> {
  const moc = Date.now() - soGio * 3600_000
  const ketQua = await Promise.allSettled(
    NGUON_TIN.map(async (n) => {
      const feed = await parser.parseURL(n.url)
      return feed.items.slice(0, 30).map((it): TinRss => {
        const ngay = it.isoDate ? new Date(it.isoDate) : it.pubDate ? new Date(it.pubDate) : null
        return {
          nguon: n.ten,
          tieuDe: boTheHtml(it.title ?? ''),
          link: (it.link ?? '').trim(),
          tomTat: boTheHtml(it.contentSnippet ?? it.content ?? it.summary ?? '').slice(0, 300),
          ngay: ngay && !isNaN(ngay.getTime()) ? ngay : null,
        }
      })
    }),
  )

  const tin: TinRss[] = []
  ketQua.forEach((kq, i) => {
    if (kq.status === 'fulfilled') tin.push(...kq.value)
    else console.error(`Lỗi đọc RSS ${NGUON_TIN[i].ten}:`, kq.reason)
  })
  return tin.filter((t) => t.tieuDe && t.link && (!t.ngay || t.ngay.getTime() >= moc))
}
