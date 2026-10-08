// Bối cảnh thêm (cùng quy ước với boiCanh.mjs: toàn khung 1080x1920, mặt sàn từ y≈1180, `id` là tiền tố duy nhất,
// tw(t0, d) là chuyển động trong [t0, t0+d], lặp hữu hạn bằng lap). Nhận các hàm vẽ chung từ boiCanh.mjs để khỏi
// import vòng. Tên khoá phải khớp lib/ai.ts (BOI_CANH) và bảng âm nền trong tao_video.mjs (AM_NEN).
export function boiCanhThem({ san, toaNha, f, lap }) {
  const tg = (id, ten, m1, m2, x2 = 0, y2 = 1) =>
    `<linearGradient id="${id}-${ten}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${m1}"/><stop offset="1" stop-color="${m2}"/></linearGradient>`
  const may = (id, k, x, y, s = 1) =>
    `<g id="${id}-may${k}" opacity="0.95"><ellipse cx="${x}" cy="${y}" rx="${120 * s}" ry="${42 * s}" fill="#fff"/><ellipse cx="${x + 60 * s}" cy="${y - 30 * s}" rx="${78 * s}" ry="${50 * s}" fill="#fff"/><ellipse cx="${x - 55 * s}" cy="${y - 14 * s}" rx="${56 * s}" ry="${36 * s}" fill="#fff"/></g>`
  const trotMay = (id, k, d, t0, xa) => `tl.fromTo("#${id}-may${k}", { x: ${-xa} }, { x: ${xa}, duration: ${f(d)}, ease: "none" }, ${f(t0)});`
  const chim = (id, k, x, y) => `<path id="${id}-chim${k}" d="M${x} ${y} q12 -14 24 0 q12 -14 24 0" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/>`
  const nhapNhay = (sel, t0, d, ck, toi = 0.25) => `tl.to("${sel}", { opacity: ${toi}, duration: ${f(ck)}, yoyo: true, repeat: ${lap(d, ck)}, ease: "sine.inOut" }, ${f(t0)});`
  const cay = (x, y, s, mau = '#16a34a') =>
    `<rect x="${x - 10 * s}" y="${y - 20 * s}" width="${20 * s}" height="${90 * s}" fill="#78350f"/><circle cx="${x}" cy="${y - 60 * s}" r="${55 * s}" fill="${mau}"/><circle cx="${x - 40 * s}" cy="${y - 30 * s}" r="${38 * s}" fill="${mau}"/><circle cx="${x + 40 * s}" cy="${y - 30 * s}" r="${38 * s}" fill="${mau}"/>`
  const thong = (x, y, s, mau = '#166534') =>
    `<rect x="${x - 8 * s}" y="${y}" width="${16 * s}" height="${50 * s}" fill="#713f12"/><path d="M${x} ${y - 180 * s} L${x + 70 * s} ${y} L${x - 70 * s} ${y} Z" fill="${mau}"/><path d="M${x} ${y - 230 * s} L${x + 50 * s} ${y - 90 * s} L${x - 50 * s} ${y - 90 * s} Z" fill="${mau}"/>`

  return {
    // Thành phố về đêm: toà tháp chọc trời, cửa sổ sáng nhấp nháy, cầu với dòng xe chạy, trăng sao
    thanh_pho_dem: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#0b1033', '#3b1d6e')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${[...Array(30)].map((_, k) => `<circle id="${id}-sao${k}" cx="${(k * 173) % 1080}" cy="${60 + ((k * 211) % 420)}" r="${1.5 + (k % 3)}" fill="#fff"/>`).join('')}
        <circle cx="860" cy="250" r="62" fill="#fef3c7"/><circle cx="884" cy="236" r="60" fill="#251654"/>
        ${toaNha(20, 640, 160, 540, '#1e1b4b', '#fde68a', id, 0)}${toaNha(200, 520, 140, 660, '#312e81', '#a5b4fc', id, 1)}
        <path d="M430 1180 L430 430 L470 300 L500 160 L530 300 L570 430 L570 1180 Z" fill="#1e1b4b" stroke="#6366f1" stroke-width="6"/>
        ${[...Array(14)].map((_, k) => `<rect id="${id}-thap${k}" x="${452 + (k % 2) * 56}" y="${460 + Math.floor(k / 2) * 92}" width="38" height="50" rx="4" fill="#fde68a"/>`).join('')}
        <circle id="${id}-den-dinh" cx="500" cy="160" r="12" fill="#f43f5e"/>
        ${toaNha(610, 560, 170, 620, '#312e81', '#fbcfe8', id, 2)}${toaNha(800, 680, 250, 500, '#1e1b4b', '#fde68a', id, 3)}
        <rect x="0" y="1040" width="1080" height="26" fill="#475569"/><path d="M0 1040 Q270 940 540 1040 Q810 940 1080 1040" fill="none" stroke="#94a3b8" stroke-width="8"/>
        ${[0, 1, 2, 3, 4, 5].map((k) => `<line x1="${90 + k * 180}" y1="${1040 - Math.round(Math.abs(Math.sin(((90 + k * 180) / 1080) * Math.PI * 2)) * 80)}" x2="${90 + k * 180}" y2="1040" stroke="#94a3b8" stroke-width="4"/>`).join('')}
        <g id="${id}-xe">${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<rect x="${k * 150}" y="1046" width="40" height="12" rx="6" fill="${k % 2 ? '#f87171' : '#fde047'}"/>`).join('')}</g>
        ${san(id, '#312e81', '#0b1033', '#818cf8', '#c7d2fe')}`,
      tw: (t0, d) => [
        ...[0, 1, 2, 3].map((k) => `tl.to("[id^='${id}-c${k}-']", { opacity: 0.3, duration: ${f(0.8 + k * 0.3)}, yoyo: true, repeat: ${lap(d, 0.8 + k * 0.3)}, ease: "none", stagger: { each: 0.11 } }, ${f(t0 + k * 0.15)});`),
        nhapNhay(`#${id}-den-dinh`, t0, d, 0.5, 0.1),
        `tl.fromTo("#${id}-xe", { x: -150 }, { x: 0, duration: 1.4, repeat: ${lap(d, 1.4)}, ease: "none" }, ${f(t0)});`,
        ...[...Array(10)].map((_, k) => nhapNhay(`#${id}-sao${k * 3}`, t0 + (k % 5) * 0.12, d, 0.6 + (k % 4) * 0.2, 0.15)),
      ],
    }),

    // Nông thôn Việt Nam: núi xa, ruộng lúa bậc thang, luỹ tre, mái nhà tranh, dòng sông, mây trôi, chim bay
    nong_thon: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#38bdf8', '#e0f2fe')}${tg(id, 'lua', '#84cc16', '#4d7c0f')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        <circle cx="860" cy="300" r="80" fill="#fde047"/>
        ${may(id, 0, 220, 330)}${may(id, 1, 700, 220, 0.8)}
        <path d="M0 760 L150 560 L300 700 L470 520 L650 720 L820 560 L1080 760 Z" fill="#6ee7b7" opacity="0.7"/>
        <path d="M0 860 L200 680 L380 820 L560 660 L760 840 L940 700 L1080 820 L1080 1180 L0 1180 Z" fill="#34d399"/>
        ${[0, 1, 2, 3, 4].map((k) => `<path d="M0 ${900 + k * 56} Q540 ${870 + k * 56} 1080 ${900 + k * 56} L1080 ${930 + k * 56} Q540 ${900 + k * 56} 0 ${930 + k * 56} Z" fill="url(#${id}-lua)" opacity="${0.75 + k * 0.05}"/>`).join('')}
        <path d="M0 1100 Q300 1060 540 1110 Q800 1160 1080 1090 L1080 1180 L0 1180 Z" fill="#7dd3fc"/>
        <path id="${id}-song" d="M40 1130 h80 M300 1120 h70 M620 1140 h90 M880 1120 h70" stroke="#e0f2fe" stroke-width="6" stroke-linecap="round"/>
        <g><path d="M720 900 L820 830 L920 900 Z" fill="#a16207" stroke="#78350f" stroke-width="6"/><rect x="740" y="900" width="160" height="110" fill="#fde68a" stroke="#78350f" stroke-width="6"/><rect x="800" y="940" width="40" height="70" fill="#78350f"/></g>
        ${[0, 1, 2, 3, 4, 5].map((k) => `<path id="${id}-tre${k}" d="M${60 + k * 30} 1040 Q${50 + k * 30} 860 ${80 + k * 34} ${700 + (k % 3) * 40}" fill="none" stroke="#15803d" stroke-width="12" stroke-linecap="round"/>`).join('')}
        ${chim(id, 0, 380, 420)}${chim(id, 1, 450, 470)}${chim(id, 2, 520, 410)}
        ${san(id, '#a16207', '#713f12', '#ca8a04', '#fef9c3')}`,
      tw: (t0, d) => [
        trotMay(id, 0, d, t0, 80),
        trotMay(id, 1, d, t0, -70),
        `tl.fromTo("#${id}-song", { x: -40 }, { x: 40, duration: 2, yoyo: true, repeat: ${lap(d, 2)}, ease: "sine.inOut" }, ${f(t0)});`,
        ...[0, 1, 2].map((k) => `tl.fromTo("#${id}-chim${k}", { x: -60, y: 0 }, { x: 220, y: -40, duration: ${f(d)}, ease: "none" }, ${f(t0)});`),
        ...[0, 1, 2, 3, 4, 5].map((k) => `tl.to("#${id}-tre${k}", { rotation: 3, svgOrigin: "${60 + k * 30} 1040", duration: 1.6, yoyo: true, repeat: ${lap(d, 1.6)}, ease: "sine.inOut" }, ${f(t0 + k * 0.1)});`),
      ],
    }),

    // Lớp học: bảng xanh có phấn, cửa sổ nhìn ra cây, đồng hồ treo tường, bản đồ, bàn ghế
    truong_hoc: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#fef9c3', '#fde68a')}</defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        <rect x="200" y="320" width="680" height="380" rx="14" fill="#14532d" stroke="#a16207" stroke-width="18"/>
        <text x="300" y="440" font-family="BVP, sans-serif" font-size="64" fill="#f8fafc" opacity="0.9">A + B = ?</text>
        <path id="${id}-phan" d="M300 520 Q420 480 540 540 T780 520" fill="none" stroke="#f8fafc" stroke-width="7" stroke-linecap="round" stroke-dasharray="560" stroke-dashoffset="560"/>
        <rect x="230" y="690" width="620" height="16" fill="#a16207"/>
        <circle cx="540" cy="230" r="54" fill="#fff" stroke="#334155" stroke-width="8"/><line id="${id}-kim" x1="540" y1="230" x2="540" y2="194" stroke="#334155" stroke-width="7" stroke-linecap="round"/><line x1="540" y1="230" x2="566" y2="230" stroke="#334155" stroke-width="7" stroke-linecap="round"/>
        <rect x="30" y="330" width="140" height="300" rx="10" fill="#7dd3fc" stroke="#a16207" stroke-width="10"/>${'' /* cửa sổ trái */}<circle cx="100" cy="470" r="50" fill="#22c55e"/>
        <rect x="910" y="330" width="140" height="200" rx="8" fill="#fff" stroke="#94a3b8" stroke-width="6"/><path d="M930 380 q30 -30 60 0 q20 40 40 10 M940 470 q40 -20 80 10" fill="none" stroke="#22c55e" stroke-width="10"/>
        ${[0, 1, 2].map((k) => `<rect x="${110 + k * 320}" y="960" width="240" height="24" rx="6" fill="#b45309"/><rect x="${130 + k * 320}" y="984" width="16" height="140" fill="#78350f"/><rect x="${314 + k * 320}" y="984" width="16" height="140" fill="#78350f"/><rect x="${150 + k * 320}" y="930" width="60" height="34" rx="4" fill="#38bdf8"/>`).join('')}
        ${san(id, '#d6d3d1', '#a8a29e', '#78716c', '#ffffff')}`,
      tw: (t0, d) => [
        `tl.to("#${id}-phan", { strokeDashoffset: 0, duration: 2.5, ease: "power1.inOut" }, ${f(t0 + 0.3)});`,
        `tl.to("#${id}-kim", { rotation: 360, svgOrigin: "540 230", duration: ${f(Math.max(4, d))}, ease: "none" }, ${f(t0)});`,
      ],
    }),

    // Bệnh viện: tường xanh bạc hà, giường bệnh, máy đo nhịp tim, giá truyền dịch, rèm, biển chữ thập
    benh_vien: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#ecfeff', '#a5f3fc')}</defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        <rect x="70" y="280" width="300" height="300" rx="16" fill="#bae6fd" stroke="#e2e8f0" stroke-width="16"/><line x1="220" y1="280" x2="220" y2="580" stroke="#e2e8f0" stroke-width="10"/>
        <rect x="430" y="250" width="220" height="90" rx="16" fill="#fff" stroke="#0891b2" stroke-width="6"/><path d="M520 268 h40 v22 h22 v40 h-22 v22 h-40 v-22 h-22 v-40 h22 Z" fill="#dc2626" transform="translate(-10 -6) scale(0.95)"/>
        <rect x="700" y="300" width="300" height="230" rx="16" fill="#0f172a" stroke="#64748b" stroke-width="10"/>
        <polyline id="${id}-nhip" points="720,420 780,420 800,370 820,470 840,400 860,420 980,420" fill="none" stroke="#22c55e" stroke-width="7" stroke-linejoin="round" stroke-dasharray="420" stroke-dashoffset="420"/>
        <text x="900" y="360" font-family="BVP, sans-serif" font-size="40" fill="#22c55e">72</text>
        <path d="M60 640 Q120 760 80 1180 L40 1180 L40 640 Z M1020 640 Q960 760 1000 1180 L1040 1180 L1040 640 Z" fill="#67e8f9" opacity="0.7"/>
        <rect x="160" y="900" width="560" height="60" rx="18" fill="#e2e8f0" stroke="#94a3b8" stroke-width="6"/><rect x="160" y="820" width="120" height="90" rx="24" fill="#fff" stroke="#94a3b8" stroke-width="6"/><rect x="180" y="960" width="18" height="180" fill="#94a3b8"/><rect x="680" y="960" width="18" height="180" fill="#94a3b8"/>
        <line x1="840" y1="640" x2="840" y2="1150" stroke="#94a3b8" stroke-width="10"/><rect x="800" y="660" width="80" height="110" rx="20" fill="#e0f2fe" stroke="#38bdf8" stroke-width="6"/><circle id="${id}-giot" cx="840" cy="800" r="8" fill="#38bdf8"/>
        ${san(id, '#e2e8f0', '#94a3b8', '#cbd5e1', '#ffffff')}`,
      tw: (t0, d) => [
        `tl.fromTo("#${id}-nhip", { strokeDashoffset: 420 }, { strokeDashoffset: -420, duration: 1.6, repeat: ${lap(d, 1.6)}, ease: "none" }, ${f(t0)});`,
        `tl.fromTo("#${id}-giot", { y: 0, opacity: 1 }, { y: 120, opacity: 0, duration: 1.2, repeat: ${lap(d, 1.2)}, ease: "power1.in" }, ${f(t0)});`,
      ],
    }),

    // Nhà máy: dầm thép, dây chuyền chạy với thân xe, cánh tay robot hàn, tia lửa, vạch cảnh báo
    nha_may: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#334155', '#1e293b')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-tuong)"/>
        ${[0, 1, 2, 3].map((k) => `<rect x="${60 + k * 270}" y="220" width="40" height="960" fill="#475569"/><path d="M${80 + k * 270} 260 L${350 + k * 270} 520" stroke="#475569" stroke-width="16"/>`).join('')}
        <rect x="0" y="220" width="1080" height="40" fill="#64748b"/>
        ${[0, 1, 2].map((k) => `<rect x="${150 + k * 300}" y="300" width="200" height="130" rx="10" fill="#fef3c7" opacity="0.25"/>`).join('')}
        <g id="${id}-chuyen">${[0, 1, 2, 3, 4].map((k) => `<g transform="translate(${k * 300 - 300} 0)"><path d="M60 860 Q80 790 160 780 L260 780 Q320 790 340 860 Z" fill="${['#ef4444', '#3b82f6', '#f8fafc', '#facc15', '#ef4444'][k]}" stroke="#0f172a" stroke-width="6"/><circle cx="120" cy="870" r="26" fill="#0f172a"/><circle cx="290" cy="870" r="26" fill="#0f172a"/></g>`).join('')}</g>
        <rect x="0" y="896" width="1080" height="40" fill="#0f172a"/>${[...Array(18)].map((_, k) => `<circle cx="${30 + k * 60}" cy="916" r="12" fill="#475569"/>`).join('')}
        <g id="${id}-tay0"><rect x="300" y="560" width="30" height="180" rx="12" fill="#f97316" stroke="#0f172a" stroke-width="5"/><rect x="290" y="720" width="50" height="40" rx="8" fill="#334155"/></g>
        <g id="${id}-tay1"><rect x="750" y="560" width="30" height="180" rx="12" fill="#f97316" stroke="#0f172a" stroke-width="5"/><rect x="740" y="720" width="50" height="40" rx="8" fill="#334155"/></g>
        <rect x="280" y="520" width="70" height="50" rx="10" fill="#0f172a"/><rect x="730" y="520" width="70" height="50" rx="10" fill="#0f172a"/>
        <circle id="${id}-lua" cx="315" cy="770" r="18" fill="#fde047"/>
        ${san(id, '#475569', '#1e293b', '#facc15', '#fde68a')}
        ${[...Array(12)].map((_, k) => `<path d="M${k * 90} 1190 l45 0 l-30 30 l-45 0 Z" fill="#facc15"/>`).join('')}`,
      tw: (t0, d) => [
        `tl.fromTo("#${id}-chuyen", { x: 0 }, { x: 300, duration: 3, repeat: ${lap(d, 3)}, ease: "none" }, ${f(t0)});`,
        ...[0, 1].map((k) => `tl.to("#${id}-tay${k}", { rotation: ${k ? -18 : 18}, svgOrigin: "${315 + k * 450} 560", duration: 0.7, yoyo: true, repeat: ${lap(d, 0.7)}, ease: "sine.inOut" }, ${f(t0 + k * 0.35)});`),
        `tl.to("#${id}-lua", { scale: 2, opacity: 0.2, transformOrigin: "50% 50%", duration: 0.25, yoyo: true, repeat: ${lap(d, 0.25)}, ease: "none" }, ${f(t0)});`,
      ],
    }),

    // Công trường xây dựng: cần cẩu tháp với móc lắc lư, khung nhà đang xây, giàn giáo, rào chắn
    cong_truong: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#7dd3fc', '#fef3c7')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${may(id, 0, 260, 300, 0.9)}
        <rect x="140" y="320" width="34" height="860" fill="#facc15" stroke="#a16207" stroke-width="6"/>
        ${[...Array(12)].map((_, k) => `<path d="M140 ${340 + k * 70} L174 ${375 + k * 70} M174 ${340 + k * 70} L140 ${375 + k * 70}" stroke="#a16207" stroke-width="4"/>`).join('')}
        <rect x="40" y="290" width="700" height="34" fill="#facc15" stroke="#a16207" stroke-width="6"/><rect x="40" y="250" width="110" height="40" fill="#a16207"/>
        <g id="${id}-moc"><line x1="600" y1="324" x2="600" y2="620" stroke="#334155" stroke-width="5"/><path d="M590 620 h20 v20 q0 26 -20 22" fill="none" stroke="#334155" stroke-width="7"/><rect x="540" y="660" width="120" height="40" fill="#94a3b8" stroke="#475569" stroke-width="5"/></g>
        <g opacity="0.95">${[0, 1, 2, 3, 4].map((r) => `<rect x="560" y="${620 + r * 110}" width="420" height="16" fill="#94a3b8"/>`).join('')}${[0, 1, 2, 3].map((c) => `<rect x="${560 + c * 136}" y="620" width="16" height="560" fill="#94a3b8"/>`).join('')}</g>
        ${[0, 1, 2].map((r) => `<rect x="580" y="${640 + r * 110}" width="${380 - r * 90}" height="90" fill="#fca5a5" opacity="0.6"/>`).join('')}
        ${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${60 + k * 170}" y="1100" width="130" height="50" fill="${k % 2 ? '#f97316' : '#f8fafc'}" stroke="#0f172a" stroke-width="4"/>`).join('')}
        ${san(id, '#a8a29e', '#78716c', '#facc15', '#fef9c3')}`,
      tw: (t0, d) => [
        `tl.to("#${id}-moc", { rotation: 4, svgOrigin: "600 324", duration: 1.6, yoyo: true, repeat: ${lap(d, 1.6)}, ease: "sine.inOut" }, ${f(t0)});`,
        trotMay(id, 0, d, t0, 60),
      ],
    }),

    // Sân bay: vách kính lớn, máy bay cất cánh, bảng giờ bay, hàng ghế chờ
    san_bay: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#0ea5e9', '#bae6fd')}</defs>
        <rect width="1080" height="1180" fill="#e2e8f0"/>
        <rect x="40" y="260" width="1000" height="560" rx="18" fill="url(#${id}-troi)"/>
        ${may(id, 0, 300, 380, 0.7)}
        <g id="${id}-may-bay"><path d="M200 640 L520 600 Q580 595 600 610 Q585 630 520 634 L200 660 Z" fill="#f8fafc" stroke="#334155" stroke-width="5"/><path d="M380 620 L300 540 L340 540 L440 615 Z M380 640 L320 700 L360 700 L440 638 Z M220 645 L180 590 L210 590 L250 640 Z" fill="#2563eb"/></g>
        <path d="M40 780 L1040 780 L1040 820 L40 820 Z" fill="#64748b"/>
        ${[0, 1, 2, 3, 4].map((k) => `<rect x="${40 + k * 250}" y="260" width="14" height="560" fill="#cbd5e1"/>`).join('')}<rect x="40" y="260" width="1000" height="560" rx="18" fill="none" stroke="#cbd5e1" stroke-width="14"/>
        <rect x="660" y="860" width="380" height="200" rx="12" fill="#0f172a" stroke="#475569" stroke-width="6"/>
        ${[0, 1, 2, 3].map((k) => `<text x="680" y="${910 + k * 42}" font-family="monospace" font-size="30" fill="${k % 2 ? '#fde047' : '#4ade80'}">${['VN123 HAN 08:15', 'SG456 SGN 09:40', 'NY789 JFK 11:05', 'TK321 IST 13:30'][k]}</text>`).join('')}
        <rect id="${id}-dong" x="672" y="872" width="356" height="40" fill="#fde04733"/>
        ${[0, 1, 2, 3].map((k) => `<rect x="${60 + k * 140}" y="1000" width="110" height="80" rx="14" fill="#3b82f6"/><rect x="${70 + k * 140}" y="1080" width="12" height="80" fill="#64748b"/>`).join('')}
        ${san(id, '#cbd5e1', '#94a3b8', '#e2e8f0', '#ffffff')}`,
      tw: (t0, d) => [
        `tl.fromTo("#${id}-may-bay", { x: -300, y: 100 }, { x: 700, y: -260, duration: ${f(Math.max(3, d))}, ease: "power1.in" }, ${f(t0)});`,
        `tl.fromTo("#${id}-dong", { y: 0 }, { y: 126, duration: 0.6, repeat: ${lap(d, 0.6)}, ease: "steps(3)" }, ${f(t0)});`,
        trotMay(id, 0, d, t0, 40),
      ],
    }),

    // Bãi biển: biển xanh, sóng vỗ, mặt trời, hàng dừa, thuyền, hải âu, bãi cát
    bai_bien: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#38bdf8', '#fef3c7')}${tg(id, 'bien', '#0284c7', '#22d3ee')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        <circle cx="760" cy="430" r="110" fill="#fde047"/><circle cx="760" cy="430" r="160" fill="#fde047" opacity="0.25"/>
        ${may(id, 0, 230, 290, 0.8)}
        <rect x="0" y="720" width="1080" height="460" fill="url(#${id}-bien)"/>
        <g id="${id}-thuyen"><path d="M560 780 L700 780 L680 810 L580 810 Z" fill="#78350f"/><path d="M630 780 L630 650 L700 770 Z" fill="#f8fafc"/></g>
        ${[0, 1, 2, 3].map((k) => `<path id="${id}-song${k}" d="M-100 ${860 + k * 80} q60 -26 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" fill="none" stroke="#e0f2fe" stroke-width="${8 - k}" opacity="0.8"/>`).join('')}
        ${chim(id, 0, 300, 520)}${chim(id, 1, 380, 560)}
        <g id="${id}-dua"><path d="M120 1180 Q100 950 150 760" stroke="#92400e" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M150 770 Q60 720 10 800 M150 770 Q240 700 290 790 M150 770 Q90 680 60 640 M150 770 Q220 660 270 650" stroke="#16a34a" stroke-width="36" fill="none" stroke-linecap="round"/></g>
        ${san(id, '#fde68a', '#f59e0b', '#fef3c7', '#ffffff')}
        <ellipse cx="860" cy="1300" rx="110" ry="24" fill="#f97316" opacity="0.6"/><path d="M860 1300 L860 1120 M780 1130 Q860 1060 940 1130 Z" stroke="#78350f" stroke-width="8" fill="#ef4444"/>`,
      tw: (t0, d) => [
        ...[0, 1, 2, 3].map((k) => `tl.fromTo("#${id}-song${k}", { x: ${k % 2 ? 0 : -120} }, { x: ${k % 2 ? -120 : 0}, duration: ${f(1.8 + k * 0.3)}, repeat: ${lap(d, 1.8 + k * 0.3)}, ease: "none" }, ${f(t0)});`),
        `tl.to("#${id}-thuyen", { y: 10, rotation: 3, svgOrigin: "630 800", duration: 1.2, yoyo: true, repeat: ${lap(d, 1.2)}, ease: "sine.inOut" }, ${f(t0)});`,
        `tl.to("#${id}-dua", { rotation: 2.5, svgOrigin: "120 1180", duration: 1.5, yoyo: true, repeat: ${lap(d, 1.5)}, ease: "sine.inOut" }, ${f(t0)});`,
        ...[0, 1].map((k) => `tl.fromTo("#${id}-chim${k}", { x: 0 }, { x: 260, y: -60, duration: ${f(d)}, ease: "none" }, ${f(t0)});`),
        trotMay(id, 0, d, t0, 60),
      ],
    }),

    // Núi rừng: dãy núi nhiều lớp, rừng thông, thác nước chảy, sương mù trôi
    nui_rung: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#bfdbfe', '#f0fdf4')}${tg(id, 'thac', '#e0f2fe', '#7dd3fc')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        <path d="M0 720 L220 360 L420 640 L620 300 L860 620 L1080 420 L1080 1180 L0 1180 Z" fill="#94a3b8"/>
        <path d="M200 400 L220 360 L250 410 Z M600 340 L620 300 L650 350 Z" fill="#f8fafc"/>
        <path d="M0 860 L260 560 L520 840 L760 600 L1080 880 L1080 1180 L0 1180 Z" fill="#4ade80"/>
        <rect x="690" y="640" width="70" height="460" fill="url(#${id}-thac)"/><path id="${id}-nuoc" d="M700 660 v420 M720 640 v440 M740 660 v420" stroke="#ffffff" stroke-width="6" stroke-dasharray="30 30"/>
        <ellipse cx="725" cy="1110" rx="140" ry="36" fill="#e0f2fe"/>
        ${[0, 1, 2, 3, 4, 5, 6].map((k) => thong(70 + k * 150 + (k % 2) * 30, 1070 + (k % 2) * 40, 0.9 + (k % 3) * 0.15, k % 2 ? '#15803d' : '#166534')).join('')}
        <g id="${id}-suong"><ellipse cx="300" cy="820" rx="360" ry="50" fill="#fff" opacity="0.5"/><ellipse cx="820" cy="760" rx="300" ry="40" fill="#fff" opacity="0.45"/></g>
        ${san(id, '#65a30d', '#3f6212', '#84cc16', '#ecfccb')}`,
      tw: (t0, d) => [
        `tl.fromTo("#${id}-nuoc", { strokeDashoffset: 0 }, { strokeDashoffset: -120, duration: 0.6, repeat: ${lap(d, 0.6)}, ease: "none" }, ${f(t0)});`,
        `tl.fromTo("#${id}-suong", { x: -60 }, { x: 60, duration: ${f(d)}, ease: "sine.inOut" }, ${f(t0)});`,
      ],
    }),

    // Chợ: các sạp có mái bạt sọc, thúng trái cây, lồng đèn đỏ đung đưa, dây đèn
    cho: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#fde68a', '#fb923c')}</defs>
        <rect width="1080" height="1180" fill="url(#${id}-troi)"/>
        ${[0, 1, 2].map((k) => {
          const x = 40 + k * 350
          const m = ['#ef4444', '#2563eb', '#16a34a'][k]
          return `<path d="M${x} 560 L${x + 320} 560 L${x + 300} 470 L${x + 20} 470 Z" fill="${m}"/>${[0, 1, 2, 3].map((j) => `<path d="M${x + 20 + j * 80} 470 L${x + 60 + j * 80} 470 L${x + 70 + j * 80} 560 L${x + 30 + j * 80} 560 Z" fill="#fff" opacity="0.85"/>`).join('')}<rect x="${x + 10}" y="560" width="14" height="420" fill="#78350f"/><rect x="${x + 296}" y="560" width="14" height="420" fill="#78350f"/><rect x="${x}" y="860" width="320" height="40" fill="#a16207"/>${[0, 1, 2].map((j) => `<ellipse cx="${x + 60 + j * 100}" cy="850" rx="44" ry="20" fill="#d97706"/><circle cx="${x + 45 + j * 100}" cy="828" r="16" fill="${['#f97316', '#facc15', '#ef4444'][j]}"/><circle cx="${x + 75 + j * 100}" cy="828" r="16" fill="${['#facc15', '#84cc16', '#f97316'][j]}"/>`).join('')}`
        }).join('')}
        <path d="M0 300 Q270 380 540 300 Q810 380 1080 300" fill="none" stroke="#78350f" stroke-width="5"/>
        ${[0, 1, 2, 3, 4, 5].map((k) => `<g id="${id}-long${k}"><line x1="${90 + k * 180}" y1="${330 + (k % 2) * 20}" x2="${90 + k * 180}" y2="${370 + (k % 2) * 20}" stroke="#78350f" stroke-width="4"/><ellipse cx="${90 + k * 180}" cy="${400 + (k % 2) * 20}" rx="30" ry="36" fill="#dc2626" stroke="#facc15" stroke-width="4"/></g>`).join('')}
        ${san(id, '#a8a29e', '#57534e', '#d6d3d1', '#fef3c7')}`,
      tw: (t0, d) => [0, 1, 2, 3, 4, 5].map((k) => `tl.to("#${id}-long${k}", { rotation: ${k % 2 ? 6 : -6}, svgOrigin: "${90 + k * 180} ${330 + (k % 2) * 20}", duration: 1.3, yoyo: true, repeat: ${lap(d, 1.3)}, ease: "sine.inOut" }, ${f(t0 + k * 0.12)});`),
    }),

    // Nhà hàng: tường ấm, đèn thả trần, bàn trải khăn, quầy bếp có lửa bập bùng
    nha_hang: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#7c2d12', '#431407')}</defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        <rect x="560" y="300" width="460" height="300" rx="14" fill="#1c1917" stroke="#a16207" stroke-width="10"/>
        <rect x="590" y="500" width="400" height="60" fill="#57534e"/>
        ${[0, 1, 2].map((k) => `<path id="${id}-lua${k}" d="M${650 + k * 130} 500 q-20 -40 0 -80 q20 40 0 80 Z M${650 + k * 130} 500 q-34 -26 -10 -60" fill="#f97316"/>`).join('')}
        ${[0, 1, 2].map((k) => `<ellipse cx="${650 + k * 130}" cy="470" rx="34" ry="12" fill="#334155"/>`).join('')}
        ${[0, 1, 2, 3].map((k) => `<line x1="${130 + k * 250}" y1="0" x2="${130 + k * 250}" y2="${260 + (k % 2) * 60}" stroke="#1c1917" stroke-width="4"/><path id="${id}-den${k}" d="M${90 + k * 250} ${260 + (k % 2) * 60} L${170 + k * 250} ${260 + (k % 2) * 60} L${150 + k * 250} ${220 + (k % 2) * 60} L${110 + k * 250} ${220 + (k % 2) * 60} Z" fill="#fbbf24"/><ellipse cx="${130 + k * 250}" cy="${300 + (k % 2) * 60}" rx="90" ry="40" fill="#fde68a" opacity="0.25"/>`).join('')}
        ${[0, 1].map((k) => `<ellipse cx="${200 + k * 300}" cy="960" rx="130" ry="34" fill="#f8fafc"/><rect x="${80 + k * 300}" y="960" width="240" height="120" fill="#f8fafc"/><rect x="${190 + k * 300}" y="1080" width="20" height="90" fill="#78350f"/><circle cx="${170 + k * 300}" cy="940" r="20" fill="#fde68a" stroke="#d97706" stroke-width="4"/><rect x="${222 + k * 300}" y="900" width="12" height="44" fill="#be123c"/>`).join('')}
        ${san(id, '#78350f', '#431407', '#a16207', '#fde68a')}`,
      tw: (t0, d) => [
        ...[0, 1, 2].map((k) => `tl.to("#${id}-lua${k}", { scaleY: 1.3, opacity: 0.7, transformOrigin: "50% 100%", duration: ${f(0.25 + k * 0.05)}, yoyo: true, repeat: ${lap(d, 0.25 + k * 0.05)}, ease: "sine.inOut" }, ${f(t0)});`),
        ...[0, 1, 2, 3].map((k) => nhapNhay(`#${id}-den${k}`, t0 + k * 0.2, d, 1.5, 0.75)),
      ],
    }),

    // Sân vận động: khán đài đông người, đèn pha nhấp nháy, bảng tỉ số, cỏ xanh
    san_van_dong: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#0f172a', '#1e3a8a')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${[0, 1].map((k) => `<rect x="${80 + k * 820}" y="180" width="20" height="300" fill="#64748b"/><rect x="${40 + k * 820}" y="150" width="100" height="60" rx="8" fill="#e2e8f0"/><path id="${id}-pha${k}" d="M${90 + k * 820} 210 L${k ? 500 : 580} 900 L${k ? 760 : 320} 900 Z" fill="#fef9c3" opacity="0.25"/>`).join('')}
        <path d="M0 520 Q540 440 1080 520 L1080 960 L0 960 Z" fill="#334155"/>
        ${[...Array(160)].map((_, k) => `<circle cx="${10 + (k % 40) * 27}" cy="${560 + Math.floor(k / 40) * 90 - Math.round(Math.sin(((k % 40) / 40) * Math.PI) * 60)}" r="11" fill="${['#ef4444', '#facc15', '#f8fafc', '#3b82f6', '#22c55e'][(k * 7) % 5]}"/>`).join('')}
        <g id="${id}-co-vu">${[...Array(40)].map((_, k) => `<circle cx="${20 + k * 27}" cy="${930 - Math.round(Math.sin((k / 40) * Math.PI) * 10)}" r="12" fill="${['#f8fafc', '#ef4444'][k % 2]}"/>`).join('')}</g>
        <rect x="390" y="250" width="300" height="140" rx="12" fill="#0f172a" stroke="#facc15" stroke-width="6"/><text x="540" y="345" text-anchor="middle" font-family="BVP, sans-serif" font-weight="700" font-size="72" fill="#fde047">2 - 1</text>
        <rect x="0" y="960" width="1080" height="220" fill="#16a34a"/>${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${k * 180}" y="960" width="90" height="220" fill="#15803d"/>`).join('')}
        ${san(id, '#22c55e', '#15803d', '#f8fafc', '#ffffff')}`,
      tw: (t0, d) => [
        ...[0, 1].map((k) => nhapNhay(`#${id}-pha${k}`, t0 + k * 0.3, d, 0.9, 0.08)),
        `tl.to("#${id}-co-vu", { y: -16, duration: 0.3, yoyo: true, repeat: ${lap(d, 0.3)}, ease: "sine.inOut" }, ${f(t0)});`,
      ],
    }),

    // Phòng họp hội đồng quản trị: bàn dài, màn hình lớn biểu đồ, vách kính nhìn thành phố, ghế da
    phong_hop: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#1e293b', '#0f172a')}${tg(id, 'kinh', '#38bdf8', '#0c4a6e')}</defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        <rect x="40" y="260" width="440" height="620" rx="12" fill="url(#${id}-kinh)"/>
        ${toaNha(60, 560, 120, 320, '#0369a1', '#e0f2fe')}${toaNha(200, 470, 110, 410, '#075985', '#bae6fd')}${toaNha(330, 600, 130, 280, '#0369a1', '#e0f2fe')}
        <rect x="40" y="260" width="440" height="620" rx="12" fill="none" stroke="#94a3b8" stroke-width="12"/><line x1="260" y1="260" x2="260" y2="880" stroke="#94a3b8" stroke-width="8"/>
        <rect x="540" y="300" width="480" height="300" rx="14" fill="#0f172a" stroke="#64748b" stroke-width="10"/>
        ${[0, 1, 2, 3, 4].map((k) => `<rect id="${id}-cot${k}" x="${580 + k * 84}" y="${560 - (60 + k * 50)}" width="56" height="${60 + k * 50}" rx="6" fill="${k === 4 ? '#22c55e' : '#38bdf8'}"/>`).join('')}
        <path d="M70 1050 L1010 1050 L960 960 L120 960 Z" fill="#78350f" stroke="#451a03" stroke-width="6"/>
        ${[0, 1, 2, 3, 4].map((k) => `<rect x="${170 + k * 170}" y="880" width="90" height="90" rx="20" fill="#111827"/>`).join('')}
        ${san(id, '#334155', '#0f172a', '#64748b', '#cbd5e1')}`,
      tw: (t0, d) => [0, 1, 2, 3, 4].map((k) => `tl.fromTo("#${id}-cot${k}", { scaleY: 0.2, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.8, ease: "back.out(1.6)" }, ${f(t0 + 0.2 + k * 0.12)});`).concat([nhapNhay(`#${id}-cot4`, t0 + 1.5, Math.max(0, d - 1.5), 0.6, 0.5)]),
    }),

    // Phòng thí nghiệm: bàn thí nghiệm, bình sủi bọt, kính hiển vi, áp phích ADN, kệ hoá chất
    phong_thi_nghiem: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#f0fdfa', '#ccfbf1')}</defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        <rect x="60" y="280" width="260" height="380" rx="12" fill="#fff" stroke="#14b8a6" stroke-width="6"/>
        <path d="M150 300 Q260 380 150 460 Q40 540 150 620 M230 300 Q120 380 230 460 Q340 540 230 620" fill="none" stroke="#14b8a6" stroke-width="8"/>${[0, 1, 2, 3, 4, 5].map((k) => `<line x1="${158 + (k % 2) * 4}" y1="${330 + k * 50}" x2="${222 - (k % 2) * 4}" y2="${330 + k * 50}" stroke="#f472b6" stroke-width="6"/>`).join('')}
        ${[0, 1].map((r) => `<rect x="400" y="${330 + r * 170}" width="620" height="18" fill="#94a3b8"/>${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${420 + k * 100}" y="${250 + r * 170}" width="50" height="80" rx="10" fill="${['#a78bfa', '#38bdf8', '#4ade80', '#fb7185', '#facc15', '#22d3ee'][(k + r) % 6]}" opacity="0.8"/>`).join('')}`).join('')}
        <rect x="80" y="900" width="920" height="40" fill="#e2e8f0" stroke="#94a3b8" stroke-width="5"/><rect x="100" y="940" width="880" height="220" fill="#cbd5e1"/>
        ${[0, 1, 2].map((k) => `<path d="M${560 + k * 120} 800 L${560 + k * 120} 860 L${530 + k * 120} 900 L${630 + k * 120} 900 L${600 + k * 120} 860 L${600 + k * 120} 800 Z" fill="${['#22c55e', '#a855f7', '#3b82f6'][k]}" stroke="#334155" stroke-width="5"/>${[0, 1, 2].map((j) => `<circle id="${id}-bot${k}-${j}" cx="${575 + k * 120 + j * 8}" cy="${860 - j * 10}" r="${5 + j}" fill="#fff" opacity="0.8"/>`).join('')}`).join('')}
        <path d="M260 900 L260 740 L320 700 L340 720 L290 760 L290 900 Z" fill="#334155"/><rect x="230" y="880" width="110" height="20" fill="#475569"/><circle cx="330" cy="705" r="16" fill="#64748b"/>
        ${san(id, '#e2e8f0', '#94a3b8', '#5eead4', '#ffffff')}`,
      tw: (t0, d) => [0, 1, 2].flatMap((k) => [0, 1, 2].map((j) => `tl.fromTo("#${id}-bot${k}-${j}", { y: 0, opacity: 0.9 }, { y: -90, opacity: 0, duration: ${f(1 + j * 0.25)}, repeat: ${lap(d, 1 + j * 0.25)}, ease: "power1.out" }, ${f(t0 + k * 0.2 + j * 0.3)});`)),
    }),

    // Hội trường: cột lớn, rèm đỏ, bục phát biểu có micro, biểu tượng vàng, băng rôn
    hoi_truong: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#7f1d1d', '#450a0a')}${tg(id, 'rem', '#dc2626', '#991b1b', 1, 0)}</defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<path d="M${k * 135} 200 Q${k * 135 + 67} 700 ${k * 135} 1180 L${k * 135 + 135} 1180 Q${k * 135 + 67} 700 ${k * 135 + 135} 200 Z" fill="url(#${id}-rem)" opacity="0.6"/>`).join('')}
        ${[0, 1].map((k) => `<rect x="${60 + k * 860}" y="200" width="100" height="980" fill="#fef3c7"/><rect x="${45 + k * 860}" y="180" width="130" height="40" fill="#fde68a"/><rect x="${45 + k * 860}" y="1140" width="130" height="40" fill="#fde68a"/>`).join('')}
        <circle id="${id}-bieu-tuong" cx="540" cy="380" r="110" fill="#facc15" stroke="#a16207" stroke-width="10"/><path d="M540 300 l24 52 h56 l-46 34 l18 56 l-52 -34 l-52 34 l18 -56 l-46 -34 h56 Z" fill="#dc2626"/>
        <rect x="220" y="540" width="640" height="80" rx="10" fill="#b91c1c" stroke="#fde68a" stroke-width="6"/><rect x="260" y="570" width="560" height="18" rx="9" fill="#fde68a" opacity="0.8"/>
        <path d="M430 1180 L460 900 L620 900 L650 1180 Z" fill="#78350f" stroke="#fde68a" stroke-width="6"/><path d="M540 900 L560 840" stroke="#334155" stroke-width="6"/><circle cx="562" cy="834" r="10" fill="#334155"/>
        ${san(id, '#7f1d1d', '#450a0a', '#fde68a', '#fef3c7')}`,
      tw: (t0, d) => [`tl.to("#${id}-bieu-tuong", { scale: 1.06, svgOrigin: "540 380", duration: 1.4, yoyo: true, repeat: ${lap(d, 1.4)}, ease: "sine.inOut" }, ${f(t0)});`],
    }),

    // Cảng biển: tàu hàng, container nhiều màu xếp chồng, cần cẩu giàn, biển
    cang_bien: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#7dd3fc', '#fef3c7')}${tg(id, 'bien', '#0369a1', '#0ea5e9')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${may(id, 0, 820, 300, 0.8)}
        <rect x="0" y="780" width="1080" height="400" fill="url(#${id}-bien)"/>
        <g id="${id}-tau"><path d="M80 820 L620 820 L580 900 L120 900 Z" fill="#1e3a8a"/>${[...Array(12)].map((_, k) => `<rect x="${130 + (k % 6) * 75}" y="${760 - Math.floor(k / 6) * 50}" width="70" height="46" fill="${['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#f97316'][(k * 5) % 6]}" stroke="#0f172a" stroke-width="3"/>`).join('')}<rect x="540" y="700" width="60" height="120" fill="#f8fafc"/></g>
        <g><rect x="700" y="400" width="20" height="500" fill="#ef4444"/><rect x="880" y="400" width="20" height="500" fill="#ef4444"/><rect x="640" y="380" width="380" height="40" fill="#ef4444"/><g id="${id}-moc"><line x1="760" y1="420" x2="760" y2="620" stroke="#334155" stroke-width="5"/><rect x="720" y="620" width="80" height="40" fill="#22c55e" stroke="#0f172a" stroke-width="3"/></g></g>
        ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${640 + c * 105}" y="${1060 - r * 55}" width="100" height="52" fill="${['#f59e0b', '#3b82f6', '#ef4444', '#14b8a6'][(r + c) % 4]}" stroke="#0f172a" stroke-width="3"/>`).join('')).join('')}
        ${chim(id, 0, 300, 480)}
        ${san(id, '#94a3b8', '#475569', '#facc15', '#f8fafc')}`,
      tw: (t0, d) => [
        `tl.to("#${id}-tau", { y: 8, duration: 1.4, yoyo: true, repeat: ${lap(d, 1.4)}, ease: "sine.inOut" }, ${f(t0)});`,
        `tl.fromTo("#${id}-moc", { x: -60 }, { x: 60, duration: 2.4, yoyo: true, repeat: ${lap(d, 2.4)}, ease: "sine.inOut" }, ${f(t0)});`,
        `tl.fromTo("#${id}-chim0", { x: 0 }, { x: 300, y: -40, duration: ${f(d)}, ease: "none" }, ${f(t0)});`,
        trotMay(id, 0, d, t0, -50),
      ],
    }),

    // Căn nhà nghèo ngày xưa: vách gỗ, quạt trần cũ quay, cửa sổ nhỏ, bàn gỗ với nồi cơm, đèn dầu, tờ lịch
    nha_ngheo: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#a16207', '#713f12')}<radialGradient id="${id}-den" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fde68a" stop-opacity="0.7"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        ${[...Array(12)].map((_, k) => `<line x1="${k * 90}" y1="0" x2="${k * 90}" y2="1180" stroke="#78350f" stroke-width="5"/>`).join('')}
        <rect x="660" y="330" width="260" height="220" fill="#7dd3fc" stroke="#451a03" stroke-width="16"/>${[0, 1, 2, 3].map((k) => `<line x1="${700 + k * 60}" y1="330" x2="${700 + k * 60}" y2="550" stroke="#451a03" stroke-width="8"/>`).join('')}
        <rect x="160" y="320" width="130" height="170" fill="#f8fafc" stroke="#92400e" stroke-width="4"/><rect x="160" y="320" width="130" height="40" fill="#dc2626"/><text x="225" y="450" text-anchor="middle" font-family="BVP, sans-serif" font-weight="700" font-size="72" fill="#334155">15</text>
        <line x1="540" y1="0" x2="540" y2="170" stroke="#1c1917" stroke-width="8"/><g id="${id}-quat"><ellipse cx="540" cy="180" rx="210" ry="20" fill="#57534e"/><ellipse cx="540" cy="180" rx="20" ry="210" fill="#57534e" transform="scale(1 0.1) translate(0 1620)"/></g><circle cx="540" cy="180" r="26" fill="#292524"/>
        <circle id="${id}-quang" cx="330" cy="860" r="260" fill="url(#${id}-den)"/>
        <rect x="140" y="950" width="420" height="30" fill="#78350f"/><rect x="160" y="980" width="20" height="190" fill="#451a03"/><rect x="520" y="980" width="20" height="190" fill="#451a03"/>
        <path d="M300 950 L300 890 Q300 860 340 860 Q380 860 380 890 L380 950 Z" fill="#9ca3af" stroke="#4b5563" stroke-width="5"/><path d="M450 950 L440 900 L480 900 L470 950 Z" fill="#fde68a" stroke="#a16207" stroke-width="4"/><path id="${id}-lua" d="M460 896 q-12 -24 0 -44 q12 20 0 44 Z" fill="#f97316"/>
        ${san(id, '#a8a29e', '#57534e', '#78716c', '#fde68a')}`,
      tw: (t0, d) => [
        `tl.to("#${id}-quat", { scaleX: -1, svgOrigin: "540 180", duration: 0.35, yoyo: true, repeat: ${lap(d, 0.35)}, ease: "sine.inOut" }, ${f(t0)});`,
        `tl.to("#${id}-lua", { scaleY: 1.25, opacity: 0.75, transformOrigin: "50% 100%", duration: 0.3, yoyo: true, repeat: ${lap(d, 0.3)}, ease: "sine.inOut" }, ${f(t0)});`,
        nhapNhay(`#${id}-quang`, t0, d, 0.6, 0.6),
      ],
    }),

    // Sân khấu ca nhạc: màn LED, đèn quét, khán giả giơ tay, pháo giấy rơi
    san_khau: (id) => ({
      svg: `
        <defs>${tg(id, 'nen', '#1e1b4b', '#020617')}${tg(id, 'led', '#a855f7', '#ec4899', 1, 0)}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-nen)"/>
        <rect id="${id}-led" x="140" y="260" width="800" height="440" rx="14" fill="url(#${id}-led)" opacity="0.85"/>
        ${[...Array(24)].map((_, k) => `<rect x="${170 + (k % 8) * 96}" y="${290 + Math.floor(k / 8) * 136}" width="70" height="110" rx="8" fill="#fff" opacity="0.12"/>`).join('')}
        ${[0, 1, 2, 3].map((k) => `<path id="${id}-quet${k}" d="M${120 + k * 280} 160 L${20 + k * 280} 1180 L${240 + k * 280} 1180 Z" fill="${['#f0abfc', '#67e8f9', '#fde047', '#f0abfc'][k]}" opacity="0.22"/>`).join('')}
        ${[...Array(30)].map((_, k) => `<rect id="${id}-phao${k}" x="${(k * 137) % 1080}" y="${120 + ((k * 89) % 200)}" width="14" height="22" fill="${['#f472b6', '#facc15', '#22d3ee', '#a3e635'][k % 4]}"/>`).join('')}
        <path d="M0 1080 ${[...Array(20)].map((_, k) => `Q${k * 54 + 27} ${1030 - (k % 3) * 14} ${k * 54 + 54} 1080`).join(' ')} L1080 1180 L0 1180 Z" fill="#0f0a2e"/>
        ${[0, 1, 2, 3, 4].map((k) => `<path id="${id}-tay${k}" d="M${120 + k * 210} 1060 L${110 + k * 210} 980" stroke="#0f0a2e" stroke-width="14" stroke-linecap="round"/>`).join('')}
        ${san(id, '#312e81', '#0f0a2e', '#e879f9', '#f0abfc')}`,
      tw: (t0, d) => [
        ...[0, 1, 2, 3].map((k) => `tl.to("#${id}-quet${k}", { rotation: ${k % 2 ? -14 : 14}, svgOrigin: "${120 + k * 280} 160", duration: ${f(1.2 + k * 0.2)}, yoyo: true, repeat: ${lap(d, 1.2 + k * 0.2)}, ease: "sine.inOut" }, ${f(t0)});`),
        nhapNhay(`#${id}-led`, t0, d, 0.5, 0.55),
        ...[...Array(30)].map((_, k) => `tl.fromTo("#${id}-phao${k}", { y: -100, rotation: 0 }, { y: 1100, rotation: ${180 + (k % 4) * 90}, duration: ${f(3 + (k % 5) * 0.4)}, repeat: ${lap(d, 3 + (k % 5) * 0.4)}, ease: "none" }, ${f(t0 + (k % 10) * 0.25)});`),
        ...[0, 1, 2, 3, 4].map((k) => `tl.to("#${id}-tay${k}", { rotation: ${k % 2 ? 18 : -18}, svgOrigin: "${120 + k * 210} 1060", duration: 0.45, yoyo: true, repeat: ${lap(d, 0.45)}, ease: "sine.inOut" }, ${f(t0 + k * 0.1)});`),
      ],
    }),

    // Thành phố tuyết (Đông Âu / xứ lạnh): nhà mái dốc phủ tuyết, nhà thờ mái vòm, đèn đường, tuyết rơi
    thanh_pho_tuyet: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#64748b', '#cbd5e1')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${[0, 1, 2, 3].map((k) => {
          const x = 30 + k * 260
          const c = 300 + (k % 2) * 80
          return `<rect x="${x}" y="${1180 - c - 300}" width="220" height="${c + 300}" fill="${['#b45309', '#64748b', '#9a3412', '#475569'][k]}"/><path d="M${x - 20} ${1180 - c - 300} L${x + 110} ${1180 - c - 420} L${x + 240} ${1180 - c - 300} Z" fill="#f8fafc"/>${[0, 1, 2, 3].map((j) => `<rect x="${x + 30 + (j % 2) * 100}" y="${1180 - c - 250 + Math.floor(j / 2) * 140}" width="60" height="80" fill="#fde68a" opacity="0.85"/>`).join('')}`
        }).join('')}
        <g transform="translate(480 0)"><rect x="40" y="520" width="120" height="400" fill="#e2e8f0"/><path d="M40 520 Q100 380 160 520 Z" fill="#16a34a"/><line x1="100" y1="400" x2="100" y2="350" stroke="#facc15" stroke-width="8"/></g>
        ${[0, 1, 2].map((k) => `<rect x="${170 + k * 360}" y="900" width="12" height="280" fill="#1f2937"/><circle id="${id}-den${k}" cx="${176 + k * 360}" cy="900" r="20" fill="#fde68a"/>`).join('')}
        ${[...Array(45)].map((_, k) => `<circle id="${id}-tuyet${k}" cx="${(k * 97) % 1080}" cy="${-20 - ((k * 53) % 300)}" r="${4 + (k % 3) * 2}" fill="#fff" opacity="0.9"/>`).join('')}
        ${san(id, '#f8fafc', '#cbd5e1', '#e2e8f0', '#ffffff')}`,
      tw: (t0, d) => [
        ...[...Array(45)].map((_, k) => `tl.fromTo("#${id}-tuyet${k}", { y: 0, x: 0 }, { y: 1400, x: ${(k % 2 ? 1 : -1) * (20 + (k % 4) * 15)}, duration: ${f(4 + (k % 6) * 0.6)}, repeat: ${lap(d, 4 + (k % 6) * 0.6)}, ease: "none" }, ${f(t0 + (k % 9) * 0.3)});`),
        ...[0, 1, 2].map((k) => nhapNhay(`#${id}-den${k}`, t0 + k * 0.2, d, 1.1, 0.6)),
      ],
    }),

    // Thư viện: kệ sách cao nhiều màu, đèn bàn đọc, thang gỗ, cửa sổ vòm
    thu_vien: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#78350f', '#451a03')}<radialGradient id="${id}-den" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fef3c7" stop-opacity="0.6"/><stop offset="1" stop-color="#fef3c7" stop-opacity="0"/></radialGradient></defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        <path d="M430 700 L430 420 Q540 300 650 420 L650 700 Z" fill="#bae6fd" stroke="#a16207" stroke-width="12"/>
        ${[0, 1].map((s) => `<rect x="${40 + s * 660}" y="240" width="340" height="940" fill="#92400e"/>${[0, 1, 2, 3, 4].map((r) => `<rect x="${40 + s * 660}" y="${400 + r * 160}" width="340" height="16" fill="#451a03"/>${[...Array(9)].map((_, k) => `<rect x="${55 + s * 660 + k * 35}" y="${400 + r * 160 - 100 - ((k * 7 + r) % 4) * 10}" width="28" height="${100 + ((k * 7 + r) % 4) * 10}" rx="3" fill="${['#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0d9488'][(k + r + s) % 6]}"/>`).join('')}`).join('')}`).join('')}
        <path d="M400 1180 L470 640 M470 1180 L540 640" stroke="#a16207" stroke-width="12"/>${[0, 1, 2, 3, 4, 5].map((k) => `<line x1="${408 + k * 11}" y1="${1110 - k * 90}" x2="${478 + k * 11}" y2="${1110 - k * 90}" stroke="#a16207" stroke-width="8"/>`).join('')}
        <circle id="${id}-quang" cx="560" cy="900" r="200" fill="url(#${id}-den)"/><path d="M520 880 L600 880 L585 830 L535 830 Z" fill="#16a34a"/><rect x="556" y="880" width="8" height="100" fill="#a16207"/>
        ${san(id, '#92400e', '#451a03', '#a16207', '#fef3c7')}`,
      tw: (t0, d) => [nhapNhay(`#${id}-quang`, t0, d, 1.6, 0.6)],
    }),

    // Sàn chứng khoán: bảng điện tử nhiều mã xanh đỏ chạy chữ, biểu đồ nến, tượng bò vàng
    san_chung_khoan: (id) => ({
      svg: `
        <defs>${tg(id, 'nen', '#0f172a', '#020617')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-nen)"/>
        <rect x="40" y="250" width="1000" height="460" rx="12" fill="#020617" stroke="#334155" stroke-width="8"/>
        ${[...Array(30)].map((_, k) => `<text x="${70 + (k % 5) * 196}" y="${300 + Math.floor(k / 5) * 66}" font-family="monospace" font-size="30" font-weight="700" fill="${(k * 7) % 3 ? '#22c55e' : '#ef4444'}">${['VIC', 'VHM', 'FPT', 'HPG', 'VNM', 'MWG', 'TCB', 'VCB', 'GAS', 'MSN'][k % 10]} ${(k * 7) % 3 ? '▲' : '▼'}${((k * 13) % 50) / 10 + 0.1}</text>`).join('')}
        <rect x="40" y="730" width="1000" height="60" fill="#111827"/><g id="${id}-chu"><text x="1080" y="772" font-family="monospace" font-size="34" fill="#facc15">VN-INDEX ▲ 1.284,56 (+1,2%) · HNX ▲ 236,4 · UPCOM ▼ 92,1 · VN30 ▲ 1.312,8</text></g>
        ${[...Array(12)].map((_, k) => `<line x1="${90 + k * 80}" y1="${930 - ((k * 37) % 120)}" x2="${90 + k * 80}" y2="${1050 - ((k * 37) % 120)}" stroke="${k % 3 ? '#22c55e' : '#ef4444'}" stroke-width="4"/><rect x="${76 + k * 80}" y="${950 - ((k * 37) % 120)}" width="28" height="${60 + (k % 4) * 10}" fill="${k % 3 ? '#22c55e' : '#ef4444'}"/>`).join('')}
        ${san(id, '#1e293b', '#020617', '#22c55e', '#86efac')}`,
      tw: (t0, d) => [`tl.fromTo("#${id}-chu", { x: 0 }, { x: -2200, duration: 9, repeat: ${lap(d, 9)}, ease: "none" }, ${f(t0)});`],
    }),
  }
}
