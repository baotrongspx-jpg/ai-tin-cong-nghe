// Nhân vật phụ xuất hiện khi lời thoại nhắc tới (người phụ nữ, cảnh sát, hacker, doanh nhân, bác sĩ, nông dân…).
// Không ghi tên trên đầu: trang phục + đồ nghề phải tự nói lên họ là ai. Cùng phong cách nét viền đậm với Mèo Mun /
// Robot Bit. viewBox 0 0 400 600, chân chạm y≈585.
// Bộ phận có id để diễn: <id>-dau (xoay quanh cổ 200 250), <id>-tay-phai / <id>-tay-trai (xoay quanh vai 270 300 / 130 300;
// đồ cầm tay vẽ trong nhóm tay nên cử động theo tay), <id>-mieng-dong / <id>-mieng-mo (nhép miệng khi nói).
// `mau`: màu nhãn + phụ đề khi nói, `ten`: tên hiện ở phụ đề. Tên khoá phải khớp lib/ai.ts (NHAN_VAT_PHU).
const VIEN = '#1f2937'

// Màu tối / sáng hơn một chút để đổ bóng
function pha(hex, t) {
  const n = parseInt(hex.slice(1, 7), 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t))))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
const vien = (w = 6) => `stroke="${VIEN}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`

// Mắt mặc định: lòng trắng, tròng màu, con ngươi, đốm sáng; `nu`: thêm mi
function matMacDinh(mauMat = '#3b2416', nu = false) {
  const mot = (x) =>
    `<ellipse cx="${x}" cy="188" rx="13" ry="15" fill="#fff" ${vien(3.5)}/><circle cx="${x + 2}" cy="190" r="8.5" fill="${mauMat}"/><circle cx="${x + 2}" cy="190" r="4.5" fill="#0b1020"/><circle cx="${x + 5}" cy="186" r="2.8" fill="#fff"/>`
  const mi = nu
    ? `<path d="M156 180 l-7 -5 M160 175 l-4 -7 M244 180 l7 -5 M240 175 l4 -7" ${vien(3)}/>`
    : ''
  return mot(170) + mot(230) + mi
}

// Khung người chung, đã chau chuốt: tai, lông mày, mũi, bàn tay, giày, cổ áo, đổ bóng. Tuỳ chọn:
// da, ao (màu áo), tay (màu tay áo, mặc định = ao), quan, giay, vay (váy), quanNgan, co ('tron' | 'so_mi' | 'vest' | 'khong'),
// tocSau / tocTruoc (vẽ sau / trước mặt; mũ nón vẽ ở tocTruoc), may (màu lông mày), mat (thay mắt), nu (mi + môi hồng),
// gia (nếp nhăn), sau (vẽ sau lưng: ba lô…), than (chi tiết trên thân: cà vạt, phù hiệu…), tayPhai / tayTrai (đồ cầm tay)
function nguoi(id, o) {
  const {
    da = '#fcd9b8', ao, tay = ao, quan = '#334155', giay = '#1f2937', vay = false, quanNgan = false, co = 'tron',
    tocSau = '', tocTruoc = '', may = '#3f2a1d', mat = '', nu = false, gia = false, sau = '', than = '', tayPhai = '', tayTrai = '',
  } = o
  const daToi = pha(da, -0.18)
  const chan = vay
    ? `<rect x="160" y="470" width="30" height="96" rx="12" fill="${da}" ${vien(5)}/><rect x="210" y="470" width="30" height="96" rx="12" fill="${da}" ${vien(5)}/>
       <path d="M140 428 L260 428 L280 522 Q200 538 120 522 Z" fill="${quan}" ${vien(6)}/><path d="M200 432 L200 528" stroke="${pha(quan, -0.25)}" stroke-width="4"/>`
    : quanNgan
      ? `<rect x="158" y="500" width="32" height="68" rx="12" fill="${da}" ${vien(5)}/><rect x="210" y="500" width="32" height="68" rx="12" fill="${da}" ${vien(5)}/>
         <path d="M148 456 L252 456 L256 518 L206 518 L200 488 L194 518 L144 518 Z" fill="${quan}" ${vien(6)}/>`
      : `<rect x="152" y="460" width="44" height="104" rx="16" fill="${quan}" ${vien(6)}/><rect x="204" y="460" width="44" height="104" rx="16" fill="${quan}" ${vien(6)}/>
         <path d="M174 470 L174 556 M226 470 L226 556" stroke="${pha(quan, -0.25)}" stroke-width="3" opacity="0.7"/>`
  const giayVe = `<path d="M140 572 Q140 552 170 552 Q198 552 200 572 Z" fill="${giay}" ${vien(5)}/><path d="M200 572 Q202 552 230 552 Q260 552 260 572 Z" fill="${giay}" ${vien(5)}/>
    <path d="M150 560 Q160 554 172 556 M212 556 Q224 554 236 558" stroke="#ffffff55" stroke-width="4" fill="none" stroke-linecap="round"/>`
  const ban = (x) =>
    `<circle cx="${x}" cy="456" r="20" fill="${da}" ${vien(5)}/><ellipse cx="${x + (x < 200 ? 15 : -15)}" cy="448" rx="7" ry="10" fill="${da}" ${vien(4)}/>`
  const canhTay = (x, them, nhom) =>
    `<g id="${id}-${nhom}"><rect x="${x}" y="300" width="44" height="140" rx="22" fill="${tay}" ${vien(6)}/><rect x="${x + 3}" y="424" width="38" height="12" rx="6" fill="${pha(tay, -0.2)}"/>${ban(x + 22)}${them}</g>`
  const coAo =
    co === 'so_mi'
      ? `<path d="M172 290 L200 322 L228 290 L222 282 L200 300 L178 282 Z" fill="#f8fafc" ${vien(4)}/>`
      : co === 'vest'
        ? `<path d="M176 292 L200 340 L224 292 Z" fill="#f8fafc" ${vien(4)}/><path d="M168 292 L200 372 L186 300 Z M232 292 L200 372 L214 300 Z" fill="${pha(ao, -0.3)}" ${vien(4)}/>`
        : co === 'tron'
          ? `<path d="M176 292 Q200 312 224 292" fill="none" stroke="${pha(ao, -0.35)}" stroke-width="6"/>`
          : ''
  return `
  <ellipse cx="200" cy="582" rx="118" ry="13" fill="#00000050"/>
  ${sau}
  ${chan}
  ${giayVe}
  ${canhTay(98, tayTrai, 'tay-trai')}
  <path d="M128 336 Q128 292 172 288 L228 288 Q272 292 272 336 L266 476 Q200 490 134 476 Z" fill="${ao}" ${vien(7)}/>
  <path d="M244 300 Q268 312 266 350 L262 470 Q250 476 238 476 Z" fill="#00000018"/>
  ${coAo}
  ${than}
  ${canhTay(258, tayPhai, 'tay-phai')}
  <g id="${id}-dau">
    ${tocSau}
    <rect x="182" y="236" width="36" height="52" rx="8" fill="${da}" ${vien(6)}/><rect x="184" y="262" width="32" height="12" fill="${daToi}" opacity="0.6"/>
    <ellipse cx="119" cy="192" rx="15" ry="20" fill="${da}" ${vien(5)}/><ellipse cx="281" cy="192" rx="15" ry="20" fill="${da}" ${vien(5)}/>
    <ellipse cx="200" cy="180" rx="80" ry="84" fill="${da}" ${vien(7)}/>
    <ellipse cx="152" cy="212" rx="15" ry="9" fill="#fb718566"/><ellipse cx="248" cy="212" rx="15" ry="9" fill="#fb718566"/>
    ${gia ? `<path d="M158 150 Q172 144 186 150 M214 150 Q228 144 242 150 M150 208 Q156 216 152 226 M250 208 Q244 216 248 226" fill="none" stroke="${daToi}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
    ${tocTruoc}
    <path d="M154 167 Q170 158 186 165" fill="none" stroke="${may}" stroke-width="6" stroke-linecap="round"/><path d="M214 165 Q230 158 246 167" fill="none" stroke="${may}" stroke-width="6" stroke-linecap="round"/>
    ${mat || matMacDinh(undefined, nu)}
    <path d="M196 200 Q201 211 207 204" fill="none" stroke="${daToi}" stroke-width="4" stroke-linecap="round"/>
    <g id="${id}-mieng-dong"><path d="M182 222 Q200 236 218 222" fill="none" stroke="${nu ? '#be185d' : VIEN}" stroke-width="6" stroke-linecap="round"/></g>
    <g id="${id}-mieng-mo" opacity="0"><ellipse cx="200" cy="226" rx="16" ry="14" fill="#7f1d1d" stroke="${nu ? '#be185d' : VIEN}" stroke-width="4"/><ellipse cx="200" cy="233" rx="9" ry="5" fill="#fb7185"/></g>
  </g>`
}

// ── Đồ nghề, phụ kiện dùng chung ──
const toc = {
  ngan: (m) => `<path d="M112 182 C98 80 302 74 290 180 C286 160 278 146 262 142 L254 152 L240 134 L222 146 L206 130 L190 146 L172 132 L158 150 L146 140 C128 148 116 162 112 182 Z" fill="${m}" ${vien(6)}/>`,
  reNgoi: (m) => `<path d="M110 184 C96 78 304 72 290 182 C286 158 276 144 262 140 C240 126 212 118 186 132 C168 142 150 146 138 144 C122 152 114 166 110 184 Z" fill="${m}" ${vien(6)}/><path d="M150 112 Q176 98 214 104 M188 132 Q214 112 252 120" fill="none" stroke="${pha(m, 0.3)}" stroke-width="4" stroke-linecap="round"/>`,
  daiSau: (m) => `<path d="M112 196 C96 82 304 82 288 196 L300 360 Q200 380 100 360 Z" fill="${m}" ${vien(7)}/>`,
  maiTruoc: (m) => `<path d="M120 176 C128 96 272 96 282 176 C258 132 216 122 196 132 C176 126 140 138 120 176 Z" fill="${m}"/>`,
  buiSau: (m) => `<circle cx="200" cy="96" r="34" fill="${m}" ${vien(6)}/>`,
  buiTruoc: (m) => `<path d="M118 176 C112 98 288 98 282 176 C262 128 138 128 118 176 Z" fill="${m}" ${vien(6)}/>`,
}
const kinh = (m = VIEN) =>
  `<circle cx="170" cy="188" r="20" fill="#ffffff22" stroke="${m}" stroke-width="5"/><circle cx="230" cy="188" r="20" fill="#ffffff22" stroke="${m}" stroke-width="5"/><path d="M190 188 L210 188 M150 186 L122 180 M250 186 L278 180" stroke="${m}" stroke-width="5"/>`
const caVat = (m) => `<path d="M192 300 L208 300 L214 412 L200 430 L186 412 Z" fill="${m}" ${vien(4)}/><path d="M192 300 L208 300 L204 314 L196 314 Z" fill="${pha(m, -0.25)}"/>`
const dieuKhien = '' // (để dành)
void dieuKhien

export const NHAN_VAT_PHU = {
  nguoi_phu_nu: {
    mau: '#f472b6',
    bieu_tuong: '👩',
    ten: 'Người phụ nữ',
    svg: (id) =>
      nguoi(id, {
        nu: true,
        ao: '#ec4899',
        quan: '#be185d',
        vay: true,
        giay: '#9d174d',
        may: '#5b2a12',
        tocSau: `<path d="M110 196 C92 80 308 80 290 196 Q306 280 282 352 Q200 370 118 352 Q94 280 110 196 Z" fill="#7c2d12" ${vien(7)}/>`,
        tocTruoc: `<path d="M120 178 C124 94 276 94 282 178 C268 140 238 118 206 122 C196 140 160 156 120 178 Z" fill="#7c2d12"/><circle cx="119" cy="214" r="6" fill="#facc15" ${vien(3)}/><circle cx="281" cy="214" r="6" fill="#facc15" ${vien(3)}/>`,
        than: `<path d="M150 340 Q200 352 250 340" fill="none" stroke="#fbcfe8" stroke-width="5"/><circle cx="200" cy="304" r="6" fill="#fef3c7" ${vien(3)}/>`,
        tayTrai: `<path d="M100 470 Q121 440 142 470" fill="none" stroke="${VIEN}" stroke-width="5"/><rect x="92" y="468" width="58" height="48" rx="10" fill="#f59e0b" ${vien(5)}/><rect x="96" y="482" width="50" height="6" fill="#d97706"/>`,
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
        co: 'so_mi',
        tocTruoc: `<path d="M110 142 Q200 54 290 142 L294 156 L106 156 Z" fill="#1e3a8a" ${vien(7)}/><path d="M102 150 Q200 182 298 150 L298 166 Q200 196 102 166 Z" fill="#0f172a" ${vien(6)}/><path d="M184 98 L200 86 L216 98 L210 118 L190 118 Z" fill="#facc15" ${vien(4)}/>`,
        than: `<path d="M226 330 L246 330 L252 350 L236 362 L220 350 Z" fill="#facc15" ${vien(4)}/><rect x="152" y="324" width="34" height="24" rx="4" fill="#1e40af" ${vien(4)}/><rect x="134" y="452" width="132" height="18" rx="4" fill="#0f172a" ${vien(4)}/><rect x="190" y="450" width="22" height="22" rx="4" fill="#cbd5e1" ${vien(4)}/><path d="M240 290 L252 290 L254 318 L238 318 Z" fill="#0f172a" ${vien(3)}/>`,
        tayPhai: `<rect x="266" y="436" width="22" height="44" rx="6" fill="#111827" ${vien(4)}/><rect x="274" y="418" width="6" height="22" fill="#111827"/><circle cx="277" cy="452" r="4" fill="#22c55e"/>`,
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
        co: 'khong',
        tocSau: `<path d="M98 200 C84 60 316 60 302 200 Q306 270 280 296 L120 296 Q94 270 98 200 Z" fill="#111827" ${vien(7)}/>`,
        tocTruoc: `<path d="M116 168 C126 100 274 100 284 168 C262 134 138 134 116 168 Z" fill="#0b0f19"/>`,
        mat: `<rect x="146" y="172" width="108" height="36" rx="14" fill="#16a34a" ${vien(5)}/><rect x="154" y="178" width="44" height="10" rx="5" fill="#bbf7d0"/><path d="M160 198 h20 M214 198 h28" stroke="#86efac" stroke-width="3"/>`,
        than: `<path d="M168 292 L176 360 M232 292 L224 360" stroke="#374151" stroke-width="5"/><path d="M150 400 Q200 420 250 400 L246 440 Q200 452 154 440 Z" fill="#1f2937" ${vien(4)}/><text x="200" y="384" text-anchor="middle" font-size="26" font-family="monospace" fill="#22c55e">{ }</text>`,
        tayPhai: `<path d="M244 452 L322 452 L330 478 L236 478 Z" fill="#475569" ${vien(5)}/><rect x="250" y="410" width="66" height="44" rx="5" fill="#0f172a" ${vien(5)}/><path d="M258 422 h30 M258 432 h44 M258 442 h22" stroke="#22c55e" stroke-width="3"/>`,
      }),
  },
  doanh_nhan: {
    mau: '#cbd5e1',
    bieu_tuong: '👔',
    ten: 'Doanh nhân',
    svg: (id) =>
      nguoi(id, {
        ao: '#1e293b',
        quan: '#0f172a',
        co: 'vest',
        tocTruoc: toc.reNgoi('#1c1917'),
        than: `${caVat('#dc2626')}<path d="M232 338 L252 338" stroke="#f8fafc" stroke-width="5"/><circle cx="200" cy="452" r="4" fill="#94a3b8"/>`,
        tayTrai: `<rect x="86" y="470" width="70" height="52" rx="8" fill="#78350f" ${vien(5)}/><path d="M108 470 Q121 452 134 470" fill="none" stroke="${VIEN}" stroke-width="5"/><rect x="116" y="490" width="10" height="8" fill="#facc15"/>`,
        tayPhai: `<rect x="262" y="424" width="36" height="10" rx="3" fill="#facc15" ${vien(3)}/>`,
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
        co: 'vest',
        may: '#94a3b8',
        tocTruoc: `<path d="M110 164 C94 112 128 70 160 96 C174 58 228 58 242 96 C274 70 308 112 290 164 C272 128 234 120 200 124 C162 118 128 130 110 164 Z" fill="#e2e8f0" ${vien(6)}/>`,
        mat: kinh() + matMacDinh(),
        than: `${caVat('#0ea5e9')}<rect x="226" y="350" width="30" height="36" rx="4" fill="#e2e8f0" ${vien(3)}/><path d="M232 346 L232 362 M242 346 L242 366" stroke="#2563eb" stroke-width="4"/>`,
        tayPhai: `<path d="M270 400 L288 400 L288 470 Q279 484 270 470 Z" fill="#e0f2fe" ${vien(4)}/><path d="M271 440 L287 440 L287 470 Q279 482 271 470 Z" fill="#22c55e"/><circle cx="282" cy="430" r="3" fill="#bbf7d0"/>`,
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
        giay: '#f8fafc',
        tocTruoc: `<path d="M110 184 C96 92 140 70 176 78 L190 54 L204 76 L226 52 L232 80 C276 84 302 120 290 182 C286 158 276 144 260 140 C236 148 208 132 186 144 C166 150 150 142 138 144 C122 152 114 166 110 184 Z" fill="#111827" ${vien(6)}/>`,
        than: `<path d="M170 330 Q200 300 230 330 Q230 370 200 380 Q170 370 170 330 Z" fill="#bbf7d0" ${vien(3)}/><path d="M188 336 L200 360 L214 330" fill="none" stroke="#15803d" stroke-width="5"/>`,
        tayPhai: `<rect x="262" y="424" width="34" height="56" rx="8" fill="#0f172a" ${vien(4)}/><rect x="267" y="430" width="24" height="42" rx="4" fill="#38bdf8"/><path d="M272 444 h14 M272 452 h10" stroke="#e0f2fe" stroke-width="3"/>`,
      }),
  },

  ong_lao: {
    mau: '#e7e5e4',
    bieu_tuong: '👴',
    ten: 'Ông lão',
    svg: (id) =>
      nguoi(id, {
        ao: '#a16207',
        quan: '#57534e',
        gia: true,
        may: '#e5e7eb',
        tocTruoc: `<path d="M118 150 Q130 120 150 132 Q160 116 176 126 L170 150 Z M282 150 Q270 120 250 132 Q240 116 224 126 L230 150 Z" fill="#f1f5f9" ${vien(4)}/><path d="M150 216 Q200 300 250 216 Q226 238 200 234 Q174 238 150 216 Z" fill="#f8fafc" ${vien(5)}/>`,
        mat: kinh('#78350f') + matMacDinh(),
        than: `<path d="M200 292 L200 470" stroke="${pha('#a16207', -0.3)}" stroke-width="4"/><circle cx="200" cy="330" r="5" fill="#fde68a" ${vien(3)}/><circle cx="200" cy="380" r="5" fill="#fde68a" ${vien(3)}/><circle cx="200" cy="430" r="5" fill="#fde68a" ${vien(3)}/>`,
        tayPhai: `<path d="M282 456 L300 586" stroke="#78350f" stroke-width="12" stroke-linecap="round"/><path d="M282 456 Q278 432 300 430" fill="none" stroke="#78350f" stroke-width="12" stroke-linecap="round"/>`,
      }),
  },
  ba_lao: {
    mau: '#d8b4fe',
    bieu_tuong: '👵',
    ten: 'Bà lão',
    svg: (id) =>
      nguoi(id, {
        nu: true,
        gia: true,
        ao: '#7e22ce',
        quan: '#1c1917',
        may: '#cbd5e1',
        tocSau: toc.buiSau('#cbd5e1'),
        tocTruoc: toc.buiTruoc('#cbd5e1') + `<path d="M176 92 Q200 80 224 92" fill="none" stroke="#94a3b8" stroke-width="4"/>`,
        mat: kinh('#78350f') + matMacDinh(undefined, true),
        than: `<path d="M200 300 L200 470 M176 300 L176 332" stroke="${pha('#7e22ce', -0.3)}" stroke-width="4"/><path d="M150 360 Q160 340 176 350 M224 350 Q240 340 250 360" fill="none" stroke="#e9d5ff" stroke-width="4"/>`,
        tayTrai: `<path d="M94 474 L150 474 L144 516 L100 516 Z" fill="#d97706" ${vien(5)}/><path d="M100 488 h44 M102 502 h40" stroke="#92400e" stroke-width="3"/><path d="M104 474 Q121 446 140 474" fill="none" stroke="${VIEN}" stroke-width="5"/>`,
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
        quanNgan: true,
        giay: '#111827',
        co: 'so_mi',
        tocTruoc: toc.ngan('#111827'),
        sau: `<rect x="122" y="316" width="156" height="150" rx="26" fill="#2563eb" ${vien(6)}/>`,
        than: `<path d="M150 300 L162 470 M250 300 L238 470" stroke="#1d4ed8" stroke-width="12" stroke-linecap="round"/><path d="M178 300 L200 346 L222 300 Z" fill="#dc2626" ${vien(4)}/><path d="M194 336 L186 362 M206 336 L214 362" stroke="#dc2626" stroke-width="7" stroke-linecap="round"/>`,
        tayTrai: `<rect x="96" y="452" width="50" height="62" rx="4" fill="#facc15" ${vien(4)}/><path d="M104 464 h34 M104 476 h28" stroke="#a16207" stroke-width="3"/>`,
      }),
  },
  cong_nhan: {
    mau: '#fdba74',
    bieu_tuong: '👷',
    ten: 'Công nhân',
    svg: (id) =>
      nguoi(id, {
        ao: '#2563eb',
        quan: '#1e3a8a',
        giay: '#78350f',
        tocTruoc: `<path d="M106 160 C106 66 294 66 294 160 Z" fill="#facc15" ${vien(7)}/><rect x="92" y="150" width="216" height="20" rx="10" fill="#eab308" ${vien(6)}/><rect x="188" y="74" width="24" height="78" rx="10" fill="#eab308" ${vien(4)}/>`,
        than: `<path d="M136 300 L170 296 L172 476 L134 472 Z M264 300 L230 296 L228 476 L266 472 Z" fill="#f97316" ${vien(5)}/><rect x="134" y="400" width="38" height="12" fill="#e5e7eb"/><rect x="228" y="400" width="38" height="12" fill="#e5e7eb"/><rect x="134" y="350" width="38" height="12" fill="#e5e7eb"/><rect x="228" y="350" width="38" height="12" fill="#e5e7eb"/>`,
        tayPhai: `<path d="M276 430 L300 500" stroke="#64748b" stroke-width="12" stroke-linecap="round"/><path d="M290 486 a16 16 0 1 0 22 16" fill="none" stroke="#64748b" stroke-width="10" stroke-linecap="round"/>`,
      }),
  },
  nong_dan: {
    mau: '#bef264',
    bieu_tuong: '🧑‍🌾',
    ten: 'Nông dân',
    svg: (id) =>
      nguoi(id, {
        da: '#e8b48c',
        ao: '#92400e',
        quan: '#1c1917',
        giay: '#57534e',
        co: 'khong',
        tocTruoc: `<path d="M60 150 L200 30 L340 150 Z" fill="#fde68a" ${vien(7)}/><path d="M118 100 L282 100 M88 126 L312 126 M200 30 L200 150" stroke="#d97706" stroke-width="4"/><path d="M140 150 Q150 230 176 252 M260 150 Q250 230 224 252" fill="none" stroke="#a16207" stroke-width="3"/>`,
        than: `<path d="M200 296 L200 476" stroke="${pha('#92400e', -0.3)}" stroke-width="4"/><path d="M150 380 h30 v28 h-30 Z M220 380 h30 v28 h-30 Z" fill="none" stroke="${pha('#92400e', -0.3)}" stroke-width="4"/><path d="M152 520 L196 520 M204 520 L248 520" stroke="#e8b48c" stroke-width="16"/>`,
        tayPhai: `<path d="M278 440 L300 300" stroke="#a16207" stroke-width="10" stroke-linecap="round"/><path d="M296 312 L340 300 L344 318 L300 328 Z" fill="#94a3b8" ${vien(4)}/>`,
        tayTrai: `<path d="M110 470 C96 410 92 380 110 360 M122 470 C120 410 124 380 140 362 M132 470 C138 420 150 392 166 380" stroke="#65a30d" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M104 360 l-6 -14 M138 362 l2 -14 M164 380 l8 -10" stroke="#ca8a04" stroke-width="6" stroke-linecap="round"/>`,
      }),
  },
  bac_si: {
    mau: '#99f6e4',
    bieu_tuong: '🧑‍⚕️',
    ten: 'Bác sĩ',
    svg: (id) =>
      nguoi(id, {
        ao: '#f8fafc',
        quan: '#0d9488',
        giay: '#f8fafc',
        co: 'vest',
        tocTruoc: toc.reNgoi('#451a03'),
        than: `<path d="M180 296 L200 330 L220 296 Z" fill="#14b8a6"/><path d="M166 300 Q150 390 200 398 Q250 390 234 300" fill="none" stroke="#334155" stroke-width="6"/><circle cx="200" cy="404" r="12" fill="#94a3b8" ${vien(4)}/><path d="M232 346 h10 v-10 h10 v10 h10 v10 h-10 v10 h-10 v-10 h-10 Z" fill="#dc2626"/><rect x="146" y="350" width="26" height="8" rx="3" fill="#2563eb"/>`,
        tayTrai: `<rect x="90" y="430" width="56" height="74" rx="6" fill="#a16207" ${vien(5)}/><rect x="96" y="442" width="44" height="56" fill="#f8fafc"/><path d="M102 456 h30 M102 468 h24 M102 480 h30" stroke="#94a3b8" stroke-width="3"/><rect x="108" y="424" width="20" height="12" rx="3" fill="#94a3b8" ${vien(3)}/>`,
      }),
  },
  giao_vien: {
    mau: '#5eead4',
    bieu_tuong: '🧑‍🏫',
    ten: 'Giáo viên',
    svg: (id) =>
      nguoi(id, {
        nu: true,
        ao: '#0ea5e9',
        quan: '#f8fafc',
        giay: '#be123c',
        co: 'khong',
        tocSau: toc.daiSau('#1c1917'),
        tocTruoc: toc.maiTruoc('#1c1917'),
        than: `<path d="M176 290 L224 290 L222 304 L178 304 Z" fill="#0284c7" ${vien(4)}/><path d="M200 304 L200 476" stroke="#0284c7" stroke-width="3"/><path d="M134 470 L170 470 L174 530 L130 530 Z M230 470 L266 470 L270 530 L226 530 Z" fill="#0ea5e9" ${vien(5)}/><path d="M156 340 q10 -12 20 0 q-10 12 -20 0 Z M226 380 q10 -12 20 0 q-10 12 -20 0 Z" fill="#e0f2fe"/>`,
        tayPhai: `<rect x="258" y="420" width="50" height="64" rx="4" fill="#dc2626" ${vien(4)}/><path d="M268 420 L268 484" stroke="#fca5a5" stroke-width="4"/><path d="M276 438 h24 M276 450 h18" stroke="#fee2e2" stroke-width="3"/>`,
      }),
  },
  ky_su: {
    mau: '#93c5fd',
    bieu_tuong: '🛠️',
    ten: 'Kỹ sư',
    svg: (id) =>
      nguoi(id, {
        ao: '#3b82f6',
        quan: '#1e293b',
        giay: '#78350f',
        co: 'so_mi',
        tocTruoc: `<path d="M106 160 C106 66 294 66 294 160 Z" fill="#f8fafc" ${vien(7)}/><rect x="92" y="150" width="216" height="20" rx="10" fill="#e2e8f0" ${vien(6)}/><rect x="188" y="74" width="24" height="78" rx="10" fill="#e2e8f0" ${vien(4)}/>`,
        than: `<rect x="134" y="446" width="132" height="22" rx="4" fill="#a16207" ${vien(4)}/><rect x="150" y="440" width="16" height="30" rx="3" fill="#64748b"/><rect x="236" y="440" width="12" height="34" rx="3" fill="#facc15" ${vien(3)}/><rect x="224" y="328" width="32" height="40" rx="4" fill="#2563eb" ${vien(3)}/><path d="M232 338 h14 M232 348 h10" stroke="#facc15" stroke-width="3"/>`,
        tayTrai: `<rect x="80" y="440" width="80" height="24" rx="12" fill="#93c5fd" ${vien(4)}/><path d="M90 452 h60" stroke="#1d4ed8" stroke-width="3"/>`,
      }),
  },
  bo_doi: {
    mau: '#a3e635',
    bieu_tuong: '🪖',
    ten: 'Quân nhân',
    svg: (id) =>
      nguoi(id, {
        ao: '#4d7c0f',
        quan: '#3f6212',
        giay: '#1c1917',
        co: 'so_mi',
        tocTruoc: `<path d="M98 166 C98 70 302 70 302 166 Z" fill="#4d7c0f" ${vien(7)}/><path d="M86 160 Q200 186 314 160 L314 174 Q200 200 86 174 Z" fill="#365314" ${vien(6)}/><circle cx="200" cy="116" r="18" fill="#dc2626" ${vien(4)}/><path d="M200 102 l4.5 9 h10 l-8 6.5 l3 10 l-9.5 -6 l-9.5 6 l3 -10 l-8 -6.5 h10 Z" fill="#facc15"/>`,
        than: `<rect x="134" y="448" width="132" height="18" rx="4" fill="#1c1917" ${vien(4)}/><rect x="188" y="444" width="24" height="26" rx="4" fill="#facc15" ${vien(4)}/><rect x="150" y="330" width="34" height="30" rx="4" fill="#3f6212" ${vien(4)}/><rect x="216" y="330" width="34" height="30" rx="4" fill="#3f6212" ${vien(4)}/><path d="M172 290 l-14 10 M228 290 l14 10" stroke="#dc2626" stroke-width="6"/>`,
      }),
  },
  phong_vien: {
    mau: '#67e8f9',
    bieu_tuong: '🎤',
    ten: 'Phóng viên',
    svg: (id) =>
      nguoi(id, {
        nu: true,
        ao: '#0f766e',
        quan: '#334155',
        giay: '#111827',
        co: 'vest',
        tocSau: `<path d="M110 196 C98 92 302 92 290 196 L292 272 Q200 286 108 272 Z" fill="#451a03" ${vien(7)}/>`,
        tocTruoc: toc.maiTruoc('#451a03'),
        than: `<path d="M184 300 L190 360 M216 300 L210 360" stroke="#dc2626" stroke-width="4"/><rect x="180" y="356" width="40" height="52" rx="5" fill="#f8fafc" ${vien(4)}/><rect x="186" y="364" width="28" height="8" fill="#0f766e"/><path d="M188 384 h24 M188 394 h18" stroke="#94a3b8" stroke-width="3"/>`,
        tayPhai: `<rect x="270" y="388" width="18" height="62" rx="7" fill="#111827" ${vien(4)}/><circle cx="279" cy="380" r="18" fill="#64748b" ${vien(5)}/><rect x="266" y="404" width="26" height="16" rx="3" fill="#dc2626"/><text x="279" y="417" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="sans-serif">TV</text>`,
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
        co: 'vest',
        gia: true,
        may: '#475569',
        tocTruoc: `<path d="M110 182 C96 80 304 74 290 180 C284 154 272 140 256 136 C232 122 196 118 170 134 C150 140 132 142 122 150 C114 160 110 170 110 182 Z" fill="#cbd5e1" ${vien(6)}/><path d="M156 112 Q190 96 232 106 M178 132 Q212 116 250 124" fill="none" stroke="#f1f5f9" stroke-width="4" stroke-linecap="round"/>`,
        than: `${caVat('#1d4ed8')}<circle cx="240" cy="334" r="8" fill="#dc2626" ${vien(3)}/><path d="M240 329 l2 4 h4 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 h4 Z" fill="#facc15"/>`,
        tayPhai: `<rect x="262" y="424" width="36" height="10" rx="3" fill="#cbd5e1" ${vien(3)}/>`,
        tayTrai: `<rect x="94" y="446" width="52" height="66" rx="4" fill="#1d4ed8" ${vien(4)}/><path d="M104 462 h32 M104 474 h26" stroke="#bfdbfe" stroke-width="3"/>`,
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
        quanNgan: true,
        giay: '#f8fafc',
        tocTruoc: toc.ngan('#111827') + `<rect x="112" y="134" width="176" height="18" rx="9" fill="#facc15" ${vien(4)}/>`,
        than: `<path d="M178 290 L200 344 L222 290" fill="none" stroke="#2563eb" stroke-width="8"/><circle cx="200" cy="356" r="18" fill="#facc15" ${vien(4)}/><path d="M200 346 l3 7 h7 l-6 4 l2 7 l-6 -4 l-6 4 l2 -7 l-6 -4 h7 Z" fill="#a16207"/><text x="200" y="440" text-anchor="middle" font-size="48" font-weight="700" fill="#f8fafc" font-family="sans-serif" stroke="${VIEN}" stroke-width="2">10</text><path d="M128 330 L150 300 M272 330 L250 300" stroke="#f8fafc" stroke-width="6"/>`,
        tayPhai: `<circle cx="280" cy="478" r="28" fill="#f8fafc" ${vien(5)}/><path d="M280 450 L272 468 L288 468 Z M258 470 L272 468 L266 486 Z M302 470 L288 468 L294 486 Z M270 500 L280 486 L290 500" fill="${VIEN}"/>`,
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
        giay: '#f8fafc',
        co: 'vest',
        tocSau: `<path d="M110 186 C94 80 306 70 292 186 L286 240 L114 240 Z" fill="#7c3aed" ${vien(7)}/>`,
        tocTruoc: `<path d="M114 166 C126 64 304 60 290 154 C252 112 200 120 150 172 C138 162 124 162 114 166 Z" fill="#8b5cf6" ${vien(6)}/><rect x="130" y="112" width="140" height="28" rx="14" fill="#111827" ${vien(4)}/><rect x="140" y="118" width="50" height="16" rx="8" fill="#38bdf8"/><rect x="210" y="118" width="50" height="16" rx="8" fill="#38bdf8"/>`,
        than: `<path d="M150 330 l6 12 l12 6 l-12 6 l-6 12 l-6 -12 l-12 -6 l12 -6 Z M246 386 l5 10 l10 5 l-10 5 l-5 10 l-5 -10 l-10 -5 l10 -5 Z M168 430 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 l8 -4 Z" fill="#fde047"/>`,
        tayPhai: `<rect x="270" y="388" width="18" height="62" rx="7" fill="#e5e7eb" ${vien(4)}/><circle cx="279" cy="380" r="18" fill="#111827" ${vien(5)}/><path d="M268 374 h22 M268 382 h22" stroke="#64748b" stroke-width="3"/>`,
        tayTrai: `<path d="M98 470 q10 -26 30 -18 M128 452 v46" fill="none" stroke="#fde047" stroke-width="5" stroke-linecap="round"/><circle cx="120" cy="500" r="9" fill="#fde047"/>`,
      }),
  },
  dau_bep: {
    mau: '#fde68a',
    bieu_tuong: '🧑‍🍳',
    ten: 'Đầu bếp',
    svg: (id) =>
      nguoi(id, {
        ao: '#f8fafc',
        quan: '#1f2937',
        co: 'khong',
        tocTruoc: `<path d="M132 126 C102 62 160 26 200 54 C240 26 298 62 268 126 Z" fill="#fff" ${vien(6)}/><rect x="128" y="112" width="144" height="36" rx="8" fill="#fff" ${vien(6)}/><path d="M168 116 L168 146 M200 116 L200 146 M232 116 L232 146" stroke="#e2e8f0" stroke-width="4"/>`,
        than: `<path d="M172 290 L200 322 L228 290 Z" fill="#dc2626" ${vien(4)}/><path d="M150 340 L250 340 L246 480 L154 480 Z" fill="#e5e7eb" ${vien(5)}/><circle cx="182" cy="370" r="5" fill="${VIEN}"/><circle cx="218" cy="370" r="5" fill="${VIEN}"/><circle cx="182" cy="410" r="5" fill="${VIEN}"/><circle cx="218" cy="410" r="5" fill="${VIEN}"/>`,
        tayPhai: `<path d="M280 446 L286 380" stroke="#78350f" stroke-width="9" stroke-linecap="round"/><rect x="270" y="346" width="34" height="38" rx="6" fill="#94a3b8" ${vien(4)}/><path d="M278 356 v18 M288 356 v18 M296 356 v18" stroke="#e2e8f0" stroke-width="3"/>`,
      }),
  },
  nu_doanh_nhan: {
    mau: '#c4b5fd',
    bieu_tuong: '👩‍💼',
    ten: 'Nữ doanh nhân',
    svg: (id) =>
      nguoi(id, {
        nu: true,
        ao: '#312e81',
        quan: '#1e1b4b',
        vay: true,
        giay: '#111827',
        co: 'vest',
        tocSau: toc.buiSau('#1c1917'),
        tocTruoc: toc.buiTruoc('#1c1917') + `<circle cx="119" cy="214" r="5" fill="#f8fafc" ${vien(2)}/><circle cx="281" cy="214" r="5" fill="#f8fafc" ${vien(2)}/>`,
        than: `<circle cx="200" cy="320" r="5" fill="#fef3c7" ${vien(2)}/><circle cx="190" cy="314" r="4" fill="#fef3c7"/><circle cx="210" cy="314" r="4" fill="#fef3c7"/><rect x="230" y="334" width="22" height="6" rx="2" fill="#f8fafc"/>`,
        tayTrai: `<rect x="88" y="440" width="64" height="86" rx="8" fill="#111827" ${vien(5)}/><rect x="94" y="448" width="52" height="68" rx="3" fill="#60a5fa"/><path d="M100 494 l12 -14 l10 8 l14 -18" fill="none" stroke="#f8fafc" stroke-width="4"/>`,
      }),
  },
  nguoi_nuoc_ngoai: {
    mau: '#fde047',
    bieu_tuong: '🌍',
    ten: 'Người nước ngoài',
    svg: (id) =>
      nguoi(id, {
        da: '#fde4d0',
        ao: '#b91c1c',
        quan: '#1e3a8a',
        giay: '#78350f',
        co: 'so_mi',
        may: '#ca8a04',
        tocTruoc: `<path d="M108 184 C94 76 306 70 292 182 C288 158 278 142 262 138 C246 150 222 128 200 140 C180 126 160 148 142 136 C124 146 112 164 108 184 Z" fill="#facc15" ${vien(6)}/><path d="M150 120 Q170 104 196 112" fill="none" stroke="#fef08a" stroke-width="5"/>`,
        mat: matMacDinh('#2563eb'),
        than: `<path d="M140 340 L260 340 M140 400 L260 400 M136 450 L264 450 M168 296 L168 476 M232 296 L232 476" stroke="#7f1d1d" stroke-width="6" opacity="0.55"/><path d="M168 296 L176 476 M232 296 L224 476" stroke="#78350f" stroke-width="10"/>`,
        tayPhai: `<rect x="258" y="430" width="52" height="40" rx="8" fill="#111827" ${vien(4)}/><circle cx="284" cy="450" r="13" fill="#475569" ${vien(4)}/><circle cx="284" cy="450" r="6" fill="#38bdf8"/><rect x="294" y="424" width="12" height="8" rx="2" fill="#111827"/>`,
      }),
  },
}
