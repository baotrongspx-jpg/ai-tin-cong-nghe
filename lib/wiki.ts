import 'server-only'

// Lấy bài Wikipedia (tiếng Việt + tiếng Anh) về một nhân vật làm nguồn cho phim tiểu sử: AI chỉ được coi là "đã xác
// minh" những gì có trong nguồn. Dùng API công khai của Wikimedia (cần User-Agent riêng theo quy định của họ).
// Người dùng hay gõ kèm mô tả ("trần quốc tuấn vinh danh anh hùng dân tộc", "tiểu sử kfc"), nên: bỏ từ thừa, thử tìm
// theo vài chữ đầu (phần tên), và CHỈ nhận bài mà tiêu đề / đoạn mở đầu có đúng cụm tên đó — tránh lấy nhầm người khác.
const UA = 'CongNghe24H/1.0 (https://ai-tin-cong-nghe-wpy7.vercel.app; phim tieu su)'

export type NguonWiki = { ngon_ngu: string; tieu_de: string; url: string; noi_dung: string }

const boDau = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
// Từ thừa thường gõ kèm tên (so khớp sau khi bỏ dấu)
const TU_THUA = new Set(['tieu', 'su', 'phim', 'cuoc', 'doi', 'cau', 'chuyen', 've', 'hanh', 'trinh', 'video', 'ke', 'lam'])

async function hoi(ngonNgu: string, q: Record<string, string>) {
  const r = await fetch(`https://${ngonNgu}.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...q })}`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(20_000),
  })
  return r.ok ? r.json() : null
}

// Tìm tiêu đề bài đúng người: thử cụm 4, 3, 2 chữ đầu của tên (1 chữ nếu tên chỉ có 1 chữ), nhận bài đầu tiên có
// tiêu đề hoặc đoạn mở đầu chứa đúng cụm đó
async function timTieuDe(ngonNgu: 'vi' | 'en', ten: string, daSua = false): Promise<string | null> {
  const chu = ten.split(/\s+/).filter((w) => w && !TU_THUA.has(boDau(w)))
  if (!chu.length) return null
  const ds = chu.length === 1 ? [1] : [Math.min(4, chu.length), 3, 2].filter((n, i, a) => n <= chu.length && n >= 2 && a.indexOf(n) === i)
  for (const n of ds) {
    const cum = chu.slice(0, n).join(' ')
    const tim = await hoi(ngonNgu, { action: 'query', list: 'search', srsearch: cum, srlimit: '6' })
    const tieuDe: string[] = (tim?.query?.search ?? []).map((x: { title: string }) => x.title)
    if (!tieuDe.length) continue
    const md = await hoi(ngonNgu, { action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exlimit: '20', redirects: '1', titles: tieuDe.join('|') })
    const trang: { title: string; extract?: string }[] = md?.query?.pages ?? []
    const theoThuTu = tieuDe.map((t) => trang.find((p) => p.title === t)).filter((p): p is { title: string; extract?: string } => !!p)
    const can = boDau(cum)
    const dung = theoThuTu.find((p) => boDau(`${p.title} ${(p.extract ?? '').slice(0, 1500)}`).includes(can))
    if (dung) return dung.title
  }
  // Gõ sai tên ("elonmuck"): dùng gợi ý sửa chính tả của Wikipedia rồi thử lại một lần
  if (!daSua) {
    const goiY: string | undefined = (await hoi(ngonNgu, { action: 'query', list: 'search', srsearch: chu.join(' '), srinfo: 'suggestion', srlimit: '1' }))?.query?.searchinfo?.suggestion
    if (goiY && boDau(goiY) !== boDau(chu.join(' '))) return timTieuDe(ngonNgu, goiY, true)
  }
  return null
}

async function layWiki(ngonNgu: 'vi' | 'en', ten: string, toiDa: number): Promise<NguonWiki | null> {
  try {
    const tieuDe = await timTieuDe(ngonNgu, ten)
    if (!tieuDe) return null
    const bai = await hoi(ngonNgu, { action: 'query', prop: 'extracts', explaintext: '1', redirects: '1', titles: tieuDe })
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

// Bài tiếng Việt (dài hơn) + tiếng Anh; không có bài nào đúng người thì trả mảng rỗng
export async function nguonWiki(ten: string) {
  const ds = await Promise.all([layWiki('vi', ten, 24_000), layWiki('en', ten, 16_000)])
  return ds.filter((x): x is NguonWiki => !!x)
}
