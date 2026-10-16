// Làm mượt ánh sáng theo cảnh (chủ trang 16/10/2026, dải màu cả phim chỉ ra AI đổi ánh sáng sáng ↔ tối liên tục ngay
// trong một cảnh). Như người chỉnh màu: mỗi cảnh (các câu liền nhau cùng nơi) một tông chủ đạo = tông nhiều câu dùng nhất;
// câu nào lệch hẳn sang cực ngược lại (sáng ↔ tối) thì kéo về tông của cảnh. Giữ nguyên câu cố ý gây sốc: loé sáng,
// cảnh báo đỏ, bất ngờ, khoảng lặng. Dùng chung cho máy dựng (tao_video.mjs) và dải màu trên web (DaiMauPhim.tsx).
export const SANG = new Set(['tuoi_sang', 'am_ap', 'loe_sang'])
export const TOI = new Set(['cang_thang', 'bi_an', 'canh_bao'])
const NHAN = new Set(['loe_sang', 'canh_bao'])
const HOP_LE = new Set(['binh_thuong', 'am_ap', 'lanh', 'cang_thang', 'tuoi_sang', 'mo_mong', 'bi_an', 'canh_bao', 'loe_sang'])

// loi: các câu ({ anh_sang, cam_xuc, lang, boi_canh, dia_diem }) → tên ánh sáng thật sự dùng cho từng câu
export function anhSangMuot(loi) {
  const goc = loi.map((l) => (HOP_LE.has(l?.anh_sang) ? l.anh_sang : 'binh_thuong'))
  const khoa = (l) => `${l?.dia_diem ?? ''}|${l?.boi_canh ?? ''}`
  const ra = [...goc]
  for (let tu = 0; tu < loi.length; ) {
    let het = tu
    while (het + 1 < loi.length && khoa(loi[het + 1]) === khoa(loi[tu])) het++
    const dem = new Map()
    for (let i = tu; i <= het; i++) if (!NHAN.has(goc[i])) dem.set(goc[i], (dem.get(goc[i]) ?? 0) + 1)
    const chu = [...dem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'binh_thuong'
    for (let i = tu; i <= het; i++) {
      const l = loi[i]
      const soc = NHAN.has(goc[i]) || l?.lang || l?.cam_xuc === 'bat_ngo'
      if (!soc && ((SANG.has(chu) && TOI.has(goc[i])) || (TOI.has(chu) && SANG.has(goc[i])))) ra[i] = chu
    }
    tu = het + 1
  }
  return ra
}
