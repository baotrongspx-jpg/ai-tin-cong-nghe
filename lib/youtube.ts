import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { db, type BaiViet } from './db'
import { vietDanYYouTube, vietPhanYouTube, type LoiThoai } from './ai'
import { NHAN_VAT } from './hoatHinh'

// Video YouTube dài (trang /youtube): hoạt hình Mèo Mun & Robot Bit, khung ngang 16:9, dài tới ~20 phút.
// Mỗi dự án là một tệp youtube/<id>/du-an.json trong kho (không cần thêm bảng). AI viết dàn ý chia phần (~3 phút
// mỗi phần) rồi viết lời thoại từng phần; máy nhà (may-nha/tho_doc.py) dựng từng phần, đủ phần thì ghép thành một
// video và chỉ lưu trên máy nhà (Desktop\Video-YouTube), vì video dài quá nặng để gửi lên kho.
// Máy nhà báo kết quả: youtube/<id>/phan-<k>.json ({ xong, ma } hoặc { loi, ma }), tien-do.json, xong.json.
const KHO = 'video-tiktok'
const PHIEN_BAN = 1 // tăng khi đổi cách dựng để các phần dựng lại
const kho = () => db().storage.from(KHO)
const thuMuc = (id: string) => `youtube/${id}`
const tenViec = (id: string, k: number) => `yt-${id}-${k}.json`

// Mỗi phần ~3 phút; giọng VieNeu đọc khoảng 4,5 giây một câu thoại (đo trên video thật)
export const PHUT_MOI_PHAN = 3
export const soPhanCho = (phut: number) => Math.min(8, Math.max(1, Math.round(phut / PHUT_MOI_PHAN)))
export const DS_PHUT = [3, 5, 10, 15, 20] as const

export type PhanYT = { tieu_de: string; noi_dung: string; loi: LoiThoai | null; moc: { chu: string; bieu_tuong: string } | null }
export type DuAnYT = {
  id: string
  tao_luc: string
  phut: number
  nguon: { bai: { id: string; tieu_de: string }[]; y_tuong: string }
  nguon_chu: string // chữ nguồn đưa cho AI (bài báo + ý tưởng), lưu lại để viết lại phần nào cũng được
  tieu_de: string
  mo_ta: string
  the: string[]
  chu_de: string
  phan: PhanYT[]
}

const bam = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 12)
// Mã một phần: đổi lời thoại / cách dựng thì đổi mã, máy nhà dựng lại phần đó
const maPhan = (d: DuAnYT, k: number) => bam([PHIEN_BAN, d.chu_de, d.phan[k - 1].loi, k === 1 ? d.phan[0].moc : null])

async function docJson<T>(duong: string): Promise<T | null> {
  const { data } = await kho().download(duong)
  if (!data) return null
  try {
    return JSON.parse(await data.text()) as T
  } catch {
    return null
  }
}
const ghiJson = async (duong: string, x: unknown) => {
  const { error } = await kho().upload(duong, JSON.stringify(x), { contentType: 'application/json', upsert: true })
  if (error) throw new Error(`Không lưu được vào kho: ${error.message}`)
}

export const docDuAn = (id: string) => (/^[0-9a-f-]{36}$/i.test(id) ? docJson<DuAnYT>(`${thuMuc(id)}/du-an.json`) : Promise.resolve(null))
const luuDuAn = (d: DuAnYT) => ghiJson(`${thuMuc(d.id)}/du-an.json`, d)

export async function dsDuAn() {
  const { data } = await kho().list('youtube', { limit: 100, sortBy: { column: 'name', order: 'asc' } })
  const ds = await Promise.all((data ?? []).filter((f) => !f.id).map((f) => docDuAn(f.name)))
  return ds.filter((d): d is DuAnYT => !!d).sort((a, b) => b.tao_luc.localeCompare(a.tao_luc))
}

// Ghép chữ nguồn: các bài đã chọn (theo thứ tự chọn) + ý tưởng tự viết
function ghepNguon(bai: Pick<BaiViet, 'tieu_de_anh' | 'nguon_ten' | 'noi_dung'>[], yTuong: string) {
  const phan = bai.map((b, i) => `<article ${i + 1}>\nTitle: ${b.tieu_de_anh}\nSource: ${b.nguon_ten}\n\n${b.noi_dung.trim()}\n</article>`)
  if (yTuong.trim()) phan.push(`<owner_idea>\n${yTuong.trim()}\n</owner_idea>`)
  return phan.join('\n\n')
}

// Tạo dự án: AI viết dàn ý (tiêu đề, mô tả, thẻ, nội dung từng phần). Lời thoại từng phần viết sau (vietLoiPhan).
export async function taoDuAn(o: { baiIds: string[]; yTuong: string; phut: number }) {
  const phut = DS_PHUT.includes(o.phut as (typeof DS_PHUT)[number]) ? o.phut : 5
  const yTuong = o.yTuong.slice(0, 8000)
  const baiIds = o.baiIds.slice(0, 15)
  const { data } = baiIds.length ? await db().from('bai_viet').select('id, tieu_de_anh, nguon_ten, noi_dung').in('id', baiIds) : { data: [] }
  const bai = baiIds.map((id) => (data ?? []).find((b) => b.id === id)).filter((b): b is NonNullable<typeof b> => !!b)
  if (!bai.length && !yTuong.trim()) throw new Error('Chọn ít nhất một bài hoặc viết ý tưởng cho video')
  const nguon = ghepNguon(bai, yTuong)
  const soPhan = soPhanCho(phut)
  const dy = await vietDanYYouTube(nguon, phut, soPhan)
  if (!dy) throw new Error('AI chưa lên được dàn ý, thử lại sau ít phút')
  const d: DuAnYT = {
    id: randomUUID(),
    tao_luc: new Date().toISOString(),
    phut,
    nguon: { bai: bai.map((b) => ({ id: b.id, tieu_de: b.tieu_de_anh })), y_tuong: yTuong },
    nguon_chu: nguon,
    tieu_de: dy.tieu_de.slice(0, 100),
    mo_ta: dy.mo_ta,
    the: dy.the.map((t) => t.replace(/^#/, '').trim()).filter(Boolean).slice(0, 20),
    chu_de: dy.chu_de.slice(0, 20) || 'Công nghệ',
    phan: dy.phan.map((p) => ({ tieu_de: p.tieu_de, noi_dung: p.noi_dung, loi: null, moc: null })),
  }
  await luuDuAn(d)
  return d
}

// AI viết (hoặc viết lại) lời thoại phần k (1, 2...); nối mạch theo vài câu cuối của phần trước
export async function vietLoiPhan(id: string, k: number) {
  const d = await docDuAn(id)
  if (!d || !d.phan[k - 1]) throw new Error('Không tìm thấy phần này')
  const truoc = d.phan[k - 2]?.loi ?? []
  const kb = await vietPhanYouTube({
    nguon: d.nguon_chu,
    danY: d,
    k,
    soCau: Math.round(((d.phut / d.phan.length) * 60) / 4.5),
    noiTiep: truoc.slice(-4).map((l) => `${l.ai}: ${l.chu}`),
  })
  if (!kb) throw new Error(`AI chưa viết được phần ${k}, thử lại sau ít phút`)
  // Đọc lại ngay trước khi lưu: lúc AI viết, phần khác có thể vừa được lưu
  const moi = (await docDuAn(id)) ?? d
  moi.phan[k - 1] = { ...moi.phan[k - 1], loi: kb.loi, moc: kb.moc }
  await luuDuAn(moi)
  return moi
}

export async function suaThongTin(id: string, o: { tieu_de: string; mo_ta: string; the: string[] }) {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  await luuDuAn({ ...d, tieu_de: o.tieu_de.slice(0, 100), mo_ta: o.mo_ta.slice(0, 5000), the: o.the.slice(0, 30) })
}

export type TrangThaiPhan =
  | { loai: 'chua_viet' | 'chua_dung' | 'cho' | 'xong' }
  | { loai: 'dang_lam'; phanTram: number; buoc: string }
  | { loai: 'loi'; loi: string }
export type TrangThaiDuAn = { phan: TrangThaiPhan[]; xong: { tep: string } | null; mayNha: string | null }

// Trạng thái từng phần + video đã ghép (chỉ tính khi khớp mã lời thoại hiện tại)
export async function trangThaiDuAn(d: DuAnYT, mayNha: string | null): Promise<TrangThaiDuAn> {
  const goc = thuMuc(d.id)
  const [{ data: viec }, tienDo, xong, ...kq] = await Promise.all([
    kho().list('hang-doi/viec', { limit: 200, search: `yt-${d.id}` }),
    docJson<{ phan: number; phanTram: number; buoc: string; luc: number }>(`${goc}/tien-do.json`),
    docJson<{ tep: string; ma: string[] }>(`${goc}/xong.json`),
    ...d.phan.map((_, i) => docJson<{ xong?: boolean; loi?: string; ma: string }>(`${goc}/phan-${i + 1}.json`)),
  ])
  const dangCho = new Set((viec ?? []).map((f) => f.name))
  const ma = d.phan.map((p, i) => (p.loi ? maPhan(d, i + 1) : ''))
  const phan = d.phan.map((p, i): TrangThaiPhan => {
    const k = i + 1
    if (!p.loi) return { loai: 'chua_viet' }
    const r = kq[i]
    if (r?.ma === ma[i] && r.xong) return { loai: 'xong' }
    if (tienDo?.phan === k && Date.now() - tienDo.luc < 10 * 60_000) return { loai: 'dang_lam', phanTram: tienDo.phanTram, buoc: tienDo.buoc }
    if (dangCho.has(tenViec(d.id, k))) return { loai: 'cho' }
    if (r?.ma === ma[i] && r.loi) return { loai: 'loi', loi: r.loi }
    return { loai: 'chua_dung' }
  })
  const daGhep = xong && xong.ma.length === ma.length && xong.ma.every((m, i) => m === ma[i]) ? { tep: xong.tep } : null
  return { phan, xong: daGhep, mayNha }
}

// Gửi máy nhà dựng các phần chưa xong (hoặc chỉ phần `chiPhan`). Mọi phần phải có lời thoại: máy nhà cần mã của
// mọi phần để biết khi nào đủ mà ghép.
export async function guiDung(d: DuAnYT, chiPhan?: number) {
  if (d.phan.some((p) => !p.loi)) throw new Error('Còn phần chưa có lời thoại, chờ AI viết xong đã')
  const tt = await trangThaiDuAn(d, null)
  const ma = d.phan.map((_, i) => maPhan(d, i + 1))
  const can = d.phan
    .map((_, i) => i + 1)
    .filter((k) => (chiPhan ? k === chiPhan : true) && ['chua_dung', 'loi'].includes(tt.phan[k - 1].loai))
  for (const k of can) {
    const p = d.phan[k - 1]
    await kho().remove([`${thuMuc(d.id)}/phan-${k}.json`])
    await ghiJson(`hang-doi/viec/${tenViec(d.id, k)}`, {
      loai: 'youtube',
      du_an: d.id,
      tieu_de: d.tieu_de,
      phan: k,
      ma_phan: ma,
      loi_thoai: { kho: 'ngang', kenh: 'Công Nghệ 24H', chu_de: d.chu_de, nhan_vat: NHAN_VAT, loi: p.loi, moc: k === 1 ? p.moc : null },
    })
  }
  // Mọi phần đã xong từ trước (vd sửa tiêu đề rồi bấm lại) nhưng chưa ghép: gửi lại phần cuối để máy nhà ghép
  if (!can.length && !chiPhan && !tt.xong && tt.phan.every((p) => p.loai === 'xong')) {
    const k = d.phan.length
    await ghiJson(`hang-doi/viec/${tenViec(d.id, k)}`, {
      loai: 'youtube',
      du_an: d.id,
      tieu_de: d.tieu_de,
      phan: k,
      ma_phan: ma,
      loi_thoai: { kho: 'ngang', kenh: 'Công Nghệ 24H', chu_de: d.chu_de, nhan_vat: NHAN_VAT, loi: d.phan[k - 1].loi, moc: k === 1 ? d.phan[0].moc : null },
    })
    return 1
  }
  return can.length
}

// Xoá dự án khỏi trang (video đã dựng trên máy nhà vẫn giữ)
export async function xoaDuAn(id: string) {
  const d = await docDuAn(id)
  if (!d) return
  const { data } = await kho().list(thuMuc(id), { limit: 100 })
  await kho().remove([
    ...(data ?? []).map((f) => `${thuMuc(id)}/${f.name}`),
    ...d.phan.map((_, i) => `hang-doi/viec/${tenViec(id, i + 1)}`),
  ])
}

// Ước lượng độ dài (giây) theo số chữ của lời thoại (~19 ký tự mỗi giây + nghỉ giữa câu, đo trên video thật)
export const uocGiay = (loi: LoiThoai | null) => (loi ? loi.reduce((t, l) => t + l.chu.length / 19 + 0.25, 0) : 0)
