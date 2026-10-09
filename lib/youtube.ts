import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { db, type BaiViet } from './db'
import { goiJson, vietDanYYouTube, vietPhanYouTube, type LoiThoai } from './ai'
import { z } from 'zod'
import {
  dongGoiYouTube, hoSoHinhAnh, nghienCuuNhanVat, phanCanhChuong, phatTrienCauChuyen, thietKeNhanVatChinh, vietPhanPhim, TAO_HINH_MAC_DINH,
  type CanhPhim, type CauChuyen, type CauPhim, type DongGoi, type HoSoHinhAnh, type NghienCuu, type TaoHinh,
} from './aiPhim'
import { anhWiki, nguonWiki, type AnhWiki } from './wiki'
import { NHAN_VAT } from './hoatHinh'
import { kiemDinh, locLoiChao, type KetQuaKiemDinh } from './kiemDinh'
import { voiPhanBien, type KetQuaPhanBien, type KhauPhanBien } from './phanBien'
import { apBienTap, deBaiBienTap, type DaBienTap, type KetQuaBienTap } from './bienTap'

// Video YouTube dài (trang /youtube): hoạt hình Mèo Mun & Robot Bit, khung ngang 16:9, dài tới ~20 phút.
// Mỗi dự án là một tệp youtube/<id>/du-an.json trong kho (không cần thêm bảng). AI viết dàn ý chia phần (~3 phút
// mỗi phần) rồi viết lời thoại từng phần; máy nhà (may-nha/tho_doc.py) dựng từng phần, đủ phần thì ghép thành một
// video và chỉ lưu trên máy nhà (Desktop\Video-YouTube), vì video dài quá nặng để gửi lên kho.
// Máy nhà báo kết quả: youtube/<id>/phan-<k>.json ({ xong, ma } hoặc { loi, ma }), tien-do.json, xong.json.
const KHO = 'video-tiktok'
const PHIEN_BAN = 16 // tăng khi đổi cách dựng để các phần dựng lại (2: thẻ minh hoạ / đạo cụ khung ngang; 3: giọng Mèo Mun; 4: nhịp chuyển cảnh mượt; 5: thẻ chương, màn kết, B-roll; 6: khung người kể, 7: người kể vẽ riêng, 8: nhân vật chính phim tiểu sử, 9: ảnh Wikipedia, 10: lời giới thiệu + đọc tên chương, ảnh đặt linh động, 11: bố cục chữ không che nhân vật, bỏ ghi nguồn trên ảnh, 12: thanh dòng thời gian, thẻ năm tự thêm, 13: câu móc trước lời chào, màn kết 20 giây, phụ đề .srt, cách đọc tên riêng, 14: biểu cảm, đi vào cảnh, chữ động con số, tiền cảnh, 15: cảnh hành động, 16: bỏ nhạc nền, màn kết 8 giây, nhân vật phụ ở lại theo đợt, lớp sự sống cho bối cảnh)
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
  anh?: number // phim tiểu sử: số thứ tự ảnh Wikipedia (d.phim.anh) hiện trong câu này, -1 = không
}
export type PhanYT = {
  tieu_de: string
  noi_dung: string
  nhip?: string
  loi: CauYT[] | null
  moc: { chu: string; bieu_tuong: string } | null
  canh?: CanhPhim[] // phim tiểu sử: phân cảnh + shot + prompt video AI của chương này
  phan_bien?: KetQuaPhanBien // hội đồng phản biện chấm kịch bản chương này (lib/phanBien.ts)
  phan_bien_canh?: KetQuaPhanBien // … chấm phân cảnh chương này
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
  anh?: AnhWiki[] // ảnh thật từ Wikimedia Commons (giấy phép tự do), ghép vào câu kể hợp nội dung
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
  bien_tap?: DaBienTap // vòng biên tập cả phim (AI máy nhà) đã áp
  phan_bien?: Partial<Record<KhauPhanBien, KetQuaPhanBien>> // hội đồng phản biện chấm từng khâu (dàn ý, nghiên cứu, câu chuyện…)
  ai_cho?: { bien_tap?: string } // phiếu việc AI máy nhà đang chờ (mã phiếu)
  shorts?: { luc: string; doan: { so: number; phan: number; tu: number; den: number; tieu_de: string }[] } // Shorts đã gửi dựng
  phat_am?: string // cách đọc tên riêng, mỗi dòng "Tên = cách đọc" (chỉ đổi chữ đưa vào giọng đọc, phụ đề giữ nguyên)
}

const bam = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 12)
// Mã một phần: đổi lời thoại / cách dựng thì đổi mã, máy nhà dựng lại phần đó
// Mã một phần = băm toàn bộ những gì gửi máy nhà dựng (lời thoại đã chèn lời giới thiệu / tên chương, hình nhân vật
// chính, ảnh, giọng…): đổi bất cứ thứ gì trong đó thì phần đó dựng lại
const maPhan = (d: DuAnYT, k: number) => bam([PHIEN_BAN, loiThoaiGui(d, k)])

// Phim tiểu sử: câu nào hiện ảnh thật nào (chỉ số câu → ảnh). Kịch bản AI viết sau khi có ảnh thì mỗi câu có "anh"
// (số thứ tự ảnh, -1 = không); kịch bản cũ chưa có thì tự rải: ảnh xếp theo năm chia đều cho các chương theo thứ tự,
// mỗi chương tối đa 3 ảnh, đặt vào các câu người kể cách đều nhau (đời người kể theo thời gian nên khớp tương đối)
function anhCuaChuong(d: DuAnYT, k: number): Record<number, AnhWiki> {
  const ds = d.phim?.anh ?? []
  const loi = d.phan[k - 1]?.loi ?? []
  if (!ds.length || !loi.length) return {}
  const kq: Record<number, AnhWiki> = {}
  if (loi.some((l) => typeof l.anh === 'number')) {
    loi.forEach((l, i) => {
      if (typeof l.anh === 'number' && ds[l.anh]) kq[i] = ds[l.anh]
    })
    return kq
  }
  const n = d.phan.length
  const phan = ds.slice(Math.floor(((k - 1) * ds.length) / n), Math.floor((k * ds.length) / n)).slice(0, 3)
  const ke = loi.map((l, i) => (l.ai === 'nguoi_ke' ? i : -1)).filter((i) => i >= 0)
  phan.forEach((a, j) => {
    const i = ke[Math.floor(((j + 0.5) * ke.length) / phan.length)]
    if (i !== undefined) kq[i] = a
  })
  return kq
}

// Phim tiểu sử: hình nhân vật chính dùng ở chương k (giai đoạn tuổi có tu_chuong lớn nhất mà <= k)
function hinhChuong(d: DuAnYT, k: number) {
  const th = d.phim?.tao_hinh ?? TAO_HINH_MAC_DINH
  const gd = [...th.giai_doan].sort((a, b) => a.tu_chuong - b.tu_chuong).filter((g, i) => i === 0 || g.tu_chuong <= k).at(-1)!
  return { nhom: th.nhom ?? 'khac', gioi: th.gioi, da: th.da, ...gd }
}
// Phim tiểu sử: mốc năm đầu / cuối đời nhân vật (từ các mốc đời đã nghiên cứu) — cho thanh dòng thời gian
function namDoi(d: DuAnYT): { tu: number; den: number } | null {
  const nam = (d.phim?.nghien_cuu?.moc_doi ?? []).flatMap((m) => [...`${m.nam} ${m.giai_doan}`.matchAll(/\b(\d{3,4})\b/g)].map((x) => Number(x[1]))).filter((n) => n > 500 && n < 2100)
  return nam.length >= 2 ? { tu: Math.min(...nam), den: Math.max(...nam) } : null
}
// Chuyện xưa (trước thế kỷ 20): nhân vật thuộc nhóm lịch sử / hoàng gia, hoặc đời người bắt đầu trước năm 1850
const laCoDai = (d: DuAnYT) => ['lich_su', 'hoang_gia'].includes(d.phim?.tao_hinh?.nhom ?? '') || (namDoi(d)?.tu ?? 9999) < 1850
// Giọng nhân vật chính theo giới tính (giọng kể chuyện còn trống trong bộ VieNeu)
const GIONG_CHINH = { nam: 'Thiện Minh', nu: 'Mỹ Duyên' } as const

// Lời thoại + nhân vật gửi máy nhà. Phim tiểu sử: thêm nhân vật chính (hình theo chương, giọng theo giới tính); câu người
// kể không có ai trên sân khấu thì cho nhân vật chính đứng diễn (người xem luôn thấy người đang được kể)
function loiThoaiGui(d: DuAnYT, k: number) {
  const p = d.phan[k - 1]
  const phim = d.loai === 'tieu_su' && d.phim ? d.phim : null
  const nhieuPhan = d.phan.length > 1
  // Tên chương AI đặt hay có sẵn "Phần 1: …" — bỏ đi để người kể không đọc "Chương 1. Phần 1"
  const tenChuong = p.tieu_de.replace(/^\s*(phần|chương|tập)\s*\d+\s*[:.\-–—]\s*/i, '').trim() || p.tieu_de
  const goc = {
    kho: 'ngang', kenh: 'Công Nghệ 24H', chu_de: d.chu_de, moc: k === 1 ? p.moc : null, phat_am: bangPhatAm(d.phat_am),
    the_chuong: { so: k, ten: tenChuong, nhan: phim ? 'CHƯƠNG' : 'PHẦN' }, man_ket: k === d.phan.length,
  }
  const hinh = phim ? hinhChuong(d, k) : null
  const anhChuong = phim ? anhCuaChuong(d, k) : {}
  const veAnh = (a: AnhWiki) => ({ anh_wiki: { url: a.url, tac_gia: a.tac_gia, giay_phep: a.giay_phep, nam: a.nam } })
  // Phim xem liền một mạch: bỏ câu chào / hẹn chương sau giữa phim, chương cuối chỉ giữ 2 câu chào kết (lib/kiemDinh.ts)
  const loi: Record<string, unknown>[] = locLoiChao((p.loi ?? []).map((l, i) => ({
    ...l,
    // Phim tiểu sử: câu người kể chưa có ai trên sân khấu thì nhân vật chính đứng diễn
    ...(phim && l.ai === 'nguoi_ke' && (!l.nhan_vat_phu || l.nhan_vat_phu === 'khong') ? { nhan_vat_phu: 'nhan_vat_chinh' } : {}),
    ...(anhChuong[i] ? veAnh(anhChuong[i]) : {}),
  })), k === d.phan.length).loi
  // Câu người kể chèn thêm (không do AI viết): giữ bối cảnh / bảng tin của câu chuyện kế bên cho khỏi đổi cảnh thừa
  const mau = (gan: Record<string, unknown> | undefined, them: Record<string, unknown>) => ({
    ...(gan ?? {}),
    ai: 'nguoi_ke', cam_xuc: 'suy_nghi', dao_cu: 'khong', nhan_vat_phu: 'khong', khung_hinh: 'toan_canh', may_quay: 'dung_yen',
    anh_sang: 'binh_thuong', am_thanh: 'khong', lang: false, chuyen_canh: 'tu_dong', the_moc: '', tai_hien: false, anh: -1,
    minh_hoa: { kieu: 'khong', tu_khoa: '', chu_chinh: '', chu_phu: '', bieu_tuong: '' }, anh_wiki: undefined,
    ...them,
  })
  const cham = (x: string) => (/[.!?…]$/.test(x.trim()) ? x.trim() : `${x.trim()}.`)
  // Người kể đọc tên chương / phần (thẻ chương hiện đúng lúc này) — chỉ khi video có nhiều phần
  const docChuong = nhieuPhan ? [mau(loi[0], { chu: cham(`${phim ? 'Chương' : 'Phần'} ${k}. ${tenChuong}`), la_chuong: true })] : []
  if (k === 1) {
    // Mở đầu: người kể giới thiệu phim kể chuyện gì (dòng chữ móc câu to hiện cùng lúc) → tên chương 1 → vào chuyện
    const chanDung = phim?.anh?.find((a) => a.chinh)
    const tieuDe = d.tieu_de.replace(/^Phim tiểu sử:\s*/i, '').trim()
    const gioiThieu = phim
      ? `Xin chào các bạn, đây là Công Nghệ 24H. Hôm nay, mời bạn cùng nghe câu chuyện về cuộc đời ${phim.ten}${nhieuPhan ? `, qua ${d.phan.length} chương phim` : ''}${tieuDe && tieuDe !== phim.ten ? `: ${cham(tieuDe)}` : '.'}`
      : `Xin chào các bạn, chào mừng đến với Công Nghệ 24H. Hôm nay chúng ta cùng tìm hiểu: ${cham(tieuDe)}`
    const loiGioiThieu = mau(loi[0], {
      chu: gioiThieu,
      cam_xuc: 'vui',
      anh_sang: 'am_ap',
      may_quay: 'day_vao',
      khung_hinh: 'trung_canh',
      gioi_thieu: true,
      ...(phim ? { nhan_vat_phu: 'nhan_vat_chinh' } : {}),
      ...(chanDung ? veAnh(chanDung) : {}),
    })
    // 5 giây đầu quyết định người xem ở lại: câu móc (câu đầu AI viết) mở màn, rồi mới chào + giới thiệu, đọc tên
    // chương 1, vào chuyện
    const moc = loi.shift()
    loi.unshift(...(moc ? [moc] : []), loiGioiThieu, ...docChuong)
  } else loi.unshift(...docChuong)
  if (!phim || !hinh) return { ...goc, nhan_vat: NHAN_VAT, loi }
  // Thẻ năm tự thêm: câu nhắc tới một năm trong đời nhân vật mà AI chưa đặt thẻ (cách thẻ trước ít nhất 4 câu, khác năm
  // đang hiện) → thẻ chỉ ghi năm, để người xem luôn biết đang ở thời điểm nào
  const doi = namDoi(d)
  if (doi) {
    let namHien = 0
    let cachThe = 99
    for (const l of loi) {
      const theCo = typeof l.the_moc === 'string' && l.the_moc ? l.the_moc : ''
      const nam = Number((theCo || String(l.chu ?? '')).match(/\b(\d{3,4})\b/)?.[1] ?? 0)
      const trongDoi = nam >= doi.tu - 5 && nam <= doi.den + 5
      if (theCo) {
        if (trongDoi) namHien = nam
        cachThe = 0
      } else if (trongDoi && nam !== namHien && cachThe >= 4 && !l.la_chuong && !l.gioi_thieu) {
        l.the_moc = String(nam)
        namHien = nam
        cachThe = 0
      } else cachThe++
    }
  }
  return {
    ...goc,
    nhan_vat: { ...NHAN_VAT, nhan_vat_chinh: { ten: phim.ten, giong: GIONG_CHINH[hinh.gioi] } },
    nhan_vat_chinh: { ten: phim.ten, hinh },
    dong_thoi_gian: doi,
    loi,
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
  const { kq: dy, pb } = await voiPhanBien('dan_y', `Video YouTube hoạt hình ${phut} phút, ${soPhan} phần, từ nguồn:\n${nguon.slice(0, 2500)}`, () => vietDanYYouTube(nguon, phut, soPhan), (x) => JSON.stringify(x))
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
    ...(pb ? { phan_bien: { dan_y: pb } } : {}),
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
  // Nối mạch: 6 câu cuối chương trước (đã bỏ câu chào / hẹn chương sau) để chương này viết tiếp liền mạch
  const noiTiep = locLoiChao(truoc, false).loi.slice(-6).map((l) => `${l.ai}: ${l.chu}`)
  const phim = d.loai === 'tieu_su' && d.phim?.nghien_cuu && d.phim.cau_chuyen ? d.phim : null
  const viet = (): Promise<{ loi: CauYT[]; moc: { chu: string; bieu_tuong: string } } | null> =>
    phim
      ? vietPhanPhim({ ten: phim.ten, nghienCuu: phim.nghien_cuu!, cauChuyen: phim.cau_chuyen!, k, soCau: Math.round(giay / 5.5), noiTiep, anh: phim.anh ?? [] })
      : vietPhanYouTube({ nguon: d.nguon_chu, danY: d, k, soCau: Math.round(giay / 4.5), noiTiep })
  // Hội đồng phản biện chấm kịch bản chương; điểm thấp thì viết lại một lần theo góp ý
  const nguCanh = `${phim ? `Phim tiểu sử hoạt hình về ${phim.ten}` : `Video hoạt hình: ${d.tieu_de}`}, ${d.phut} phút, ${d.phan.length} ${phim ? 'chương' : 'phần'}. Đang chấm ${phim ? 'chương' : 'phần'} ${k}: "${d.phan[k - 1].tieu_de}" — ${d.phan[k - 1].noi_dung}${phim?.cau_chuyen ? `\nBig idea: ${phim.cau_chuyen.big_idea}` : ''}${noiTiep.length ? `\nCuối chương trước:\n${noiTiep.join('\n')}` : ''}`
  const { kq: kb, pb } = await voiPhanBien(
    'kich_ban',
    nguCanh,
    viet,
    (x) =>
      x.loi
        .map((l) => {
          const c = l as CauYT & { hanh_dong?: string }
          return `[${c.ai}|${c.cam_xuc}|${c.boi_canh}|${c.nhan_vat_phu}${c.hanh_dong && c.hanh_dong !== 'khong' ? `|${c.hanh_dong}` : ''}${c.tai_hien ? '|tái hiện' : ''}] ${c.chu}`
        })
        .join('\n'),
    { conGiay: 120 },
  )
  if (!kb) throw new Error(`AI chưa viết được phần ${k}, thử lại sau ít phút`)
  // Biên tập viên kiểm định: tự sửa nhịp hình ảnh, chấm điểm, ghi chú
  const { loi, ...kd } = kiemDinh(kb.loi as CauYT[], { loai: d.loai, laCuoi: k === d.phan.length, coDai: laCoDai(d) })
  // Đọc lại ngay trước khi lưu: lúc AI viết, phần khác có thể vừa được lưu
  const moi = (await docDuAn(id)) ?? d
  moi.phan[k - 1] = { ...moi.phan[k - 1], loi, moc: kb.moc, canh: undefined, kiem_dinh: kd, phan_bien: pb ?? undefined, phan_bien_canh: undefined } // lời đổi thì phân cảnh cũ không còn đúng
  await luuDuAn(moi)
  return moi
}

// Cho biên tập viên kiểm định chạy lại trên lời thoại đang có (phần viết trước khi có bước này): tự sửa + chấm điểm
// Vòng biên tập cả phim (lib/bienTap.ts). Gemini làm trước (chất lượng tốt, xong ngay, 1 lượt mỗi phim); Gemini hết lượt
// thì gửi phiếu việc cho AI máy nhà (may-nha/ai_may_nha.py, miễn phí, ~10 phút) — trang chi tiết hỏi lại mỗi vài giây,
// máy nhà làm xong thì áp chỗ sửa. Chỗ sửa chỉ được áp khi nguyên văn câu cũ khớp (apBienTap). Trả trạng thái để trang hiện.
const KetQuaBienTapSchema = z.object({
  nhan_xet: z.string(),
  sua: z.array(z.object({ chuong: z.number().int(), cau: z.number().int(), cu: z.string(), kieu: z.enum(['sua', 'xoa']), chu: z.string(), ly_do: z.string() })),
})
// Áp kết quả biên tập vào dự án (đọc bản mới nhất), kiểm định lại chương có sửa, ghi nhật ký
async function apVaoDuAn(id: string, ketQua: KetQuaBienTap, nguon: 'gemini' | 'may_nha', boCho: boolean) {
  const moi = (await docDuAn(id))!
  if (boCho) moi.ai_cho = { ...moi.ai_cho, bien_tap: undefined }
  const ap = apBienTap(moi.phan.map((x) => x.loi ?? []), ketQua)
  moi.phan = moi.phan.map((x, i) => {
    if (!x.loi || !ap.chi_tiet.some((c) => c.chuong === i + 1)) return x
    // Chương có sửa: kiểm định lại (điểm, ghi chú) trên lời mới; lời đổi thì phân cảnh cũ không còn đúng
    const { loi, ...kd } = kiemDinh(ap.phan[i] as CauYT[], { loai: moi.loai, laCuoi: i === moi.phan.length - 1, coDai: laCoDai(moi) })
    return { ...x, loi, kiem_dinh: kd, canh: undefined }
  })
  moi.bien_tap = { luc: new Date().toISOString(), nguon, nhan_xet: ketQua.nhan_xet, chi_tiet: ap.chi_tiet }
  await luuDuAn(moi)
  return moi
}
export type TrangThaiBienTap = { trang_thai: 'cho' | 'xong' | 'loi'; loi?: string; duAn: DuAnYT }
export async function bienTapPhim(id: string, batDauLai = false): Promise<TrangThaiBienTap> {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  const ma = d.ai_cho?.bien_tap
  if (ma && !batDauLai) {
    const kq = await docJson<{ text?: string; loi?: string }>(`hang-doi/xong/${ma}.json`)
    if (!kq) return { trang_thai: 'cho', duAn: d }
    await kho().remove([`hang-doi/xong/${ma}.json`])
    let ketQua: KetQuaBienTap | null = null
    try {
      const j = KetQuaBienTapSchema.safeParse(JSON.parse(kq.text ?? 'null'))
      if (j.success) ketQua = j.data
    } catch {}
    if (!ketQua) {
      const moi = (await docDuAn(id)) ?? d
      moi.ai_cho = { ...moi.ai_cho, bien_tap: undefined }
      await luuDuAn(moi)
      return { trang_thai: 'loi', loi: kq.loi ?? 'AI máy nhà trả kết quả sai dạng, bấm biên tập lại', duAn: moi }
    }
    return { trang_thai: 'xong', duAn: await apVaoDuAn(id, ketQua, 'may_nha', true) }
  }
  if (!d.phan.length || d.phan.some((x) => !x.loi)) throw new Error('Còn chương chưa có kịch bản, chờ AI viết xong đã')
  const de = deBaiBienTap({ ten: d.tieu_de, loai: d.loai, phan: d.phan.map((x) => ({ tieu_de: x.tieu_de, loi: locLoiChao(x.loi ?? [], false).loi })) })
  // Gemini trước
  const gemini = await goiJson({ system: de.system, noiDung: de.noiDung, kiemTra: KetQuaBienTapSchema, schema: de.schema, effort: 'low' }).catch(() => null)
  if (gemini) {
    // Kịch bản đưa AI đã bỏ câu chào giữa phim: lưu bản đó trước để chỉ số / nguyên văn câu khớp khi áp
    const sach = (await docDuAn(id)) ?? d
    sach.phan = sach.phan.map((x, i) => (x.loi ? { ...x, loi: locLoiChao(x.loi, i === sach.phan.length - 1).loi } : x))
    await luuDuAn(sach)
    return { trang_thai: 'xong', duAn: await apVaoDuAn(id, gemini, 'gemini', false) }
  }
  // Gemini hết lượt / lỗi: nhờ AI máy nhà
  const maMoi = `ai-${id}-bt-${Date.now()}`
  await ghiJson(`hang-doi/viec/${maMoi}.json`, { loai: 'ai', system: de.system, noi_dung: de.noiDung, schema: de.schema })
  const moi = (await docDuAn(id)) ?? d
  moi.ai_cho = { ...moi.ai_cho, bien_tap: maMoi }
  // Kịch bản đưa AI đã bỏ câu chào giữa phim: lưu luôn bản đó để chỉ số câu AI trả về khớp
  moi.phan = moi.phan.map((x, i) => (x.loi ? { ...x, loi: locLoiChao(x.loi, i === moi.phan.length - 1).loi } : x))
  await luuDuAn(moi)
  return { trang_thai: 'cho', duAn: moi }
}

export async function kiemDinhLaiPhan(id: string, k: number) {
  const d = await docDuAn(id)
  const p = d?.phan[k - 1]
  if (!d || !p?.loi) throw new Error('Phần này chưa có lời thoại')
  const { loi, ...kd } = kiemDinh(p.loi, { loai: d.loai, laCuoi: k === d.phan.length, coDai: laCoDai(d) })
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
  // Ảnh bìa kiểu 3: ảnh chân dung thật (Wikimedia Commons) của nhân vật
  const anh_that = d.loai === 'tieu_su' ? (d.phim?.anh?.find((a) => a.chinh)?.url ?? null) : null
  return { chu, chu_de: d.chu_de, kenh: 'Công Nghệ 24H', boi_canh, nguoi_ke: !nhan_vat_chinh && d.phan.some((p) => p.loi?.some((l) => l.ai === 'nguoi_ke')), nhan_vat_chinh, anh_that }
}

// "Tên = cách đọc" mỗi dòng → [[tên, cách đọc]]
export function bangPhatAm(chu?: string): [string, string][] {
  return (chu ?? '')
    .split('\n')
    .map((d) => d.split('=').map((x) => x.trim()))
    .filter((x): x is [string, string] => x.length === 2 && !!x[0] && !!x[1])
    .slice(0, 100)
}
export async function luuPhatAm(id: string, phatAm: string) {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  await luuDuAn({ ...d, phat_am: phatAm.slice(0, 5000) })
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
  xong: { tep: string; kiem_tra?: KiemTraVideo; anh_bia?: { xem: string; tai: string }[]; moc_chuong?: number[]; phu_de?: string } | null
  mayNha: string | null
}

// Trạng thái từng phần + video đã ghép (chỉ tính khi khớp mã lời thoại hiện tại)
export async function trangThaiDuAn(d: DuAnYT, mayNha: string | null): Promise<TrangThaiDuAn> {
  const goc = thuMuc(d.id)
  const [{ data: viec }, tienDo, xong, ...kq] = await Promise.all([
    kho().list('hang-doi/viec', { limit: 200, search: `yt-${d.id}` }),
    docJson<{ phan: number; phanTram: number; buoc: string; luc: number }>(`${goc}/tien-do.json`),
    docJson<{ tep: string; ma: string[]; nhac?: string | null; kiem_tra?: KiemTraVideo; anh_bia?: boolean | number; moc_chuong?: number[]; phu_de?: boolean }>(`${goc}/xong.json`),
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
  const khop = xong && xong.ma.length === ma.length && xong.ma.every((m, i) => m === ma[i]) && !xong.nhac
  let daGhep: TrangThaiDuAn['xong'] = null
  if (khop) {
    daGhep = { tep: xong.tep, kiem_tra: xong.kiem_tra, moc_chuong: xong.moc_chuong }
    if (xong.phu_de) {
      const { data } = await kho().createSignedUrl(`${goc}/phu-de.srt`, 3600, { download: 'phu-de.srt' })
      if (data) daGhep.phu_de = data.signedUrl
    }
    // Ảnh bìa: bản cũ ghi true (1 ảnh), bản mới ghi số ảnh (3 kiểu)
    const soAnh = xong.anh_bia === true ? 1 : typeof xong.anh_bia === 'number' ? xong.anh_bia : 0
    if (soAnh) {
      const ten = ['anh-bia.png', 'anh-bia-2.png', 'anh-bia-3.png'].slice(0, Math.max(1, soAnh))
      const ds = await Promise.all(
        ten.map(async (t) => {
          const [xem, tai] = await Promise.all([kho().createSignedUrl(`${goc}/${t}`, 3600), kho().createSignedUrl(`${goc}/${t}`, 3600, { download: t })])
          return xem.data && tai.data ? { xem: xem.data.signedUrl, tai: tai.data.signedUrl } : null
        }),
      )
      daGhep.anh_bia = ds.filter((x): x is { xem: string; tai: string } => !!x)
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
  // Video YouTube không ghép nhạc nền (chỉ giọng đọc + âm thanh cảnh)
  const nhac = { nhac: null }
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
// ── Shorts: 3 đoạn gay cấn nhất (25-55 giây) dựng lại ở khung dọc 9:16 ──
// Chấm điểm từng câu: cảm xúc mạnh, khoảng lặng, cảnh hành động, con số, nhân vật chính nói, tái hiện; bỏ câu chào /
// giới thiệu / đọc tên chương. Cửa sổ câu liền nhau trong một chương có tổng điểm cao nhất, không chồng nhau.
type CauGui = Record<string, unknown> & { ai?: string; chu?: string }
function diemCau(l: CauGui) {
  if (l.la_chuong || l.gioi_thieu) return -99
  let d = 0
  if (['bat_ngo', 'buon', 'tuc_gian'].includes(String(l.cam_xuc))) d += 2
  if (l.cam_xuc === 'lo_lang') d += 1
  if (l.lang) d += 2
  if (l.hanh_dong && l.hanh_dong !== 'khong') d += 2
  if (/\d/.test(String(l.chu))) d += 1
  if (l.ai === 'nhan_vat_chinh') d += 2
  if (l.tai_hien) d += 1
  if (l.anh_wiki) d += 1
  return d
}
export function chonDoanShorts(d: DuAnYT) {
  const ung: { phan: number; tu: number; den: number; diem: number }[] = []
  d.phan.forEach((_, i) => {
    const loi = loiThoaiGui(d, i + 1).loi as CauGui[]
    for (let tu = 0; tu < loi.length; tu++) {
      let giay = 0
      let diem = 0
      for (let den = tu; den < loi.length; den++) {
        const dc = diemCau(loi[den])
        if (dc < 0) break
        giay += String(loi[den].chu ?? '').length / 19 + 0.25
        diem += dc
        if (giay > 55) break
        if (giay >= 25) ung.push({ phan: i + 1, tu, den, diem: diem / Math.sqrt(den - tu + 1) })
      }
    }
  })
  const chon: typeof ung = []
  for (const u of ung.sort((a, b) => b.diem - a.diem)) {
    if (chon.length === 3) break
    if (chon.some((c) => c.phan === u.phan && !(u.den < c.tu || u.tu > c.den))) continue
    chon.push(u)
  }
  return chon.sort((a, b) => a.phan - b.phan || a.tu - b.tu)
}
export async function taoShorts(id: string) {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  if (d.phan.some((p) => !p.loi)) throw new Error('Còn chương chưa có kịch bản')
  const doan = chonDoanShorts(d)
  if (!doan.length) throw new Error('Không tìm được đoạn đủ dài để làm Shorts')
  const ds: NonNullable<DuAnYT['shorts']>['doan'] = []
  for (const [n, c] of doan.entries()) {
    const { phieu, tieuDe } = phieuShort(d, c, n + 1)
    const so = n + 1
    await kho().remove([`${thuMuc(id)}/short-${so}.json`])
    await ghiJson(`hang-doi/viec/yts-${id}-${so}.json`, phieu)
    ds.push({ so, phan: c.phan, tu: c.tu + 1, den: c.den + 1, tieu_de: tieuDe })
  }
  const moi = (await docDuAn(id)) ?? d
  moi.shorts = { luc: new Date().toISOString(), doan: ds }
  await luuDuAn(moi)
  return moi
}
// Phiếu dựng một Shorts: lời thoại đoạn đã chọn (khung dọc) + chữ móc câu + câu kết mời xem bản đầy đủ
export function phieuShort(d: DuAnYT, c: { phan: number; tu: number; den: number }, so: number) {
  const goc = loiThoaiGui(d, c.phan)
  const loi = (goc.loi as CauGui[]).slice(c.tu, c.den + 1)
  const dauNhat = loi.reduce((a, b) => (diemCau(b) > diemCau(a) ? b : a), loi[0])
  const bang = (dauNhat.bang ?? {}) as { chu?: string; bieu_tuong?: string }
  const tieuDe = (bang.chu || d.tieu_de).split(/\s+/).slice(0, 8).join(' ')
  // Câu kết mời xem bản đầy đủ (Mèo Mun)
  const ket = { ...loi[loi.length - 1], ai: 'meo', chu: 'Muốn biết chuyện gì xảy ra tiếp theo? Xem trọn câu chuyện trên kênh Công Nghệ 24H nhé!', cam_xuc: 'vui', dao_cu: 'khong', nhan_vat_phu: 'khong', anh_wiki: undefined, hanh_dong: 'khong', la_chuong: false, the_moc: '', lang: false, minh_hoa: { kieu: 'khong', tu_khoa: '', chu_chinh: '', chu_phu: '', bieu_tuong: '' } }
  const phieu = {
    loai: 'youtube_short',
    du_an: d.id,
    so,
    tieu_de: d.tieu_de,
    loi_thoai: { ...goc, kho: 'doc', loi: [...loi, ket], moc: { chu: tieuDe, bieu_tuong: bang.bieu_tuong || '🎬' }, the_chuong: null, man_ket: false },
  }
  return { phieu, tieuDe }
}
export type TrangThaiShort = { so: number; trang_thai: 'cho' | 'dang_lam' | 'xong' | 'loi'; tep?: string; loi?: string; phan_tram?: number }
export async function trangThaiShorts(d: DuAnYT): Promise<TrangThaiShort[]> {
  if (!d.shorts) return []
  const goc = thuMuc(d.id)
  const [{ data: viec }, tienDo, ...kq] = await Promise.all([
    kho().list('hang-doi/viec', { limit: 200, search: `yts-${d.id}` }),
    docJson<{ so: number; phanTram: number; luc: number }>(`${goc}/tien-do-short.json`),
    ...d.shorts.doan.map((x) => docJson<{ tep?: string; loi?: string }>(`${goc}/short-${x.so}.json`)),
  ])
  const cho = new Set((viec ?? []).map((f) => f.name))
  return d.shorts.doan.map((x, i) => {
    const r = kq[i]
    if (r?.tep) return { so: x.so, trang_thai: 'xong', tep: r.tep }
    if (r?.loi) return { so: x.so, trang_thai: 'loi', loi: r.loi }
    if (tienDo?.so === x.so && Date.now() - tienDo.luc < 10 * 60_000) return { so: x.so, trang_thai: 'dang_lam', phan_tram: tienDo.phanTram }
    return { so: x.so, trang_thai: cho.has(`yts-${d.id}-${x.so}.json`) ? 'cho' : 'loi', loi: cho.has(`yts-${d.id}-${x.so}.json`) ? undefined : 'Mất phiếu việc, bấm tạo lại' }
  })
}

export async function xoaDuAn(id: string) {
  const d = await docDuAn(id)
  if (!d) return
  const { data } = await kho().list(thuMuc(id), { limit: 100 })
  await kho().remove([
    ...(data ?? []).map((f) => `${thuMuc(id)}/${f.name}`),
    ...d.phan.map((_, i) => `hang-doi/viec/${tenViec(id, i + 1)}`),
    ...[1, 2, 3].map((so) => `hang-doi/viec/yts-${id}-${so}.json`),
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

export type BuocPhim = 'nghien_cuu' | 'lay_anh' | 'cau_chuyen' | 'tao_hinh' | 'ho_so' | 'phan_canh' | 'dong_goi'

// Chạy một giai đoạn (phan_canh cần số chương k). Trả dự án đã lưu.
export async function chayBuocPhim(id: string, buoc: BuocPhim, k?: number) {
  const d = await docDuAn(id)
  if (!d?.phim || d.loai !== 'tieu_su') throw new Error('Không tìm thấy phim')
  const p = d.phim
  // Hội đồng phản biện: ngữ cảnh chung + nơi ghi kết quả từng khâu
  const nguCanh = `Phim tiểu sử hoạt hình về ${p.ten}, ${d.phut} phút${p.ghi_chu ? `. Ghi chú của chủ kênh: ${p.ghi_chu.slice(0, 500)}` : ''}${p.cau_chuyen ? `\nTiêu đề: ${d.tieu_de}\nBig idea: ${p.cau_chuyen.big_idea}` : ''}`
  const pbMoi: Partial<Record<KhauPhanBien, KetQuaPhanBien>> = {}
  const json = (x: unknown) => JSON.stringify(x)
  if (buoc === 'nghien_cuu') {
    const [wiki, anh] = await Promise.all([nguonWiki(p.ten), anhWiki(p.ten).catch(() => [])])
    p.anh = anh
    const ds = [
      ...wiki.map((w, i) => ({ ten: `Nguồn ${i + 1} — Wikipedia ${w.ngon_ngu === 'vi' ? 'tiếng Việt' : 'tiếng Anh'}: ${w.tieu_de} (${w.url})`, chu: w.noi_dung })),
      ...(p.tai_lieu ? [{ ten: `Nguồn ${wiki.length + 1} — Tài liệu chủ kênh cung cấp`, chu: p.tai_lieu }] : []),
    ]
    const { kq, pb } = await voiPhanBien('nghien_cuu', nguCanh, () => nghienCuuNhanVat(p.ten, p.ghi_chu, ds.map((x) => `<source name="${x.ten}">\n${x.chu}\n</source>`).join('\n\n')), json)
    if (!kq) throw new Error('AI chưa nghiên cứu được, thử lại sau ít phút')
    if (pb) pbMoi.nghien_cuu = pb
    p.nghien_cuu = kq
    p.nguon = wiki.map((w) => ({ tieu_de: `Wikipedia (${w.ngon_ngu}): ${w.tieu_de}`, url: w.url }))
  } else if (buoc === 'cau_chuyen') {
    if (!p.nghien_cuu) throw new Error('Chưa có bước nghiên cứu')
    const nc = p.nghien_cuu
    const { kq, pb } = await voiPhanBien('cau_chuyen', nguCanh, () => phatTrienCauChuyen({ ten: p.ten, ghiChu: p.ghi_chu, nghienCuu: nc, phut: d.phut, soPhan: soPhanCho(d.phut) }), json)
    if (!kq) throw new Error('AI chưa phát triển được câu chuyện, thử lại sau ít phút')
    if (pb) pbMoi.cau_chuyen = pb
    p.cau_chuyen = kq
    d.tieu_de = kq.tieu_de.slice(0, 100)
    d.chu_de = kq.chu_de.slice(0, 20) || 'Tiểu sử'
    d.the = kq.the.map((t) => t.replace(/^#/, '').trim()).filter(Boolean).slice(0, 20)
    d.mo_ta = kq.big_idea
    d.phan = kq.phan.map((x) => ({ tieu_de: x.tieu_de, noi_dung: x.noi_dung, nhip: x.nhip, loi: null, moc: null }))
  } else if (buoc === 'lay_anh') {
    // Không gọi AI: lấy ảnh trong bài Wikipedia (phim nghiên cứu trước khi có bước này, hoặc bấm "Lấy lại ảnh")
    p.anh = await anhWiki(p.ten)
  } else if (buoc === 'tao_hinh') {
    if (!p.nghien_cuu || !p.cau_chuyen) throw new Error('Chưa có nghiên cứu và câu chuyện')
    // AI chưa làm được thì dùng hình mặc định để phim vẫn dựng được; bấm "Thiết kế lại" sau
    const nc = p.nghien_cuu
    const cc = p.cau_chuyen
    const { kq, pb } = await voiPhanBien('tao_hinh', nguCanh, () => thietKeNhanVatChinh({ ten: p.ten, nghienCuu: nc, cauChuyen: cc }), json)
    p.tao_hinh = kq ?? TAO_HINH_MAC_DINH
    if (pb) pbMoi.tao_hinh = pb
  } else if (buoc === 'ho_so') {
    if (!p.nghien_cuu || !p.cau_chuyen) throw new Error('Chưa có nghiên cứu và câu chuyện')
    const nc = p.nghien_cuu
    const cc = p.cau_chuyen
    const { kq, pb } = await voiPhanBien('ho_so', nguCanh, () => hoSoHinhAnh({ ten: p.ten, nghienCuu: nc, cauChuyen: cc }), json)
    if (!kq) throw new Error('AI chưa lập được hồ sơ hình ảnh, thử lại sau ít phút')
    if (pb) pbMoi.ho_so = pb
    p.ho_so = kq
  } else if (buoc === 'phan_canh') {
    const phan = k ? d.phan[k - 1] : undefined
    if (!k || !phan?.loi || !p.cau_chuyen) throw new Error('Chương này chưa có kịch bản')
    const cc = p.cau_chuyen
    const loiChuong = phan.loi as CauPhim[]
    const { kq, pb } = await voiPhanBien('phan_canh', `${nguCanh}\nChương ${k}: ${phan.tieu_de}`, () => phanCanhChuong({ ten: p.ten, hoSo: p.ho_so ?? null, cauChuyen: cc, k, loi: loiChuong }), json)
    if (!kq) throw new Error(`AI chưa phân cảnh được chương ${k}, thử lại sau ít phút`)
    phan.canh = kq
    phan.phan_bien_canh = pb ?? undefined
  } else {
    if (!p.nghien_cuu || !p.cau_chuyen || d.phan.some((x) => !x.loi)) throw new Error('Chưa đủ kịch bản để đóng gói')
    const kichBan = d.phan
      .map((x, i) => `## Chương ${i + 1}: ${x.tieu_de}\n${(x.loi ?? []).map((l) => `[${l.ai}] ${l.chu}`).join('\n')}`)
      .join('\n\n')
    const nc = p.nghien_cuu
    const cc = p.cau_chuyen
    const { kq, pb } = await voiPhanBien('dong_goi', nguCanh, () => dongGoiYouTube({ ten: p.ten, nghienCuu: nc, cauChuyen: cc, kichBan }), json)
    if (!kq) throw new Error('AI chưa đóng gói được, thử lại sau ít phút')
    if (pb) pbMoi.dong_goi = pb
    p.dong_goi = kq
    d.tieu_de = (kq.top5[0] ?? d.tieu_de).slice(0, 100)
    d.mo_ta = kq.mo_ta
    d.the = [...kq.tu_khoa, ...kq.hashtag.map((h) => h.replace(/^#/, ''))].slice(0, 30)
  }
  // Bước "câu chuyện" đặt lại các chương; bước khác đọc lại bản mới nhất rồi chỉ ghi phần của mình
  // (lúc AI chạy, chương khác có thể vừa được viết / phân cảnh)
  d.phan_bien = { ...d.phan_bien, ...pbMoi }
  let ketQua = d
  if (buoc !== 'cau_chuyen') {
    const moi = (await docDuAn(id)) ?? d
    ketQua = {
      ...moi,
      tieu_de: d.tieu_de,
      mo_ta: d.mo_ta,
      the: d.the,
      phim: { ...moi.phim!, ...p },
      phan_bien: { ...moi.phan_bien, ...pbMoi },
      phan: moi.phan.map((x, i) => (buoc === 'phan_canh' && i === (k ?? 0) - 1 ? { ...x, canh: d.phan[i].canh, phan_bien_canh: d.phan[i].phan_bien_canh } : x)),
    }
  }
  await luuDuAn(ketQua)
  return ketQua
}
