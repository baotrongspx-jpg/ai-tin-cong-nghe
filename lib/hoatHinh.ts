import 'server-only'
import { createHash } from 'node:crypto'
import { after } from 'next/server'
import { vietLoiThoai } from './ai'
import { db, type BaiViet } from './db'
import { GIONG } from './dsGiong'
import { maNhac, type Nhac } from './nhacNen'

// Video hoạt hình nhân vật: Mèo Mun hỏi, Robot Bit giải thích, bối cảnh đổi theo lời thoại. Trang web nhờ AI viết lời
// thoại rồi để phiếu việc trong kho; thợ ở máy nhà (may-nha/tho_doc.py + may-nha/hoat-hinh) đọc hai giọng, dựng bằng
// HyperFrames, trộn nhạc nền và gửi video lên đúng tên tệp đã hẹn. Mặc định bật; VIDEO_HOAT_HINH=0 để chỉ dùng video thường.
export const batHoatHinh = () => process.env.VIDEO_HOAT_HINH !== '0'

const KHO = 'video-tiktok' // cùng kho với video thường (lib/video.ts)
const PHIEN_BAN = 8 // tăng khi đổi cách dựng để bỏ video hoạt hình cũ
// Mỗi người nói một giọng VieNeu riêng (nhân vật phụ: may-nha/hoat-hinh/nhanVatPhu.mjs)
export const NHAN_VAT = {
  meo: { ten: 'Mèo Mun', giong: 'Ngọc Huyền' },
  robot: { ten: 'Robot Bit', giong: GIONG },
  nguoi_phu_nu: { ten: 'Người phụ nữ', giong: 'Đoan Trang' },
  canh_sat: { ten: 'Cảnh sát', giong: 'Minh Đức' },
  hacker: { ten: 'Hacker', giong: 'Adam bựa' },
  doanh_nhan: { ten: 'Doanh nhân', giong: 'Quốc Tuấn' },
  nha_khoa_hoc: { ten: 'Nhà khoa học', giong: 'Thiện Minh' },
  nguoi_dung: { ten: 'Người dùng', giong: 'Phạm Tuyên' },
  ong_lao: { ten: 'Ông lão', giong: 'Thiền Tâm Đức' },
  ba_lao: { ten: 'Bà lão', giong: 'Thục Đoan' },
  hoc_sinh: { ten: 'Học sinh', giong: 'Quỳnh Anh' },
  cong_nhan: { ten: 'Công nhân', giong: 'Đức Trí' },
  nong_dan: { ten: 'Nông dân', giong: 'Quang Sơn' },
  bac_si: { ten: 'Bác sĩ', giong: 'Mai Anh' },
  giao_vien: { ten: 'Giáo viên', giong: 'Ngọc Linh' },
  ky_su: { ten: 'Kỹ sư', giong: 'Minh Triết' },
  bo_doi: { ten: 'Quân nhân', giong: 'Xuân Vĩnh' },
  phong_vien: { ten: 'Phóng viên', giong: 'Thùy Dung' },
  chinh_khach: { ten: 'Lãnh đạo', giong: 'Thái Sơn' },
  van_dong_vien: { ten: 'Vận động viên', giong: 'Adam' },
  nghe_si: { ten: 'Nghệ sĩ', giong: 'Trúc Ly' },
  dau_bep: { ten: 'Đầu bếp', giong: 'Phạm Tuyên' },
  nu_doanh_nhan: { ten: 'Nữ doanh nhân', giong: 'Kim Thanh' },
  nguoi_nuoc_ngoai: { ten: 'Người nước ngoài', giong: 'Adam bựa' },
  // Vai cổ trang
  vua: { ten: 'Nhà vua', giong: 'Minh Đức' },
  hoang_hau: { ten: 'Hoàng hậu', giong: 'Đoan Trang' },
  tuong_quan: { ten: 'Tướng quân', giong: 'Xuân Vĩnh' },
  chien_binh: { ten: 'Chiến binh', giong: 'Quốc Tuấn' },
  nha_su: { ten: 'Nhà sư', giong: 'Thiền Tâm Đức' },
  phu_nu_xua: { ten: 'Phụ nữ thời xưa', giong: 'Ngọc Trân' },
  nong_dan_xua: { ten: 'Nông dân thời xưa', giong: 'Quang Sơn' },
  quan_lai: { ten: 'Quan lại', giong: 'Minh Triết' },
  // Người kể phim tài liệu (trang YouTube, phim tiểu sử): giọng kể chuyện, không đứng trên sân khấu
  nguoi_ke: { ten: 'Người kể', giong: 'Thanh Bình' },
}

const bam = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16)
const kho = () => db().storage.from(KHO)

// `chuDoc`: chữ được đọc (lib/video.ts chuDeDoc); `nhac`: bản nhạc nền. Sửa bài / đổi nhạc thì dựng lại.
export const tenVideoHoatHinh = (bai: BaiViet, chuDoc: string, nhac: Nhac) =>
  `${bai.id}/hh-${bam([PHIEN_BAN, chuDoc, bai.chu_de, maNhac(nhac)])}.mp4`
const maViec = (ten: string) => `hh-${bam(ten)}`

const coTep = async (thuMuc: string, ten: string) => {
  const { data } = await kho().list(thuMuc, { search: ten })
  return !!data?.some((f) => f.name === ten)
}
const docJson = async <T>(duong: string): Promise<T | null> => {
  const { data } = await kho().download(duong)
  return data ? (JSON.parse(await data.text()) as T) : null
}

// Người dùng đang bấm Xem trước bài này: đánh dấu để thợ máy nhà làm trước các video dựng sẵn trong nền
export async function uuTienHoatHinh(ten: string) {
  await kho().upload(`hang-doi/uu-tien/${maViec(ten)}.json`, JSON.stringify({ luc: Date.now() }), { contentType: 'application/json', upsert: true })
}

// Số video hoạt hình xếp hàng trước bài này (thợ làm việc ưu tiên trước, cùng nhóm thì việc đặt trước làm trước)
export async function viTriHoatHinh(ten: string) {
  const [{ data: viec }, { data: uu }, dangLam] = await Promise.all([
    kho().list('hang-doi/viec', { limit: 200, sortBy: { column: 'created_at', order: 'asc' } }),
    kho().list('hang-doi/uu-tien', { limit: 200 }),
    docJson<{ ten?: string; luc?: number }>('hang-doi/dang-lam.json'),
  ])
  const uuTien = new Set((uu ?? []).map((f) => f.name))
  const ds = (viec ?? []).filter((f) => f.name.startsWith('hh-')).map((f) => f.name)
  const thuTu = [...ds.filter((n) => uuTien.has(n)), ...ds.filter((n) => !uuTien.has(n))]
  const vt = thuTu.indexOf(`${maViec(ten)}.json`)
  // Video máy nhà đang dựng dở (đã rời hàng đợi) cũng phải xong mới tới lượt bài này; kèm % của nó để trang hiện
  // "video phía trước đang dựng X%" thay vì đứng yên ở 10%
  const khac = dangLam?.ten && dangLam.ten !== ten && Date.now() - (dangLam.luc ?? 0) < 15 * 60_000 ? dangLam.ten : null
  const tdKhac = khac ? await docJson<{ phanTram?: number }>(`hang-doi/tien-do/${maViec(khac)}.json`) : null
  return { truoc: (vt < 0 ? 0 : vt) + (khac ? 1 : 0), phanTramTruoc: khac ? (tdKhac?.phanTram ?? 0) : undefined }
}

// tienDo: phần trăm + bước đang làm (máy nhà ghi ở hang-doi/tien-do khi đang dựng; đang viết lời thoại / xếp hàng thì ước lượng)
export type TienDo = { phanTram: number; buoc: string }
export type TrangThaiHoatHinh =
  | { loai: 'xong' | 'chua' }
  | { loai: 'dang_lam' | 'cho'; tienDo?: TienDo }
  | { loai: 'loi'; loi: string }

export async function trangThaiHoatHinh(ten: string): Promise<TrangThaiHoatHinh> {
  const [thuMuc, tep] = ten.split('/')
  const ma = maViec(ten)
  const [xong, kq, cho, dangViet, dangLam, tienDo] = await Promise.all([
    coTep(thuMuc, tep),
    docJson<{ loi?: string }>(`hang-doi/xong/${ma}.json`),
    coTep('hang-doi/viec', `${ma}.json`),
    docJson<{ luc?: number }>(`hang-doi/viet/${ma}.json`),
    docJson<{ ten?: string; luc?: number }>('hang-doi/dang-lam.json'),
    docJson<TienDo & { luc?: number }>(`hang-doi/tien-do/${ma}.json`),
  ])
  if (xong) return { loai: 'xong' }
  if (kq?.loi) return { loai: 'loi', loi: kq.loi }
  // AI đang viết lời thoại (chạy ngầm, gói Gemini miễn phí có lúc mất vài phút)
  if (cho) return { loai: 'cho', tienDo: { phanTram: 10, buoc: 'Chờ máy nhà' } }
  if (dangViet && Date.now() - (dangViet.luc ?? 0) < 6 * 60_000) return { loai: 'cho', tienDo: { phanTram: 5, buoc: 'AI đang viết lời thoại' } }
  // Thợ dựng một video mất vài phút; quá 15 phút chưa xong coi như đã hỏng
  if (dangLam?.ten === ten && Date.now() - (dangLam.luc ?? 0) < 15 * 60_000)
    return { loai: 'dang_lam', tienDo: tienDo ? { phanTram: tienDo.phanTram, buoc: tienDo.buoc } : { phanTram: 10, buoc: 'Máy nhà bắt đầu dựng' } }
  return { loai: 'chua' }
}

// Đặt việc dựng video hoạt hình (nếu chưa có ai làm). Lần trước lỗi thì xóa lỗi và đặt lại.
// `ngam` (mặc định): trả lời ngay, AI viết lời thoại sau khi đã trả lời (next/server after); lỗi ghi vào hang-doi/xong.
// Chỗ phải chờ có video ngay trong lượt (bấm Đăng) đặt ngam = false: after chỉ chạy khi lượt đó kết thúc.
export async function datViecHoatHinh(bai: BaiViet, ten: string, nhac: Nhac, tt?: TrangThaiHoatHinh, ngam = true) {
  tt ??= await trangThaiHoatHinh(ten)
  if (tt.loai !== 'chua' && tt.loai !== 'loi') return tt
  const ma = maViec(ten)
  if (tt.loai === 'loi') await kho().remove([`hang-doi/xong/${ma}.json`])
  const viet = async () => {
    const kb = await vietLoiThoai(bai)
    if (!kb) throw new Error('AI không viết được lời thoại cho bài này')
    const viec = { loai: 'hoat_hinh', ten, nhac: nhac?.ten ?? null, am_luong: nhac?.amLuong ?? 0, tieu_de: bai.tieu_de_anh, loi_thoai: { kenh: 'Công Nghệ 24H', chu_de: bai.chu_de, nhan_vat: NHAN_VAT, ...kb } }
    const { error } = await kho().upload(`hang-doi/viec/${ma}.json`, JSON.stringify(viec), { contentType: 'application/json', upsert: true })
    if (error) throw new Error(`Không gửi được việc cho máy nhà: ${error.message}`)
  }
  if (!ngam) {
    await viet()
    return { loai: 'cho' } as const
  }
  await kho().upload(`hang-doi/viet/${ma}.json`, JSON.stringify({ luc: Date.now() }), { contentType: 'application/json', upsert: true })
  after(async () => {
    try {
      await viet()
    } catch (e) {
      const loi = e instanceof Error ? e.message : String(e)
      await kho().upload(`hang-doi/xong/${ma}.json`, JSON.stringify({ loi }), { contentType: 'application/json', upsert: true })
    } finally {
      await kho().remove([`hang-doi/viet/${ma}.json`])
    }
  })
  return { loai: 'cho' } as const
}

// Chờ máy nhà dựng xong (tối đa `giay`); xong trả true, lỗi thì ném lỗi, hết giờ trả false
export async function choHoatHinh(ten: string, giay: number) {
  const het = Date.now() + giay * 1000
  while (Date.now() < het) {
    const tt = await trangThaiHoatHinh(ten)
    if (tt.loai === 'xong') return true
    if (tt.loai === 'loi') throw new Error(`Dựng video hoạt hình lỗi: ${tt.loi}`)
    await new Promise((r) => setTimeout(r, 4000))
  }
  return false
}
