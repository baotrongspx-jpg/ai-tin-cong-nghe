import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { db, type BaiViet } from './db'
import { chinhTaTieuDe, goiJson, vietDanYYouTube, vietPhanYouTube, type AnhBiaGoiY, type LoiThoai } from './ai'
import { z } from 'zod'
import {
  dongGoiYouTube, hoSoHinhAnh, nghienCuuNhanVat, phanCanhChuong, phatTrienCauChuyen, thietKeNhanVatChinh, vietPhanPhim, TAO_HINH_MAC_DINH,
  type CanhPhim, type CauChuyen, type CauPhim, type DongGoi, type HoSoHinhAnh, type NghienCuu, type TaoHinh,
} from './aiPhim'
import { anhWiki, nguonWiki, type AnhWiki } from './wiki'
import { NHAN_VAT } from './hoatHinh'
import { kiemDinh, locLoiChao, type KetQuaKiemDinh } from './kiemDinh'
import { chuGopY, phanBien, voiPhanBien, type KetQuaPhanBien, type KhauPhanBien } from './phanBien'
import { suaKichBan } from './suaKichBan'
import { bienTapDat, hoiDongDat, khauChuaDat, loiBienTap } from './datChuan'
import { apBienTap, deBaiBienTap, type DaBienTap, type KetQuaBienTap } from './bienTap'
import { batNhacNen, dsNhac } from './nhacNen'
import { veAnhGemini } from './veAnhNen'
import { THU_VIEN_HANH_DONG, emojiCua, emojiGoc, type CauHanhDong, type HinhCan, type PhanTichHanhDong } from './thuVienHanhDong'

// Video YouTube dài (trang /youtube): hoạt hình Mèo Mun & Robot Bit, khung ngang 16:9, dài tới ~20 phút.
// Mỗi dự án là một tệp youtube/<id>/du-an.json trong kho (không cần thêm bảng). AI viết dàn ý chia phần (~3 phút
// mỗi phần) rồi viết lời thoại từng phần; máy nhà (may-nha/tho_doc.py) dựng từng phần, đủ phần thì ghép thành một
// video và chỉ lưu trên máy nhà (Desktop\Video-YouTube), vì video dài quá nặng để gửi lên kho.
// Máy nhà báo kết quả: youtube/<id>/phan-<k>.json ({ xong, ma } hoặc { loi, ma }), tien-do.json, xong.json.
const KHO = 'video-tiktok'
const PHIEN_BAN = 23 // tăng khi đổi cách dựng để các phần dựng lại (2: thẻ minh hoạ / đạo cụ khung ngang; 3: giọng Mèo Mun; 4: nhịp chuyển cảnh mượt; 5: thẻ chương, màn kết, B-roll; 6: khung người kể, 7: người kể vẽ riêng, 8: nhân vật chính phim tiểu sử, 9: ảnh Wikipedia, 10: lời giới thiệu + đọc tên chương, ảnh đặt linh động, 11: bố cục chữ không che nhân vật, bỏ ghi nguồn trên ảnh, 12: thanh dòng thời gian, thẻ năm tự thêm, 13: câu móc trước lời chào, màn kết 20 giây, phụ đề .srt, cách đọc tên riêng, 14: biểu cảm, đi vào cảnh, chữ động con số, tiền cảnh, 15: cảnh hành động, 16: bỏ nhạc nền, màn kết 8 giây, nhân vật phụ ở lại theo đợt, lớp sự sống cho bối cảnh, 17: nhân vật hết nhiệm vụ rời đi trước khi người mới vào, 18: ảnh nền Pixabay theo cảnh, 19: tranh nền hoạt hình, Mèo / Bit dạt xa suốt cụm có hai nhân vật phụ (hết đè nhau), 20: Mèo Mun đọc lời mời đăng ký ở màn kết, 21: bỏ ghim cờ trên áo nhân vật, 22: Mèo / Bit dạt theo người đang đứng trên sân khấu, máy quay cận theo chỗ họ đứng, 23: màn hình gọn (bảng tin chỉ khi đổi cảnh, khung người kể một lần, bỏ nhãn chủ đề, phụ đề nhỏ), lời kể nền rõ nét, mở đầu vào thẳng chuyện)
const kho = () => db().storage.from(KHO)
const thuMuc = (id: string) => `youtube/${id}`
// Phiên bản máy nhà mới nhất (may-nha/tho_doc.py: BAN_MAY_NHA)
const BAN_MAY_NHA = 6
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
  dia_diem?: string // phim tiểu sử: mã địa điểm trong hồ sơ (LOC_xx) của cảnh chứa câu này, "" = không thuộc địa điểm nào (ganDiaDiem)
  anh?: number // phim tiểu sử: số thứ tự ảnh Wikipedia (d.phim.anh) hiện trong câu này, -1 = không
  hanh_dong_chot?: boolean // hành động do chủ trang chốt ở bước chuẩn bị (máy dựng ưu tiên hơn tự đoán từ chữ)
  logo?: { ten: string; mau: string; chu: string }[] // huy hiệu thương hiệu câu nhắc tới (chuẩn bị hành động)
  vat_them?: string[] // đạo cụ phụ (emoji) người diễn cầm thêm ở tay còn trống trong câu này (chuẩn bị hành động)
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
  nen?: Record<string, { tep: string; luc: number; nho?: boolean }> // nho: có ảnh xem trước nhỏ <mã>-nho.jpg — ảnh nền chủ trang tải lên theo địa điểm hồ sơ (mã LOC → tệp ở youtube/<id>/nen/)
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
  hanh_dong?: PhanTichHanhDong // AI chuẩn bị hành động nhân vật cho từng câu trước khi dựng (lib/thuVienHanhDong.ts)
  duyet?: { luc: string; ma: string } // chủ trang duyệt kịch bản (ma = maKichBan lúc duyệt; kịch bản đổi thì phải duyệt lại)
  phat_am?: string // cách đọc tên riêng, mỗi dòng "Tên = cách đọc" (chỉ đổi chữ đưa vào giọng đọc, phụ đề giữ nguyên)
  anh_bia_goi_y?: AnhBiaGoiY[] // 3 ý ảnh bìa AI đề xuất ở bước dàn ý (chữ 2-4 từ, emoji, nhân vật lớn)
  anh_bia_chu?: string // chữ trên ảnh bìa chủ trang tự đặt (ưu tiên hơn gợi ý)
  anh_bia_chon?: number // kiểu ảnh bìa chủ trang chọn làm ảnh chính (0 = kiểu 1)
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
    // Dự án từ 15/10/2026 (phim cũ giữ nguyên để khỏi dựng lại): ảnh phải ĐÚNG THỜI ĐIỂM câu đang kể — phim Jensen Huang
    // dùng ảnh Denny's chụp 2023 cho chuyện 1978 / 1993, ảnh 2025 cho năm 2006. Năm câu đang kể = năm nhắc trong câu,
    // không có thì năm nhắc trong 3 câu trước đó; ảnh chụp sau đó quá 3 năm thì bỏ (trừ câu nói về "ngày nay").
    // Một ảnh chỉ dùng cho một đoạn câu liền nhau trong chương (không quay lại ảnh cũ ở câu khác).
    const loc = d.tao_luc >= '2026-10-15T05:00'
    const namCua = (l: CauYT) => [...`${l.chu ?? ''} ${(l as { the_moc?: string }).the_moc ?? ''}`.matchAll(/\b(1[89]\d\d|20\d\d)\b/g)].map((m) => +m[1])
    let namDang = 0
    let lucNam = -99
    {
      const truocDo = d.phan.slice(0, k - 1).flatMap((p) => p.loi ?? []).slice(-3)
      truocDo.forEach((l, j) => {
        if (namCua(l).length) {
          namDang = namCua(l).at(-1)!
          lucNam = j - truocDo.length
        }
      })
    }
    let truoc = -1
    const daDung = new Set<number>()
    loi.forEach((l, i) => {
      const nam = namCua(l)
      if (nam.length) {
        namDang = nam.at(-1)!
        lucNam = i
      }
      if (typeof l.anh !== 'number' || !ds[l.anh]) return
      if (loc) {
        const namAnh = Number(String(ds[l.anh].nam).match(/\b(1[89]\d\d|20\d\d)\b/)?.[1] ?? 0)
        const homNay = /ngày nay|hiện nay|hôm nay|bây giờ|năm nay|hiện tại/i.test(l.chu ?? '')
        const moc = nam.length ? Math.max(...nam) : i - lucNam <= 3 ? namDang : 0
        if (namAnh && moc && namAnh > moc + 3 && !homNay) return
        if (daDung.has(l.anh) && truoc !== l.anh) return
      }
      kq[i] = ds[l.anh]
      daDung.add(l.anh)
      truoc = l.anh
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
// Giới tính nhân vật chính (hình vẽ + giọng), kiểm lúc thiết kế nhân vật (bước tao_hinh; phim đã dựng giữ nguyên). AI
// thiết kế đôi khi chọn nhầm, còn hình mặc định (AI lỗi) luôn là nam → đối chiếu với cách lời kể / tư liệu gọi người này: "bà / cô ấy / nữ / mẹ / vợ" hay "ông / anh ấy / cha / chồng". Chứng cứ rõ
// (ít nhất 3 lần và gấp đôi phía kia) thì theo chứng cứ, không thì giữ lựa chọn của AI.
function gioiPhim(d: DuAnYT, th: TaoHinh): 'nam' | 'nu' {
  const nc = d.phim?.nghien_cuu
  const chu = [
    nc?.ho_so.gia_dinh, nc?.ho_so.nghe_nghiep,
    ...(nc?.moc_doi ?? []).map((m) => m.su_kien),
    ...(nc?.su_that ?? []).map((s) => s.noi_dung),
    ...d.phan.flatMap((p) => (p.loi ?? []).filter((l) => l.ai === 'nguoi_ke').map((l) => l.chu)),
  ].filter(Boolean).join(' . ').toLowerCase()
  const dem = (re: RegExp) => chu.match(re)?.length ?? 0
  const sau = '(?= (ấy|ta|đã|là|vẫn|không|cũng|bắt đầu|được|bị|quyết|từng|luôn|sinh|mất|qua đời|lại|chỉ|đang|sẽ|có|nói|kể|viết|trở thành|rời|đến|tới))'
  const nu = dem(new RegExp(`(^|[^\\p{L}])(bà|cô)${sau}`, 'gu')) + dem(/nữ (hoàng|tướng|khoa học gia|nhà|ca sĩ|diễn viên|doanh nhân|vận động viên)|người phụ nữ|con gái (duy nhất|út|cả)/gu)
  const nam = dem(new RegExp(`(^|[^\\p{L}])(ông|anh)${sau}`, 'gu')) + dem(/người đàn ông|cậu bé|con trai (duy nhất|út|cả)/gu)
  if (nu >= 3 && nu >= nam * 2) return 'nu'
  if (nam >= 3 && nam >= nu * 2) return 'nam'
  return th.gioi
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
  // Ảnh nền theo địa điểm: chỉ các địa điểm chương này dùng (đổi ảnh địa điểm khác không làm chương này dựng lại)
  const dungDiaDiem = new Set((p.loi ?? []).map((l) => l.dia_diem).filter(Boolean))
  const nenPhim = Object.fromEntries(Object.entries(phim?.nen ?? {}).filter(([ma]) => dungDiaDiem.has(ma)).map(([ma, v]) => [ma, { duong: `${thuMuc(d.id)}/nen/${v.tep}`, luc: v.luc }]))
  const goc = {
    ...(Object.keys(nenPhim).length ? { nen_phim: nenPhim } : {}),
    kho: 'ngang', kenh: 'Công Nghệ 24H', chu_de: d.chu_de, moc: k === 1 ? p.moc : null, phat_am: bangPhatAm(d.phat_am),
    the_chuong: k === 1 ? null : { so: k, ten: tenChuong, nhan: phim ? 'CHƯƠNG' : 'PHẦN' }, man_ket: k === d.phan.length,
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
    const gonGon = d.tao_luc >= '2026-10-14T12:00'
    const gioiThieu = phim
      ? `Đây là Công Nghệ 24H, và đây là câu chuyện về ${phim.ten}${!gonGon && tieuDe && tieuDe !== phim.ten ? `: ${cham(tieuDe)}` : '.'}`
      : gonGon
        ? 'Bạn đang xem Công Nghệ 24H.'
        : `Bạn đang xem Công Nghệ 24H. Hôm nay chúng ta cùng tìm hiểu: ${cham(tieuDe)}`
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
    // 30 giây đầu quyết định người xem ở lại: vào thẳng chuyện — câu móc + các câu tiếp theo của câu chuyện (~15 giây gay
    // cấn), rồi mới chào ngắn một câu, kể tiếp. Không đọc tên chương 1 / không thẻ chương ở phần 1 (làm chậm phút đầu)
    // Dự án từ 15/10/2026: đoạn mở đầu ở lại trong khoảnh khắc cao trào ~30 giây (lib/aiPhim.ts COLD OPEN) → lời chào
    // chen đúng trước câu quay về quá khứ ("Để hiểu vì sao… phải quay về…"), không cắt ngang giữa cảnh mở đầu
    const quayVe = d.tao_luc >= '2026-10-15T05:00'
      ? loi.slice(2, 9).findIndex((l) => /quay về|quay ngược|trở lại năm|ngược dòng|để hiểu/i.test(String(l.chu ?? '')))
      : -1
    const soDau = quayVe >= 0 ? quayVe + 2 : d.tao_luc >= '2026-10-15T05:00' ? 5 : 3
    const dau = loi.splice(0, Math.min(soDau, Math.max(1, loi.length - 2)))
    loi.unshift(...dau, loiGioiThieu)
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
    tieu_de: (await chinhTaTieuDe([dy.tieu_de]))[0].slice(0, 100),
    mo_ta: dy.mo_ta,
    the: dy.the.map((t) => t.replace(/^#/, '').trim()).filter(Boolean).slice(0, 20),
    chu_de: dy.chu_de.slice(0, 20) || 'Công nghệ',
    phan: dy.phan.map((p) => ({ tieu_de: p.tieu_de, noi_dung: p.noi_dung, nhip: p.nhip, loi: null, moc: null })),
    anh_bia_goi_y: dy.anh_bia.slice(0, 3),
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
  // Hội đồng phản biện chấm kịch bản chương; chưa đạt thì bắt buộc sửa đúng những câu bị chê theo góp ý rồi chấm lại
  const batDau = Date.now()
  const nguCanh = nguCanhPhan(d, k)
  const { kq: kb, pb } = await voiPhanBien('kich_ban', nguCanh, viet, (x) => tomTatLoi(x.loi), {
    conGiay: 120,
    sua: async (x, gopY) => {
      const s = await suaKichBan({ loi: x.loi, gopY, nguCanh, phim: !!phim })
      return s && { ...x, loi: s.loi }
    },
  })
  if (!kb) throw new Error(`AI chưa viết được phần ${k}, thử lại sau ít phút`)
  // Biên tập viên kiểm định: tự sửa nhịp hình ảnh, chấm điểm, ghi chú. Còn lỗi nặng (không tự sửa được) thì bắt buộc AI
  // sửa theo ghi chú (còn thời gian; hết thì trang tự gọi sửa tiếp — suaLoiPhan)
  let { loi, ...kd } = kiemDinhDu(d, k, kb.loi as CauYT[])
  if (!bienTapDat(kd) && (Date.now() - batDau) / 1000 < 200) {
    const s = await suaKichBan({ loi, gopY: chuBienTap(kd), nguCanh, phim: !!phim }).catch(() => null)
    if (s) {
      const kd2 = kiemDinhDu(d, k, s.loi as CauYT[])
      if (loiBienTap(kd2).length < loiBienTap(kd).length) ({ loi, ...kd } = kd2)
    }
  }
  // Đọc lại ngay trước khi lưu: lúc AI viết, phần khác có thể vừa được lưu
  const moi = (await docDuAn(id)) ?? d
  moi.phan[k - 1] = { ...moi.phan[k - 1], loi, moc: kb.moc, canh: undefined, kiem_dinh: kd, phan_bien: pb ?? undefined, phan_bien_canh: undefined } // lời đổi thì phân cảnh cũ không còn đúng
  await luuDuAn(moi)
  return moi
}

// Phim gì, phần nào, nối tiếp câu nào: bối cảnh cho hội đồng chấm và biên tập viên sửa kịch bản phần k
function nguCanhPhan(d: DuAnYT, k: number) {
  const phim = d.loai === 'tieu_su' && d.phim?.cau_chuyen ? d.phim : null
  const noiTiep = locLoiChao(d.phan[k - 2]?.loi ?? [], false).loi.slice(-6).map((l) => `${l.ai}: ${l.chu}`)
  return `${phim ? `Phim tiểu sử hoạt hình về ${phim.ten}` : `Video hoạt hình: ${d.tieu_de}`}, ${d.phut} phút, ${d.phan.length} ${phim ? 'chương' : 'phần'}. Đang chấm ${phim ? 'chương' : 'phần'} ${k}: "${d.phan[k - 1].tieu_de}" — ${d.phan[k - 1].noi_dung}${phim?.cau_chuyen ? `\nBig idea: ${phim.cau_chuyen.big_idea}` : ''}${noiTiep.length ? `\nCuối chương trước:\n${noiTiep.join('\n')}` : ''}`
}

// Lời thoại rút gọn cho hội đồng chấm: [người nói|cảm xúc|bối cảnh|nhân vật phụ|cảnh hành động] lời
const tomTatLoi = (loi: CauYT[]) =>
  loi
    .map((l) => {
      const c = l as CauYT & { hanh_dong?: string }
      return `[${c.ai}|${c.cam_xuc}|${c.boi_canh}|${c.nhan_vat_phu}${c.hanh_dong && c.hanh_dong !== 'khong' ? `|${c.hanh_dong}` : ''}${c.tai_hien ? '|tái hiện' : ''}] ${c.chu}`
    })
    .join('\n')

// Nút "AI sửa theo góp ý": biên tập viên AI chỉ sửa / xoá / chèn đúng những câu hội đồng chê (lib/suaKichBan.ts), giữ
// nguyên phần còn lại, rồi hội đồng chấm lại. Bản sửa bị chấm thấp hơn thì giữ bản cũ.
export async function suaLoiPhan(id: string, k: number): Promise<{ duAn: DuAnYT; soCho: number; diem: number | null; giu: 'moi' | 'cu' | 'moi_chua_cham' }> {
  const d = await docDuAn(id)
  const p = d?.phan[k - 1]
  if (!d || !p?.loi) throw new Error('Phần này chưa có lời thoại')
  // Góp ý = hội đồng (có góp ý) + lỗi nặng biên tập viên còn lại
  const coHoiDong = !!p.phan_bien && (p.phan_bien.van_de.length > 0 || !!p.phan_bien.goi_y)
  const gopY = [coHoiDong ? chuGopY(p.phan_bien!) : '', bienTapDat(p.kiem_dinh) ? '' : chuBienTap(p.kiem_dinh!)].filter(Boolean).join('\n\n')
  if (!gopY) throw new Error('Hội đồng và biên tập viên chưa có góp ý cho phần này')
  const nguCanh = nguCanhPhan(d, k)
  const s = await suaKichBan({ loi: p.loi, gopY, nguCanh, phim: d.loai === 'tieu_su' })
  if (!s) throw new Error('AI chưa sửa được (có thể hết lượt AI), thử lại sau ít phút')
  const pb2 = await phanBien('kich_ban', nguCanh, tomTatLoi(s.loi)).catch(() => null)
  const { loi, ...kd } = kiemDinhDu(d, k, s.loi as CauYT[])
  const diemCu = p.phan_bien?.diem ?? 0
  const lanCu = p.phan_bien?.lan ?? 0
  const luc = new Date().toISOString()
  const moi = (await docDuAn(id)) ?? d
  // Bản sửa bị hội đồng chấm thấp hơn, hoặc biên tập viên thấy nhiều lỗi nặng hơn: giữ bản cũ
  if ((pb2 && p.phan_bien && pb2.diem < diemCu) || loiBienTap(kd).length > loiBienTap(p.kiem_dinh).length) {
    if (p.phan_bien) moi.phan[k - 1] = { ...moi.phan[k - 1], phan_bien: { ...p.phan_bien, lan: lanCu + 1, luc, diem_dau: diemCu, giu: 'cu' } }
    await luuDuAn(moi)
    return { duAn: moi, soCho: s.soCho, diem: pb2?.diem ?? null, giu: 'cu' }
  }
  const goc = pb2 ?? p.phan_bien
  const pb: KetQuaPhanBien | undefined = goc ? { ...goc, dat: hoiDongDat(goc), lan: lanCu + 1, luc, diem_dau: diemCu, giu: pb2 ? 'moi' : 'moi_chua_cham' } : undefined
  moi.phan[k - 1] = { ...moi.phan[k - 1], loi, canh: undefined, kiem_dinh: kd, phan_bien: pb, phan_bien_canh: undefined }
  await luuDuAn(moi)
  return { duAn: moi, soCho: s.soCho, diem: pb2?.diem ?? null, giu: pb?.giu ?? 'moi_chua_cham' }
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
    const { loi, ...kd } = kiemDinhDu(moi, i + 1, ap.phan[i] as CauYT[])
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

// ── Kiểm định đầy đủ một chương (luật, không tốn lượt AI): biên tập viên (kiemDinh) + hai luật cần cả phim:
// 1. Phim tiểu sử: câu đặt vào miệng người thật (nhân vật chính / nhân vật phụ) mà tư liệu nghiên cứu không có → gắn nhãn
//    "Tái hiện" (người xem khó tính ghét lời bịa trình bày như lời thật). So bằng cặp từ liền nhau trùng với tư liệu.
// 2. Chống lặp: câu gần như nguyên văn câu ở chương khác → lỗi, AI phải viết lại; cụm từ dùng quá nhiều lần cả phim → nhắc.
const capTu = (s: string) => {
  const w = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  return w.slice(1).map((x, i) => `${w[i]} ${x}`)
}
const CUM_THUONG = new Set(['công ty', 'của ông', 'của bà', 'của họ', 'chúng ta', 'chúng tôi', 'thế giới', 'không thể', 'một người', 'những người', 'trong khi', 'là một', 'đã trở', 'trở thành', 'của mình', 'cho đến', 'vào năm', 'năm đó', 'có thể', 'không phải', 'đó là', 'và rồi', 'rằng ông', 'mọi người', 'cuộc đời', 'câu chuyện', 'công nghệ', 'nhân vật'])
function kiemDinhDu(d: DuAnYT, k: number, loiVao: CauYT[]) {
  const kq = kiemDinh(loiVao, { loai: d.loai, laCuoi: k === d.phan.length, coDai: laCoDai(d) })
  const them: { muc: 'loi' | 'nhac'; chu: string }[] = []
  const nc = d.phim?.nghien_cuu
  if (d.loai === 'tieu_su' && nc) {
    const nguon = new Set(capTu([...(nc.tai_lieu_goc ?? []).map((x) => x.noi_dung), ...nc.su_that.map((x) => x.noi_dung), ...nc.moc_doi.map((x) => x.su_kien), d.phim?.tai_lieu ?? ''].join(' . ')))
    let gan = 0
    for (const l of kq.loi) {
      if (l.tai_hien || ['nguoi_ke', 'meo', 'robot'].includes(l.ai)) continue
      const c = capTu(l.chu)
      if (c.length >= 3 && c.filter((x) => nguon.has(x)).length / c.length < 0.5) {
        l.tai_hien = true
        gan++
      }
    }
    if (gan) them.push({ muc: 'nhac', chu: `${gan} câu đặt vào miệng người thật không thấy trong tư liệu: đã gắn nhãn "Tái hiện"` })
  }
  // Chống lặp với các chương khác
  const khac = d.phan.flatMap((p, j) => (j === k - 1 ? [] : (p.loi ?? []).map((l) => ({ j: j + 1, c: new Set(capTu(l.chu)) }))))
  for (const l of kq.loi) {
    const c = capTu(l.chu)
    if (c.length < 6) continue
    const giong = khac.find((x) => c.filter((y) => x.c.has(y)).length / c.length >= 0.6)
    if (giong) them.push({ muc: 'loi', chu: `Câu "${l.chu.slice(0, 70)}…" lặp gần nguyên văn một câu ở chương ${giong.j}: viết lại bằng ý / chi tiết mới` })
  }
  const dem: Record<string, number> = {}
  for (const p of d.phan.map((x, j) => (j === k - 1 ? kq.loi : x.loi ?? []))) for (const l of p) for (const c of new Set(capTu(l.chu))) if (!CUM_THUONG.has(c)) dem[c] = (dem[c] ?? 0) + 1
  const ten = (d.phim?.ten ?? '').toLowerCase()
  const nhieu = Object.entries(dem).filter(([c, n]) => n >= 4 && !ten.includes(c) && kq.loi.some((l) => capTu(l.chu).includes(c))).map(([c]) => `"${c}"`)
  if (nhieu.length) them.push({ muc: 'nhac', chu: `Cụm từ lặp nhiều lần trong phim: ${nhieu.slice(0, 5).join(', ')} — nên thay cách nói` })
  if (!them.length) return kq
  const ghi_chu = [...kq.ghi_chu, ...them]
  const diem = Math.max(0, 100 - ghi_chu.filter((g) => g.muc === 'loi').length * 25 - ghi_chu.filter((g) => g.muc === 'nhac').length * 7)
  return { ...kq, ghi_chu, diem }
}

// ── Chủ trang duyệt kịch bản trước khi dựng (đạo diễn / người xem chuyên nghiệp 14/10/2026: lỗi kiến thức, câu bịa, tên
// sai lọt tới video cuối vì không có mắt người nào đọc trước). Dự án tạo từ 14/10/2026 mới bắt buộc (dự án cũ giữ như cũ).
// Mã kịch bản: tên phim + toàn bộ lời; sửa một chữ là phải duyệt lại.
const maKichBan = (d: DuAnYT) => bam([d.tieu_de, d.phan.map((p) => (p.loi ?? []).map((l) => `${l.ai}:${l.chu}:${l.tai_hien ? 1 : 0}`))])
const canDuyet = (d: DuAnYT) => d.tao_luc >= '2026-10-14T12:00'
const daDuyet = (d: DuAnYT) => !canDuyet(d) || d.duyet?.ma === maKichBan(d)
export async function duyetKichBan(id: string) {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  if (d.phan.some((p) => !p.loi)) throw new Error('Còn chương chưa có kịch bản')
  d.duyet = { luc: new Date().toISOString(), ma: maKichBan(d) }
  await luuDuAn(d)
  return d
}

// ── Chuẩn bị hành động trước khi dựng (chủ trang 15/10/2026: "đọc lời thoại, chuẩn bị bộ hành động cho nhân vật theo
// từng câu, từng chương; thiếu thì hiển thị ra để chép vào Claude Code"). AI đọc từng chương, mỗi câu: ai làm, làm gì trên
// hình, máy dựng đã có hành động đó chưa (THU_VIEN_HANH_DONG) — chưa có thì đặt mã mới. Kết quả lưu riêng (d.hanh_dong),
// không sửa lời thoại; bấm "Áp dụng" mới ghi mã hành động có sẵn vào dong_tac của các chương chưa dựng.
// Hai lượt AI tách bạch (lượt gộp làm AI uốn mô tả cho khớp hành động có sẵn: "cất tiếng khóc chào đời" thành "ngồi đọc
// sách"): lượt 1 KHÔNG thấy thư viện — chỉ đọc lời, ghi việc thật sự xảy ra trên hình và đạo cụ cần; lượt 2 đem từng việc
// đó so với thư viện: có hành động làm đúng việc đó chưa, đạo cụ nào hành động đó chưa có.
const HinhCanSchema = z.object({ loai: z.string(), ten: z.string(), emoji: z.string(), mau: z.string(), chu: z.string() })
const ViecSchema = z.object({ cau: z.array(z.object({ i: z.number().int(), nguoi: z.string(), can: z.boolean(), viec: z.string(), do_vat_can: z.array(z.string()), hinh_can: z.array(HinhCanSchema) })) })
const KhopSchema = z.object({ cau: z.array(z.object({ i: z.number().int(), hanh_dong: z.string(), ten_moi: z.string() })) })
const schemaMang = (thuocTinh: Record<string, unknown>) => ({
  type: 'object',
  properties: { cau: { type: 'array', items: { type: 'object', properties: thuocTinh, required: Object.keys(thuocTinh), additionalProperties: false } } },
  required: ['cau'],
  additionalProperties: false,
})
const CHUOI = { type: 'string' }
// Mã hành động mới: bỏ dấu tiếng Việt (khuân vác → khuan_vac), chỉ chữ thường, số, gạch dưới
const boDauMa = (x: string) =>
  x.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'chua_dat_ten'
const MANG_CHUOI = { type: 'array', items: { type: 'string' } }
// Hình cần có của một câu: máy tự đối chiếu cái nào đã có — logo (máy tự vẽ huy hiệu), đồ vật có emoji, ảnh thật đã gắn
// cho câu, nhân vật đang đứng trên sân khấu, ảnh nền của địa điểm, thẻ số liệu / minh hoạ của câu
// Tên người trùng nhân vật chính (đủ một chữ của tên, vd "Jensen" trong "Jensen Huang")
const laNhanVatChinh = (d: DuAnYT, ten: string) => {
  const ds = (d.phim?.ten ?? '').toLowerCase().split(/\s+/).filter((x) => x.length > 2)
  return ds.some((x) => ten.toLowerCase().includes(x))
}
const LOAI_HINH = new Set(['logo', 'do_vat', 'anh_that', 'nhan_vat', 'dia_diem', 'so_lieu'])
// Hai tên nơi chốn khớp nhau: bỏ dấu, có chung một chữ dài từ 4 ký tự ("Đài Nam" ~ "Tainan, Đài Loan" thì không — AI ghi
// tên theo lời thoại, hồ sơ có cả thành phố / quốc gia nên thường trùng ít nhất một chữ)
const boDau = (x: string) => x.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()
function khopTen(a: string, b: string) {
  const ca = new Set(boDau(a).split(/[^a-z0-9]+/).filter((x) => x.length >= 4))
  return boDau(b).split(/[^a-z0-9]+/).some((x) => x.length >= 4 && ca.has(x)) || boDau(a).includes(boDau(b).trim())
}
function hinhCanCau(d: DuAnYT, l: CauYT, ds: z.infer<typeof HinhCanSchema>[]): HinhCan[] {
  return ds
    .filter((h) => LOAI_HINH.has(h.loai) && h.ten.trim())
    .slice(0, 5)
    .map((h) => {
      // Địa điểm: phim tiểu sử phải đúng NƠI (câu sinh ra ở Đài Nam mà ảnh nền là trường Oneida → sai), không chỉ có ảnh nền
      const noiCau = d.phim?.ho_so?.dia_diem.find((x) => x.ma === l.dia_diem)
      const dungNoi = !noiCau || khopTen([noiCau.ten, noiCau.thanh_pho, noiCau.quoc_gia].join(' '), h.ten)
      const co =
        h.loai === 'logo' ? true
        : h.loai === 'do_vat' ? !!emojiCua(h.emoji)
        : h.loai === 'anh_that' ? typeof l.anh === 'number' && l.anh >= 0
        : h.loai === 'nhan_vat' ? laNhanVatChinh(d, h.ten) || (!!l.nhan_vat_phu && !['khong', 'nhan_vat_chinh'].includes(l.nhan_vat_phu))
        : h.loai === 'dia_diem' ? d.loai !== 'tieu_su' || (!!l.dia_diem && !!d.phim?.nen?.[l.dia_diem] && dungNoi)
        : !!l.minh_hoa?.kieu && l.minh_hoa.kieu !== 'khong'
      const ghi_chu =
        h.loai === 'logo' ? 'máy tự vẽ huy hiệu'
        : co ? 'đã có'
        : h.loai === 'do_vat' ? 'chưa có hình — phải vẽ'
        : h.loai === 'anh_that' ? 'cần ảnh thật'
        : h.loai === 'dia_diem' ? (noiCau && !dungNoi ? `bối cảnh đang là "${noiCau.ten}" — sai nơi, cần cảnh ${h.ten}` : 'cần ảnh nền địa điểm')
        : h.loai === 'so_lieu' ? 'nên có thẻ số liệu'
        : 'cần nhân vật'
      return { loai: h.loai as HinhCan['loai'], ten: h.ten.trim(), emoji: emojiCua(h.emoji), mau: /^#[0-9a-f]{3,8}$/i.test(h.mau) ? h.mau : '', chu: h.chu.trim().slice(0, 5), co, ghi_chu }
    })
}
export async function hanhDongChuong(d: DuAnYT, k: number): Promise<CauHanhDong[]> {
  const loi = d.phan[k - 1]?.loi ?? []
  if (!loi.length) return []
  const ten = d.phim?.ten ? `The main character (nhan_vat_chinh) is ${d.phim.ten}.` : ''
  const viec = await goiJson({
    system: `You are the animation director of a Vietnamese 2D cartoon documentary. For EVERY numbered line write what the viewer should SEE a character DO while it is spoken, so characters act the words with real objects instead of standing and talking. ${ten}
Who acts: on a narrator line (ai = nguoi_ke) the person the narrator describes (nhan_vat_phu, or the main character); on a dialogue line the speaker. Mèo Mun (meo) and Robot Bit (robot) are the mascot hosts.
For each line return: i (the line number), nguoi (who acts, in Vietnamese: name or role, "Mèo Mun", "Robot Bit"), can (true when the line tells an event or a concrete visible activity of a person — being born, moving, studying, working, cleaning, founding a company, signing, launching, travelling, fighting, building, crying, hugging, eating, being arrested, receiving an award… In a biography most narrator lines that tell what happened are true; false only for commentary, questions, reactions, explanations and lessons; mascot lines are false), viec (in Vietnamese, at most 12 words: the core activity the LINE itself tells, in plain words — verb + object, e.g. "em bé sơ sinh khóc", "lau nhà vệ sinh bằng giẻ", "ôm chầm cha mẹ", "ký hợp đồng"; never invent staging the line does not say; a line that only states a fact, a time, a place or a feeling has can false; for can false: the gesture while talking), do_vat_can (EVERY object the person acts with, each as "emoji + Vietnamese name": ["🧹 cái chổi"], ["🥣 cái chén", "🧽 miếng rửa"], ["🖊️ cây bút", "📜 tờ hợp đồng"]; the closest single emoji, or only the Vietnamese name when no emoji fits; [] when no object), hinh_can (EVERY visual element the viewer should see for this line so the picture matches the words, one object each: loai = "logo" (a company, product, app, school or organisation named in the line — Facebook, Harvard, Nvidia, iPhone…: ten = its name, mau = its brand colour as #hex, chu = 1 to 4 characters for a simple badge such as "f", "H", "NV"), "do_vat" (an object the line talks about: emoji + ten), "anh_that" (a real archival photo the line calls for: a real person at that moment, a real building, a real document or product), "nhan_vat" (a person who must appear: ten = who), "dia_diem" (the place where it happens: ten), "so_lieu" (a number, statistic, date or chart worth showing: ten = the figure); emoji = closest single emoji or ""; mau and chu "" when not a logo; [] when nothing beyond the characters talking). Metaphors ("lửa thử vàng", "cuộc chiến sinh tồn") are not physical activities.`,
    noiDung: loi.map((l, i) => `${i}. [${l.ai}${l.nhan_vat_phu && l.nhan_vat_phu !== 'khong' ? ` / ${l.nhan_vat_phu}` : ''}] ${l.chu}`).join('\n'),
    effort: 'medium',
    kiemTra: ViecSchema,
    schema: schemaMang({
      i: { type: 'integer' }, nguoi: CHUOI, can: { type: 'boolean' }, viec: CHUOI, do_vat_can: MANG_CHUOI,
      hinh_can: { type: 'array', items: { type: 'object', properties: { loai: CHUOI, ten: CHUOI, emoji: CHUOI, mau: CHUOI, chu: CHUOI }, required: ['loai', 'ten', 'emoji', 'mau', 'chu'], additionalProperties: false } },
    }),
  })
  if (!viec) throw new Error(`AI chưa đọc được chương ${k}, thử lại`)
  const theoViec = new Map(viec.cau.map((x) => [x.i, x]))
  const thuVien = Object.entries(THU_VIEN_HANH_DONG)
    .map(([ma, v]) => `${ma} (${v.loai === 'ke_chuyen' ? 'story action' : 'gesture'}): ${v.mo_ta}${v.do_vat ? ` [props it already has: ${v.do_vat.join(', ')}]` : ' [no props]'}`)
    .join('\n')
  const can = viec.cau.filter((x) => x.can)
  const khop = can.length
    ? await goiJson({
        system: `You match planned on-screen activities of a 2D cartoon to the renderer's action library. Library:
${thuVien}
For each numbered activity (who: activity | props needed) return: i, hanh_dong (the library code that shows exactly the SAME body movement: a story action, or a GESTURE when the activity is that gesture done with an object — pointing at a letter = chi_tay, holding up an exam paper = cam_vat or gio_tay, slamming a report on the table = dap_tay, writing / signing = viet, standing proudly = khoanh_tay — the needed objects are added as props. "moi" only when the body must do something no library code does — judge strictly: hugging is not a handshake, walking into a building is not being pushed, wiping a toilet is not washing dishes, a newborn crying is not an adult crying, riding a bicycle is not running), ten_moi (when "moi": a short GENERAL snake_case code without diacritics for the kind of movement, reusable across lines and films, e.g. "chao_doi" (a baby is born), "lau_don" (wiping, mopping, cleaning), "om" (hugging), "di_bo" (walking somewhere), "dap_xe", "lai_xe", "bi_bat"; never "hanh_dong_moi"; else "").`,
        noiDung: can.map((x) => `${x.i}. ${x.nguoi}: ${x.viec} | ${x.do_vat_can.join(', ') || '—'}`).join('\n'),
        effort: 'medium',
        kiemTra: KhopSchema,
        schema: schemaMang({ i: { type: 'integer' }, hanh_dong: CHUOI, ten_moi: CHUOI }),
      })
    : { cau: [] }
  if (!khop) throw new Error(`AI chưa đối chiếu được chương ${k}, thử lại`)
  const theoKhop = new Map(khop.cau.map((x) => [x.i, x]))
  const ketQua: CauHanhDong[] = loi.map((l, i) => {
    const x = theoViec.get(i)
    const y = x?.can ? theoKhop.get(i) : undefined
    const ma = y?.hanh_dong ?? 'khong'
    // AI đặt mã "mới" trùng đúng tên hành động đã có (di_bo, mo_cua…) → tính là đã có
    const maMoi = boDauMa(y?.ten_moi ?? '')
    const chon = !x?.can ? 'khong' : THU_VIEN_HANH_DONG[ma] ? ma : THU_VIEN_HANH_DONG[maMoi]?.loai === 'ke_chuyen' ? maMoi : 'moi'
    // Em bé sơ sinh / chào đời → em bé nằm nôi (AI hay chọn "khóc" của người lớn)
    const hanh_dong = x?.can && /sơ sinh|chào đời|lọt lòng|em bé/i.test(x.viec) && ['khoc', 'moi', 'be_em_be'].includes(chon) && !/bế/i.test(x.viec) ? 'nam_noi' : chon
    // Đạo cụ thiếu: so emoji với đạo cụ hành động đã có (máy tự so, không để AI đoán)
    const coSan = new Set((THU_VIEN_HANH_DONG[hanh_dong]?.do_vat ?? []).map((v) => emojiGoc(v)))
    // Đồ vẽ sẵn (không emoji: còng tay, dây đài…) so theo tên
    const tenCoSan = (THU_VIEN_HANH_DONG[hanh_dong]?.do_vat ?? []).map((v) => boDau(v))
    const daCo = (v: string) => (emojiCua(v) && coSan.has(emojiGoc(v))) || tenCoSan.some((x) => khopTen(x, v))
    const canVat = (x?.do_vat_can ?? []).map((v) => v.trim()).filter(Boolean).slice(0, 4)
    return {
      i,
      chu: l.chu.slice(0, 60),
      nguoi: x?.nguoi ?? '',
      can: !!x?.can,
      hanh_dong,
      viec: x?.viec ?? '',
      ten_moi: hanh_dong === 'moi' ? boDauMa(y?.ten_moi && y.ten_moi !== 'hanh_dong_moi' ? y.ten_moi : 'chua_dat_ten') : '',
      do_vat: '',
      do_vat_can: canVat,
      hinh_can: hinhCanCau(d, l, x?.hinh_can ?? []),
      do_vat_thieu: canVat.filter((v) => !daCo(v)),
    }
  })
  // Lượt 3 — kịch bản diễn chi tiết cho TỪNG câu (chủ trang 15/10/2026, mẫu "nhân vật quét nhà"): cầm đạo cụ thế nào, tư
  // thế, ánh mắt, chu trình động tác, bước chân và trọng tâm, biến thể giữa chừng, kết thúc, yêu cầu chuyển động — vừa
  // khít thời lượng câu nói. Câu chỉ nói chuyện: vài câu ngắn về cử chỉ, ánh mắt, nét mặt. Chia nhóm 8 câu cho AI viết kỹ.
  const nhom: number[][] = []
  for (let i = 0; i < ketQua.length; i += 8) nhom.push(ketQua.slice(i, i + 8).map((x) => x.i))
  const chiTiet = await Promise.all(
    nhom.map((ds) =>
      goiJson({
        system: `You are the animation director of a Vietnamese 2D cartoon documentary (flat front-facing characters: head, eyebrows, eyes, mouth, two arms, body, legs; props held in the hands). For each numbered line write in VIETNAMESE the detailed ACTING SCRIPT the animator follows while the line is spoken (it lasts the given seconds), in the style of this example:
"HÀNH ĐỘNG: NHÂN VẬT QUÉT NHÀ
Nhân vật cầm chổi bằng hai tay, một tay nắm phần giữa cán chổi, tay còn lại giữ phía trên. Nhân vật hơi cúi người về phía trước, mắt nhìn xuống sàn nhà, tập trung vào khu vực cần dọn dẹp.
Nhân vật bắt đầu đưa chổi từ bên trái sang bên phải, sau đó kéo chổi ngược lại một cách tự nhiên. Hai cánh tay phối hợp nhịp nhàng, thân người hơi nghiêng và di chuyển theo hướng quét. Hai chân bước từng bước nhỏ để tiến dần về phía trước, liên tục gom bụi và rác vụn thành một đống nhỏ.
Khi quét đến góc nhà, nhân vật xoay nhẹ người, cúi thấp hơn và đưa đầu chổi sát chân tường để gom sạch bụi. Kết thúc hành động, nhân vật dừng quét, đứng thẳng người, nhìn xuống sàn kiểm tra kết quả và mỉm cười hài lòng.
Yêu cầu chuyển động: chuyển động tự nhiên, liên tục, có trọng lượng; tay, vai, thân, đầu và chân phối hợp đồng bộ. Đầu chổi luôn chạm sàn; chổi không xuyên sàn, cán không biến dạng; nhân vật không trượt chân, không đứng bất động khi đang quét."
For an ACTIVITY line (given): title line "HÀNH ĐỘNG: …" in capitals, then paragraphs covering — how each hand holds or uses each prop (grip points); starting posture and where the eyes look; the main motion cycle step by step with both arms, shoulders, torso and head; footwork, weight shift and travel direction; one natural variation in the middle; how it ends (final pose, glance, facial expression matching the emotion of the line); and "Yêu cầu chuyển động:" with prop contact rules (what must touch what, nothing passes through anything, props keep their shape, no sliding feet, never frozen). 90 to 160 words, faithful to the line, era-correct, nothing the line does not support.
For a TALKING line (no activity): 2 to 3 sentences — the gesture, where the eyes look (at whom), facial expression and one small body movement, timed to the key word.`,
        noiDung: ds
          .map((i) => {
            const x = ketQua[i]
            const giay = Math.max(2, Math.round((loi[i].chu.length / 14) * 10) / 10)
            return `${i}. [${x.nguoi || loi[i].ai}] (${giay} giây) "${loi[i].chu}" → ${x.can ? `ACTIVITY: ${x.viec}${x.do_vat_can?.length ? ` | props: ${x.do_vat_can.join(', ')}` : ''}` : `TALKING: ${x.viec}`}`
          })
          .join('\n'),
        effort: 'medium',
        kiemTra: z.object({ cau: z.array(z.object({ i: z.number().int(), chi_tiet: z.string() })) }),
        schema: schemaMang({ i: { type: 'integer' }, chi_tiet: CHUOI }),
      }).catch(() => null),
    ),
  )
  for (const kq of chiTiet) for (const c of kq?.cau ?? []) if (ketQua[c.i]) ketQua[c.i].chi_tiet = c.chi_tiet.trim()
  return ketQua
}
export async function chuanBiHanhDong(id: string) {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  if (d.phan.some((p) => !p.loi)) throw new Error('Còn chương chưa có lời thoại')
  const chuong = await Promise.all(d.phan.map(async (_, j) => ({ k: j + 1, cau: await hanhDongChuong(d, j + 1) })))
  const moi = await docDuAn(id)
  if (!moi) throw new Error('Không tìm thấy video')
  moi.hanh_dong = { luc: new Date().toISOString(), chuong }
  await luuDuAn(moi)
  return moi
}
// Ghi mã hành động có sẵn vào dong_tac của từng câu — chỉ các chương CHƯA dựng xong (chương đã dựng giữ nguyên, khỏi dựng lại)
export async function apDungHanhDong(id: string) {
  const d = await docDuAn(id)
  if (!d?.hanh_dong) throw new Error('Chưa chuẩn bị hành động')
  let so = 0
  const boQua: number[] = []
  for (const c of d.hanh_dong.chuong) {
    const p = d.phan[c.k - 1]
    if (!p?.loi) continue
    const r = await docJson<{ xong?: boolean; ma: string }>(`${thuMuc(d.id)}/phan-${c.k}.json`)
    if (r?.xong && r.ma === maPhan(d, c.k)) {
      boQua.push(c.k)
      continue
    }
    for (const x of c.cau) {
      const l = p.loi[x.i]
      if (!l || l.chu.slice(0, 60) !== x.chu) continue
      // Logo thương hiệu câu nhắc tới → huy hiệu bật lên (máy dựng tự nhận thương hiệu quen; đây thêm cả thương hiệu lạ)
      const logo = (x.hinh_can ?? []).filter((h) => h.loai === 'logo').slice(0, 2).map((h) => ({ ten: h.ten, mau: h.mau, chu: h.chu || h.ten.slice(0, 2) }))
      if (JSON.stringify(logo) !== JSON.stringify(l.logo ?? [])) {
        if (logo.length) l.logo = logo
        else delete l.logo
        so++
      }
      // Đạo cụ còn thiếu có emoji → người diễn cầm thêm (tối đa 2); không có emoji thì phải vẽ (Claude Code)
      const them = (x.do_vat_thieu ?? []).map(emojiCua).filter(Boolean).slice(0, 2)
      if (JSON.stringify(them) !== JSON.stringify(l.vat_them ?? [])) {
        if (them.length) l.vat_them = them
        else delete l.vat_them
        so++
      }
      if (!THU_VIEN_HANH_DONG[x.hanh_dong] || (l.dong_tac === x.hanh_dong && l.hanh_dong_chot)) continue
      l.dong_tac = x.hanh_dong as typeof l.dong_tac
      l.hanh_dong_chot = true
      so++
    }
  }
  await luuDuAn(d)
  return { duAn: d, so, boQua }
}

export async function kiemDinhLaiPhan(id: string, k: number) {
  const d = await docDuAn(id)
  const p = d?.phan[k - 1]
  if (!d || !p?.loi) throw new Error('Phần này chưa có lời thoại')
  const { loi, ...kd } = kiemDinhDu(d, k, p.loi)
  const doi = JSON.stringify(loi) !== JSON.stringify(p.loi)
  d.phan[k - 1] = { ...p, loi, kiem_dinh: kd, canh: doi ? undefined : p.canh }
  await luuDuAn(d)
  return d
}

// Ảnh bìa (hoat-hinh/tao_anh_bia.mjs): MỘT tình huống, MỘT nhân vật to, chữ 2-4 từ. Chữ: chủ trang tự đặt → ý AI đề xuất
// (dàn ý / đóng gói phim tiểu sử) → vế đầu tiêu đề. Nhân vật lớn: nhân vật chính phim tiểu sử, hoặc nhân vật phụ AI chọn /
// xuất hiện nhiều nhất. Emoji: của ý ảnh bìa, không có thì của câu móc phần 1. Nền: bối cảnh hay gặp nhất ở phần 1.
export function anhBia(d: DuAnYT) {
  const vat = (x: string) => x.replace(/[#\p{Extended_Pictographic}️]/gu, '').replace(/\s+/g, ' ').trim()
  const tuTieuDe = vat(d.tieu_de.replace(/^Phim tiểu sử:\s*/i, '')).split(/\s*[:|–—?]\s*|\s+-\s+/)[0]
  const goiY = d.anh_bia_goi_y?.[0]
  const chu = vat(d.anh_bia_chu ?? '') || vat(goiY?.chu ?? '') || vat(d.phim?.dong_goi?.thumbnail[0]?.chu ?? '') || tuTieuDe.split(' ').slice(0, 4).join(' ')
  const dem: Record<string, number> = {}
  for (const l of d.phan[0]?.loi ?? []) dem[l.boi_canh] = (dem[l.boi_canh] ?? 0) + 1
  const boi_canh = Object.entries(dem).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'truong_quay'
  const demPhu: Record<string, number> = {}
  for (const p of d.phan) for (const l of p.loi ?? []) if (l.nhan_vat_phu && l.nhan_vat_phu !== 'khong') demPhu[l.nhan_vat_phu] = (demPhu[l.nhan_vat_phu] ?? 0) + 1
  const nhan_vat = goiY && !['meo', 'robot'].includes(goiY.nhan_vat) ? goiY.nhan_vat : (Object.entries(demPhu).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
  const bieu_tuong = goiY?.bieu_tuong || d.phan[0]?.moc?.bieu_tuong || ''
  // Phim tiểu sử: nhân vật chính (hình giai đoạn cuối, lúc nổi tiếng nhất) là gương mặt lớn
  const nhan_vat_chinh = d.loai === 'tieu_su' && d.phim ? hinhChuong(d, d.phan.length) : null
  // Kiểu 5: ảnh chân dung thật (Wikimedia Commons) của nhân vật
  const anh_that = d.loai === 'tieu_su' ? (d.phim?.anh?.find((a) => a.chinh)?.url ?? null) : null
  return { chu, bieu_tuong, nhan_vat, kenh: 'Công Nghệ 24H', boi_canh, nhan_vat_chinh, anh_that }
}

// Gợi ý chữ ảnh bìa cho trang (ý AI + ý thumbnail của bước đóng gói phim tiểu sử)
export const goiYChuAnhBia = (d: DuAnYT) =>
  [...(d.anh_bia_goi_y ?? []).map((g) => g.chu), ...(d.phim?.dong_goi?.thumbnail ?? []).map((t) => t.chu)].map((x) => x.trim()).filter(Boolean).slice(0, 6)

// Vẽ (lại) ảnh bìa ngay, không cần dựng video: lưu chữ chủ trang đặt rồi gửi phiếu cho máy nhà (ưu tiên cao, vẽ ~10 giây)
export async function veAnhBia(id: string, chu: string) {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  const moi = { ...d, anh_bia_chu: chu.trim().slice(0, 60) || undefined }
  await luuDuAn(moi)
  await ghiJson(`hang-doi/viec/ytb-${id}.json`, { loai: 'yt_anh_bia', du_an: id, tieu_de: moi.tieu_de, anh_bia: anhBia(moi) })
  return moi
}

export async function chonAnhBia(id: string, k: number) {
  const d = await docDuAn(id)
  if (!d) throw new Error('Không tìm thấy video')
  const moi = { ...d, anh_bia_chon: Math.max(0, Math.min(4, Math.round(k))) }
  await luuDuAn(moi)
  return moi
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
  | { loai: 'dang_lam'; phanTram: number; buoc: string; luc: number }
  | { loai: 'loi'; loi: string }
// Máy nhà tự kiểm tra video sau khi ghép (may-nha/tho_doc.py: kiem_tra_video)
export type KiemTraVideo = { do_dai: number | null; lufs: number | null; lufs_goc: number | null; da_chinh_am: boolean; im_lang: number[][]; man_den: number[][]; ghi_chu: string[] }
export type TrangThaiDuAn = {
  phan: TrangThaiPhan[]
  xong: { tep: string; kiem_tra?: KiemTraVideo; anh_bia?: { xem: string; tai: string }[]; moc_chuong?: number[]; phu_de?: string } | null
  mayNha: string | null
  ketGhep?: boolean // đủ phần mà máy nhà chưa ghép được (bấm Ghép lại)
  anh_bia?: { xem: string; tai: string }[] // các kiểu ảnh bìa đã vẽ (có thể vẽ trước khi dựng xong video)
  ve_bia?: boolean // máy nhà đang có phiếu vẽ ảnh bìa
  // Máy nhà đang làm gì (hang-doi/hien-tai.json, may-nha/tho_doc.py: bao_hien_tai): việc của video này hay việc khác
  mayNhaCu?: boolean // máy nhà đang chạy bản cũ (chưa khởi động lại sau lần cập nhật)
  mayNhaLam?: { mo_ta: string; buoc: string; phanTram: number | null; luc: number; phan: number | null; cuaVideo: boolean; tieu_de: string | null } | null
  ghiNguonNhac?: string // ghi nguồn nhạc nền (giấy phép CC BY bắt buộc), dán vào mô tả YouTube
  duyet?: { can: boolean; da: boolean; doi: boolean } // can: dự án phải duyệt; da: đã duyệt bản hiện tại; doi: từng duyệt nhưng kịch bản đã đổi
  xemTruoc?: Record<number, string[]> // phần → link ảnh xem trước từng câu (máy nhà chụp trước khi dựng hình), đúng mã phần hiện tại
}

// Trạng thái từng phần + video đã ghép (chỉ tính khi khớp mã lời thoại hiện tại)
export async function trangThaiDuAn(d: DuAnYT, mayNha: string | null): Promise<TrangThaiDuAn> {
  const goc = thuMuc(d.id)
  const [{ data: viec }, { data: viecBia }, bia, song, hienTai, tienDo, xong, ...kq] = await Promise.all([
    kho().list('hang-doi/viec', { limit: 200, search: `yt-${d.id}` }),
    kho().list('hang-doi/viec', { limit: 5, search: `ytb-${d.id}` }),
    docJson<{ so: number; luc: number }>(`${goc}/anh-bia.json`),
    docJson<{ luc: number; ban?: number }>('hang-doi/song.json'),
    docJson<{ loai: string; mo_ta: string; buoc: string; phanTram: number | null; luc: number; du_an: string | null; phan: number | null; tieu_de: string | null }>('hang-doi/hien-tai.json'),
    docJson<{ phan: number; phanTram: number; buoc: string; luc: number }>(`${goc}/tien-do.json`),
    docJson<{ tep: string; ma: string[]; nhac?: string | null; kiem_tra?: KiemTraVideo; anh_bia?: boolean | number; moc_chuong?: number[]; phu_de?: boolean }>(`${goc}/xong.json`),
    ...d.phan.map((_, i) => docJson<{ xong?: boolean; loi?: string; ma: string; luc?: number }>(`${goc}/phan-${i + 1}.json`)),
  ])
  const dangCho = new Set((viec ?? []).map((f) => f.name))
  // Bảng tin máy nhà còn mới (máy nhà báo ít nhất mỗi vài phút khi đang làm); cũ hơn 30 phút là sót lại, bỏ
  const moiDay = !!hienTai && Date.now() - hienTai.luc < 30 * 60_000
  const ma = d.phan.map((p, i) => (p.loi ? maPhan(d, i + 1) : ''))
  const phan = d.phan.map((p, i): TrangThaiPhan => {
    const k = i + 1
    if (!p.loi) return { loai: 'chua_viet' }
    const r = kq[i]
    if (r?.ma === ma[i] && r.xong) return { loai: 'xong' }
    if (tienDo?.phan === k && Date.now() - tienDo.luc < 10 * 60_000) return { loai: 'dang_lam', phanTram: tienDo.phanTram, buoc: tienDo.buoc, luc: tienDo.luc }
    // Máy nhà đã nhận phần này nhưng chưa tới bước báo tiến độ riêng (bảng tin chung)
    if (moiDay && hienTai?.du_an === d.id && hienTai.phan === k && hienTai.loai !== 'yt_anh_bia') return { loai: 'dang_lam', phanTram: hienTai.phanTram ?? 0, buoc: hienTai.buoc, luc: hienTai.luc }
    if (dangCho.has(tenViec(d.id, k))) return { loai: 'cho' }
    if (r?.ma === ma[i] && r.loi) return { loai: 'loi', loi: r.loi }
    return { loai: 'chua_dung' }
  })
  const nhacChon = await nhacCuaDuAn(d)
  // Video đã ghép không nhạc (dựng trước khi bật nhạc nền theo chương, 12/10/2026) vẫn tính là xong: video đã dựng giữ
  // nguyên, không bắt dựng / ghép lại; video ghép mới thì nhạc phải khớp lựa chọn hiện tại
  const khop = xong && xong.ma.length === ma.length && xong.ma.every((m, i) => m === ma[i]) && (!xong.nhac || xong.nhac === nhacChon)
  let daGhep: TrangThaiDuAn['xong'] = null
  if (khop) {
    daGhep = { tep: xong.tep, kiem_tra: xong.kiem_tra, moc_chuong: xong.moc_chuong }
    if (xong.phu_de) {
      const { data } = await kho().createSignedUrl(`${goc}/phu-de.srt`, 3600, { download: 'phu-de.srt' })
      if (data) daGhep.phu_de = data.signedUrl
    }
  }
  // Ảnh bìa: anh-bia.json (máy nhà ghi mỗi lần vẽ, kể cả lúc ghép video) → số kiểu; dự án cũ chỉ có trong xong.json
  // (true = 1 ảnh, số = số kiểu). Tên tệp cố định: anh-bia.png, anh-bia-2.png…
  const soAnh = bia?.so ?? (xong?.anh_bia === true ? 1 : typeof xong?.anh_bia === 'number' ? xong.anh_bia : 0)
  const anh_bia = (
    await Promise.all(
      Array.from({ length: soAnh }, (_, i) => (i ? `anh-bia-${i + 1}.png` : 'anh-bia.png')).map(async (t) => {
        const [xem, tai] = await Promise.all([kho().createSignedUrl(`${goc}/${t}`, 3600), kho().createSignedUrl(`${goc}/${t}`, 3600, { download: t })])
        return xem.data && tai.data ? { xem: `${xem.data.signedUrl}&v=${bia?.luc ?? 0}`, tai: tai.data.signedUrl } : null
      }),
    )
  ).filter((x): x is { xem: string; tai: string } => !!x)
  if (daGhep) daGhep.anh_bia = anh_bia
  // Kẹt ghép: đủ phần đã dựng, chưa có video ghép, không còn phiếu nào chờ, phần xong cuối cùng đã quá 5 phút
  const xongCuoi = Math.max(0, ...kq.map((r) => r?.luc ?? 0))
  const ketGhep = !daGhep && phan.length > 0 && phan.every((p) => p.loai === 'xong') && !dangCho.size && Date.now() - xongCuoi > 5 * 60_000
  const mayNhaLam = moiDay && hienTai ? { mo_ta: hienTai.mo_ta, buoc: hienTai.buoc, phanTram: hienTai.phanTram, luc: hienTai.luc, phan: hienTai.phan, cuaVideo: hienTai.du_an === d.id, tieu_de: hienTai.tieu_de } : null
  // Ảnh xem trước từng câu của các phần (máy nhà chụp trước khi dựng hình): chỉ lấy bản đúng mã phần hiện tại
  const xemTruoc: Record<number, string[]> = {}
  await Promise.all(
    d.phan.map(async (_, i) => {
      const x = await docJson<{ ma: string; anh: string[] }>(`${goc}/xem-truoc-${i + 1}.json`)
      if (!x || x.ma !== ma[i] || !x.anh?.length) return
      const ds = await Promise.all(x.anh.map((t) => kho().createSignedUrl(`${goc}/${t}`, 3600)))
      xemTruoc[i + 1] = ds.map((r) => r.data?.signedUrl).filter((u): u is string => !!u)
    }),
  )
  return {
    xemTruoc,
    phan, xong: daGhep, mayNha, ketGhep, anh_bia, ve_bia: !!viecBia?.length, mayNhaLam, mayNhaCu: !mayNha && (song?.ban ?? 0) < BAN_MAY_NHA, ghiNguonNhac: ghiNguonNhac(nhacChon),
    duyet: { can: canDuyet(d), da: daDuyet(d), doi: !!d.duyet && !daDuyet(d) },
  }
}

// ── Nhạc nền theo cấu trúc câu chuyện ──
// Mỗi chương một bài, chọn theo TÊN bài trong thư viện nhạc (kho video, thư mục nhac/, tải lên từ trang TikTok): tên có
// chữ chỉ cảm xúc — to-mo / hoi-hop / hung-trang / lang-dong / buon / vui. Đi theo đường cong 3 hồi (góp ý dựng phim
// 12/10/2026): chương đầu tò mò, các chương giữa dồn dập theo cảm xúc chương, chương có nhiều cảm xúc mạnh nhất là cao trào,
// chương cuối lắng đọng; tránh hai chương liền nhau cùng một bài khi thư viện có bài khác. Thiếu bài đúng cảm xúc thì lấy
// bài gần nghĩa, rồi bài bất kỳ. Trả 'cam_xuc:bài1|bài2|…' (một bài mỗi chương) hoặc null khi không có nhạc.
const AM_LUONG_NHAC_YT = 30
// Nhạc Kevin MacLeod (incompetech.com, CC BY 4.0, dùng được cho video bật kiếm tiền) lưu tên "<cảm xúc>_<Tên-Bài>.mp3"
// (tải lên 12/10/2026): giấy phép bắt buộc ghi tên bài + tác giả + giấy phép trong mô tả YouTube
function ghiNguonNhac(maNhac: string | null) {
  const bai = [...new Set((maNhac?.replace(/^cam_xuc:/, '').split('|') ?? []).filter((t) => t.includes('_')))]
  if (!bai.length) return ''
  return [
    'Nhạc nền:',
    ...bai.map((t) => `- "${t.slice(t.indexOf('_') + 1).replace(/\.[a-z0-9]+$/i, '').replace(/-/g, ' ')}" Kevin MacLeod (incompetech.com)`),
    'Licensed under Creative Commons: By Attribution 4.0',
    'https://creativecommons.org/licenses/by/4.0/',
  ].join('\n')
}
const TU_CAM_XUC = {
  to_mo: /to-mo|bi-an|mystery|curious|tom-mo/,
  hoi_hop: /hoi-hop|cang|tension|suspense|kich|don-dap/,
  hung: /hung|hao|epic|anh-hung|chien-thang|vinh-quang|cao-trao/,
  lang: /lang|nhe|calm|em-dem|chill|piano|ket/,
  buon: /buon|sad|tiec|mat-mat/,
  vui: /vui|happy|tuoi|fun/,
} as const
type CamXucNhac = keyof typeof TU_CAM_XUC
// Cảm xúc dự phòng khi thư viện không có bài đúng cảm xúc
const GAN_NGHIA: Record<CamXucNhac, CamXucNhac[]> = {
  to_mo: ['hoi_hop', 'lang'],
  hoi_hop: ['hung', 'to_mo'],
  hung: ['hoi_hop', 'vui'],
  lang: ['buon', 'to_mo'],
  buon: ['lang', 'to_mo'],
  vui: ['hung', 'lang'],
}
// Độ "mạnh" của chương: cảm xúc mạnh, cảnh hành động lớn, khoảng lặng có chủ đích
function doManh(loi: CauYT[]) {
  let d = 0
  for (const l of loi) {
    if (['bat_ngo', 'tuc_gian', 'lo_lang', 'buon'].includes(l.cam_xuc)) d += 1
    const hd = (l as CauYT & { hanh_dong?: string }).hanh_dong
    if (hd && hd !== 'khong') d += 2
    if (l.lang) d += 1
  }
  return d / Math.max(1, loi.length)
}
function camXucChuong(loi: CauYT[]): CamXucNhac {
  const dem = { hung: 0, buon: 0, hoi_hop: 0, vui: 0 }
  for (const l of loi) {
    if (l.cam_xuc === 'buon') dem.buon += 2
    if (l.cam_xuc === 'lo_lang') dem.hoi_hop += 1
    if (l.cam_xuc === 'tuc_gian' || l.cam_xuc === 'bat_ngo') dem.hoi_hop += 1.5
    if (l.cam_xuc === 'vui') dem.vui += 1
    if (l.cam_xuc === 'khang_dinh') dem.hung += 0.6
    const hd = (l as CauYT & { hanh_dong?: string }).hanh_dong
    if (hd === 'xung_tran' || hd === 'ky_binh') dem.hung += 3
    if (hd === 'phao_hoa' || hd === 'dam_dong') dem.hung += 2
  }
  return Object.entries(dem).sort((a, b) => b[1] - a[1])[0][0] as CamXucNhac
}
// Nhạc không bật đều một mức từ đầu đến cuối: hệ số âm lượng từng chương (nhân với AM_LUONG_NHAC_YT) — mở đầu vừa phải,
// chương giữa to hơn, chương cao trào to nhất, chương cuối (đúc kết bài học) nhỏ lại cho lời đúc kết rõ. Máy nhà bản 6+.
function amLuongNhacPhan(d: DuAnYT) {
  const n = d.phan.length
  if (n === 1) return [1]
  const manh = d.phan.map((p) => doManh(p.loi ?? []))
  const caoTrao = n >= 3 ? manh.slice(1, -1).reduce((m, x, i) => (x > manh[m] ? i + 1 : m), 1) : -1
  return d.phan.map((_, k) => (k === 0 ? 0.9 : k === n - 1 ? 0.75 : k === caoTrao ? 1.35 : 1.15))
}
export async function nhacCuaDuAn(d: DuAnYT) {
  if (!batNhacNen() || !d.phan.length) return null
  const boDau = (x: string) => x.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  // Chỉ bài đặt tên theo cảm xúc (nhạc nền không lời chủ trang tải cho YouTube). Bài khác trong thư viện (nhạc TikTok,
  // có thể có lời hát) không bao giờ dùng: không có bài nào đúng tên thì video không nhạc (chủ trang yêu cầu 12/10/2026)
  const dsTen = (await dsNhac().catch(() => [])).map((x) => x.ten).filter((t) => Object.values(TU_CAM_XUC).some((r) => r.test(boDau(t))))
  if (!dsTen.length) return null
  const n = d.phan.length
  const manh = d.phan.map((p) => doManh(p.loi ?? []))
  // Cao trào: chương mạnh nhất trong các chương giữa (phim 3 chương trở lên)
  const caoTrao = n >= 3 ? manh.slice(1, -1).reduce((m, x, i) => (x > manh[m] ? i + 1 : m), 1) : -1
  const ra: string[] = []
  d.phan.forEach((p, k) => {
    const cx: CamXucNhac = n === 1 ? camXucChuong(p.loi ?? []) : k === 0 ? 'to_mo' : k === n - 1 ? (camXucChuong(p.loi ?? []) === 'vui' ? 'vui' : 'lang') : k === caoTrao ? 'hung' : camXucChuong(p.loi ?? []) === 'buon' ? 'buon' : 'hoi_hop'
    const hop = [cx, ...GAN_NGHIA[cx]].flatMap((c) => dsTen.filter((t) => TU_CAM_XUC[c].test(boDau(t))))
    const truoc = ra[k - 1]
    ra.push(hop.find((t) => t !== truoc) ?? hop[0] ?? dsTen.find((t) => t !== truoc) ?? dsTen[0])
  })
  return `cam_xuc:${ra.join('|')}`
}

// Gửi máy nhà dựng các phần chưa xong (hoặc chỉ phần `chiPhan`). Mọi phần phải có lời thoại: máy nhà cần mã của
// mọi phần để biết khi nào đủ mà ghép.
export async function guiDung(d: DuAnYT, chiPhan?: number) {
  if (d.phan.some((p) => !p.loi)) throw new Error('Còn phần chưa có lời thoại, chờ AI viết xong đã')
  // Bắt buộc đạt chuẩn hội đồng phản biện + biên tập viên mới được dựng
  const chuaDat = khauChuaDat(d)
  if (chuaDat.length) throw new Error(`Chưa dựng được: còn ${chuaDat.length} khâu hội đồng / biên tập viên chấm chưa đạt (${chuaDat.map((x) => x.ten).join('; ')}). Bấm "Làm lại cho đạt" để AI làm lại.`)
  if (!daDuyet(d)) throw new Error(d.duyet ? 'Kịch bản đã đổi sau lần duyệt trước: đọc lại rồi bấm "Duyệt kịch bản" trước khi dựng' : 'Chưa duyệt kịch bản: đọc lướt kịch bản rồi bấm "Duyệt kịch bản" trước khi dựng')
  // Có ảnh nền theo địa điểm: gắn các cảnh chưa gắn vào địa điểm trước khi tính mã phần
  if (await ganDiaDiem(d)) await luuDuAn(d)
  const tt = await trangThaiDuAn(d, null)
  const ma = d.phan.map((_, i) => maPhan(d, i + 1))
  // Nhạc nền theo từng chương (nhacCuaDuAn): máy nhà ghép dải nhạc theo độ dài từng phần, nhỏ đi khi có giọng đọc
  const maNhac = await nhacCuaDuAn(d)
  const nhac = { nhac: maNhac, nhac_phan: maNhac ? maNhac.slice(8).split('|') : null, am_luong_phan: maNhac ? amLuongNhacPhan(d) : null, am_luong_nhac: AM_LUONG_NHAC_YT }
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
// ── Shorts: 3 đoạn gay cấn nhất (40-55 giây + ~5 giây lời mời xem bản đầy đủ ≈ 45-60 giây; thiếu đoạn đủ dài thì
// lấy đoạn từ 25 giây) dựng lại ở khung dọc 9:16 ──
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
  const ung: { phan: number; tu: number; den: number; diem: number; giay: number }[] = []
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
        if (giay >= 25) ung.push({ phan: i + 1, tu, den, diem: diem / Math.sqrt(den - tu + 1), giay })
      }
    }
  })
  const chon: typeof ung = []
  // Đoạn đủ dài (từ 40 giây) xếp trước, rồi mới tới đoạn ngắn hơn
  for (const u of ung.sort((a, b) => Number(b.giay >= 40) - Number(a.giay >= 40) || b.diem - a.diem)) {
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
  const [{ data }, { data: nen }] = await Promise.all([kho().list(thuMuc(id), { limit: 100 }), kho().list(`${thuMuc(id)}/nen`, { limit: 100 })])
  await kho().remove([
    ...(data ?? []).map((f) => `${thuMuc(id)}/${f.name}`),
    ...(nen ?? []).map((f) => `${thuMuc(id)}/nen/${f.name}`),
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
  // Chạy lại một khâu đã bị hội đồng chấm chưa đạt: lần làm đầu đã sửa theo góp ý lần trước
  const truoc = (pb?: KetQuaPhanBien) => ({ gopYTruoc: pb && !hoiDongDat(pb) ? chuGopY(pb) : undefined })
  if (buoc === 'nghien_cuu') {
    const [wiki, anh] = await Promise.all([nguonWiki(p.ten), anhWiki(p.ten).catch(() => [])])
    p.anh = anh
    const ds = [
      ...wiki.map((w, i) => ({ ten: `Nguồn ${i + 1} — Wikipedia ${w.ngon_ngu === 'vi' ? 'tiếng Việt' : 'tiếng Anh'}: ${w.tieu_de} (${w.url})`, chu: w.noi_dung })),
      ...(p.tai_lieu ? [{ ten: `Nguồn ${wiki.length + 1} — Tài liệu chủ kênh cung cấp`, chu: p.tai_lieu }] : []),
    ]
    const { kq, pb } = await voiPhanBien('nghien_cuu', nguCanh, () => nghienCuuNhanVat(p.ten, p.ghi_chu, ds.map((x) => `<source name="${x.ten}">\n${x.chu}\n</source>`).join('\n\n')), json, truoc(d.phan_bien?.nghien_cuu))
    if (!kq) throw new Error('AI chưa nghiên cứu được, thử lại sau ít phút')
    if (pb) pbMoi.nghien_cuu = pb
    p.nghien_cuu = kq
    p.nguon = wiki.map((w) => ({ tieu_de: `Wikipedia (${w.ngon_ngu}): ${w.tieu_de}`, url: w.url }))
  } else if (buoc === 'cau_chuyen') {
    if (!p.nghien_cuu) throw new Error('Chưa có bước nghiên cứu')
    const nc = p.nghien_cuu
    const { kq, pb } = await voiPhanBien('cau_chuyen', nguCanh, () => phatTrienCauChuyen({ ten: p.ten, ghiChu: p.ghi_chu, nghienCuu: nc, phut: d.phut, soPhan: soPhanCho(d.phut) }), json, truoc(d.phan_bien?.cau_chuyen))
    if (!kq) throw new Error('AI chưa phát triển được câu chuyện, thử lại sau ít phút')
    if (pb) pbMoi.cau_chuyen = pb
    p.cau_chuyen = kq
    d.tieu_de = (await chinhTaTieuDe([kq.tieu_de]))[0].slice(0, 100)
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
    const { kq, pb } = await voiPhanBien('tao_hinh', nguCanh, () => thietKeNhanVatChinh({ ten: p.ten, nghienCuu: nc, cauChuyen: cc }), json, truoc(d.phan_bien?.tao_hinh))
    const th = kq ?? TAO_HINH_MAC_DINH
    p.tao_hinh = { ...th, gioi: gioiPhim(d, th) }
    if (pb) pbMoi.tao_hinh = pb
  } else if (buoc === 'ho_so') {
    if (!p.nghien_cuu || !p.cau_chuyen) throw new Error('Chưa có nghiên cứu và câu chuyện')
    const nc = p.nghien_cuu
    const cc = p.cau_chuyen
    const { kq, pb } = await voiPhanBien('ho_so', nguCanh, () => hoSoHinhAnh({ ten: p.ten, nghienCuu: nc, cauChuyen: cc }), json, truoc(d.phan_bien?.ho_so))
    if (!kq) throw new Error('AI chưa lập được hồ sơ hình ảnh, thử lại sau ít phút')
    if (pb) pbMoi.ho_so = pb
    p.ho_so = kq
  } else if (buoc === 'phan_canh') {
    const phan = k ? d.phan[k - 1] : undefined
    if (!k || !phan?.loi || !p.cau_chuyen) throw new Error('Chương này chưa có kịch bản')
    const cc = p.cau_chuyen
    const loiChuong = phan.loi as CauPhim[]
    const { kq, pb } = await voiPhanBien('phan_canh', `${nguCanh}\nChương ${k}: ${phan.tieu_de}`, () => phanCanhChuong({ ten: p.ten, hoSo: p.ho_so ?? null, cauChuyen: cc, k, loi: loiChuong }), json, truoc(phan.phan_bien_canh))
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
    const { kq, pb } = await voiPhanBien('dong_goi', nguCanh, () => dongGoiYouTube({ ten: p.ten, nghienCuu: nc, cauChuyen: cc, kichBan }), json, truoc(d.phan_bien?.dong_goi))
    if (!kq) throw new Error('AI chưa đóng gói được, thử lại sau ít phút')
    if (pb) pbMoi.dong_goi = pb
    p.dong_goi = kq
    if (kq.top5.length) kq.top5 = await chinhTaTieuDe(kq.top5)
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


// ---------- Ảnh nền theo địa điểm của phim tiểu sử ----------
// Hồ sơ phim có danh sách địa điểm (ho_so.dia_diem, mã LOC_xx). Chủ trang tải mỗi địa điểm một ảnh nền (kho
// youtube/<id>/nen/<mã>.<đuôi>, ghi vào phim.nen). Lúc gửi dựng, AI gắn từng cảnh của kịch bản (các câu liền nhau cùng
// bối cảnh) vào một địa điểm (câu.dia_diem); máy nhà dùng ảnh của địa điểm đó làm nền cảnh thay tranh Pixabay / cảnh vẽ.
const DUOI_NEN = /\.(jpe?g|png|webp)$/i
const duongNen = (id: string, tep: string) => `${thuMuc(id)}/nen/${tep}`
const kiemDiaDiem = (d: DuAnYT | null, ma: string) => {
  if (!d?.phim?.ho_so?.dia_diem?.some((x) => x.ma === ma)) throw new Error('Không có địa điểm này trong hồ sơ phim')
  return d
}

export async function linkTaiNenPhim(id: string, ma: string, tenGoc: string) {
  const d = kiemDiaDiem(await docDuAn(id), ma)
  const duoi = tenGoc.match(DUOI_NEN)?.[0].toLowerCase().replace('.jpeg', '.jpg')
  if (!duoi) throw new Error('Chỉ nhận ảnh .jpg, .png, .webp')
  const cu = d.phim?.nen?.[ma]
  if (cu && !cu.tep.endsWith(duoi)) await kho().remove([duongNen(id, cu.tep)])
  // Kèm link tải ảnh xem trước nhỏ (trình duyệt tự thu nhỏ): ảnh gốc thường ~9 MB, hiện trên trang rất chậm
  const [goc, nho] = await Promise.all([
    kho().createSignedUploadUrl(duongNen(id, `${ma}${duoi}`), { upsert: true }),
    kho().createSignedUploadUrl(duongNen(id, `${ma}-nho.jpg`), { upsert: true }),
  ])
  if (goc.error || !goc.data) throw new Error(`Không tạo được link tải lên: ${goc.error?.message ?? 'lỗi'}`)
  return { url: goc.data.signedUrl, urlNho: nho.data?.signedUrl ?? null, tep: `${ma}${duoi}` }
}

// Trình duyệt tải ảnh lên xong thì ghi vào dự án (lúc tải = mã phiên bản, thay ảnh thì các chương dùng địa điểm này dựng lại)
export async function xongTaiNenPhim(id: string, ma: string, tep: string, nho = false) {
  const d = kiemDiaDiem(await docDuAn(id), ma)
  if (!DUOI_NEN.test(tep) || !tep.startsWith(ma)) throw new Error('Tên tệp không hợp lệ')
  d.phim!.nen = { ...(d.phim!.nen ?? {}), [ma]: { tep, luc: Date.now(), ...(nho ? { nho: true } : {}) } }
  await luuDuAn(d)
  return d
}

// AI vẽ ảnh nền cho một địa điểm (Gemini, lib/veAnhNen.ts) theo đúng mô tả trong hồ sơ phim, lưu như ảnh chủ trang tải
// lên (thay ảnh cũ). Chủ trang vẫn thay bằng ảnh tự chọn được.
export async function veNenPhim(id: string, ma: string) {
  const d = kiemDiaDiem(await docDuAn(id), ma)
  const x = d.phim!.ho_so!.dia_diem.find((v) => v.ma === ma)!
  const moTa = [
    `${x.ten}, ${[x.thanh_pho, x.quoc_gia].filter(Boolean).join(', ')}, era: ${x.thoi_ky}.`,
    ...([['Architecture', x.kien_truc], ['Interior', x.noi_that], ['Exterior', x.ngoai_that], ['Colours', x.mau_sac], ['Light', x.anh_sang], ['Weather', x.thoi_tiet], ['Props', x.dao_cu], ['Atmosphere', x.khong_khi]] as const)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}.`),
  ].join('\n')
  const anh = await veAnhGemini(moTa)
  const duoi = anh.mime.includes('jpeg') ? '.jpg' : anh.mime.includes('webp') ? '.webp' : '.png'
  const cu = d.phim?.nen?.[ma]
  if (cu && !cu.tep.endsWith(duoi)) await kho().remove([duongNen(id, cu.tep), duongNen(id, `${ma}-nho.jpg`)])
  const { error } = await kho().upload(duongNen(id, `${ma}${duoi}`), anh.du_lieu, { contentType: anh.mime, upsert: true })
  if (error) throw new Error(`Không lưu được ảnh: ${error.message}`)
  return xongTaiNenPhim(id, ma, `${ma}${duoi}`)
}

export async function xoaNenPhim(id: string, ma: string) {
  const d = kiemDiaDiem(await docDuAn(id), ma)
  const cu = d.phim?.nen?.[ma]
  if (cu) await kho().remove([duongNen(id, cu.tep), duongNen(id, `${ma}-nho.jpg`)])
  if (d.phim?.nen) delete d.phim.nen[ma]
  await luuDuAn(d)
  return d
}

export async function linkXemNenPhim(d: DuAnYT): Promise<Record<string, string>> {
  const ds = Object.entries(d.phim?.nen ?? {})
  if (!ds.length) return {}
  const { data } = await kho().createSignedUrls(ds.map(([ma, v]) => duongNen(d.id, v.nho ? `${ma}-nho.jpg` : v.tep)), 3600)
  return Object.fromEntries(ds.map(([ma], i) => [ma, data?.[i]?.signedUrl ?? '']))
}

// Cảnh = các câu liền nhau cùng bối cảnh trong một chương (cùng cách chia với máy nhà)
const cacCanh = (d: DuAnYT) =>
  d.phan.flatMap((p, k) => {
    const loi = p.loi ?? []
    const ds: { k: number; tu: number; het: number }[] = []
    loi.forEach((l, i) => {
      if (i && l.boi_canh === loi[i - 1].boi_canh) ds[ds.length - 1].het = i
      else ds.push({ k, tu: i, het: i })
    })
    return ds
  })

const GanDiaDiemSchema = z.object({ gan: z.array(z.object({ canh: z.string(), ma: z.string() })) })

// Gắn cảnh → địa điểm (một lượt AI), chỉ khi có ảnh nền và còn cảnh chưa gắn (kịch bản mới / vừa sửa). Trả true nếu đã gắn
export async function ganDiaDiem(d: DuAnYT) {
  const dd = d.phim?.ho_so?.dia_diem ?? []
  if (!dd.length || !Object.keys(d.phim?.nen ?? {}).length || d.phan.some((p) => !p.loi)) return false
  const canh = cacCanh(d)
  if (!canh.some((c) => d.phan[c.k].loi![c.tu].dia_diem === undefined)) return false
  const kq = await goiJson({
    system: `You are the production designer of an animated biography film. For every scene of the script, pick the location from the film bible where it takes place (ma). Use "" ONLY for the TV studio where the two mascot hosts talk; for any other scene pick the closest fitting location (the same city, the same period, the place the person is at that moment) rather than leaving it empty, so the film does not fall back to a generic backdrop. Use the chapter, the year, the scene setting (boi_canh) and what the lines describe.`,
    noiDung: JSON.stringify({
      dia_diem: dd.map((x) => ({ ma: x.ma, ten: x.ten, thanh_pho: x.thanh_pho, thoi_ky: x.thoi_ky })),
      canh: canh.map((c) => ({
        canh: `${c.k + 1}-${c.tu}`,
        chuong: d.phan[c.k].tieu_de,
        boi_canh: d.phan[c.k].loi![c.tu].boi_canh,
        loi: d.phan[c.k].loi!.slice(c.tu, c.het + 1).map((l) => l.chu.slice(0, 90)).join(' / ').slice(0, 400),
      })),
    }),
    effort: 'low',
    kiemTra: GanDiaDiemSchema,
    schema: {
      type: 'object', additionalProperties: false, required: ['gan'],
      properties: { gan: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['canh', 'ma'], properties: { canh: { type: 'string' }, ma: { type: 'string' } } } } },
    },
  })
  if (!kq) throw new Error('AI chưa gắn được cảnh vào địa điểm (để dùng ảnh nền), thử lại sau ít phút')
  const theo = new Map(kq.gan.map((g) => [g.canh, dd.some((x) => x.ma === g.ma) ? g.ma : '']))
  for (const c of canh) {
    const ma = theo.get(`${c.k + 1}-${c.tu}`) ?? ''
    for (let i = c.tu; i <= c.het; i++) d.phan[c.k].loi![i].dia_diem = ma
  }
  return true
}

// Địa điểm → số cảnh đang dùng (hiện trên trang sau khi đã gắn)
export const soCanhTheoDiaDiem = (d: DuAnYT) => {
  const dem: Record<string, number> = {}
  for (const c of cacCanh(d)) {
    const ma = d.phan[c.k].loi?.[c.tu]?.dia_diem
    if (ma) dem[ma] = (dem[ma] ?? 0) + 1
  }
  return dem
}

// Lỗi nặng biên tập viên còn lại → lời góp ý cho AI sửa kịch bản (cùng cách đưa như góp ý hội đồng)
const chuBienTap = (kd: Pick<KetQuaKiemDinh, 'ghi_chu'>) => `Biên tập viên kiểm định phát hiện các lỗi bắt buộc phải sửa:\n${loiBienTap(kd).map((x) => `- ${x}`).join('\n')}`
