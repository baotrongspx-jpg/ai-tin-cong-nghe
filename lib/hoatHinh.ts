import 'server-only'
import { createHash } from 'node:crypto'
import { after } from 'next/server'
import { vietLoiThoai } from './ai'
import { db, type BaiViet } from './db'
import { GIONG } from './dsGiong'

// Video hoạt hình nhân vật: Mèo Mun hỏi, Robot Bit giải thích, bối cảnh đổi theo lời thoại. Trang web nhờ AI viết lời
// thoại rồi để phiếu việc trong kho; thợ ở máy nhà (may-nha/tho_doc.py + may-nha/hoat-hinh) đọc hai giọng, dựng bằng
// HyperFrames, trộn nhạc nền và gửi video lên đúng tên tệp đã hẹn. Mặc định bật; VIDEO_HOAT_HINH=0 để chỉ dùng video thường.
export const batHoatHinh = () => process.env.VIDEO_HOAT_HINH !== '0'

const KHO = 'video-tiktok' // cùng kho với video thường (lib/video.ts)
const PHIEN_BAN = 6 // tăng khi đổi cách dựng để bỏ video hoạt hình cũ
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
}

const bam = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16)
const kho = () => db().storage.from(KHO)

// `chuDoc`: chữ được đọc (lib/video.ts chuDeDoc); `nhac`: bản nhạc nền. Sửa bài / đổi nhạc thì dựng lại.
export const tenVideoHoatHinh = (bai: BaiViet, chuDoc: string, nhac: string | null) =>
  `${bai.id}/hh-${bam([PHIEN_BAN, chuDoc, bai.chu_de, nhac])}.mp4`
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
  const [{ data: viec }, { data: uu }] = await Promise.all([
    kho().list('hang-doi/viec', { limit: 200, sortBy: { column: 'created_at', order: 'asc' } }),
    kho().list('hang-doi/uu-tien', { limit: 200 }),
  ])
  const uuTien = new Set((uu ?? []).map((f) => f.name))
  const ds = (viec ?? []).filter((f) => f.name.startsWith('hh-')).map((f) => f.name)
  const thuTu = [...ds.filter((n) => uuTien.has(n)), ...ds.filter((n) => !uuTien.has(n))]
  const vt = thuTu.indexOf(`${maViec(ten)}.json`)
  return vt < 0 ? 0 : vt
}

export type TrangThaiHoatHinh = { loai: 'xong' | 'dang_lam' | 'cho' | 'chua' } | { loai: 'loi'; loi: string }

export async function trangThaiHoatHinh(ten: string): Promise<TrangThaiHoatHinh> {
  const [thuMuc, tep] = ten.split('/')
  const ma = maViec(ten)
  const [xong, kq, cho, dangViet, dangLam] = await Promise.all([
    coTep(thuMuc, tep),
    docJson<{ loi?: string }>(`hang-doi/xong/${ma}.json`),
    coTep('hang-doi/viec', `${ma}.json`),
    docJson<{ luc?: number }>(`hang-doi/viet/${ma}.json`),
    docJson<{ ten?: string; luc?: number }>('hang-doi/dang-lam.json'),
  ])
  if (xong) return { loai: 'xong' }
  if (kq?.loi) return { loai: 'loi', loi: kq.loi }
  // AI đang viết lời thoại (chạy ngầm, gói Gemini miễn phí có lúc mất vài phút)
  if (cho || (dangViet && Date.now() - (dangViet.luc ?? 0) < 6 * 60_000)) return { loai: 'cho' }
  // Thợ dựng một video mất vài phút; quá 15 phút chưa xong coi như đã hỏng
  if (dangLam?.ten === ten && Date.now() - (dangLam.luc ?? 0) < 15 * 60_000) return { loai: 'dang_lam' }
  return { loai: 'chua' }
}

// Đặt việc dựng video hoạt hình (nếu chưa có ai làm). Lần trước lỗi thì xóa lỗi và đặt lại.
// `ngam` (mặc định): trả lời ngay, AI viết lời thoại sau khi đã trả lời (next/server after); lỗi ghi vào hang-doi/xong.
// Chỗ phải chờ có video ngay trong lượt (bấm Đăng) đặt ngam = false: after chỉ chạy khi lượt đó kết thúc.
export async function datViecHoatHinh(bai: BaiViet, ten: string, nhac: string | null, tt?: TrangThaiHoatHinh, ngam = true) {
  tt ??= await trangThaiHoatHinh(ten)
  if (tt.loai !== 'chua' && tt.loai !== 'loi') return tt
  const ma = maViec(ten)
  if (tt.loai === 'loi') await kho().remove([`hang-doi/xong/${ma}.json`])
  const viet = async () => {
    const kb = await vietLoiThoai(bai)
    if (!kb) throw new Error('AI không viết được lời thoại cho bài này')
    const viec = { loai: 'hoat_hinh', ten, nhac, loi_thoai: { kenh: 'Công Nghệ 24H', chu_de: bai.chu_de, nhan_vat: NHAN_VAT, ...kb } }
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
