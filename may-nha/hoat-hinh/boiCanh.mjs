// Thư viện bối cảnh vẽ SVG (1080x1920) cho video nhân vật. Mỗi bối cảnh trả { svg, tw(t0, d) }:
// svg: hình vẽ toàn khung (mặt sàn từ y≈1180 để nhân vật đứng), tw: chuyển động riêng của bối cảnh trong [t0, t0+d]
// (mây trôi, đèn chớp...). `id` là tiền tố duy nhất cho mỗi lần dùng. Danh sách tên phải khớp lib/ai.ts (BOI_CANH).
import { boiCanhThem } from './boiCanhThem.mjs'
import { boiCanhCo } from './boiCanhCo.mjs'

const f = (x) => (Math.round(x * 1000) / 1000).toString()
const lap = (giay, chuKy) => Math.max(0, Math.floor(giay / chuKy) - 1)

// Mặt sàn có phản chiếu ánh sáng + đốm sáng chiếu xuống chỗ nhân vật đứng
const san = (id, mau1, mau2, vach, sang = '#ffffff') => `
  <defs><linearGradient id="${id}-san" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mau1}"/><stop offset="1" stop-color="${mau2}"/></linearGradient>
  <radialGradient id="${id}-dom" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${sang}" stop-opacity="0.32"/><stop offset="1" stop-color="${sang}" stop-opacity="0"/></radialGradient></defs>
  <rect x="0" y="1180" width="1080" height="740" fill="url(#${id}-san)"/>
  <rect x="0" y="1180" width="1080" height="10" fill="${vach}"/>
  <ellipse cx="290" cy="1330" rx="300" ry="90" fill="url(#${id}-dom)"/><ellipse cx="790" cy="1330" rx="300" ry="90" fill="url(#${id}-dom)"/>`

// Tia sáng chéo từ trên xuống (đèn sân khấu / nắng)
const tia = (id, mau, x0) => `
  <defs><linearGradient id="${id}-tia" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mau}" stop-opacity="0.35"/><stop offset="1" stop-color="${mau}" stop-opacity="0"/></linearGradient></defs>
  <g id="${id}-cum-tia">${[0, 1, 2].map((k) => `<polygon points="${x0 + k * 300},0 ${x0 + k * 300 + 90},0 ${x0 + k * 300 + 260},1300 ${x0 + k * 300 - 60},1300" fill="url(#${id}-tia)"/>`).join('')}</g>`
const nhayTia = (id, t0, d) => `tl.to("#${id}-cum-tia", { opacity: 0.55, duration: 1.6, yoyo: true, repeat: ${lap(d, 1.6)}, ease: "sine.inOut" }, ${f(t0)});`

// Toà nhà có cửa sổ và cạnh bóng đổ; `id` thì cửa sổ có id để nhấp nháy
const toaNha = (x, y, w, h, mau, mauCua, id, so = 0) => {
  const cua = []
  for (let r = 0; r < Math.floor((h - 40) / 70); r++)
    for (let c = 0; c < Math.floor((w - 20) / 50); c++)
      cua.push(`<rect ${id ? `id="${id}-c${so}-${r}-${c}"` : ''} x="${x + 18 + c * 50}" y="${y + 30 + r * 70}" width="28" height="38" rx="4" fill="${mauCua}"/>`)
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${mau}"/><rect x="${x + w - 18}" y="${y}" width="18" height="${h}" fill="#00000022"/>${cua.join('')}`
}

export const BOI_CANH = {
  // Trường quay bản tin: tường gradient, thành phố đêm sau cửa kính, trăng, đèn sân khấu
  truong_quay: (id) => ({
    svg: `
      <defs><linearGradient id="${id}-tuong" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140f3c"/><stop offset="1" stop-color="#3b1d72"/></linearGradient></defs>
      <rect width="1080" height="1920" fill="url(#${id}-tuong)"/>
      <rect x="50" y="250" width="980" height="800" rx="34" fill="#070b1f"/>
      ${toaNha(80, 640, 170, 410, '#16213e', '#fde68a88', id, 0)}${toaNha(270, 520, 150, 530, '#1b2550', '#93c5fd88', id, 1)}${toaNha(440, 700, 190, 350, '#16213e', '#fde68a88', id, 2)}${toaNha(650, 560, 160, 490, '#1e2a5a', '#f9a8d488', id, 3)}${toaNha(830, 680, 170, 370, '#16213e', '#fde68a88', id, 4)}
      <circle cx="880" cy="380" r="58" fill="#fef3c7"/><circle cx="902" cy="366" r="56" fill="#070b1f"/>
      <rect x="50" y="250" width="980" height="800" rx="34" fill="none" stroke="#6d28d9" stroke-width="20"/>
      <line x1="540" y1="250" x2="540" y2="1050" stroke="#6d28d9" stroke-width="14"/>
      ${tia(id, '#c4b5fd', 60)}
      ${san(id, '#4c1d95', '#1e0b3d', '#a78bfa', '#c4b5fd')}`,
    tw: (t0, d) => [
      nhayTia(id, t0, d),
      ...[0, 1, 2, 3, 4].map((k) => `tl.to("[id^='${id}-c${k}-']", { opacity: 0.25, duration: ${f(0.9 + k * 0.3)}, yoyo: true, repeat: ${lap(d, 0.9 + k * 0.3)}, ease: "none", stagger: { each: 0.13 } }, ${f(t0 + k * 0.2)});`),
    ],
  }),

  // Phố (mọi cảnh ngoài trời / "ở nước X"): trời nắng, mây, nhà nhiều màu có bóng đổ, hàng dừa, vạch đường
  pho_florida: (id) => ({
    svg: `
      <defs><linearGradient id="${id}-troi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="0.6" stop-color="#7dd3fc"/><stop offset="1" stop-color="#fef3c7"/></linearGradient>
      <radialGradient id="${id}-nang" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fef08a"/><stop offset="1" stop-color="#fef08a" stop-opacity="0"/></radialGradient></defs>
      <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
      <circle cx="820" cy="420" r="260" fill="url(#${id}-nang)"/><circle id="${id}-mat-troi" cx="820" cy="420" r="95" fill="#fde047"/>
      <g id="${id}-may1" opacity="0.95"><ellipse cx="200" cy="380" rx="130" ry="46" fill="#fff"/><ellipse cx="270" cy="345" rx="85" ry="55" fill="#fff"/><ellipse cx="140" cy="365" rx="60" ry="38" fill="#fff"/></g>
      <g id="${id}-may2" opacity="0.85"><ellipse cx="620" cy="290" rx="105" ry="36" fill="#fff"/><ellipse cx="670" cy="265" rx="66" ry="40" fill="#fff"/></g>
      <g opacity="0.55">${toaNha(40, 620, 190, 560, '#93c5fd', '#e0f2fe')}${toaNha(860, 580, 200, 600, '#a5b4fc', '#eef2ff')}</g>
      ${toaNha(110, 720, 210, 460, '#fb923c', '#fff7ed')}${toaNha(340, 590, 190, 590, '#f472b6', '#fdf2f8')}${toaNha(560, 780, 230, 400, '#34d399', '#ecfdf5')}${toaNha(810, 660, 190, 520, '#a78bfa', '#f5f3ff')}
      <g id="${id}-dua1"><path d="M84 1190 Q70 950 96 760" stroke="#92400e" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M96 770 Q10 720 -40 800 M96 770 Q180 700 230 790 M96 770 Q30 680 0 640 M96 770 Q160 660 210 650 M96 770 Q96 690 104 630" stroke="#16a34a" stroke-width="36" fill="none" stroke-linecap="round"/></g>
      <g id="${id}-dua2"><path d="M996 1190 Q1010 980 990 810" stroke="#92400e" stroke-width="28" fill="none" stroke-linecap="round"/><path d="M990 820 Q910 770 870 840 M990 820 Q1070 760 1110 840 M990 820 Q930 730 900 700 M990 820 Q1050 720 1090 710" stroke="#15803d" stroke-width="34" fill="none" stroke-linecap="round"/></g>
      ${san(id, '#94a3b8', '#475569', '#e2e8f0', '#fef9c3')}
      <rect x="0" y="1290" width="1080" height="14" fill="#f8fafc" opacity="0.7"/>${[0, 1, 2, 3, 4].map((k) => `<rect x="${40 + k * 230}" y="1420" width="130" height="16" rx="8" fill="#facc15" opacity="0.85"/>`).join('')}`,
    tw: (t0, d) => [
      `tl.fromTo("#${id}-may1", { x: -90 }, { x: 170, duration: ${f(d)}, ease: "none" }, ${f(t0)});`,
      `tl.fromTo("#${id}-may2", { x: 70 }, { x: -130, duration: ${f(d)}, ease: "none" }, ${f(t0)});`,
      `gsap.set("#${id}-dua1", { svgOrigin: "84 1190" }); gsap.set("#${id}-dua2", { svgOrigin: "996 1190" });`,
      `tl.to(["#${id}-dua1", "#${id}-dua2"], { rotation: 2.5, duration: 1.3, yoyo: true, repeat: ${lap(d, 1.3)}, ease: "sine.inOut" }, ${f(t0)});`,
      `tl.to("#${id}-mat-troi", { scale: 1.07, svgOrigin: "820 420", duration: 1.1, yoyo: true, repeat: ${lap(d, 1.1)}, ease: "sine.inOut" }, ${f(t0)});`,
    ],
  }),

  // Phòng máy chủ AI: dãy tủ máy chủ, quầng sáng, đèn chớp, lưới sàn phối cảnh phát sáng
  may_chu: (id) => ({
    svg: `
      <defs><linearGradient id="${id}-nen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="1" stop-color="#0c1a3a"/></linearGradient>
      <radialGradient id="${id}-quang" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient></defs>
      <rect width="1080" height="1920" fill="url(#${id}-nen)"/>
      <ellipse id="${id}-quang-giua" cx="540" cy="700" rx="520" ry="420" fill="url(#${id}-quang)"/>
      ${[0, 1, 2, 3].map((k) => `<rect x="${60 + k * 250}" y="290" width="210" height="890" rx="16" fill="#0f172a" stroke="#1d4ed8" stroke-width="5"/><rect x="${70 + k * 250}" y="300" width="190" height="16" fill="#1e3a8a"/>`).join('')}
      ${[...Array(12)].map((_, k) => `<rect x="${80 + (k % 4) * 250}" y="${360 + Math.floor(k / 4) * 270}" width="170" height="8" rx="4" fill="#1e293b"/>`).join('')}
      ${[...Array(56)].map((_, k) => `<circle id="${id}-den${k}" cx="${92 + (k % 4) * 250 + ((k * 3) % 6) * 28}" cy="${340 + Math.floor(k / 4) * 60}" r="8" fill="${['#22d3ee', '#4ade80', '#a78bfa', '#f472b6'][k % 4]}"/>`).join('')}
      ${san(id, '#0b2149', '#020617', '#22d3ee', '#67e8f9')}
      ${[...Array(9)].map((_, k) => `<line x1="${540 + (k - 4) * 60}" y1="1190" x2="${540 + (k - 4) * 260}" y2="1920" stroke="#22d3ee" stroke-opacity="0.18" stroke-width="3"/>`).join('')}
      ${[0, 1, 2, 3, 4].map((k) => `<line x1="0" y1="${1240 + k * k * 34}" x2="1080" y2="${1240 + k * k * 34}" stroke="#22d3ee" stroke-opacity="0.15" stroke-width="3"/>`).join('')}
      ${[0, 1, 2, 3].map((k) => `<g id="${id}-dl${k}">${[...Array(7)].map((_, j) => `<rect x="${236 + k * 250}" y="${300 + j * 130}" width="14" height="${40 + ((j * 37 + k * 11) % 60)}" rx="7" fill="#22d3ee" opacity="0.55"/>`).join('')}</g>`).join('')}`,
    tw: (t0, d) => [
      `tl.to("#${id}-quang-giua", { opacity: 0.5, duration: 1.2, yoyo: true, repeat: ${lap(d, 1.2)}, ease: "sine.inOut" }, ${f(t0)});`,
      // Dòng dữ liệu chạy dọc theo tủ máy chủ
      ...[0, 1, 2, 3].map((k) => `tl.fromTo("#${id}-dl${k}", { y: -130 }, { y: 0, duration: 0.9, repeat: ${lap(d, 0.9)}, ease: "none" }, ${f(t0 + k * 0.2)});`),
      ...[...Array(56)].map((_, k) => `tl.to("#${id}-den${k}", { opacity: 0.12, duration: ${f(0.2 + (k % 6) * 0.13)}, yoyo: true, repeat: ${lap(d, 0.2 + (k % 6) * 0.13)}, ease: "none" }, ${f(t0 + (k % 9) * 0.07)});`),
    ],
  }),

  // Phòng điều tra (cảnh sát, tội phạm, pháp luật): bảng ghim ảnh nối dây đỏ, cửa sổ trời sao, đèn bàn, quầng đèn đỏ-xanh
  don_canh_sat: (id) => ({
    svg: `
      <defs><linearGradient id="${id}-tuong" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
      <radialGradient id="${id}-den" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fde68a" stop-opacity="0.55"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs>
      <rect width="1080" height="1920" fill="url(#${id}-tuong)"/>
      <rect x="690" y="270" width="330" height="440" rx="14" fill="#0b1026" stroke="#475569" stroke-width="14"/>
      ${[...Array(18)].map((_, k) => `<circle cx="${710 + ((k * 97) % 290)}" cy="${290 + ((k * 151) % 400)}" r="${2 + (k % 3)}" fill="#e2e8f0" opacity="${0.5 + (k % 3) * 0.2}"/>`).join('')}
      <circle cx="930" cy="360" r="40" fill="#f1f5f9"/><line x1="855" y1="270" x2="855" y2="710" stroke="#475569" stroke-width="10"/>
      <rect x="60" y="300" width="580" height="420" rx="16" fill="#a16207"/><rect x="76" y="316" width="548" height="388" rx="10" fill="#ca8a04"/>
      ${[[110, 350, '🕵️'], [300, 340, '💻'], [470, 360, '📍'], [140, 540, '📄'], [330, 560, '🚨'], [490, 540, '🤖']].map(([x, y, e], k) => `<rect x="${x}" y="${y}" width="120" height="130" fill="#fefce8" transform="rotate(${k % 2 ? 4 : -4} ${x + 60} ${y + 65})"/><text x="${x + 60}" y="${y + 92}" text-anchor="middle" font-size="64" font-family="Emoji">${e}</text><circle cx="${x + 60}" cy="${y + 8}" r="9" fill="#dc2626"/>`).join('')}
      <polyline id="${id}-day" points="170,358 360,348 530,368 550,548 390,568 200,548 170,358" fill="none" stroke="#dc2626" stroke-width="5"/>
      <ellipse cx="540" cy="1090" rx="420" ry="160" fill="url(#${id}-den)"/>
      <rect x="380" y="1050" width="320" height="22" rx="8" fill="#334155"/><path d="M600 1050 L640 960 L700 975" stroke="#94a3b8" stroke-width="10" fill="none"/><path d="M670 950 L740 975 L720 1010 Z" fill="#fbbf24"/>
      <circle id="${id}-quang-do" cx="250" cy="820" r="380" fill="#ef4444" opacity="0.28"/>
      <circle id="${id}-quang-xanh" cx="830" cy="820" r="380" fill="#3b82f6" opacity="0"/>
      ${san(id, '#334155', '#0f172a', '#94a3b8', '#bfdbfe')}`,
    tw: (t0, d) => [
      `tl.to("#${id}-quang-do", { opacity: 0, duration: 0.3, yoyo: true, repeat: ${lap(d, 0.3)}, ease: "none" }, ${f(t0)});`,
      `tl.to("#${id}-quang-xanh", { opacity: 0.28, duration: 0.3, yoyo: true, repeat: ${lap(d, 0.3)}, ease: "none" }, ${f(t0)});`,
      `tl.fromTo("#${id}-day", { opacity: 0.3 }, { opacity: 1, duration: 0.8, yoyo: true, repeat: ${lap(d, 0.8)}, ease: "sine.inOut" }, ${f(t0)});`,
    ],
  }),

  // Phòng khách ấm cúng: đèn cây, cửa sổ, tranh, sofa, cây xanh, thảm
  phong_khach: (id) => ({
    svg: `
      <defs><linearGradient id="${id}-tuong" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
      <radialGradient id="${id}-den" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff7ed" stop-opacity="0.9"/><stop offset="1" stop-color="#fff7ed" stop-opacity="0"/></radialGradient></defs>
      <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
      <circle id="${id}-quang-den" cx="150" cy="520" r="260" fill="url(#${id}-den)"/>
      <rect x="140" y="560" width="14" height="620" fill="#78350f"/><path d="M90 560 L210 560 L180 470 L120 470 Z" fill="#fff7ed" stroke="#92400e" stroke-width="6"/>
      <rect x="650" y="300" width="330" height="380" rx="20" fill="#7dd3fc" stroke="#92400e" stroke-width="16"/><line x1="815" y1="300" x2="815" y2="680" stroke="#92400e" stroke-width="10"/><line x1="650" y1="490" x2="980" y2="490" stroke="#92400e" stroke-width="10"/>
      <rect x="290" y="330" width="250" height="180" rx="12" fill="#fff7ed" stroke="#92400e" stroke-width="10"/><path d="M315 485 L375 405 L425 465 L465 425 L515 485 Z" fill="#86efac"/><circle cx="480" cy="380" r="22" fill="#fde047"/>
      <path d="M960 1180 Q930 1000 960 900 Q990 1000 960 1180 M960 1080 Q880 1000 900 930 M960 1040 Q1040 960 1030 900" stroke="#15803d" stroke-width="22" fill="none" stroke-linecap="round"/><rect x="915" y="1120" width="90" height="70" rx="12" fill="#b45309"/>
      <rect x="230" y="900" width="560" height="200" rx="60" fill="#ea580c"/><rect x="210" y="840" width="600" height="110" rx="55" fill="#f97316"/><rect x="250" y="880" width="160" height="90" rx="30" fill="#fdba74"/>
      ${san(id, '#b45309', '#78350f', '#78350f', '#fff7ed')}
      <ellipse cx="540" cy="1500" rx="460" ry="120" fill="#dc2626" opacity="0.35"/><ellipse cx="540" cy="1500" rx="380" ry="90" fill="none" stroke="#fde68a" stroke-opacity="0.5" stroke-width="10"/>`,
    tw: (t0, d) => [`tl.to("#${id}-quang-den", { opacity: 0.6, duration: 1.4, yoyo: true, repeat: ${lap(d, 1.4)}, ease: "sine.inOut" }, ${f(t0)});`],
  }),

  // Văn phòng công ty công nghệ: kính lớn nhìn ra toà nhà, bảng biểu đồ tăng trưởng, bàn có màn hình
  van_phong: (id) => ({
    svg: `
      <defs><linearGradient id="${id}-tuong" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0f2fe"/><stop offset="1" stop-color="#bae6fd"/></linearGradient></defs>
      <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
      <rect x="40" y="260" width="620" height="760" rx="18" fill="#7dd3fc"/>
      ${toaNha(70, 520, 170, 500, '#38bdf8', '#e0f2fe')}${toaNha(260, 420, 150, 600, '#0ea5e9', '#f0f9ff')}${toaNha(430, 600, 200, 420, '#38bdf8', '#e0f2fe')}
      ${[0, 1, 2].map((k) => `<rect x="${40 + k * 207}" y="260" width="12" height="760" fill="#e2e8f0"/>`).join('')}<rect x="40" y="260" width="620" height="760" rx="18" fill="none" stroke="#e2e8f0" stroke-width="16"/>
      <rect x="720" y="300" width="300" height="400" rx="16" fill="#fff" stroke="#94a3b8" stroke-width="8"/>
      <polyline id="${id}-bieu-do" points="760,620 820,560 880,590 940,480 990,420" fill="none" stroke="#10b981" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      ${[0, 1, 2].map((k) => `<rect x="760" y="${350 + k * 50}" width="${200 - k * 50}" height="22" rx="11" fill="#cbd5e1"/>`).join('')}
      <rect x="690" y="980" width="360" height="26" rx="10" fill="#475569"/><rect x="720" y="870" width="150" height="100" rx="10" fill="#1e293b"/><rect id="${id}-man" x="732" y="882" width="126" height="76" rx="6" fill="#38bdf8"/>
      ${san(id, '#cbd5e1', '#64748b', '#94a3b8', '#ffffff')}`,
    tw: (t0, d) => [
      `tl.fromTo("#${id}-bieu-do", { opacity: 0.2 }, { opacity: 1, duration: 1.2, ease: "power2.out" }, ${f(t0 + 0.2)});`,
      `tl.to("#${id}-man", { opacity: 0.5, duration: 0.9, yoyo: true, repeat: ${lap(d, 0.9)}, ease: "sine.inOut" }, ${f(t0)});`,
    ],
  }),

  // Vũ trụ (vệ tinh, tên lửa, khám phá, internet vệ tinh): trời sao, Trái Đất, hành tinh, sao băng, mặt đất đá
  vu_tru: (id) => ({
    svg: `
      <defs><radialGradient id="${id}-nen" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="#312e81"/><stop offset="1" stop-color="#020617"/></radialGradient>
      <radialGradient id="${id}-dat" cx="0.35" cy="0.35" r="0.7"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#1e3a8a"/></radialGradient></defs>
      <rect width="1080" height="1920" fill="url(#${id}-nen)"/>
      <defs>${[["#a855f7", 0], ["#ec4899", 1], ["#06b6d4", 2]].map(([m, k]) => `<radialGradient id="${id}-tv${k}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${m}" stop-opacity="0.45"/><stop offset="1" stop-color="${m}" stop-opacity="0"/></radialGradient>`).join("")}</defs>
      <g id="${id}-tinh-van"><ellipse cx="300" cy="620" rx="420" ry="260" fill="url(#${id}-tv0)"/><ellipse cx="760" cy="300" rx="380" ry="220" fill="url(#${id}-tv1)"/><ellipse cx="560" cy="980" rx="460" ry="200" fill="url(#${id}-tv2)"/></g>
      ${[...Array(60)].map((_, k) => `<circle id="${id}-sao${k}" cx="${(k * 181) % 1080}" cy="${40 + ((k * 263) % 1120)}" r="${1.5 + (k % 4)}" fill="#fff" opacity="${0.4 + (k % 4) * 0.15}"/>`).join('')}
      <circle cx="800" cy="520" r="210" fill="url(#${id}-dat)"/><path d="M640 470 Q700 420 760 470 Q800 520 740 560 Q690 600 650 560 Z M820 380 Q880 360 900 420 Q870 460 830 440 Z" fill="#22c55e" opacity="0.85"/>
      <ellipse cx="800" cy="520" rx="300" ry="60" fill="none" stroke="#c4b5fd" stroke-opacity="0.5" stroke-width="10" transform="rotate(-18 800 520)"/>
      <circle cx="210" cy="330" r="70" fill="#f9a8d4"/><circle cx="190" cy="315" r="14" fill="#f472b6"/>
      <line id="${id}-sao-bang" x1="120" y1="160" x2="300" y2="230" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0"/>
      <path d="M0 1180 Q270 1120 540 1170 Q810 1220 1080 1150 L1080 1920 L0 1920 Z" fill="#64748b"/>
      ${[0, 1, 2, 3].map((k) => `<ellipse cx="${150 + k * 260}" cy="${1300 + (k % 2) * 90}" rx="${70 - k * 8}" ry="22" fill="#475569"/>`).join('')}`,
    tw: (t0, d) => [
      ...[...Array(20)].map((_, j) => `tl.to("#${id}-sao${j * 3}", { opacity: 0.1, duration: ${f(0.5 + (j % 5) * 0.2)}, yoyo: true, repeat: ${lap(d, 0.5 + (j % 5) * 0.2)}, ease: "sine.inOut" }, ${f(t0 + (j % 7) * 0.1)});`),
      `tl.to("#${id}-tinh-van", { x: 40, y: -30, duration: ${f(d)}, ease: "sine.inOut" }, ${f(t0)});`,
      `tl.fromTo("#${id}-sao-bang", { x: -300, y: -120, opacity: 0 }, { x: 700, y: 280, opacity: 1, duration: 1.1, ease: "power1.in" }, ${f(t0 + 0.8)});`,
    ],
  }),

  // Cửa hàng điện thoại / đồ công nghệ: biển hiệu, kệ trưng bày điện thoại và laptop sáng màn hình, biển SALE
  cua_hang: (id) => ({
    svg: `
      <defs><linearGradient id="${id}-tuong" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5f3ff"/><stop offset="1" stop-color="#ddd6fe"/></linearGradient></defs>
      <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
      <defs><filter id="${id}-neon" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>
      <rect id="${id}-neon-sau" x="20" y="222" width="1040" height="86" rx="20" fill="none" stroke="#e879f9" stroke-width="16" filter="url(#${id}-neon)"/>
      <rect x="0" y="230" width="1080" height="70" fill="#7c3aed"/>
      <rect x="20" y="222" width="1040" height="86" rx="20" fill="none" stroke="#f5d0fe" stroke-width="4"/><text x="540" y="282" text-anchor="middle" font-family="BVP, sans-serif" font-weight="700" font-size="46" fill="#fff">TECH STORE</text>
      ${[0, 1, 2].map((r) => `<rect x="70" y="${400 + r * 230}" width="940" height="24" rx="8" fill="#a78bfa"/><rect x="70" y="${424 + r * 230}" width="940" height="10" fill="#7c3aed55"/>`).join('')}
      ${[...Array(15)].map((_, k) => {
        const r = Math.floor(k / 5), c = k % 5, x = 110 + c * 185, y = 400 + r * 230
        return k % 3 === 1
          ? `<rect x="${x - 10}" y="${y - 100}" width="150" height="96" rx="8" fill="#1e293b"/><rect id="${id}-mh${k}" x="${x}" y="${y - 92}" width="130" height="78" rx="4" fill="${['#38bdf8', '#f472b6', '#4ade80'][r]}"/>`
          : `<rect x="${x + 20}" y="${y - 150}" width="80" height="146" rx="16" fill="#0f172a"/><rect id="${id}-mh${k}" x="${x + 27}" y="${y - 140}" width="66" height="122" rx="10" fill="${['#818cf8', '#fb7185', '#34d399', '#fbbf24'][k % 4]}"/>`
      }).join('')}
      <g id="${id}-sale"><rect x="820" y="330" width="200" height="90" rx="20" fill="#ef4444" transform="rotate(8 920 375)"/><text x="920" y="392" text-anchor="middle" font-family="BVP, sans-serif" font-weight="700" font-size="48" fill="#fff" transform="rotate(8 920 375)">SALE</text></g>
      ${san(id, '#e9d5ff', '#a78bfa', '#c4b5fd', '#ffffff')}`,
    tw: (t0, d) => [
      `gsap.set("#${id}-sale", { svgOrigin: "920 375" });`,
      `tl.to("#${id}-neon-sau", { opacity: 0.35, duration: 0.7, yoyo: true, repeat: ${lap(d, 0.7)}, ease: "sine.inOut" }, ${f(t0)});`,
      `tl.to("#${id}-sale", { scale: 1.1, rotation: -6, duration: 0.5, yoyo: true, repeat: ${lap(d, 0.5)}, ease: "sine.inOut" }, ${f(t0)});`,
      ...[...Array(15)].map((_, k) => `tl.to("#${id}-mh${k}", { opacity: 0.55, duration: ${f(0.7 + (k % 4) * 0.25)}, yoyo: true, repeat: ${lap(d, 0.7 + (k % 4) * 0.25)}, ease: "sine.inOut" }, ${f(t0 + (k % 5) * 0.15)});`),
    ],
  }),

  // Bối cảnh thêm: thành phố đêm, nông thôn, trường học, bệnh viện, nhà máy… (boiCanhThem.mjs)
  ...boiCanhThem({ san, toaNha, f, lap }),
  // Bối cảnh theo thời kỳ / văn hoá / nghề: thảo nguyên, cung điện, chiến trường, ga-ra khởi nghiệp… (boiCanhCo.mjs)
  ...boiCanhCo({ san, f, lap }),
}
