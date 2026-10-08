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

  // ── Nhân vật thêm cho phim tiểu sử / tin đời sống ──
  ong_lao: {
    mau: '#e7e5e4',
    bieu_tuong: '👴',
    ten: 'Ông lão',
    svg: (id) =>
      nguoi(id, {
        ao: '#a16207',
        quan: '#57534e',
        tocTruoc: `<ellipse cx="124" cy="165" rx="18" ry="28" fill="#f1f5f9" stroke="${VIEN}" stroke-width="5"/><ellipse cx="276" cy="165" rx="18" ry="28" fill="#f1f5f9" stroke="${VIEN}" stroke-width="5"/><path d="M150 214 Q200 300 250 214 Q200 246 150 214 Z" fill="#f1f5f9" stroke="${VIEN}" stroke-width="5"/>`,
        mat: `<circle cx="172" cy="185" r="17" fill="none" stroke="${VIEN}" stroke-width="5"/><circle cx="228" cy="185" r="17" fill="none" stroke="${VIEN}" stroke-width="5"/><line x1="189" y1="185" x2="211" y2="185" stroke="${VIEN}" stroke-width="5"/><circle cx="172" cy="187" r="7" fill="${VIEN}"/><circle cx="228" cy="187" r="7" fill="${VIEN}"/>`,
        them: `<path d="M302 452 L318 586" stroke="#78350f" stroke-width="11" stroke-linecap="round"/><path d="M302 452 Q300 432 318 432" fill="none" stroke="#78350f" stroke-width="11" stroke-linecap="round"/>`,
      }),
  },
  ba_lao: {
    mau: '#d8b4fe',
    bieu_tuong: '👵',
    ten: 'Bà lão',
    svg: (id) =>
      nguoi(id, {
        ao: '#7e22ce',
        quan: '#3b0764',
        tocSau: `<circle cx="200" cy="94" r="34" fill="#cbd5e1" stroke="${VIEN}" stroke-width="6"/>`,
        tocTruoc: `<path d="M118 175 C112 100 288 100 282 175 C262 128 138 128 118 175 Z" fill="#cbd5e1" stroke="${VIEN}" stroke-width="6"/>`,
        mat: `<circle cx="172" cy="187" r="15" fill="none" stroke="${VIEN}" stroke-width="4"/><circle cx="228" cy="187" r="15" fill="none" stroke="${VIEN}" stroke-width="4"/><line x1="187" y1="187" x2="213" y2="187" stroke="${VIEN}" stroke-width="4"/><circle cx="172" cy="188" r="7" fill="${VIEN}"/><circle cx="228" cy="188" r="7" fill="${VIEN}"/>`,
      }),
  },
  hoc_sinh: {
    mau: '#fca5a5',
    bieu_tuong: '🧑‍🎓',
    ten: 'Học sinh',
    svg: (id) =>
      nguoi(id, {
        ao: '#f8fafc',
        quan: '#1d4ed8',
        tocTruoc: `<path d="M116 168 C108 92 292 88 286 168 C268 128 236 118 200 124 C164 118 132 130 116 168 Z" fill="#111827" stroke="${VIEN}" stroke-width="6"/>`,
        them: `<path d="M152 302 L162 470 M248 302 L238 470" stroke="#2563eb" stroke-width="12" stroke-linecap="round"/><path d="M174 294 L200 336 L226 294 Z" fill="#dc2626" stroke="${VIEN}" stroke-width="4"/>`,
      }),
  },
  cong_nhan: {
    mau: '#fdba74',
    bieu_tuong: '👷',
    ten: 'Công nhân',
    svg: (id) =>
      nguoi(id, {
        ao: '#f97316',
        quan: '#1e3a8a',
        tocTruoc: `<path d="M108 160 C108 72 292 72 292 160 Z" fill="#facc15" stroke="${VIEN}" stroke-width="7"/><rect x="94" y="152" width="212" height="18" rx="9" fill="#eab308" stroke="${VIEN}" stroke-width="6"/><rect x="190" y="84" width="20" height="70" rx="8" fill="#eab308"/>`,
        them: `<rect x="136" y="398" width="128" height="14" fill="#e5e7eb"/><rect x="140" y="350" width="120" height="14" fill="#e5e7eb"/>`,
      }),
  },
  nong_dan: {
    mau: '#bef264',
    bieu_tuong: '🧑‍🌾',
    ten: 'Nông dân',
    svg: (id) =>
      nguoi(id, {
        ao: '#92400e',
        quan: '#1c1917',
        tocTruoc: `<path d="M66 150 L200 34 L334 150 Z" fill="#fde68a" stroke="${VIEN}" stroke-width="7" stroke-linejoin="round"/><path d="M138 96 L262 96 M104 126 L296 126" stroke="#d97706" stroke-width="4"/>`,
        them: `<path d="M96 470 C80 420 70 380 92 360 M104 470 C104 410 110 380 128 362" stroke="#65a30d" stroke-width="7" fill="none" stroke-linecap="round"/>`,
      }),
  },
  bac_si: {
    mau: '#99f6e4',
    bieu_tuong: '🧑‍⚕️',
    ten: 'Bác sĩ',
    svg: (id) =>
      nguoi(id, {
        ao: '#f8fafc',
        quan: '#0ea5e9',
        tocTruoc: `<path d="M118 160 C118 92 282 88 284 160 C262 124 150 122 118 160 Z" fill="#78350f" stroke="${VIEN}" stroke-width="6"/>`,
        them: `<path d="M168 300 Q156 384 200 392 Q244 384 232 300" fill="none" stroke="#334155" stroke-width="6"/><circle cx="200" cy="398" r="11" fill="#94a3b8" stroke="${VIEN}" stroke-width="4"/><path d="M236 340 h10 v-10 h10 v10 h10 v10 h-10 v10 h-10 v-10 h-10 Z" fill="#dc2626"/>`,
      }),
  },
  giao_vien: {
    mau: '#5eead4',
    bieu_tuong: '🧑‍🏫',
    ten: 'Giáo viên',
    svg: (id) =>
      nguoi(id, {
        ao: '#0d9488',
        quan: '#f8fafc',
        tocSau: `<path d="M108 190 C98 88 302 88 292 190 L298 360 L102 360 Z" fill="#1c1917" stroke="${VIEN}" stroke-width="7"/>`,
        tocTruoc: `<path d="M120 170 C130 100 270 100 282 170 C250 138 170 130 120 170 Z" fill="#1c1917"/>`,
        them: `<rect x="252" y="392" width="52" height="64" rx="4" fill="#dc2626" stroke="${VIEN}" stroke-width="4"/><line x1="262" y1="392" x2="262" y2="456" stroke="#fca5a5" stroke-width="4"/>`,
      }),
  },
  ky_su: {
    mau: '#93c5fd',
    bieu_tuong: '🛠️',
    ten: 'Kỹ sư',
    svg: (id) =>
      nguoi(id, {
        ao: '#2563eb',
        quan: '#1e293b',
        tocTruoc: `<path d="M108 160 C108 72 292 72 292 160 Z" fill="#f8fafc" stroke="${VIEN}" stroke-width="7"/><rect x="94" y="152" width="212" height="18" rx="9" fill="#e2e8f0" stroke="${VIEN}" stroke-width="6"/>`,
        them: `<rect x="84" y="420" width="76" height="22" rx="11" fill="#93c5fd" stroke="${VIEN}" stroke-width="4"/><rect x="160" y="330" width="80" height="12" rx="4" fill="#facc15"/>`,
      }),
  },
  bo_doi: {
    mau: '#a3e635',
    bieu_tuong: '🪖',
    ten: 'Quân nhân',
    svg: (id) =>
      nguoi(id, {
        ao: '#4d7c0f',
        quan: '#365314',
        tocTruoc: `<path d="M102 166 C102 78 298 78 298 166 Z" fill="#4d7c0f" stroke="${VIEN}" stroke-width="7"/><rect x="92" y="156" width="216" height="16" rx="8" fill="#365314" stroke="${VIEN}" stroke-width="5"/><circle cx="200" cy="118" r="16" fill="#dc2626" stroke="${VIEN}" stroke-width="4"/><path d="M200 106 l4 8 h9 l-7 6 l3 9 l-9 -5 l-9 5 l3 -9 l-7 -6 h9 Z" fill="#facc15"/>`,
      }),
  },
  phong_vien: {
    mau: '#67e8f9',
    bieu_tuong: '🎤',
    ten: 'Phóng viên',
    svg: (id) =>
      nguoi(id, {
        ao: '#0f766e',
        quan: '#334155',
        tocSau: `<path d="M110 196 C100 92 300 92 290 196 L292 268 L108 268 Z" fill="#451a03" stroke="${VIEN}" stroke-width="7"/>`,
        tocTruoc: `<path d="M120 168 C132 102 268 102 282 168 C246 136 170 132 120 168 Z" fill="#451a03"/>`,
        them: `<rect x="156" y="338" width="36" height="46" rx="4" fill="#f8fafc" stroke="${VIEN}" stroke-width="4"/><rect x="162" y="346" width="24" height="6" fill="#0f766e"/><rect x="272" y="392" width="16" height="54" rx="6" fill="#111827"/><circle cx="280" cy="384" r="17" fill="#64748b" stroke="${VIEN}" stroke-width="5"/>`,
      }),
  },
  chinh_khach: {
    mau: '#e2e8f0',
    bieu_tuong: '🏛️',
    ten: 'Lãnh đạo',
    svg: (id) =>
      nguoi(id, {
        ao: '#0f172a',
        quan: '#0f172a',
        tocTruoc: `<path d="M118 162 C116 92 284 88 284 160 C246 116 168 112 150 140 C140 130 126 140 118 162 Z" fill="#94a3b8" stroke="${VIEN}" stroke-width="6"/>`,
        them: `<path d="M180 292 L200 330 L220 292 Z" fill="#f8fafc"/><path d="M193 312 L207 312 L212 420 L200 436 L188 420 Z" fill="#1d4ed8" stroke="${VIEN}" stroke-width="4"/><circle cx="240" cy="336" r="7" fill="#facc15" stroke="${VIEN}" stroke-width="3"/>`,
      }),
  },
  van_dong_vien: {
    mau: '#fca5a5',
    bieu_tuong: '🏅',
    ten: 'Vận động viên',
    svg: (id) =>
      nguoi(id, {
        ao: '#dc2626',
        quan: '#f8fafc',
        tocTruoc: `<path d="M116 165 C110 95 290 90 286 165 C270 135 240 120 200 128 C160 120 130 135 116 165 Z" fill="#111827" stroke="${VIEN}" stroke-width="6"/><rect x="114" y="136" width="172" height="18" rx="9" fill="#facc15" stroke="${VIEN}" stroke-width="4"/>`,
        them: `<path d="M184 292 L200 344 L216 292" fill="none" stroke="#2563eb" stroke-width="7"/><circle cx="200" cy="356" r="17" fill="#facc15" stroke="${VIEN}" stroke-width="4"/><text x="200" y="440" text-anchor="middle" font-size="46" font-weight="700" fill="#f8fafc" font-family="sans-serif">10</text>`,
      }),
  },
  nghe_si: {
    mau: '#f0abfc',
    bieu_tuong: '🎵',
    ten: 'Nghệ sĩ',
    svg: (id) =>
      nguoi(id, {
        ao: '#a21caf',
        quan: '#111827',
        tocSau: `<path d="M112 180 C96 80 304 70 292 180 L284 236 L116 236 Z" fill="#7c3aed" stroke="${VIEN}" stroke-width="7"/>`,
        tocTruoc: `<path d="M116 160 C130 70 300 70 290 150 C250 110 200 120 150 170 C138 160 124 160 116 160 Z" fill="#7c3aed"/>`,
        them: `<path d="M150 330 l6 12 l12 6 l-12 6 l-6 12 l-6 -12 l-12 -6 l12 -6 Z M250 380 l5 10 l10 5 l-10 5 l-5 10 l-5 -10 l-10 -5 l10 -5 Z" fill="#fde047"/><rect x="272" y="392" width="16" height="54" rx="6" fill="#111827"/><circle cx="280" cy="384" r="17" fill="#e5e7eb" stroke="${VIEN}" stroke-width="5"/>`,
      }),
  },
  dau_bep: {
    mau: '#fde68a',
    bieu_tuong: '🧑‍🍳',
    ten: 'Đầu bếp',
    svg: (id) =>
      nguoi(id, {
        ao: '#f8fafc',
        quan: '#475569',
        tocTruoc: `<path d="M134 124 C108 64 160 32 200 58 C240 32 292 64 266 124 Z" fill="#fff" stroke="${VIEN}" stroke-width="6"/><rect x="130" y="112" width="140" height="34" rx="8" fill="#fff" stroke="${VIEN}" stroke-width="6"/>`,
        them: `<path d="M172 292 L200 324 L228 292 Z" fill="#dc2626" stroke="${VIEN}" stroke-width="4"/><circle cx="200" cy="370" r="5" fill="${VIEN}"/><circle cx="200" cy="410" r="5" fill="${VIEN}"/>`,
      }),
  },
  nu_doanh_nhan: {
    mau: '#c4b5fd',
    bieu_tuong: '👩‍💼',
    ten: 'Nữ doanh nhân',
    svg: (id) =>
      nguoi(id, {
        ao: '#1e293b',
        quan: '#1e293b',
        tocSau: `<circle cx="200" cy="96" r="32" fill="#1c1917" stroke="${VIEN}" stroke-width="6"/>`,
        tocTruoc: `<path d="M118 172 C112 96 288 96 282 172 C258 126 142 126 118 172 Z" fill="#1c1917" stroke="${VIEN}" stroke-width="6"/>`,
        them: `<path d="M178 292 L200 334 L222 292 Z" fill="#f8fafc"/><circle cx="200" cy="300" r="5" fill="#fef3c7"/><rect x="246" y="400" width="58" height="44" rx="6" fill="#78350f" stroke="${VIEN}" stroke-width="4"/>`,
      }),
  },
  nguoi_nuoc_ngoai: {
    mau: '#fde047',
    bieu_tuong: '🌍',
    ten: 'Người nước ngoài',
    svg: (id) =>
      nguoi(id, {
        da: '#fde2cf',
        ao: '#b91c1c',
        quan: '#1e3a8a',
        tocTruoc: `<path d="M114 168 C104 86 296 82 288 168 C262 120 226 112 200 122 C170 110 134 126 114 168 Z" fill="#facc15" stroke="${VIEN}" stroke-width="6"/>`,
        mat: `<circle cx="172" cy="185" r="10" fill="#2563eb"/><circle cx="228" cy="185" r="10" fill="#2563eb"/><circle cx="175" cy="181" r="3.5" fill="#fff"/><circle cx="231" cy="181" r="3.5" fill="#fff"/>`,
        them: `<path d="M140 340 L260 340 M140 400 L260 400 M170 300 L170 480 M230 300 L230 480" stroke="#7f1d1d" stroke-width="5" opacity="0.6"/>`,
      }),
  },
}
