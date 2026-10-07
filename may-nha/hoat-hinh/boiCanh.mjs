// Thư viện bối cảnh vẽ SVG (1080x1920) cho video nhân vật. Mỗi bối cảnh trả { svg, tw(t0, d) }:
// svg: hình vẽ toàn khung (mặt sàn từ y≈1180 để nhân vật đứng), tw: các chuyển động riêng của bối cảnh
// trong khoảng [t0, t0+d] (mây trôi, đèn chớp...). `id` là tiền tố duy nhất cho mỗi lần dùng.
const f = (x) => (Math.round(x * 1000) / 1000).toString()
const lap = (giay, chuKy) => Math.max(0, Math.floor(giay / chuKy) - 1)

const san = (mau1, mau2) => `<rect x="0" y="1180" width="1080" height="740" fill="${mau1}"/><rect x="0" y="1180" width="1080" height="16" fill="${mau2}"/>`

export const BOI_CANH = {
  // Trường quay bản tin: cửa kính nhìn ra thành phố đêm, bàn dẫn, màn hình
  truong_quay: (id) => ({
    svg: `
      <rect width="1080" height="1920" fill="#1e1b4b"/>
      <rect x="60" y="250" width="960" height="760" rx="30" fill="#0b1026"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<rect x="${90 + k * 118}" y="${560 + ((k * 137) % 260)}" width="90" height="${450 - ((k * 137) % 260)}" fill="#1e293b"/>`).join('')}
      ${[...Array(22)].map((_, k) => `<rect id="${id}-cua${k}" x="${105 + (k % 8) * 118 + ((k * 7) % 3) * 22}" y="${640 + Math.floor(k / 8) * 110 + ((k * 13) % 40)}" width="18" height="24" fill="#fde68a"/>`).join('')}
      <circle cx="860" cy="360" r="50" fill="#fef3c7"/>
      <rect x="60" y="250" width="960" height="760" rx="30" fill="none" stroke="#4c1d95" stroke-width="18"/>
      <line x1="540" y1="250" x2="540" y2="1010" stroke="#4c1d95" stroke-width="14"/>
      ${san('#2e1065', '#7c3aed')}
      <rect x="0" y="1180" width="1080" height="740" fill="url(#${id}-bong)" opacity="0.5"/>
      <defs><linearGradient id="${id}-bong" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#2e1065" stop-opacity="0"/></linearGradient></defs>`,
    tw: (t0, d) =>
      [...Array(22)].map((_, k) => `tl.to("#${id}-cua${k}", { opacity: 0.2, duration: ${f(0.6 + (k % 5) * 0.3)}, yoyo: true, repeat: ${lap(d, 0.6 + (k % 5) * 0.3)}, ease: "none" }, ${f(t0 + (k % 7) * 0.2)});`),
  }),

  // Đường phố Florida: nắng, dừa, mây, nhà cao tầng
  pho_florida: (id) => ({
    svg: `
      <defs><linearGradient id="${id}-troi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs>
      <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
      <circle id="${id}-mat-troi" cx="820" cy="420" r="110" fill="#fde047"/>
      <g id="${id}-may1"><ellipse cx="200" cy="380" rx="120" ry="45" fill="#fff"/><ellipse cx="270" cy="350" rx="80" ry="50" fill="#fff"/></g>
      <g id="${id}-may2"><ellipse cx="600" cy="300" rx="100" ry="38" fill="#ffffffdd"/><ellipse cx="650" cy="275" rx="65" ry="40" fill="#ffffffdd"/></g>
      <rect x="120" y="700" width="200" height="480" fill="#fb923c"/><rect x="340" y="560" width="180" height="620" fill="#f472b6"/><rect x="560" y="760" width="220" height="420" fill="#34d399"/><rect x="800" y="640" width="190" height="540" fill="#a78bfa"/>
      ${[...Array(24)].map((_, k) => `<rect x="${140 + (k % 4) * 45 + Math.floor(k / 8) * 230}" y="${740 + (Math.floor(k / 4) % 2) * 90 + Math.floor(k / 8) * 20}" width="28" height="40" fill="#ffffffaa"/>`).join('')}
      <g id="${id}-dua1"><rect x="70" y="760" width="28" height="430" rx="10" fill="#92400e"/><path d="M84 770 Q0 720 -40 800 M84 770 Q170 700 220 790 M84 770 Q20 680 -10 640 M84 770 Q150 660 200 650 M84 770 Q84 690 90 640" stroke="#16a34a" stroke-width="34" fill="none" stroke-linecap="round"/></g>
      <g id="${id}-dua2"><rect x="985" y="800" width="26" height="390" rx="10" fill="#92400e"/><path d="M998 810 Q920 760 880 830 M998 810 Q1080 750 1120 830 M998 810 Q940 720 910 690 M998 810 Q1060 710 1100 700" stroke="#15803d" stroke-width="32" fill="none" stroke-linecap="round"/></g>
      ${san('#64748b', '#e2e8f0')}
      <rect x="0" y="1300" width="1080" height="18" fill="#facc15" opacity="0.8"/>`,
    tw: (t0, d) => [
      `tl.fromTo("#${id}-may1", { x: -80 }, { x: 160, duration: ${f(d)}, ease: "none" }, ${f(t0)});`,
      `tl.fromTo("#${id}-may2", { x: 60 }, { x: -120, duration: ${f(d)}, ease: "none" }, ${f(t0)});`,
      `gsap.set(["#${id}-dua1", "#${id}-dua2"], { svgOrigin: "540 1190" });`,
      `tl.to("#${id}-dua1", { rotation: 1.5, duration: 1.2, yoyo: true, repeat: ${lap(d, 1.2)}, ease: "sine.inOut" }, ${f(t0)});`,
      `tl.to("#${id}-mat-troi", { scale: 1.06, duration: 1, yoyo: true, repeat: ${lap(d, 1)}, ease: "sine.inOut", svgOrigin: "820 420" }, ${f(t0)});`,
    ],
  }),

  // Phòng máy chủ AI: tủ máy chủ, đèn chớp, sàn ánh xanh
  may_chu: (id) => ({
    svg: `
      <rect width="1080" height="1920" fill="#020617"/>
      ${[0, 1, 2, 3].map((k) => `<rect x="${60 + k * 250}" y="300" width="210" height="880" rx="14" fill="#0f172a" stroke="#1e3a8a" stroke-width="6"/>`).join('')}
      ${[...Array(48)].map((_, k) => `<circle id="${id}-den${k}" cx="${90 + (k % 4) * 250 + ((k * 3) % 5) * 30}" cy="${350 + Math.floor(k / 4) * 68}" r="9" fill="${['#22d3ee', '#4ade80', '#a78bfa'][k % 3]}"/>`).join('')}
      ${[...Array(12)].map((_, k) => `<rect x="${80 + (k % 4) * 250}" y="${340 + Math.floor(k / 4) * 270}" width="170" height="10" fill="#1e293b"/>`).join('')}
      ${san('#0c1a3a', '#22d3ee')}
      <rect x="0" y="1196" width="1080" height="400" fill="#22d3ee" opacity="0.08"/>`,
    tw: (t0, d) =>
      [...Array(48)].map((_, k) => `tl.to("#${id}-den${k}", { opacity: 0.15, duration: ${f(0.2 + (k % 6) * 0.13)}, yoyo: true, repeat: ${lap(d, 0.2 + (k % 6) * 0.13)}, ease: "none" }, ${f(t0 + (k % 9) * 0.07)});`),
  }),

  // Đồn cảnh sát: toà nhà, biển POLICE, xe cảnh sát nháy đèn
  don_canh_sat: (id) => ({
    svg: `
      <rect width="1080" height="1920" fill="#1e3a8a"/>
      <circle cx="180" cy="330" r="60" fill="#e2e8f0"/>
      <rect x="140" y="520" width="800" height="660" fill="#cbd5e1"/>
      <polygon points="110,530 540,380 970,530" fill="#94a3b8"/>
      <rect x="360" y="560" width="360" height="90" rx="12" fill="#1d4ed8"/>
      <text x="540" y="625" text-anchor="middle" font-family="BVP, sans-serif" font-weight="700" font-size="58" fill="#fff">POLICE</text>
      ${[0, 1, 2, 3].map((k) => `<rect x="${200 + k * 180}" y="700" width="110" height="150" rx="8" fill="#334155"/>`).join('')}
      <rect x="470" y="930" width="140" height="250" rx="10" fill="#475569"/>
      <g id="${id}-xe">
        <rect x="620" y="1080" width="380" height="110" rx="30" fill="#f8fafc" stroke="#0f172a" stroke-width="8"/>
        <path d="M690 1080 L730 1020 L890 1020 L930 1080 Z" fill="#f8fafc" stroke="#0f172a" stroke-width="8"/>
        <rect x="620" y="1120" width="380" height="26" fill="#1d4ed8"/>
        <rect id="${id}-den-do" x="760" y="990" width="50" height="30" rx="8" fill="#ef4444"/>
        <rect id="${id}-den-xanh" x="815" y="990" width="50" height="30" rx="8" fill="#3b82f6"/>
        <circle cx="700" cy="1195" r="38" fill="#0f172a"/><circle cx="920" cy="1195" r="38" fill="#0f172a"/>
      </g>
      <circle id="${id}-quang-do" cx="785" cy="1000" r="220" fill="#ef4444" opacity="0.35"/>
      <circle id="${id}-quang-xanh" cx="840" cy="1000" r="220" fill="#3b82f6" opacity="0"/>
      ${san('#334155', '#94a3b8')}`,
    tw: (t0, d) => [
      `tl.to("#${id}-quang-do", { opacity: 0, duration: 0.3, yoyo: true, repeat: ${lap(d, 0.3)}, ease: "none" }, ${f(t0)});`,
      `tl.to("#${id}-quang-xanh", { opacity: 0.35, duration: 0.3, yoyo: true, repeat: ${lap(d, 0.3)}, ease: "none" }, ${f(t0)});`,
      `tl.to("#${id}-den-do", { opacity: 0.3, duration: 0.3, yoyo: true, repeat: ${lap(d, 0.3)}, ease: "none" }, ${f(t0)});`,
    ],
  }),

  // Phòng khách: tường, cửa sổ, sofa, bàn có laptop
  phong_khach: (id) => ({
    svg: `
      <rect width="1080" height="1920" fill="#fde68a"/>
      <rect x="0" y="0" width="1080" height="1180" fill="#fcd34d"/>
      <rect x="640" y="300" width="330" height="380" rx="20" fill="#7dd3fc" stroke="#92400e" stroke-width="16"/>
      <line x1="805" y1="300" x2="805" y2="680" stroke="#92400e" stroke-width="10"/>
      <rect x="120" y="360" width="260" height="190" rx="12" fill="#fff7ed" stroke="#92400e" stroke-width="10"/>
      <path d="M150 520 L210 440 L260 500 L300 460 L350 520 Z" fill="#86efac"/>
      <rect x="90" y="900" width="560" height="200" rx="60" fill="#f97316"/><rect x="70" y="840" width="600" height="110" rx="55" fill="#fb923c"/>
      <rect x="700" y="980" width="300" height="30" rx="10" fill="#92400e"/><rect x="730" y="1010" width="20" height="170" fill="#92400e"/><rect x="950" y="1010" width="20" height="170" fill="#92400e"/>
      <rect x="770" y="900" width="160" height="80" rx="8" fill="#334155"/><rect id="${id}-man-hinh" x="782" y="910" width="136" height="60" rx="4" fill="#38bdf8"/>
      ${san('#b45309', '#78350f')}`,
    tw: (t0, d) => [`tl.to("#${id}-man-hinh", { opacity: 0.5, duration: 0.8, yoyo: true, repeat: ${lap(d, 0.8)}, ease: "sine.inOut" }, ${f(t0)});`],
  }),
}
