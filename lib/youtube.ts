import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { db, type BaiViet } from './db'
import { vietDanYYouTube, vietPhanYouTube, type LoiThoai } from './ai'
import {
  dongGoiYouTube, hoSoHinhAnh, nghienCuuNhanVat, phanCanhChuong, phatTrienCauChuyen, thietKeNhanVatChinh, vietPhanPhim, TAO_HINH_MAC_DINH,
  type CanhPhim, type CauChuyen, type CauPhim, type DongGoi, type HoSoHinhAnh, type NghienCuu, type TaoHinh,
} from './aiPhim'
import { nguonWiki } from './wiki'
import { NHAN_VAT } from './hoatHinh'
import { dsNhac } from './nhacNen'
import { kiemDinh, type KetQuaKiemDinh } from './kiemDinh'

// Video YouTube dài (trang /youtube): hoạt hình Mèo Mun & Robot Bit, khung ngang 16:9, dài tới ~20 phút.
// Mỗi dự án là một tệp youtube/<id>/du-an.json trong kho (không cần thêm bảng). AI viết dàn ý chia phần (~3 phút
// mỗi phần) rồi viết lời thoại từng phần; máy nhà (may-nha/tho_doc.py) dựng từng phần, đủ phần thì ghép thành một
// video và chỉ lưu trên máy nhà (Desktop\Video-YouTube), vì video dài quá nặng để gửi lên kho.
// Máy nhà báo kết quả: youtube/<id>/phan-<k>.json ({ xong, ma } hoặc { loi, ma }), tien-do.json, xong.json.
const KHO = 'video-tiktok'
const PHIEN_BAN = 8 // tăng khi đổi cách dựng để các phần dựng lại (2: thẻ minh hoạ / đạo cụ khung ngang; 3: giọng Mèo Mun; 4: nhịp chuyển cảnh mượt; 5: thẻ chương, màn kết, B-roll; 6: khung người kể, 7: người kể vẽ riêng, 8: nhân vật chính phim tiểu sử)
const kho = () => db().storage.from(KHO)
const thuMuc = (id: string) => `youtube/${id}`
const tenViec = (id: string, k: number) => `yt-${id}-${k}.json`

// Mỗi phần ~3 phút; giọng VieNeu đọc khoảng 4,5 giây một câu thoại (đo trên video thật)
export const PHUT_MOI_PHAN = 3
export const soPhanCho = (phut: number) => Math.min(8, Math.max(1, Math.round(phut / PHUT_MOI_PHAN)))
export const DS_PHUT = [3, 5, 10, 15, 20] as const

// Một câu thoại: video thường (Mèo & Bit + nhân vật phụ) hoặc phim tiểu sử (thêm người kể, thẻ năm / nơi, cờ tái hiện)
export type CauYT = Omit<LoiThoai[number], 'ai' | 'nhan_vat_phu'> & {
  ai: CauPhim['ai']
  nhan_vat_phu: CauPhim['nhan_vat_phu']
  tai_hien?: boolean
  the_moc?: string
}
export type PhanYT = {
  tieu_de: string
  noi_dung: string
  nhip?: string
  loi: CauYT[] | null
  moc: { chu: string; bieu_tuong: string } | null
  canh?: CanhPhim[] // phim tiểu sử: phân cảnh + shot + prompt video AI của chương này
  kiem_dinh?: KetQuaKiemDinh // biên tập viên kiểm định (lib/kiemDinh.ts): điểm, ghi chú, những gì đã tự sửa
}
// Phim tiểu sử: kết quả từng giai đoạn sản xuất
export type PhimTieuSu = {
  ten: string
  ghi_chu: string
  tai_lieu: string // tài liệu nguồn người dùng dán vào
  nguon: { tieu_de: string; url: string }[]
  nghien_cuu?: NghienCuu
  cau_chuyen?: CauChuyen
  ho_so?: HoSoHinhAnh
  tao_hinh?: TaoHinh // hình hoạt hình của người được kể (bước "Thiết kế nhân vật chính")
  dong_goi?: DongGoi
}
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
  loai?: 'thuong' | 'tieu_su'
  phim?: PhimTieuSu
  nhac?: string // nhạc nền: tên bài trong thư viện, 'khong' = không nhạc, trống = tự chọn bài đầu tiên
  am_luong_nhac?: number // % (mặc định 30)
}

const bam = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 12)
// Mã một phần: đổi lời thoại / cách dựng thì đổi mã, máy nhà dựng lại phần đó
const maPhan = (d: DuAnYT, k: number) =>
  bam([PHIEN_BAN, d.chu_de, d.phan[k - 1].loi, k === 1 ? d.phan[0].moc : null, ...(d.loai === 'tieu_su' ? [hinhChuong(d, k)] : [])])

// Phim tiểu sử: hình nhân vật chính dùng ở chương k (giai đoạn tuổi có tu_chuong lớn nhất mà <= k)
function hinhChuong(d: DuAnYT, k: number) {
  const th = d.phim?.tao_hinh ?? TAO_HINH_MAC_DINH
  const gd = [...th.giai_doan].sort((a, b) => a.tu_chuong - b.tu_chuong).filter((g, i) => i === 0 || g.tu_chuong <= k).at(-1)!
  return { nhom: th.nhom ?? 'khac', gioi: th.gioi, da: th.da, ...gd }
}
// Giọng nhân vật chính theo giới tính (giọng kể chuyện còn trống trong bộ VieNeu)
const GIONG_CHINH = { nam: 'Thiện Minh', nu: 'Mỹ Duyên' } as const

// Lời thoại + nhân vật gửi máy nhà. Phim tiểu sử: thêm nhân vật chính (hình theo chương, giọng theo giới tính); câu người
// kể không có ai trên sân khấu thì cho nhân vật chính đứng diễn (người xem luôn thấy người đang được kể)
function loiThoaiGui(d: DuAnYT, k: number) {
  const p = d.phan[k - 1]
  const goc = { kho: 'ngang', kenh: 'Công Nghệ 24H', chu_de: d.chu_de, moc: k === 1 ? p.moc : null, the_chuong: { so: k, ten: p.tieu_de }, man_ket: k === d.phan.length }
  if (d.loai !== 'tieu_su' || !d.phim) return { ...goc, nhan_vat: NHAN_VAT, loi: p.loi }
  const hinh = hinhChuong(d, k)
  return {
    ...goc,
    nhan_vat: { ...NHAN_VAT, nhan_vat_chinh: { ten: d.phim.ten, giong: GIONG_CHINH[hinh.gioi] } },
    nhan_vat_chinh: { ten: d.phim.ten, hinh },
    loi: (p.loi ?? []).map((l) => (l.ai === 'nguoi_ke' && (!l.nhan_vat_phu || l.nhan_vat_phu === 'khong') ? { ...l, nhan_vat_phu: 'nhan_vat_chinh' } : l)),
  }
}

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
    phan: dy.phan.map((p) => ({ tieu_de: p.tieu_de, noi_dung: p.noi_dung, nhip: p.nhip, loi: null, moc: null })),
  }
  await luuDuAn(d)
  return d
}

// AI viết (hoặc viết lại) lời thoại phần k (1, 2...); nối mạch theo vài câu cuối của phần trước
export async function vietLoiPhan(id: string, k: number) {
  const d = await docDuAn(id)
  if (!d || !d.phan[k - 1]) throw new Error('Không tìm thấy phần này')
  const truoc = d.phan[k - 2]?.loi ?? []
  const giay = (d.phut / d.phan.length) * 60
  const noiTiep = truoc.slice(-4).map((l) => `${l.ai}: ${l.chu}`)
  const kb =
    d.loai === 'tieu_su' && d.phim?.nghien_cuu && d.phim.cau_chuyen
      ? await vietPhanPhim({ ten: d.phim.ten, nghienCuu: d.phim.nghien_cuu, cauChuyen: d.phim.cau_chuyen, k, soCau: Math.round(giay / 5.5), noiTiep })
      : await vietPhanYouTube({ nguon: d.nguon_chu, danY: d, k, soCau: Math.round(giay / 4.5), noiTiep })
  if (!kb) throw new Error(`AI chưa viết được phần ${k}, thử lại sau ít phút`)
  // Biên tập viên kiểm định: tự sửa nhịp hình ảnh, chấm điểm, ghi chú
  const { loi, ...kd } = kiemDinh(kb.loi as CauYT[], { loai: d.loai })
  // Đọc lại ngay trước khi lưu: lúc AI viết, phần khác có thể vừa được lưu
  const moi = (await docDuAn(id)) ?? d
  moi.phan[k - 1] = { ...moi.phan[k - 1], loi, moc: kb.moc, canh: undefined, kiem_dinh: kd } // lời đổi thì phân cảnh cũ không còn đúng
  await luuDuAn(moi)
  return moi
}

// Cho biên tập viên kiểm định chạy lại trên lời thoại đang có (phần viết trước khi có bước này): tự sửa + chấm điểm
export async function kiemDinhLaiPhan(id: string, k: number) {
  const d = await docDuAn(id)
  const p = d?.phan[k - 1]
  if (!d || !p?.loi) throw new Error('Phần này chưa có lời thoại')
  const { loi, ...kd } = kiemDinh(p.loi, { loai: d.loai })
  const doi = JSON.stringify(loi) !== JSON.stringify(p.loi)
  d.phan[k - 1] = { ...p, loi, kiem_dinh: kd, canh: doi ? undefined : p.canh }
  await luuDuAn(d)
  return d
}

// Ảnh bìa: chữ to (phim tiểu sử: chữ AI đề xuất ở bước đóng gói; video thường: vế đầu của tiêu đề), bối cảnh hay gặp
// nhất ở phần 1 làm nền, có người kể thì người kể đứng giữa. Máy nhà vẽ khi ghép xong (hoat-hinh/tao_anh_bia.mjs).
function anhBia(d: DuAnYT) {
  const vat = (x: string) => x.replace(/[#\p{Extended_Pictographic}️]/gu, '').replace(/\s+/g, ' ').trim()
  const tuTieuDe = vat(d.tieu_de.replace(/^Phim tiểu sử:\s*/i, '')).split(/\s*[:|–—]\s+|\s+-\s+/)[0]
  const chu = vat(d.phim?.dong_goi?.thumbnail[0]?.chu ?? '') || tuTieuDe.split(' ').slice(0, 8).join(' ')
  const dem: Record<string, number> = {}
  for (const l of d.phan[0]?.loi ?? []) dem[l.boi_canh] = (dem[l.boi_canh] ?? 0) + 1
  const boi_canh = Object.entries(dem).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'truong_quay'
  // Phim tiểu sử: nhân vật chính (hình giai đoạn cuối, lúc nổi tiếng nhất) đứng giữa thay cho người kể
  const nhan_vat_chinh = d.loai === 'tieu_su' && d.phim ? hinhChuong(d, d.phan.length) : null
  return { chu, chu_de: d.chu_de, kenh: 'Công Nghệ 24H', boi_canh, nguoi_ke: !nhan_vat_chinh && d.phan.some((p) => p.loi?.some((l) => l.ai === 'nguoi_ke')), nhan_vat_chinh }
}

// Bài nhạc nền sẽ dùng: bài đã chọn (nếu còn trong thư viện), không chọn thì bài đầu tiên; 'khong' thì không nhạc
export async function nhacCuaDuAn(d: DuAnYT) {
  if (d.nhac === 'khong') return null
  const ds = await dsNhac().catch(() => [])
  return ds.find((x) => x.ten === d.nhac)?.ten ?? ds[0]?.ten ?? null
}

export async function chonNhacDuAn(id: string, nhac: string, amLuong: number) {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  await luuDuAn({ ...d, nhac, am_luong_nhac: Math.max(5, Math.min(80, Math.round(amLuong))) })
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
// Máy nhà tự kiểm tra video sau khi ghép (may-nha/tho_doc.py: kiem_tra_video)
export type KiemTraVideo = { do_dai: number | null; lufs: number | null; lufs_goc: number | null; da_chinh_am: boolean; im_lang: number[][]; man_den: number[][]; ghi_chu: string[] }
export type TrangThaiDuAn = {
  phan: TrangThaiPhan[]
  xong: { tep: string; kiem_tra?: KiemTraVideo; anh_bia?: { xem: string; tai: string } } | null
  mayNha: string | null
}

// Trạng thái từng phần + video đã ghép (chỉ tính khi khớp mã lời thoại hiện tại)
export async function trangThaiDuAn(d: DuAnYT, mayNha: string | null): Promise<TrangThaiDuAn> {
  const goc = thuMuc(d.id)
  const [{ data: viec }, tienDo, xong, ...kq] = await Promise.all([
    kho().list('hang-doi/viec', { limit: 200, search: `yt-${d.id}` }),
    docJson<{ phan: number; phanTram: number; buoc: string; luc: number }>(`${goc}/tien-do.json`),
    docJson<{ tep: string; ma: string[]; nhac?: string | null; kiem_tra?: KiemTraVideo; anh_bia?: boolean }>(`${goc}/xong.json`),
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
  const nhacChon = await nhacCuaDuAn(d)
  const khop = xong && xong.ma.length === ma.length && xong.ma.every((m, i) => m === ma[i]) && (xong.nhac ?? null) === nhacChon
  let daGhep: TrangThaiDuAn['xong'] = null
  if (khop) {
    daGhep = { tep: xong.tep, kiem_tra: xong.kiem_tra }
    if (xong.anh_bia) {
      const [xem, tai] = await Promise.all([
        kho().createSignedUrl(`${goc}/anh-bia.png`, 3600),
        kho().createSignedUrl(`${goc}/anh-bia.png`, 3600, { download: 'anh-bia.png' }),
      ])
      if (xem.data && tai.data) daGhep.anh_bia = { xem: xem.data.signedUrl, tai: tai.data.signedUrl }
    }
  }
  return { phan, xong: daGhep, mayNha }
}

// Gửi máy nhà dựng các phần chưa xong (hoặc chỉ phần `chiPhan`). Mọi phần phải có lời thoại: máy nhà cần mã của
// mọi phần để biết khi nào đủ mà ghép.
export async function guiDung(d: DuAnYT, chiPhan?: number) {
  if (d.phan.some((p) => !p.loi)) throw new Error('Còn phần chưa có lời thoại, chờ AI viết xong đã')
  const tt = await trangThaiDuAn(d, null)
  const ma = d.phan.map((_, i) => maPhan(d, i + 1))
  const nhac = { nhac: await nhacCuaDuAn(d), am_luong_nhac: d.am_luong_nhac ?? 30 }
  const can = d.phan
    .map((_, i) => i + 1)
    .filter((k) => (chiPhan ? k === chiPhan : true) && ['chua_dung', 'loi'].includes(tt.phan[k - 1].loai))
  for (const k of can) {
    await kho().remove([`${thuMuc(d.id)}/phan-${k}.json`])
    await ghiJson(`hang-doi/viec/${tenViec(d.id, k)}`, {
      loai: 'youtube',
      du_an: d.id,
      tieu_de: d.tieu_de,
      phan: k,
      ma_phan: ma,
      ...nhac,
      anh_bia: anhBia(d),
      loi_thoai: loiThoaiGui(d, k),
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
      ...nhac,
      anh_bia: anhBia(d),
      loi_thoai: loiThoaiGui(d, k),
    })
    return 1
  }
  return can.length
}

// Xoá dự án khỏi trang (video đã dựng trên máy nhà vẫn giữ)
// Xoá dự án khỏi trang + bỏ các phần đang chờ dựng; gửi lệnh cho máy nhà xoá luôn thư mục video trên máy
export async function xoaDuAn(id: string) {
  const d = await docDuAn(id)
  if (!d) return
  const { data } = await kho().list(thuMuc(id), { limit: 100 })
  await kho().remove([
    ...(data ?? []).map((f) => `${thuMuc(id)}/${f.name}`),
    ...d.phan.map((_, i) => `hang-doi/viec/${tenViec(id, i + 1)}`),
  ])
  await ghiJson(`hang-doi/viec/xoa-${id}.json`, { loai: 'xoa_youtube', du_an: id })
}

// Ước lượng độ dài (giây) theo số chữ của lời thoại (~19 ký tự mỗi giây + nghỉ giữa câu, đo trên video thật)
export const uocGiay = (loi: { chu: string }[] | null) => (loi ? loi.reduce((t, l) => t + l.chu.length / 19 + 0.25, 0) : 0)

// ---------- Phim tiểu sử: tạo dự án rồi chạy lần lượt từng giai đoạn (mỗi giai đoạn một lượt gọi máy chủ) ----------

export async function taoPhim(o: { ten: string; ghiChu: string; taiLieu: string; phut: number }) {
  const ten = o.ten.trim().slice(0, 120)
  if (!ten) throw new Error('Nhập tên nhân vật')
  const phut = DS_PHUT.includes(o.phut as (typeof DS_PHUT)[number]) ? o.phut : 10
  const d: DuAnYT = {
    id: randomUUID(),
    tao_luc: new Date().toISOString(),
    phut,
    nguon: { bai: [], y_tuong: '' },
    nguon_chu: '',
    tieu_de: `Phim tiểu sử: ${ten}`,
    mo_ta: '',
    the: [],
    chu_de: 'Tiểu sử',
    phan: [],
    loai: 'tieu_su',
    phim: { ten, ghi_chu: o.ghiChu.trim().slice(0, 3000), tai_lieu: o.taiLieu.trim().slice(0, 40_000), nguon: [] },
  }
  await luuDuAn(d)
  return d
}

export type BuocPhim = 'nghien_cuu' | 'cau_chuyen' | 'tao_hinh' | 'ho_so' | 'phan_canh' | 'dong_goi'

// Chạy một giai đoạn (phan_canh cần số chương k). Trả dự án đã lưu.
export async function chayBuocPhim(id: string, buoc: BuocPhim, k?: number) {
  const d = await docDuAn(id)
  if (!d?.phim || d.loai !== 'tieu_su') throw new Error('Không tìm thấy phim')
  const p = d.phim
  if (buoc === 'nghien_cuu') {
    const wiki = await nguonWiki(p.ten)
    const ds = [
      ...wiki.map((w, i) => ({ ten: `Nguồn ${i + 1} — Wikipedia ${w.ngon_ngu === 'vi' ? 'tiếng Việt' : 'tiếng Anh'}: ${w.tieu_de} (${w.url})`, chu: w.noi_dung })),
      ...(p.tai_lieu ? [{ ten: `Nguồn ${wiki.length + 1} — Tài liệu chủ kênh cung cấp`, chu: p.tai_lieu }] : []),
    ]
    const kq = await nghienCuuNhanVat(p.ten, p.ghi_chu, ds.map((x) => `<source name="${x.ten}">\n${x.chu}\n</source>`).join('\n\n'))
    if (!kq) throw new Error('AI chưa nghiên cứu được, thử lại sau ít phút')
    p.nghien_cuu = kq
    p.nguon = wiki.map((w) => ({ tieu_de: `Wikipedia (${w.ngon_ngu}): ${w.tieu_de}`, url: w.url }))
  } else if (buoc === 'cau_chuyen') {
    if (!p.nghien_cuu) throw new Error('Chưa có bước nghiên cứu')
    const kq = await phatTrienCauChuyen({ ten: p.ten, ghiChu: p.ghi_chu, nghienCuu: p.nghien_cuu, phut: d.phut, soPhan: soPhanCho(d.phut) })
    if (!kq) throw new Error('AI chưa phát triển được câu chuyện, thử lại sau ít phút')
    p.cau_chuyen = kq
    d.tieu_de = kq.tieu_de.slice(0, 100)
    d.chu_de = kq.chu_de.slice(0, 20) || 'Tiểu sử'
    d.the = kq.the.map((t) => t.replace(/^#/, '').trim()).filter(Boolean).slice(0, 20)
    d.mo_ta = kq.big_idea
    d.phan = kq.phan.map((x) => ({ tieu_de: x.tieu_de, noi_dung: x.noi_dung, nhip: x.nhip, loi: null, moc: null }))
  } else if (buoc === 'tao_hinh') {
    if (!p.nghien_cuu || !p.cau_chuyen) throw new Error('Chưa có nghiên cứu và câu chuyện')
    // AI chưa làm được thì dùng hình mặc định để phim vẫn dựng được; bấm "Thiết kế lại" sau
    p.tao_hinh = (await thietKeNhanVatChinh({ ten: p.ten, nghienCuu: p.nghien_cuu, cauChuyen: p.cau_chuyen })) ?? TAO_HINH_MAC_DINH
  } else if (buoc === 'ho_so') {
    if (!p.nghien_cuu || !p.cau_chuyen) throw new Error('Chưa có nghiên cứu và câu chuyện')
    const kq = await hoSoHinhAnh({ ten: p.ten, nghienCuu: p.nghien_cuu, cauChuyen: p.cau_chuyen })
    if (!kq) throw new Error('AI chưa lập được hồ sơ hình ảnh, thử lại sau ít phút')
    p.ho_so = kq
  } else if (buoc === 'phan_canh') {
    const phan = k ? d.phan[k - 1] : undefined
    if (!k || !phan?.loi || !p.cau_chuyen) throw new Error('Chương này chưa có kịch bản')
    const kq = await phanCanhChuong({ ten: p.ten, hoSo: p.ho_so ?? null, cauChuyen: p.cau_chuyen, k, loi: phan.loi as CauPhim[] })
    if (!kq) throw new Error(`AI chưa phân cảnh được chương ${k}, thử lại sau ít phút`)
    phan.canh = kq
  } else {
    if (!p.nghien_cuu || !p.cau_chuyen || d.phan.some((x) => !x.loi)) throw new Error('Chưa đủ kịch bản để đóng gói')
    const kichBan = d.phan
      .map((x, i) => `## Chương ${i + 1}: ${x.tieu_de}\n${(x.loi ?? []).map((l) => `[${l.ai}] ${l.chu}`).join('\n')}`)
      .join('\n\n')
    const kq = await dongGoiYouTube({ ten: p.ten, nghienCuu: p.nghien_cuu, cauChuyen: p.cau_chuyen, kichBan })
    if (!kq) throw new Error('AI chưa đóng gói được, thử lại sau ít phút')
    p.dong_goi = kq
    d.tieu_de = (kq.top5[0] ?? d.tieu_de).slice(0, 100)
    d.mo_ta = kq.mo_ta
    d.the = [...kq.tu_khoa, ...kq.hashtag.map((h) => h.replace(/^#/, ''))].slice(0, 30)
  }
  // Bước "câu chuyện" đặt lại các chương; bước khác đọc lại bản mới nhất rồi chỉ ghi phần của mình
  // (lúc AI chạy, chương khác có thể vừa được viết / phân cảnh)
  let ketQua = d
  if (buoc !== 'cau_chuyen') {
    const moi = (await docDuAn(id)) ?? d
    ketQua = {
      ...moi,
      tieu_de: d.tieu_de,
      mo_ta: d.mo_ta,
      the: d.the,
      phim: { ...moi.phim!, ...p },
      phan: moi.phan.map((x, i) => (buoc === 'phan_canh' && i === (k ?? 0) - 1 ? { ...x, canh: d.phan[i].canh } : x)),
    }
  }
  await luuDuAn(ketQua)
  return ketQua
}
