'use server'

import { revalidatePath } from 'next/cache'
import { daDangNhap } from '@/lib/xacThuc'
import { mayNhaTat } from '@/lib/giongDoc'
import {
  bienTapPhim, chayBuocPhim, chonNhacDuAn, docDuAn, guiDung, kiemDinhLaiPhan, luuPhatAm, taoShorts, trangThaiShorts, suaThongTin, taoDuAn, taoPhim, trangThaiDuAn, vietLoiPhan, xoaDuAn,
  type BuocPhim, type DuAnYT, type TrangThaiBienTap, type TrangThaiDuAn, type TrangThaiShort,
} from '@/lib/youtube'

type Loi = { ok: false; loi: string }
const baoLoi = (e: unknown): Loi => ({ ok: false, loi: e instanceof Error ? e.message : 'Có lỗi' })

async function chanChuaDangNhap() {
  if (!(await daDangNhap())) throw new Error('Chưa đăng nhập')
}

export async function taoVideoYouTube(o: { baiIds: string[]; yTuong: string; phut: number }): Promise<{ ok: true; id: string } | Loi> {
  try {
    await chanChuaDangNhap()
    const d = await taoDuAn(o)
    revalidatePath('/youtube')
    return { ok: true, id: d.id }
  } catch (e) {
    return baoLoi(e)
  }
}

// Phim tiểu sử: tạo dự án (nhanh, chưa gọi AI); các giai đoạn chạy sau bằng chayBuocPhimYouTube
export async function taoPhimTieuSu(o: { ten: string; ghiChu: string; taiLieu: string; phut: number }): Promise<{ ok: true; id: string } | Loi> {
  try {
    await chanChuaDangNhap()
    const d = await taoPhim(o)
    revalidatePath('/youtube')
    return { ok: true, id: d.id }
  } catch (e) {
    return baoLoi(e)
  }
}

export async function chayBuocPhimYouTube(id: string, buoc: BuocPhim, k?: number): Promise<{ ok: true; duAn: DuAnYT } | Loi> {
  try {
    await chanChuaDangNhap()
    return { ok: true, duAn: await chayBuocPhim(id, buoc, k) }
  } catch (e) {
    return baoLoi(e)
  }
}

export async function vietPhanYouTube(id: string, k: number): Promise<{ ok: true; duAn: DuAnYT } | Loi> {
  try {
    await chanChuaDangNhap()
    return { ok: true, duAn: await vietLoiPhan(id, k) }
  } catch (e) {
    return baoLoi(e)
  }
}

// Biên tập viên kiểm định chạy lại trên lời thoại đang có (không gọi AI)
export async function kiemDinhYouTube(id: string, k: number): Promise<{ ok: true; duAn: DuAnYT } | Loi> {
  try {
    await chanChuaDangNhap()
    return { ok: true, duAn: await kiemDinhLaiPhan(id, k) }
  } catch (e) {
    return baoLoi(e)
  }
}

// Vòng biên tập cả phim bằng AI máy nhà: lần đầu gửi phiếu việc, gọi lại để lấy kết quả (batDauLai: gửi phiếu mới)
export async function bienTapYouTube(id: string, batDauLai = false): Promise<{ ok: true; tt: TrangThaiBienTap } | Loi> {
  try {
    await chanChuaDangNhap()
    return { ok: true, tt: await bienTapPhim(id, batDauLai) }
  } catch (e) {
    return baoLoi(e)
  }
}

export async function luuPhatAmYouTube(id: string, phatAm: string): Promise<{ ok: true } | Loi> {
  try {
    await chanChuaDangNhap()
    await luuPhatAm(id, phatAm)
    return { ok: true }
  } catch (e) {
    return baoLoi(e)
  }
}

export async function taoShortsYouTube(id: string): Promise<{ ok: true; duAn: DuAnYT } | Loi> {
  try {
    await chanChuaDangNhap()
    return { ok: true, duAn: await taoShorts(id) }
  } catch (e) {
    return baoLoi(e)
  }
}
export async function layShortsYouTube(id: string): Promise<{ ok: true; ds: TrangThaiShort[] } | Loi> {
  try {
    await chanChuaDangNhap()
    const d = await docDuAn(id)
    if (!d) throw new Error('Không tìm thấy video')
    return { ok: true, ds: await trangThaiShorts(d) }
  } catch (e) {
    return baoLoi(e)
  }
}

export async function layTrangThaiYouTube(id: string): Promise<{ ok: true; tt: TrangThaiDuAn } | Loi> {
  try {
    await chanChuaDangNhap()
    const d = await docDuAn(id)
    if (!d) throw new Error('Không tìm thấy video')
    return { ok: true, tt: await trangThaiDuAn(d, await mayNhaTat().catch(() => 'Không kiểm tra được máy nhà')) }
  } catch (e) {
    return baoLoi(e)
  }
}

// chiPhan: chỉ dựng lại một phần (phần lỗi); không có thì dựng mọi phần chưa xong
export async function dungVideoYouTube(id: string, chiPhan?: number): Promise<{ ok: true; so: number } | Loi> {
  try {
    await chanChuaDangNhap()
    const d = await docDuAn(id)
    if (!d) throw new Error('Không tìm thấy video')
    return { ok: true, so: await guiDung(d, chiPhan) }
  } catch (e) {
    return baoLoi(e)
  }
}

export async function chonNhacYouTube(id: string, nhac: string, amLuong: number): Promise<{ ok: true } | Loi> {
  try {
    await chanChuaDangNhap()
    await chonNhacDuAn(id, nhac, amLuong)
    return { ok: true }
  } catch (e) {
    return baoLoi(e)
  }
}

export async function luuThongTinYouTube(id: string, o: { tieu_de: string; mo_ta: string; the: string[] }): Promise<{ ok: true } | Loi> {
  try {
    await chanChuaDangNhap()
    await suaThongTin(id, o)
    revalidatePath('/youtube')
    return { ok: true }
  } catch (e) {
    return baoLoi(e)
  }
}

export async function xoaVideoYouTube(id: string): Promise<{ ok: true } | Loi> {
  try {
    await chanChuaDangNhap()
    await xoaDuAn(id)
    revalidatePath('/youtube')
    return { ok: true }
  } catch (e) {
    return baoLoi(e)
  }
}
