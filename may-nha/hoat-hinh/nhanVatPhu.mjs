// Nhân vật phụ (không nói, chỉ diễn) xuất hiện khi lời thoại nhắc tới: người phụ nữ, cảnh sát, hacker, doanh nhân,
// nhà khoa học, người dùng. Cùng phong cách nét viền đậm với Mèo Mun / Robot Bit. viewBox 0 0 400 600, chân chạm y≈585.
// Bộ phận có id để diễn: <id>-dau (xoay quanh cổ 200 250), <id>-tay-phai / <id>-tay-trai (xoay quanh vai 270 300 / 130 300),
// <id>-mieng-dong / <id>-mieng-mo (nhép miệng khi nhân vật phụ nói). `mau`: màu thẻ tên + phụ đề khi nói.
// Tên phải khớp lib/ai.ts (NHAN_VAT_PHU).
const VIEN = '#1f2937'

// Khung người chung; `ao`: màu áo, `toc`: hình tóc (vẽ sau đầu / trước đầu), `them`: phụ kiện
function nguoi(id, { da = '#fcd9b8', ao, quan = '#334155', tocSau = '', tocTruoc = '', them = '', mat = '' }) {
  return `
  <ellipse cx="200" cy="588" rx="120" ry="14" fill="#00000055"/>
  <rect x="150" y="470" width="42" height="112" rx="16" fill="${quan}" stroke="${VIEN}" stroke-width="7"/>
  <rect x="208" y="470" width="42" height="112" rx="16" fill="${quan}" stroke="${VIEN}" stroke-width="7"/>
  <g id="${id}-tay-trai"><rect x="98" y="300" width="44" height="150" rx="22" fill="${ao}" stroke="${VIEN}" stroke-width="7"/><circle cx="120" cy="455" r="22" fill="${da}" stroke="${VIEN}" stroke-width="6"/></g>
  <path d="M130 490 C120 360 140 290 200 290 C260 290 280 360 270 490 Z" fill="${ao}" stroke="${VIEN}" stroke-width="7"/>
  <g id="${id}-tay-phai"><rect x="258" y="300" width="44" height="150" rx="22" fill="${ao}" stroke="${VIEN}" stroke-width="7"/><circle cx="280" cy="455" r="22" fill="${da}" stroke="${VIEN}" stroke-width="6"/></g>
  <g id="${id}-dau">
    ${tocSau}
    <rect x="182" y="240" width="36" height="40" fill="${da}" stroke="${VIEN}" stroke-width="6"/>
    <circle cx="200" cy="180" r="82" fill="${da}" stroke="${VIEN}" stroke-width="7"/>
    ${tocTruoc}
    ${mat || `<circle cx="172" cy="185" r="10" fill="${VIEN}"/><circle cx="228" cy="185" r="10" fill="${VIEN}"/><circle cx="175" cy="181" r="3.5" fill="#fff"/><circle cx="231" cy="181" r="3.5" fill="#fff"/>`}
    <g id="${id}-mieng-dong"><path d="M180 220 Q200 236 220 220" fill="none" stroke="${VIEN}" stroke-width="6" stroke-linecap="round"/></g>
    <g id="${id}-mieng-mo" opacity="0"><ellipse cx="200" cy="226" rx="17" ry="15" fill="#7f1d1d" stroke="${VIEN}" stroke-width="4"/><ellipse cx="200" cy="234" rx="10" ry="5" fill="#fb7185"/></g>
    <ellipse cx="155" cy="210" rx="14" ry="8" fill="#fb718555"/><ellipse cx="245" cy="210" rx="14" ry="8" fill="#fb718555"/>
  </g>
  ${them}`
}

export const NHAN_VAT_PHU = {
  nguoi_phu_nu: {
    mau: '#f472b6',
    bieu_tuong: '👩',
    ten: 'Người phụ nữ',
    svg: (id) =>
      nguoi(id, {
        ao: '#f472b6',
        quan: '#f472b6',
        tocSau: `<path d="M110 190 C100 90 300 90 290 190 L300 330 L100 330 Z" fill="#7c2d12" stroke="${VIEN}" stroke-width="7"/>`,
        tocTruoc: `<path d="M120 170 C130 100 270 100 282 170 C250 140 170 130 120 170 Z" fill="#7c2d12"/>`,
      }),
  },
  canh_sat: {
    mau: '#60a5fa',
    bieu_tuong: '👮',
    ten: 'Cảnh sát',
    svg: (id) =>
      nguoi(id, {
        ao: '#1e3a8a',
        quan: '#172554',
        tocTruoc: `<path d="M112 140 Q200 60 288 140 L292 158 L108 158 Z" fill="#1e3a8a" stroke="${VIEN}" stroke-width="7"/><rect x="104" y="150" width="192" height="22" rx="8" fill="#172554" stroke="${VIEN}" stroke-width="6"/><circle cx="200" cy="118" r="16" fill="#facc15" stroke="${VIEN}" stroke-width="4"/>`,
        them: `<path d="M228 330 L246 330 L252 348 L237 358 L222 348 Z" fill="#facc15" stroke="${VIEN}" stroke-width="4"/>`,
      }),
  },
  hacker: {
    mau: '#4ade80',
    bieu_tuong: '🧑‍💻',
    ten: 'Hacker',
    svg: (id) =>
      nguoi(id, {
        da: '#e7c3a0',
        ao: '#111827',
        quan: '#1f2937',
        tocSau: `<path d="M100 200 C90 70 310 70 300 200 L300 300 L100 300 Z" fill="#111827" stroke="${VIEN}" stroke-width="7"/>`,
        tocTruoc: `<path d="M118 150 C140 95 260 95 282 150 C250 125 150 125 118 150 Z" fill="#111827"/>`,
        mat: `<rect x="148" y="170" width="104" height="34" rx="12" fill="#22c55e" stroke="${VIEN}" stroke-width="5"/><rect x="156" y="176" width="40" height="10" rx="5" fill="#bbf7d0"/>`,
        them: `<path d="M170 380 L230 380" stroke="#22c55e" stroke-width="6" stroke-dasharray="10 8"/>`,
      }),
  },
  doanh_nhan: {
    mau: '#cbd5e1',
    bieu_tuong: '👔',
    ten: 'Doanh nhân',
    svg: (id) =>
      nguoi(id, {
        ao: '#334155',
        quan: '#1e293b',
        tocTruoc: `<path d="M118 160 C120 90 280 85 284 160 C260 120 150 120 118 160 Z" fill="#292524" stroke="${VIEN}" stroke-width="6"/>`,
        them: `<path d="M180 292 L200 330 L220 292 Z" fill="#f8fafc"/><path d="M193 312 L207 312 L212 420 L200 436 L188 420 Z" fill="#dc2626" stroke="${VIEN}" stroke-width="4"/>`,
      }),
  },
  nha_khoa_hoc: {
    mau: '#a5f3fc',
    bieu_tuong: '🧑‍🔬',
    ten: 'Nhà khoa học',
    svg: (id) =>
      nguoi(id, {
        ao: '#f8fafc',
        quan: '#475569',
        tocTruoc: `<path d="M112 160 C100 110 130 70 160 95 C175 60 230 60 245 95 C275 70 305 110 288 160 C270 130 140 130 112 160 Z" fill="#cbd5e1" stroke="${VIEN}" stroke-width="6"/>`,
        mat: `<circle cx="172" cy="185" r="22" fill="#e0f2fe" stroke="${VIEN}" stroke-width="5"/><circle cx="228" cy="185" r="22" fill="#e0f2fe" stroke="${VIEN}" stroke-width="5"/><line x1="194" y1="185" x2="206" y2="185" stroke="${VIEN}" stroke-width="5"/><circle cx="172" cy="187" r="8" fill="${VIEN}"/><circle cx="228" cy="187" r="8" fill="${VIEN}"/>`,
        them: `<rect x="232" y="350" width="30" height="40" rx="4" fill="#38bdf8" stroke="${VIEN}" stroke-width="4"/>`,
      }),
  },
  nguoi_dung: {
    mau: '#86efac',
    bieu_tuong: '🙋',
    ten: 'Người dùng',
    svg: (id) =>
      nguoi(id, {
        ao: '#22c55e',
        quan: '#1d4ed8',
        tocTruoc: `<path d="M116 165 C110 95 290 90 286 165 C270 135 240 120 200 128 C160 120 130 135 116 165 Z" fill="#111827" stroke="${VIEN}" stroke-width="6"/>`,
        them: `<rect x="96" y="408" width="36" height="58" rx="8" fill="#0f172a" stroke="${VIEN}" stroke-width="4"/><rect x="101" y="414" width="26" height="44" rx="4" fill="#38bdf8"/>`,
      }),
  },
}
