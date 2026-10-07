import 'server-only'
import { createHash } from 'node:crypto'
import { vietLoiThoai } from './ai'
import { db, type BaiViet } from './db'
import { GIONG } from './dsGiong'

// Video hoạt hình nhân vật: Mèo Mun hỏi, Robot Bit giải thích, bối cảnh đổi theo lời thoại. Trang web nhờ AI viết lời
// thoại rồi để phiếu việc trong kho; thợ ở máy nhà (may-nha/tho_doc.py + may-nha/hoat-hinh) đọc hai giọng, dựng bằng
// HyperFrames, trộn nhạc nền và gửi video lên đúng tên tệp đã hẹn. Mặc định bật; VIDEO_HOAT_HINH=0 để chỉ dùng video thường.
export const batHoatHinh = () => process.env.VIDEO_HOAT_HINH !== '0'

const KHO = 'video-tiktok' // cùng kho với video thường (lib/video.ts)
const PHIEN_BAN = 1 // tăng khi đổi cách dựng để bỏ video hoạt hình cũ
export const NHAN_VAT = { meo: { ten: 'Mèo Mun', giong: 'Ngọc Huyền' }, robot: { ten: 'Robot Bit', giong: GIONG } }

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

export type TrangThaiHoatHinh = { loai: 'xong' | 'dang_lam' | 'cho' | 'chua' } | { loai: 'loi'; loi: string }

export async function trangThaiHoatHinh(ten: string): Promise<TrangThaiHoatHinh> {
  const [thuMuc, tep] = ten.split('/')
  const ma = maViec(ten)
  const [xong, kq, cho, dangLam] = await Promise.all([
    coTep(thuMuc, tep),
    docJson<{ loi?: string }>(`hang-doi/xong/${ma}.json`),
    coTep('hang-doi/viec', `${ma}.json`),
    docJson<{ ten?: string; luc?: number }>('hang-doi/dang-lam.json'),
  ])
  if (xong) return { loai: 'xong' }
  if (kq?.loi) return { loai: 'loi', loi: kq.loi }
  if (cho) return { loai: 'cho' }
  // Thợ dựng một video mất vài phút; quá 15 phút chưa xong coi như đã hỏng
  if (dangLam?.ten === ten && Date.now() - (dangLam.luc ?? 0) < 15 * 60_000) return { loai: 'dang_lam' }
  return { loai: 'chua' }
}

// Đặt việc dựng video hoạt hình (nếu chưa có ai làm). Lần trước lỗi thì xóa lỗi và đặt lại.
export async function datViecHoatHinh(bai: BaiViet, ten: string, nhac: string | null, tt?: TrangThaiHoatHinh) {
  tt ??= await trangThaiHoatHinh(ten)
  if (tt.loai !== 'chua' && tt.loai !== 'loi') return tt
  const ma = maViec(ten)
  if (tt.loai === 'loi') await kho().remove([`hang-doi/xong/${ma}.json`])
  const loi = await vietLoiThoai(bai)
  if (!loi) throw new Error('AI không viết được lời thoại cho bài này')
  const viec = { loai: 'hoat_hinh', ten, nhac, loi_thoai: { kenh: 'Công Nghệ 24H', chu_de: bai.chu_de, nhan_vat: NHAN_VAT, loi } }
  const { error } = await kho().upload(`hang-doi/viec/${ma}.json`, JSON.stringify(viec), { contentType: 'application/json', upsert: true })
  if (error) throw new Error(`Không gửi được việc cho máy nhà: ${error.message}`)
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
