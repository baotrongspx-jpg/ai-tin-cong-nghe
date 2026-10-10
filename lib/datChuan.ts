// Chuẩn đạt của hội đồng phản biện (thang 10) và biên tập viên kiểm định (còn lỗi mức "loi" là chưa đạt).
// Khâu nào chưa đạt thì bắt buộc AI làm lại; còn khâu chưa đạt thì không cho dựng video.
// Dùng được ở cả máy chủ lẫn trình duyệt (không gọi AI, không đọc kho).
export const DIEM_DAT_HOI_DONG = 6
export const SO_LAN_LAM_LAI = 3 // trang tự cho AI làm lại tối đa bấy nhiêu lượt mỗi khâu trong một lần chạy

type PB = { diem: number } | null | undefined
type KD = { ghi_chu: { muc: string; chu: string }[] } | null | undefined
// Hội đồng không chấm được (hết lượt AI…) thì không chặn
export const hoiDongDat = (pb: PB) => !pb || pb.diem >= DIEM_DAT_HOI_DONG
export const bienTapDat = (kd: KD) => !kd || !kd.ghi_chu.some((g) => g.muc === 'loi')
export const loiBienTap = (kd: KD) => (kd?.ghi_chu ?? []).filter((g) => g.muc === 'loi').map((g) => g.chu)

export type KhauChuaDat = { loai: 'buoc'; buoc: 'nghien_cuu' | 'cau_chuyen' | 'tao_hinh' | 'ho_so' | 'dong_goi'; ten: string; diem: number } | { loai: 'chuong' | 'canh'; k: number; ten: string }

type DuAn = {
  loai?: string
  phan_bien?: Partial<Record<string, { diem: number }>>
  phan: { loi: unknown[] | null; phan_bien?: PB; phan_bien_canh?: PB; kiem_dinh?: KD; canh?: unknown }[]
}
const TEN_BUOC = { nghien_cuu: 'Nghiên cứu tư liệu', cau_chuyen: 'Phát triển câu chuyện', tao_hinh: 'Thiết kế nhân vật chính', ho_so: 'Hồ sơ hình ảnh', dong_goi: 'Đóng gói YouTube' } as const

// Các khâu đã làm mà chưa đạt (khâu chưa làm không tính)
export function khauChuaDat(d: DuAn): KhauChuaDat[] {
  const ds: KhauChuaDat[] = []
  if (d.loai === 'tieu_su') {
    for (const [buoc, ten] of Object.entries(TEN_BUOC) as [keyof typeof TEN_BUOC, string][]) {
      const pb = d.phan_bien?.[buoc]
      if (!hoiDongDat(pb)) ds.push({ loai: 'buoc', buoc, ten: `${ten}: hội đồng chấm ${pb!.diem}/10`, diem: pb!.diem })
    }
  }
  const ten = d.loai === 'tieu_su' ? 'Chương' : 'Phần'
  d.phan.forEach((p, i) => {
    if (!p.loi) return
    const ly = [
      ...(hoiDongDat(p.phan_bien) ? [] : [`hội đồng chấm ${p.phan_bien!.diem}/10`]),
      ...(bienTapDat(p.kiem_dinh) ? [] : [`biên tập viên còn ${loiBienTap(p.kiem_dinh).length} lỗi`]),
    ]
    if (ly.length) ds.push({ loai: 'chuong', k: i + 1, ten: `${ten} ${i + 1} — kịch bản: ${ly.join(', ')}` })
    if (p.canh && !hoiDongDat(p.phan_bien_canh)) ds.push({ loai: 'canh', k: i + 1, ten: `${ten} ${i + 1} — phân cảnh: hội đồng chấm ${p.phan_bien_canh!.diem}/10` })
  })
  return ds
}
