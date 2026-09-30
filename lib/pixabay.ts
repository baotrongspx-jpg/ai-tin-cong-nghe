import 'server-only'
import { nhoTam } from './nhoTam'

// Ảnh kho miễn phí Pixabay (dùng thương mại được, không bắt buộc ghi nguồn; mình vẫn ghi "Ảnh: Pixabay").
// Link ảnh Pixabay trả về chỉ dùng được một thời gian, nên lưu mã ảnh và lấy lại link mỗi khi vẽ.
export const coPixabay = () => !!process.env.PIXABAY_KEY

export type AnhPixabay = { id: number; xemTruoc: string; lon: string; tacGia: string }

type Hit = { id: number; previewURL: string; webformatURL: string; largeImageURL: string; user: string }

async function goi(tham: Record<string, string>): Promise<Hit[]> {
  const q = new URLSearchParams({ key: process.env.PIXABAY_KEY!, image_type: 'photo', safesearch: 'true', ...tham })
  const res = await fetch(`https://pixabay.com/api/?${q}`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Pixabay trả lỗi ${res.status}`)
  return ((await res.json()) as { hits: Hit[] }).hits
}

const doi = (h: Hit): AnhPixabay => ({ id: h.id, xemTruoc: h.webformatURL, lon: h.largeImageURL, tacGia: h.user })

// Tìm ảnh ngang theo từ khóa tiếng Anh, ảnh nhiều người dùng trước
export async function timAnh(tuKhoa: string, soLuong = 12): Promise<AnhPixabay[]> {
  if (!coPixabay() || !tuKhoa.trim()) return []
  const hits = await goi({ q: tuKhoa.trim().slice(0, 100), orientation: 'horizontal', order: 'popular', per_page: String(soLuong) })
  return hits.map(doi)
}

// Ảnh nền đã chọn, dạng data URL để nhúng vào ảnh bài. Nhớ 1 giờ để khỏi tải lại mỗi lần vẽ.
// Lỗi (ảnh bị xóa, hết lượt...) thì trả null: ảnh bài quay về nền màu, không hỏng.
export function layAnhNen(id: number): Promise<string | null> {
  return nhoTam(`anh_nen_${id}`, 3600_000, async () => {
    try {
      const [h] = await goi({ id: String(id) })
      if (!h) return null
      const res = await fetch(h.largeImageURL, { signal: AbortSignal.timeout(20_000) })
      if (!res.ok) return null
      const loai = res.headers.get('content-type') ?? 'image/jpeg'
      return `data:${loai};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
    } catch {
      return null
    }
  })
}
