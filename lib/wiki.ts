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

// ---------- Ảnh trong bài: chỉ ảnh trên Wikimedia Commons (kho chỉ nhận ảnh giấy phép tự do / phạm vi công cộng) ----------
// Bỏ ảnh SVG, ảnh nhỏ, cờ, logo, chữ ký, bản đồ, huy hiệu, biểu tượng. Mỗi ảnh giữ: link ảnh thu nhỏ rộng 1280, trang
// nguồn, tác giả, giấy phép (để ghi nguồn trên video và trong mô tả YouTube), năm chụp, mô tả.
export type AnhWiki = { url: string; nguon: string; ten_tep: string; tac_gia: string; giay_phep: string; nam: string; mo_ta: string; chinh?: boolean }
const BO_ANH = /flag|logo|signature|chữ[_ ]ký|chu[_ ]ky|icon|map|bản[_ ]đồ|coat[_ ]of[_ ]arms|seal|emblem|huy[_ ]hiệu|symbol|commons-|wiki|disambig|question|edit-|ambox|portal|stub|padlock|audio|speaker/i
const boThe = (s: string) =>
  s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim()

async function anhCuaBai(ngonNgu: 'vi' | 'en', tieuDe: string): Promise<AnhWiki[]> {
  const [ds, chinh] = await Promise.all([
    hoi(ngonNgu, {
      action: 'query', titles: tieuDe, redirects: '1', generator: 'images', gimlimit: '60',
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1280',
    }),
    hoi(ngonNgu, { action: 'query', titles: tieuDe, redirects: '1', prop: 'pageimages', piprop: 'name' }),
  ])
  const tenChinh: string | undefined = chinh?.query?.pages?.[0]?.pageimage
  type Trang = { title: string; imagerepository?: string; imageinfo?: { url: string; thumburl?: string; descriptionurl: string; width: number; height: number; mime: string; extmetadata?: Record<string, { value: string }> }[] }
  const kq: AnhWiki[] = []
  for (const t of (ds?.query?.pages ?? []) as Trang[]) {
    const ii = t.imageinfo?.[0]
    if (!ii || t.imagerepository !== 'shared') continue // chỉ ảnh trên Commons
    if (!/^image\/(jpeg|png|webp)$/.test(ii.mime) || ii.width < 400 || ii.height < 300 || BO_ANH.test(t.title)) continue
    const m = ii.extmetadata ?? {}
    const giayPhep = boThe(m.LicenseShortName?.value ?? '')
    if (!giayPhep || /non-?free|fair use/i.test(giayPhep)) continue
    const ngay = boThe(m.DateTimeOriginal?.value ?? '')
    const tenTep = t.title.replace(/^[^:]+:/, '')
    kq.push({
      url: ii.thumburl ?? ii.url,
      nguon: ii.descriptionurl,
      ten_tep: tenTep,
      tac_gia: boThe(m.Artist?.value ?? '').slice(0, 80) || 'Không rõ',
      giay_phep: giayPhep,
      nam: ngay.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[1] ?? '',
      mo_ta: (boThe(m.ImageDescription?.value ?? '') || tenTep.replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')).slice(0, 200),
      chinh: !!tenChinh && tenTep.replace(/ /g, '_') === tenChinh.replace(/ /g, '_'),
    })
  }
  return kq
}

// Ảnh của nhân vật từ bài vi + en (bỏ trùng), ảnh chân dung chính của bài lên đầu, rồi theo năm; tối đa 16 ảnh
export async function anhWiki(ten: string): Promise<AnhWiki[]> {
  const bai = await Promise.all((['vi', 'en'] as const).map(async (ng) => ({ ng, tieuDe: await timTieuDe(ng, ten).catch(() => null) })))
  const ds = (await Promise.all(bai.filter((b) => b.tieuDe).map((b) => anhCuaBai(b.ng, b.tieuDe!).catch(() => [])))).flat()
  const daCo = new Set<string>()
  const kq = ds.filter((a) => !daCo.has(a.ten_tep) && daCo.add(a.ten_tep))
  return kq.sort((a, b) => Number(!!b.chinh) - Number(!!a.chinh) || (a.nam || '9999').localeCompare(b.nam || '9999')).slice(0, 16)
}

// Bài tiếng Việt (dài hơn) + tiếng Anh; không có bài nào đúng người thì trả mảng rỗng
export async function nguonWiki(ten: string) {
  const ds = await Promise.all([layWiki('vi', ten, 24_000), layWiki('en', ten, 16_000)])
  return ds.filter((x): x is NguonWiki => !!x)
}
