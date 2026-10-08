import 'server-only'

// Lấy bài Wikipedia (tiếng Việt + tiếng Anh) về một nhân vật làm nguồn cho phim tiểu sử: AI chỉ được coi là "đã xác
// minh" những gì có trong nguồn. Dùng API công khai của Wikimedia (cần User-Agent riêng theo quy định của họ).
const UA = 'CongNghe24H/1.0 (https://ai-tin-cong-nghe-wpy7.vercel.app; phim tieu su)'

export type NguonWiki = { ngon_ngu: string; tieu_de: string; url: string; noi_dung: string }

async function layWiki(ngonNgu: 'vi' | 'en', ten: string, toiDa: number): Promise<NguonWiki | null> {
  const goc = `https://${ngonNgu}.wikipedia.org/w/api.php`
  const hoi = (q: Record<string, string>) =>
    fetch(`${goc}?${new URLSearchParams({ format: 'json', formatversion: '2', ...q })}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(20_000),
    }).then((r) => (r.ok ? r.json() : null))
  try {
    const tim = await hoi({ action: 'query', list: 'search', srsearch: ten, srlimit: '1' })
    const tieuDe: string | undefined = tim?.query?.search?.[0]?.title
    if (!tieuDe) return null
    const bai = await hoi({ action: 'query', prop: 'extracts', explaintext: '1', redirects: '1', titles: tieuDe })
    const trang = bai?.query?.pages?.[0]
    const noiDung: string = (trang?.extract ?? '').replace(/\n{3,}/g, '\n\n').trim()
    if (noiDung.length < 300) return null
    return {
      ngon_ngu: ngonNgu,
      tieu_de: trang.title,
      url: `https://${ngonNgu}.wikipedia.org/wiki/${encodeURIComponent(trang.title.replace(/ /g, '_'))}`,
      noi_dung: noiDung.slice(0, toiDa),
    }
  } catch {
    return null
  }
}

// Bài tiếng Việt (dài hơn) + tiếng Anh; không có bài nào thì trả mảng rỗng
export async function nguonWiki(ten: string) {
  const ds = await Promise.all([layWiki('vi', ten, 24_000), layWiki('en', ten, 16_000)])
  return ds.filter((x): x is NguonWiki => !!x)
}
