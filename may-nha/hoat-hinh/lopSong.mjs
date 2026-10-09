// "Lớp sự sống" + chiều sâu phủ lên mọi bối cảnh (để nền không phẳng / đứng im): theo loại cảnh
// - pho: phố xá — người đi đường nhỏ ở xa đi qua lại, chim bay, mù không khí ở đường chân trời
// - tu_nhien: thiên nhiên / lịch sử ngoài trời — đàn chim bay ngang, lá / hạt bay, mù xa
// - trong_nha: trong nhà — vệt nắng xiên, hạt bụi lơ lửng trong nắng, bóng người mờ làm việc phía sau
// Toạ độ thế giới của bối cảnh (rộng 1080, khung ngang trải -1080..2160; mặt sàn y≈1180). Lặp hữu hạn, vị trí theo công
// thức (không ngẫu nhiên). lopSong(ten, id, { f, lap, NGANG }) → { svg, tw(t0, d) }
const LOAI = {
  pho: ['pho_florida', 'thanh_pho_dem', 'thanh_pho_tuyet', 'cho', 'cong_truong', 'cang_bien', 'san_bay'],
  tu_nhien: ['nong_thon', 'nui_rung', 'thao_nguyen', 'lang_xua', 'bai_bien', 'sa_mac', 'den_chua', 'thanh_co', 'chien_truong', 'bien_ca', 'be_phong', 'san_van_dong', 'vu_tru'],
}
const loaiCua = (ten) => (LOAI.pho.includes(ten) ? 'pho' : LOAI.tu_nhien.includes(ten) ? 'tu_nhien' : 'trong_nha')
const DEM = ['thanh_pho_dem', 'vu_tru', 'be_phong', 'phong_thu', 'phim_truong']

// Người đi đường (bóng nhỏ, xa): đầu, thân, hai chân bước
const nguoiXa = (id, k, x, y, s, mau) =>
  `<g id="${id}-ng${k}" transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-58" r="9" fill="${mau}"/><rect x="-9" y="-48" width="18" height="30" rx="7" fill="${mau}"/>` +
  `<path id="${id}-ngc${k}" d="M-4 -20 L-8 0 M4 -20 L8 0" stroke="${mau}" stroke-width="6" stroke-linecap="round"/></g>`
const chim = (x, y, s, mau) => `<path d="M${x} ${y} q${10 * s} ${-10 * s} ${20 * s} 0 q${10 * s} ${-10 * s} ${20 * s} 0" fill="none" stroke="${mau}" stroke-width="${3.5 * s}" stroke-linecap="round"/>`

export function lopSong(ten, id, { f, lap, NGANG }) {
  const loai = loaiCua(ten)
  const dem = DEM.includes(ten)
  const x0 = NGANG ? -1080 : 0
  const rong = NGANG ? 3240 : 1080
  const parts = []
  const tws = []
  const sid = `${id}-song`

  if (loai !== 'trong_nha') {
    // Mù không khí ở chân trời: tách lớp xa / gần (chiều sâu)
    parts.push(`<defs><linearGradient id="${sid}-mu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dem ? '#a5b4fc' : '#ffffff'}" stop-opacity="0"/><stop offset="0.7" stop-color="${dem ? '#a5b4fc' : '#ffffff'}" stop-opacity="${dem ? 0.12 : 0.28}"/><stop offset="1" stop-color="${dem ? '#a5b4fc' : '#ffffff'}" stop-opacity="0"/></linearGradient></defs>`)
    parts.push(`<rect id="${sid}-mu" x="${x0}" y="780" width="${rong}" height="420" fill="url(#${sid}-mu)"/>`)
    tws.push((t0, d) => `tl.to("#${sid}-mu", { opacity: 0.6, duration: 3, yoyo: true, repeat: ${lap(d, 3)}, ease: "sine.inOut" }, ${f(t0)});`)
    // Đàn chim bay ngang trời (ban đêm: không)
    if (!dem) {
      const dan = [...Array(6)].map((_, k) => chim(k * 46 - (k % 2) * 20, (k % 3) * 22, 0.9 + (k % 2) * 0.3, ten === 'bien_ca' || ten === 'bai_bien' ? '#f8fafc' : '#1f2937')).join('')
      parts.push(`<g id="${sid}-chim" transform="translate(${x0 - 300} 420)">${dan}</g>`)
      tws.push((t0, d) => `tl.fromTo("#${sid}-chim", { x: 0, y: 0 }, { x: ${rong + 600}, y: -120, duration: ${f(Math.max(8, Math.min(d, 18)))}, ease: "none", repeat: ${lap(d, 18)}, immediateRender: false }, ${f(t0)});`)
    }
  }
  if (loai === 'pho') {
    // Người đi đường nhỏ ở xa (đường phía sau nhân vật), đi hai chiều, bước chân lắc
    const mau = dem ? '#0f172a' : '#334155'
    const nguoi = [...Array(8)].map((_, k) => nguoiXa(sid, k, x0 + ((k * 431) % rong), 1150 - (k % 3) * 18, 1.1 - (k % 3) * 0.15, mau)).join('')
    parts.push(`<g opacity="0.55">${nguoi}</g>`)
    tws.push((t0, d) =>
      [...Array(8)]
        .map((_, k) => {
          const chieu = k % 2 ? 1 : -1
          return `tl.to("#${sid}-ng${k}", { x: "+=${chieu * (220 + (k % 3) * 80)}", duration: ${f(d)}, ease: "none" }, ${f(t0)});tl.to("#${sid}-ngc${k}", { scaleX: -1, transformOrigin: "50% 0%", duration: 0.32, yoyo: true, repeat: ${lap(d, 0.32) | 1}, ease: "none" }, ${f(t0 + (k % 4) * 0.08)});`
        })
        .join(''),
    )
  }
  if (loai === 'tu_nhien') {
    // Lá / hạt bay chéo qua khung (cát ở sa mạc, tuyết nhẹ ở thảo nguyên đêm… để lớp thời tiết lo; đây là lá / phấn hoa)
    const mauHat = ten === 'sa_mac' ? '#fde68a' : ten === 'chien_truong' ? '#a8a29e' : '#86efac'
    const hat = [...Array(14)].map((_, k) => `<ellipse id="${sid}-h${k}" cx="${x0 + ((k * 263) % rong)}" cy="${300 + ((k * 197) % 700)}" rx="${7 + (k % 3) * 3}" ry="${4 + (k % 2) * 2}" fill="${mauHat}" opacity="0.75"/>`).join('')
    parts.push(hat)
    tws.push((t0, d) =>
      [...Array(14)]
        .map((_, k) => `tl.to("#${sid}-h${k}", { x: ${240 + (k % 4) * 60}, y: ${120 + (k % 5) * 40}, rotation: ${180 + k * 20}, duration: ${f(Math.max(4, d))}, ease: "sine.inOut" }, ${f(t0)});`)
        .join(''),
    )
  }
  if (loai === 'trong_nha') {
    // Vệt nắng xiên từ cửa sổ (đêm: ánh đèn ấm) + hạt bụi lơ lửng trong nắng + bóng người mờ làm việc phía sau
    const mauNang = dem ? '#fbbf24' : '#fef9c3'
    parts.push(`<defs><linearGradient id="${sid}-nang" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mauNang}" stop-opacity="0.45"/><stop offset="1" stop-color="${mauNang}" stop-opacity="0"/></linearGradient></defs>`)
    parts.push(`<g id="${sid}-nang">${[0, 1, 2].map((k) => `<polygon points="${x0 + 120 + k * 1080},0 ${x0 + 320 + k * 1080},0 ${x0 + 760 + k * 1080},1180 ${x0 + 420 + k * 1080},1180" fill="url(#${sid}-nang)"/>`).join('')}</g>`)
    tws.push((t0, d) => `tl.fromTo("#${sid}-nang", { opacity: 0.7 }, { opacity: 1, duration: 2.6, yoyo: true, repeat: ${lap(d, 2.6)}, ease: "sine.inOut", immediateRender: false }, ${f(t0)});`)
    const bui = [...Array(18)].map((_, k) => `<circle id="${sid}-b${k}" cx="${x0 + ((k * 211) % rong)}" cy="${200 + ((k * 157) % 900)}" r="${2 + (k % 3)}" fill="#fff" opacity="${0.35 + (k % 3) * 0.15}"/>`).join('')
    parts.push(bui)
    tws.push((t0, d) =>
      [...Array(18)].map((_, k) => `tl.to("#${sid}-b${k}", { y: ${-40 - (k % 4) * 15}, x: ${(k % 2 ? 1 : -1) * (15 + (k % 3) * 10)}, duration: ${f(Math.max(3, d))}, ease: "sine.inOut" }, ${f(t0)});`).join(''),
    )
    // Bóng người mờ phía sau (đồng nghiệp, khách, người qua lại) — chỉ ở cảnh có người làm việc
    if (['van_phong', 'phong_hop', 'truong_quay', 'benh_vien', 'nha_hang', 'cua_hang', 'nha_may', 'hoi_truong', 'thu_vien', 'cung_dien', 'phim_truong', 'san_chung_khoan'].includes(ten)) {
      const bong = [...Array(4)].map((_, k) => nguoiXa(sid, k, x0 + 300 + k * 760, 1130, 2.2, '#1e293b')).join('')
      parts.push(`<g opacity="0.22" style="filter:blur(3px)">${bong}</g>`)
      tws.push((t0, d) => [...Array(4)].map((_, k) => `tl.to("#${sid}-ng${k}", { x: "+=${(k % 2 ? 1 : -1) * 160}", duration: ${f(Math.max(4, d))}, ease: "sine.inOut" }, ${f(t0)});`).join(''))
    }
  }
  // Viền tối nhẹ (vignette) cho mọi cảnh: dồn mắt vào giữa, cảm giác điện ảnh
  parts.push(`<defs><radialGradient id="${sid}-vien" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient></defs><rect x="${x0}" y="0" width="${rong}" height="1920" fill="url(#${sid}-vien)"/>`)
  return { svg: parts.join(''), tw: (t0, d) => tws.map((g) => g(t0, d)) }
}
