import 'server-only'
import { decodeHTML as giaiMa } from 'entities'

// Tải trang báo và lấy phần chữ chính (các đoạn <p>). Trả '' nếu không đọc được.
export async function docNoiDungBai(url: string, toiDa = 15_000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (tin-cong-nghe-bot)' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return ''
    let html = await res.text()
    html = html.replace(/<(script|style|noscript|svg|figure|aside|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    // Ưu tiên thẻ <article> nếu trang có
    const article = html.match(/<article[\s\S]*<\/article>/i)?.[0] ?? html
    const doan = [...article.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => giaiMa(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 40)
    return doan.join('\n\n').slice(0, toiDa)
  } catch {
    return ''
  }
}
