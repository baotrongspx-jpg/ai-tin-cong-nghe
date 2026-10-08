// Bối cảnh theo thời kỳ / văn hoá / nghề nghiệp cho phim tiểu sử và chuyện lịch sử: thảo nguyên, cung điện, chiến
// trường, thành cổ, làng xưa, sa mạc, biển cả thuyền buồm, chùa chiền, ga-ra khởi nghiệp, bệ phóng tên lửa, phòng thu
// âm, phim trường. Cùng quy ước với boiCanh.mjs: toàn khung 1080x1920, mặt sàn từ y≈1180, `id` là tiền tố duy nhất,
// tw(t0, d) là chuyển động trong [t0, t0+d] (lặp hữu hạn bằng lap, không ngẫu nhiên). Tên khoá khớp lib/ai.ts (BOI_CANH).
export function boiCanhCo({ san, f, lap }) {
  const tg = (id, ten, m1, m2) =>
    `<linearGradient id="${id}-${ten}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m1}"/><stop offset="1" stop-color="${m2}"/></linearGradient>`
  const may = (id, k, x, y, s = 1, mau = '#fff') =>
    `<g id="${id}-may${k}" opacity="0.92"><ellipse cx="${x}" cy="${y}" rx="${120 * s}" ry="${40 * s}" fill="${mau}"/><ellipse cx="${x + 58 * s}" cy="${y - 28 * s}" rx="${76 * s}" ry="${48 * s}" fill="${mau}"/><ellipse cx="${x - 52 * s}" cy="${y - 12 * s}" rx="${54 * s}" ry="${34 * s}" fill="${mau}"/></g>`
  const trotMay = (id, k, d, t0, xa) => `tl.fromTo("#${id}-may${k}", { x: ${-xa} }, { x: ${xa}, duration: ${f(d)}, ease: "none" }, ${f(t0)});`
  const chim = (id, k, x, y, mau = '#1f2937') => `<path id="${id}-chim${k}" d="M${x} ${y} q12 -14 24 0 q12 -14 24 0" fill="none" stroke="${mau}" stroke-width="5" stroke-linecap="round"/>`
  const bayChim = (id, k, t0, d, dx, dy) => `tl.fromTo("#${id}-chim${k}", { x: 0, y: 0 }, { x: ${dx}, y: ${dy}, duration: ${f(d)}, ease: "none" }, ${f(t0)});`
  const nhapNhay = (sel, t0, d, ck, toi = 0.25) => `tl.to("${sel}", { opacity: ${toi}, duration: ${f(ck)}, yoyo: true, repeat: ${lap(d, ck)}, ease: "sine.inOut" }, ${f(t0)});`
  const dua = (sel, t0, d, ck, goc, goc0) => `tl.fromTo("${sel}", { rotation: ${-goc} }, { rotation: ${goc}, svgOrigin: "${goc0}", duration: ${f(ck)}, yoyo: true, repeat: ${lap(d, ck) | 1}, ease: "sine.inOut" }, ${f(t0)});`
  // Cờ phấp phới: lá cờ hình sóng, đổi dạng bằng scaleX qua lại quanh cán
  const co = (id, k, x, y, mau, cao = 160) =>
    `<rect x="${x - 4}" y="${y}" width="8" height="${cao}" fill="#57534e"/><path id="${id}-co${k}" d="M${x} ${y} q40 -10 80 6 q-10 22 0 44 q-40 -16 -80 -6 Z" fill="${mau}" stroke="#1f2937" stroke-width="3"/>`
  const phapPhoi = (id, k, x, y, t0, d) => `tl.fromTo("#${id}-co${k}", { scaleX: 1, skewY: 0 }, { scaleX: 0.82, skewY: 6, svgOrigin: "${x} ${y + 20}", duration: 0.7, yoyo: true, repeat: ${lap(d, 0.7)}, ease: "sine.inOut" }, ${f(t0 + k * 0.17)});`
  // Lều tròn du mục (ger / yurt): thân trắng, mái vòm, đai hoa văn, cửa đỏ
  const leu = (x, y, s) =>
    `<g><rect x="${x - 110 * s}" y="${y - 120 * s}" width="${220 * s}" height="${120 * s}" fill="#f8fafc" stroke="#78716c" stroke-width="5"/>
     <path d="M${x - 124 * s} ${y - 118 * s} Q${x} ${y - 230 * s} ${x + 124 * s} ${y - 118 * s} Z" fill="#e7e5e4" stroke="#78716c" stroke-width="5"/>
     <rect x="${x - 110 * s}" y="${y - 86 * s}" width="${220 * s}" height="${18 * s}" fill="#dc2626"/><path d="M${x - 100 * s} ${y - 77 * s} h${200 * s}" stroke="#fde047" stroke-width="${4 * s}" stroke-dasharray="${10 * s} ${8 * s}"/>
     <rect x="${x - 26 * s}" y="${y - 70 * s}" width="${52 * s}" height="${70 * s}" rx="${6 * s}" fill="#b91c1c" stroke="#7f1d1d" stroke-width="4"/><circle cx="${x}" cy="${y - 196 * s}" r="${12 * s}" fill="#a8a29e"/></g>`
  // Ngựa (bóng đen giản lược)
  const ngua = (id, k, x, y, s, mau = '#44403c') =>
    `<g id="${id}-ngua${k}"><ellipse cx="${x}" cy="${y}" rx="${60 * s}" ry="${26 * s}" fill="${mau}"/><path d="M${x + 44 * s} ${y - 10 * s} L${x + 78 * s} ${y - 60 * s} L${x + 96 * s} ${y - 52 * s} L${x + 66 * s} ${y - 2 * s} Z" fill="${mau}"/>
     ${[-40, -22, 26, 44].map((dx) => `<rect x="${x + dx * s}" y="${y + 14 * s}" width="${9 * s}" height="${50 * s}" fill="${mau}"/>`).join('')}<path d="M${x - 58 * s} ${y - 6 * s} q-24 10 -18 44" fill="none" stroke="${mau}" stroke-width="${8 * s}" stroke-linecap="round"/></g>`
  // Mái ngói cong kiểu Á Đông
  const maiCong = (x, y, w, mau, vien = '#7c2d12') =>
    `<path d="M${x - w / 2 - 40} ${y + 10} Q${x - w / 2} ${y + 6} ${x - w / 2 + 20} ${y - 40} L${x + w / 2 - 20} ${y - 40} Q${x + w / 2} ${y + 6} ${x + w / 2 + 40} ${y + 10} Q${x} ${y - 4} ${x - w / 2 - 40} ${y + 10} Z" fill="${mau}" stroke="${vien}" stroke-width="6"/>`
  const denLong = (id, k, x, y) =>
    `<g id="${id}-long${k}"><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y}" stroke="#78350f" stroke-width="4"/><ellipse cx="${x}" cy="${y + 34}" rx="30" ry="38" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/><rect x="${x - 14}" y="${y - 6}" width="28" height="8" fill="#facc15"/><rect x="${x - 14}" y="${y + 68}" width="28" height="8" fill="#facc15"/><line x1="${x}" y1="${y + 76}" x2="${x}" y2="${y + 100}" stroke="#facc15" stroke-width="4"/></g>`
  const lacLong = (id, k, x, y, t0, d) => dua(`#${id}-long${k}`, t0 + k * 0.2, d, 1.4, 4, `${x} ${y - 40}`)

  return {
    // Thảo nguyên: trời cao, núi xa, đồi cỏ lượn sóng, lều tròn du mục, đàn ngựa, đại bàng lượn, mây trôi
    thao_nguyen: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#60a5fa', '#e0f2fe')}${tg(id, 'doi', '#a3e635', '#65a30d')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        <circle cx="830" cy="380" r="70" fill="#fef9c3"/>
        ${may(id, 0, 240, 360)}${may(id, 1, 760, 300, 0.75)}
        <path d="M0 860 L120 700 L260 790 L420 640 L600 800 L760 660 L900 760 L1080 680 L1080 900 L0 900 Z" fill="#94a3b8" opacity="0.6"/>
        <path d="M0 900 Q270 820 540 890 Q810 960 1080 870 L1080 1180 L0 1180 Z" fill="url(#${id}-doi)"/>
        <path d="M0 1010 Q300 950 600 1010 Q860 1060 1080 1000 L1080 1180 L0 1180 Z" fill="#84cc16"/>
        ${leu(250, 1020, 0.9)}${leu(820, 1000, 0.75)}${leu(560, 960, 0.5)}
        ${ngua(id, 0, 420, 1080, 0.8)}${ngua(id, 1, 680, 1100, 0.7, '#78350f')}
        <g id="${id}-ung"><path d="M520 470 q30 -26 60 0 q30 -26 60 0" fill="none" stroke="#292524" stroke-width="8" stroke-linecap="round"/></g>
        ${san(id, '#84cc16', '#3f6212', '#65a30d', '#fef9c3')}`,
      tw: (t0, d) => [
        trotMay(id, 0, d, t0, 70),
        trotMay(id, 1, d, t0, -60),
        `tl.fromTo("#${id}-ung", { x: -120, y: 0 }, { x: 160, y: -40, duration: ${f(d)}, ease: "sine.inOut" }, ${f(t0)});`,
        ...[0, 1].map((k) => `tl.to("#${id}-ngua${k}", { y: -6, duration: 0.9, yoyo: true, repeat: ${lap(d, 0.9)}, ease: "sine.inOut" }, ${f(t0 + k * 0.4)});`),
      ],
    }),

    // Cung điện Á Đông: điện lớn mái ngói vàng cong, cột đỏ, bậc thềm đá, đèn lồng đung đưa, cờ hai bên
    cung_dien: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#fdba74', '#fef3c7')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${may(id, 0, 200, 340, 0.8, '#fff7ed')}${may(id, 1, 860, 280, 0.7, '#fff7ed')}
        ${maiCong(540, 520, 620, '#eab308')}
        <rect x="270" y="530" width="540" height="40" fill="#b91c1c"/>
        ${maiCong(540, 640, 820, '#facc15')}
        <rect x="180" y="650" width="720" height="380" fill="#dc2626" stroke="#7f1d1d" stroke-width="6"/>
        ${[220, 330, 440, 640, 750, 860].map((x) => `<rect x="${x - 16}" y="650" width="32" height="380" fill="#991b1b"/>`).join('')}
        <rect x="480" y="760" width="120" height="270" rx="60" fill="#7f1d1d" stroke="#facc15" stroke-width="6"/>
        <rect x="430" y="690" width="220" height="50" rx="6" fill="#1e3a8a" stroke="#facc15" stroke-width="5"/><path d="M460 715 h160" stroke="#facc15" stroke-width="5" stroke-dasharray="14 10"/>
        ${[0, 1, 2, 3].map((k) => `<rect x="${240 - k * 30}" y="${1030 + k * 38}" width="${600 + k * 60}" height="38" fill="${k % 2 ? '#d6d3d1' : '#e7e5e4'}" stroke="#a8a29e" stroke-width="3"/>`).join('')}
        ${denLong(id, 0, 290, 680)}${denLong(id, 1, 790, 680)}
        ${co(id, 0, 80, 720, '#facc15', 460)}${co(id, 1, 1000, 720, '#dc2626', 460)}
        ${san(id, '#d6d3d1', '#a8a29e', '#78716c', '#fef3c7')}`,
      tw: (t0, d) => [
        trotMay(id, 0, d, t0, 50),
        trotMay(id, 1, d, t0, -50),
        lacLong(id, 0, 290, 680, t0, d),
        lacLong(id, 1, 790, 680, t0, d),
        phapPhoi(id, 0, 80, 720, t0, d),
        phapPhoi(id, 1, 1000, 720, t0, d),
      ],
    }),

    // Chiến trường xưa: trời đỏ cam, khói bốc thành cột, doanh trại lều xa, rừng giáo mác, cờ hiệu, khiên gãy trên đất
    chien_truong: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#7c2d12', '#fb923c')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        <circle cx="540" cy="760" r="150" fill="#fde68a" opacity="0.85"/>
        ${[0, 1, 2].map((k) => `<g id="${id}-khoi${k}" opacity="0.7">${[0, 1, 2, 3].map((j) => `<circle cx="${200 + k * 340 + j * 14}" cy="${880 - j * 110}" r="${50 + j * 18}" fill="#57534e"/>`).join('')}</g>`).join('')}
        <path d="M0 930 L1080 930 L1080 1180 L0 1180 Z" fill="#78350f"/>
        ${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M${60 + k * 175} 930 l50 -70 l50 70 Z" fill="#a8a29e" stroke="#44403c" stroke-width="4"/>`).join('')}
        ${[...Array(22)].map((_, k) => `<line x1="${30 + k * 48}" y1="${1000 - (k % 3) * 14}" x2="${36 + k * 48}" y2="${820 - (k % 4) * 20}" stroke="#292524" stroke-width="6"/><path d="M${36 + k * 48} ${820 - (k % 4) * 20} l-7 14 l14 0 Z" fill="#d6d3d1"/>`).join('')}
        ${co(id, 0, 150, 700, '#dc2626', 320)}${co(id, 1, 540, 640, '#facc15', 380)}${co(id, 2, 930, 700, '#1d4ed8', 320)}
        <ellipse cx="240" cy="1150" rx="46" ry="16" fill="#713f12"/><path d="M780 1150 l40 -26 l12 18 Z" fill="#a8a29e"/>
        ${san(id, '#92400e', '#451a03', '#b45309', '#fed7aa')}`,
      tw: (t0, d) => [
        ...[0, 1, 2].map((k) => `tl.fromTo("#${id}-khoi${k}", { y: 0, opacity: 0.7 }, { y: -60, opacity: 0.45, duration: 2.6, yoyo: true, repeat: ${lap(d, 2.6)}, ease: "sine.inOut" }, ${f(t0 + k * 0.5)});`),
        ...[0, 1, 2].map((k) => phapPhoi(id, k, [150, 540, 930][k], [700, 640, 700][k], t0, d)),
      ],
    }),

    // Thành cổ: tường đá có lỗ châu mai, hai tháp canh, cổng vòm, cờ trên tháp, đường đất dẫn vào
    thanh_co: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#38bdf8', '#e0f2fe')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${may(id, 0, 220, 330)}${may(id, 1, 820, 260, 0.8)}
        <path d="M0 980 L1080 980 L1080 1180 L0 1180 Z" fill="#86efac"/>
        <rect x="60" y="700" width="960" height="320" fill="#a8a29e" stroke="#57534e" stroke-width="6"/>
        ${[...Array(12)].map((_, k) => `<rect x="${70 + k * 80}" y="660" width="50" height="46" fill="#a8a29e" stroke="#57534e" stroke-width="5"/>`).join('')}
        ${[...Array(5)].map((_, r) => [...Array(12)].map((__, c) => `<rect x="${60 + c * 80 + (r % 2) * 40}" y="${720 + r * 60}" width="80" height="60" fill="none" stroke="#78716c" stroke-width="3"/>`).join('')).join('')}
        ${[140, 940].map((x) => `<rect x="${x - 90}" y="520" width="180" height="500" fill="#78716c" stroke="#44403c" stroke-width="6"/><path d="M${x - 110} 520 L${x} 400 L${x + 110} 520 Z" fill="#991b1b" stroke="#450a0a" stroke-width="6"/><rect x="${x - 22}" y="600" width="44" height="70" rx="22" fill="#1c1917"/>`).join('')}
        <path d="M430 1020 L430 840 Q540 740 650 840 L650 1020 Z" fill="#292524" stroke="#57534e" stroke-width="8"/>
        ${[0, 1, 2, 3, 4].map((k) => `<line x1="${450 + k * 45}" y1="830" x2="${450 + k * 45}" y2="1020" stroke="#78350f" stroke-width="8"/>`).join('')}
        ${co(id, 0, 140, 300, '#facc15', 110)}${co(id, 1, 940, 300, '#facc15', 110)}
        <path d="M430 1180 L480 1020 L600 1020 L650 1180 Z" fill="#d6d3d1"/>
        ${san(id, '#a3a3a3', '#57534e', '#78716c', '#fef9c3')}`,
      tw: (t0, d) => [trotMay(id, 0, d, t0, 60), trotMay(id, 1, d, t0, -60), phapPhoi(id, 0, 140, 300, t0, d), phapPhoi(id, 1, 940, 300, t0, d)],
    }),

    // Làng xưa Việt Nam: cây đa lớn, mái đình cong, giếng nước, đống rơm, cổng tre, con trâu
    lang_xua: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#fcd34d', '#fef9c3')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${may(id, 0, 760, 340, 0.8)}
        <path d="M0 960 Q540 900 1080 960 L1080 1180 L0 1180 Z" fill="#a3e635"/>
        <g id="${id}-da"><rect x="150" y="620" width="70" height="420" fill="#78350f"/>${[[180, 560, 170], [80, 640, 120], [290, 640, 130], [180, 460, 120]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#15803d"/>`).join('')}${[0, 1, 2, 3].map((k) => `<path d="M${120 + k * 30} 700 q-6 160 4 300" fill="none" stroke="#713f12" stroke-width="4"/>`).join('')}</g>
        ${maiCong(680, 780, 380, '#9a3412')}
        <rect x="510" y="790" width="340" height="220" fill="#fde68a" stroke="#78350f" stroke-width="6"/>
        ${[540, 620, 740, 820].map((x) => `<rect x="${x - 10}" y="790" width="20" height="220" fill="#92400e"/>`).join('')}
        <rect x="640" y="870" width="80" height="140" fill="#78350f"/>
        <ellipse cx="960" cy="1060" rx="70" ry="20" fill="#a8a29e" stroke="#57534e" stroke-width="5"/><rect x="890" y="1010" width="140" height="50" fill="#d6d3d1" stroke="#57534e" stroke-width="5"/>
        <path d="M380 1060 Q420 930 470 1060 Z" fill="#facc15" stroke="#a16207" stroke-width="5"/>
        <g id="${id}-trau"><ellipse cx="420" cy="1120" rx="70" ry="34" fill="#57534e"/><circle cx="490" cy="1100" r="24" fill="#57534e"/><path d="M478 1082 q-10 -20 -30 -18 M502 1082 q10 -20 30 -18" fill="none" stroke="#e7e5e4" stroke-width="6" stroke-linecap="round"/>${[370, 395, 445, 470].map((x) => `<rect x="${x}" y="1140" width="10" height="36" fill="#57534e"/>`).join('')}</g>
        ${chim(id, 0, 600, 480)}${chim(id, 1, 660, 520)}
        ${san(id, '#ca8a04', '#713f12', '#a16207', '#fef9c3')}`,
      tw: (t0, d) => [
        trotMay(id, 0, d, t0, -60),
        `tl.to("#${id}-da", { rotation: 1.2, svgOrigin: "185 1040", duration: 2.2, yoyo: true, repeat: ${lap(d, 2.2)}, ease: "sine.inOut" }, ${f(t0)});`,
        `tl.to("#${id}-trau", { x: 18, duration: ${f(d)}, ease: "none" }, ${f(t0)});`,
        bayChim(id, 0, t0, d, 260, -60),
        bayChim(id, 1, t0, d, 240, -40),
      ],
    }),

    // Sa mạc: đồi cát lượn, mặt trời gay gắt, đoàn lạc đà đi chậm, hơi nóng bốc lên
    sa_mac: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#f97316', '#fde68a')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        <circle id="${id}-mt" cx="780" cy="420" r="110" fill="#fef08a"/>
        <path d="M0 900 Q260 800 520 880 Q800 960 1080 860 L1080 1180 L0 1180 Z" fill="#fbbf24"/>
        <path d="M0 990 Q330 920 640 1000 Q880 1060 1080 990 L1080 1180 L0 1180 Z" fill="#f59e0b"/>
        <g id="${id}-doan">${[0, 1, 2].map((k) => `<g transform="translate(${180 + k * 150} ${930 - k * 6}) scale(0.7)"><ellipse cx="0" cy="0" rx="60" ry="30" fill="#78350f"/><circle cx="-10" cy="-30" r="22" fill="#78350f"/><path d="M50 -10 L80 -70 L100 -64 L70 0 Z" fill="#78350f"/>${[-40, -20, 24, 44].map((x) => `<rect x="${x}" y="18" width="9" height="60" fill="#78350f"/>`).join('')}</g>`).join('')}</g>
        <g id="${id}-nong" opacity="0.35">${[0, 1, 2].map((k) => `<path d="M${200 + k * 300} 880 q20 -30 0 -60 q-20 -30 0 -60" fill="none" stroke="#fff7ed" stroke-width="6"/>`).join('')}</g>
        ${san(id, '#fcd34d', '#b45309', '#f59e0b', '#fff7ed')}`,
      tw: (t0, d) => [
        `tl.fromTo("#${id}-doan", { x: -40 }, { x: 220, duration: ${f(d)}, ease: "none" }, ${f(t0)});`,
        `tl.fromTo("#${id}-nong", { y: 0, opacity: 0.35 }, { y: -40, opacity: 0.1, duration: 1.6, repeat: ${lap(d, 1.6)}, ease: "sine.out" }, ${f(t0)});`,
        `tl.to("#${id}-mt", { scale: 1.06, svgOrigin: "780 420", duration: 2, yoyo: true, repeat: ${lap(d, 2)}, ease: "sine.inOut" }, ${f(t0)});`,
      ],
    }),

    // Biển cả: thuyền buồm gỗ nhấp nhô trên sóng, hải âu, chân trời, mây; sàn là cầu tàu gỗ
    bien_ca: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#38bdf8', '#e0f2fe')}${tg(id, 'bien', '#0284c7', '#075985')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${may(id, 0, 260, 340)}${may(id, 1, 800, 280, 0.8)}
        <rect x="0" y="860" width="1080" height="320" fill="url(#${id}-bien)"/>
        <g id="${id}-thuyen"><path d="M380 900 L700 900 L660 970 L420 970 Z" fill="#78350f" stroke="#451a03" stroke-width="6"/><rect x="532" y="560" width="14" height="340" fill="#451a03"/>
          <path d="M546 580 Q680 680 546 860 Z" fill="#fef3c7" stroke="#a16207" stroke-width="5"/><path d="M532 600 Q420 700 532 860 Z" fill="#fde68a" stroke="#a16207" stroke-width="5"/><path d="M546 560 l50 14 l-50 14 Z" fill="#dc2626"/></g>
        ${[0, 1, 2, 3].map((k) => `<path id="${id}-song${k}" d="M${-60 + (k % 2) * 60} ${960 + k * 50} q60 -24 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" fill="none" stroke="#e0f2fe" stroke-width="7" stroke-linecap="round" opacity="0.8"/>`).join('')}
        ${chim(id, 0, 200, 520, '#f8fafc')}${chim(id, 1, 260, 560, '#f8fafc')}
        ${[...Array(9)].map((_, k) => `<rect x="${k * 120}" y="1180" width="114" height="740" fill="${k % 2 ? '#92400e' : '#a16207'}"/>`).join('')}
        <rect x="0" y="1180" width="1080" height="12" fill="#451a03"/>`,
      tw: (t0, d) => [
        trotMay(id, 0, d, t0, 60),
        trotMay(id, 1, d, t0, -50),
        `tl.fromTo("#${id}-thuyen", { y: 0, rotation: -2 }, { y: 14, rotation: 2, svgOrigin: "540 930", duration: 1.6, yoyo: true, repeat: ${lap(d, 1.6) | 1}, ease: "sine.inOut" }, ${f(t0)});`,
        ...[0, 1, 2, 3].map((k) => `tl.fromTo("#${id}-song${k}", { x: 0 }, { x: ${k % 2 ? 120 : -120}, duration: 2.4, repeat: ${lap(d, 2.4)}, ease: "none" }, ${f(t0)});`),
        bayChim(id, 0, t0, d, 300, -80),
        bayChim(id, 1, t0, d, 280, -50),
      ],
    }),

    // Chùa chiền: tháp nhiều tầng, cổng tam quan, cây xanh, khói nhang bay, đèn lồng
    den_chua: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#a5b4fc', '#fef3c7')}</defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${[0, 1, 2, 3, 4].map((k) => `${maiCong(760, 420 + k * 120, 260 - k * 20 + k * 40, '#b45309')}<rect x="${700 - k * 4}" y="${430 + k * 120}" width="${120 + k * 8}" height="80" fill="#fef3c7" stroke="#78350f" stroke-width="5"/>`).join('')}
        <circle cx="760" cy="350" r="16" fill="#facc15"/><rect x="756" y="300" width="8" height="50" fill="#facc15"/>
        <rect x="120" y="820" width="380" height="220" fill="#fef3c7" stroke="#78350f" stroke-width="6"/>${maiCong(310, 810, 400, '#9a3412')}
        ${[160, 250, 370, 460].map((x) => `<rect x="${x - 12}" y="820" width="24" height="220" fill="#b91c1c"/>`).join('')}<rect x="270" y="900" width="80" height="140" rx="40" fill="#7f1d1d"/>
        ${[60, 980].map((x) => `<circle cx="${x}" cy="840" r="110" fill="#166534"/><rect x="${x - 14}" y="900" width="28" height="140" fill="#713f12"/>`).join('')}
        <rect x="560" y="1050" width="60" height="70" rx="8" fill="#a16207" stroke="#713f12" stroke-width="5"/>
        <g id="${id}-khoi" opacity="0.6">${[0, 1, 2].map((k) => `<path d="M${578 + k * 12} 1050 q-16 -40 0 -80 q16 -40 0 -80" fill="none" stroke="#e7e5e4" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>
        ${denLong(id, 0, 190, 760)}${denLong(id, 1, 430, 760)}
        ${san(id, '#d6d3d1', '#a8a29e', '#78716c', '#fef3c7')}`,
      tw: (t0, d) => [
        `tl.fromTo("#${id}-khoi", { y: 0, opacity: 0.6 }, { y: -50, opacity: 0.15, duration: 2.4, repeat: ${lap(d, 2.4)}, ease: "sine.out" }, ${f(t0)});`,
        lacLong(id, 0, 190, 760, t0, d),
        lacLong(id, 1, 430, 760, t0, d),
      ],
    }),

    // Ga-ra khởi nghiệp: cửa cuốn mở, bàn thợ với dụng cụ treo tường, máy tính màn hình sáng, bóng đèn đung đưa
    ga_ra: (id) => ({
      svg: `
        <defs>${tg(id, 'tuong', '#475569', '#334155')}</defs>
        <rect width="1080" height="1180" fill="url(#${id}-tuong)"/>
        <rect x="620" y="360" width="400" height="560" fill="#1e293b" stroke="#94a3b8" stroke-width="8"/>
        ${[...Array(5)].map((_, k) => `<rect x="628" y="${368 + k * 34}" width="384" height="26" fill="#64748b"/>`).join('')}
        <rect x="628" y="540" width="384" height="372" fill="#0ea5e9" opacity="0.35"/><circle cx="900" cy="640" r="40" fill="#fde68a" opacity="0.7"/>
        <rect x="60" y="430" width="480" height="230" rx="8" fill="#a16207" stroke="#713f12" stroke-width="6"/>
        ${[[110, 470, '🔧'], [200, 480, '🔨'], [300, 470, '🪛'], [400, 480, '⚙️']].map(([x, y, e]) => `<text x="${x}" y="${y + 60}" font-size="64" font-family="Emoji, 'Segoe UI Emoji'">${e}</text>`).join('')}
        <rect x="40" y="840" width="560" height="30" rx="6" fill="#92400e"/><rect x="60" y="870" width="20" height="170" fill="#713f12"/><rect x="560" y="870" width="20" height="170" fill="#713f12"/>
        <rect x="120" y="700" width="200" height="140" rx="10" fill="#0f172a" stroke="#cbd5e1" stroke-width="8"/><rect id="${id}-man" x="134" y="714" width="172" height="112" fill="#38bdf8"/>
        <path d="M150 740 h90 M150 764 h120 M150 788 h70" stroke="#e0f2fe" stroke-width="7" stroke-linecap="round"/>
        <rect x="360" y="780" width="160" height="60" rx="6" fill="#64748b"/><circle cx="400" cy="810" r="14" fill="#fbbf24"/><circle cx="470" cy="810" r="14" fill="#22c55e"/>
        <g id="${id}-den"><line x1="330" y1="0" x2="330" y2="260" stroke="#cbd5e1" stroke-width="4"/><path d="M300 260 h60 l-14 36 h-32 Z" fill="#64748b"/><circle cx="330" cy="310" r="22" fill="#fef08a"/></g>
        ${san(id, '#94a3b8', '#475569', '#64748b', '#fef9c3')}`,
      tw: (t0, d) => [dua(`#${id}-den`, t0, d, 1.8, 5, '330 0'), nhapNhay(`#${id}-man`, t0, d, 0.9, 0.7)],
    }),

    // Bệ phóng tên lửa: trời rạng sáng, tên lửa lớn cạnh tháp giàn, đèn pha quét, khói trắng phả ra chân bệ
    be_phong: (id) => ({
      svg: `
        <defs>${tg(id, 'troi', '#1e1b4b', '#f472b6')}<linearGradient id="${id}-pha" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fef9c3" stop-opacity="0.5"/><stop offset="1" stop-color="#fef9c3" stop-opacity="0"/></linearGradient></defs>
        <rect width="1080" height="1920" fill="url(#${id}-troi)"/>
        ${[...Array(18)].map((_, k) => `<circle cx="${(k * 191) % 1080}" cy="${80 + ((k * 137) % 420)}" r="${1.5 + (k % 3)}" fill="#fff"/>`).join('')}
        <polygon id="${id}-pha0" points="120,1180 160,1180 420,300 300,300" fill="url(#${id}-pha)"/><polygon id="${id}-pha1" points="920,1180 960,1180 780,300 660,300" fill="url(#${id}-pha)"/>
        <rect x="660" y="380" width="70" height="760" fill="none" stroke="#f97316" stroke-width="8"/>
        ${[...Array(9)].map((_, k) => `<path d="M660 ${400 + k * 82} L730 ${470 + k * 82} M730 ${400 + k * 82} L660 ${470 + k * 82}" stroke="#f97316" stroke-width="4"/>`).join('')}
        <path d="M540 260 Q580 340 580 420 L580 1060 L500 1060 L500 420 Q500 340 540 260 Z" fill="#f8fafc" stroke="#334155" stroke-width="7"/>
        <rect x="500" y="560" width="80" height="26" fill="#1e293b"/><rect x="500" y="860" width="80" height="26" fill="#1e293b"/>
        <path d="M500 960 L450 1090 L500 1060 Z M580 960 L630 1090 L580 1060 Z" fill="#dc2626" stroke="#334155" stroke-width="5"/>
        <g id="${id}-khoi" opacity="0.85">${[0, 1, 2, 3, 4].map((k) => `<circle cx="${380 + k * 80}" cy="${1120 - (k % 2) * 20}" r="${60 + (k % 3) * 14}" fill="#e2e8f0"/>`).join('')}</g>
        ${san(id, '#64748b', '#1e293b', '#f97316', '#fde68a')}`,
      tw: (t0, d) => [
        `tl.fromTo("#${id}-pha0", { rotation: -6 }, { rotation: 6, svgOrigin: "140 1180", duration: 2.4, yoyo: true, repeat: ${lap(d, 2.4) | 1}, ease: "sine.inOut" }, ${f(t0)});`,
        `tl.fromTo("#${id}-pha1", { rotation: 6 }, { rotation: -6, svgOrigin: "940 1180", duration: 2.4, yoyo: true, repeat: ${lap(d, 2.4) | 1}, ease: "sine.inOut" }, ${f(t0)});`,
        `tl.fromTo("#${id}-khoi", { scale: 1, opacity: 0.85 }, { scale: 1.08, opacity: 0.6, svgOrigin: "540 1120", duration: 1.2, yoyo: true, repeat: ${lap(d, 1.2)}, ease: "sine.inOut" }, ${f(t0)});`,
      ],
    }),

    // Phòng thu âm: tường cách âm, bàn mixer đèn nhấp nháy, micro thu âm, đèn ON AIR đỏ, loa hai bên
    phong_thu: (id) => ({
      svg: `
        <rect width="1080" height="1180" fill="#1e1b4b"/>
        ${[...Array(6)].map((_, r) => [...Array(9)].map((__, c) => `<path d="M${30 + c * 115} ${300 + r * 110} l50 -40 l50 40 l-50 40 Z" fill="${(r + c) % 2 ? '#312e81' : '#3730a3'}"/>`).join('')).join('')}
        <rect x="400" y="320" width="280" height="90" rx="14" fill="#450a0a" stroke="#7f1d1d" stroke-width="6"/><text id="${id}-onair" x="540" y="382" text-anchor="middle" font-family="BVP, sans-serif" font-size="52" font-weight="700" fill="#ef4444">ON AIR</text>
        ${[110, 970].map((x) => `<rect x="${x - 70}" y="560" width="140" height="300" rx="16" fill="#0f172a" stroke="#475569" stroke-width="6"/><circle cx="${x}" cy="640" r="40" fill="#334155"/><circle cx="${x}" cy="770" r="58" fill="#334155"/><circle cx="${x}" cy="770" r="20" fill="#64748b"/>`).join('')}
        <path d="M230 930 L850 930 L900 1040 L180 1040 Z" fill="#334155" stroke="#0f172a" stroke-width="6"/>
        ${[...Array(16)].map((_, k) => `<rect x="${250 + k * 36}" y="950" width="10" height="56" rx="4" fill="#0f172a"/><rect id="${id}-led${k}" x="${247 + k * 36}" y="${960 + (k * 7) % 30}" width="16" height="12" rx="3" fill="${k % 3 ? '#22c55e' : '#f59e0b'}"/>`).join('')}
        <g><line x1="540" y1="470" x2="540" y2="740" stroke="#94a3b8" stroke-width="10"/><rect x="505" y="470" width="70" height="120" rx="35" fill="#cbd5e1" stroke="#475569" stroke-width="6"/>${[0, 1, 2].map((k) => `<line x1="515" y1="${500 + k * 26}" x2="565" y2="${500 + k * 26}" stroke="#64748b" stroke-width="4"/>`).join('')}</g>
        ${san(id, '#3f2a1d', '#1c1410', '#78350f', '#c4b5fd')}`,
      tw: (t0, d) => [
        nhapNhay(`#${id}-onair`, t0, d, 0.7, 0.35),
        `tl.to("[id^='${id}-led']", { scaleY: 0.4, svgOrigin: "540 1000", duration: 0.25, yoyo: true, repeat: ${lap(d, 0.25)}, ease: "none", stagger: { each: 0.05 } }, ${f(t0)});`,
      ],
    }),

    // Phim trường: rèm nhung, đèn chiếu trên giá rọi tia sáng, máy quay trên chân, bảng clapper, ghế đạo diễn
    phim_truong: (id) => ({
      svg: `
        <defs><linearGradient id="${id}-tia" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef9c3" stop-opacity="0.55"/><stop offset="1" stop-color="#fef9c3" stop-opacity="0"/></linearGradient></defs>
        <rect width="1080" height="1180" fill="#450a0a"/>
        ${[...Array(12)].map((_, k) => `<path d="M${k * 90} 200 q45 500 0 980 h90 q-45 -480 0 -980 Z" fill="${k % 2 ? '#7f1d1d' : '#991b1b'}"/>`).join('')}
        <rect x="0" y="180" width="1080" height="60" fill="#b45309"/>
        ${[[120, 1], [960, -1]].map(([x, h]) => `<line x1="${x}" y1="560" x2="${x - 50}" y2="1100" stroke="#1f2937" stroke-width="8"/><line x1="${x}" y1="560" x2="${x + 50}" y2="1100" stroke="#1f2937" stroke-width="8"/><rect x="${x - 50}" y="480" width="100" height="90" rx="12" fill="#1f2937" transform="rotate(${h * 20} ${x} 525)"/><polygon id="${id}-tia${h > 0 ? 0 : 1}" points="${x + h * 40},500 ${x + h * 460},860 ${x + h * 300},1100" fill="url(#${id}-tia)"/>`).join('')}
        <g><rect x="700" y="700" width="170" height="110" rx="14" fill="#111827" stroke="#4b5563" stroke-width="6"/><circle cx="700" cy="755" r="36" fill="#374151" stroke="#9ca3af" stroke-width="6"/><circle cx="760" cy="684" r="34" fill="#1f2937" stroke="#4b5563" stroke-width="5"/><circle cx="830" cy="684" r="34" fill="#1f2937" stroke="#4b5563" stroke-width="5"/>
          <line x1="785" y1="810" x2="740" y2="1080" stroke="#1f2937" stroke-width="8"/><line x1="785" y1="810" x2="830" y2="1080" stroke="#1f2937" stroke-width="8"/></g>
        <g transform="translate(250 880)"><rect x="0" y="40" width="150" height="100" fill="#111827"/><g id="${id}-clap"><rect x="0" y="0" width="150" height="36" fill="#f8fafc"/>${[0, 1, 2, 3].map((k) => `<path d="M${k * 40} 0 l20 0 l20 36 l-20 0 Z" fill="#111827"/>`).join('')}</g><path d="M14 80 h120 M14 110 h80" stroke="#f8fafc" stroke-width="6"/></g>
        <g><rect x="440" y="960" width="120" height="16" fill="#78350f"/><rect x="440" y="880" width="120" height="70" fill="#1f2937"/><line x1="450" y1="976" x2="550" y2="1090" stroke="#78350f" stroke-width="8"/><line x1="550" y1="976" x2="450" y2="1090" stroke="#78350f" stroke-width="8"/></g>
        ${san(id, '#292524', '#0c0a09', '#b45309', '#fef9c3')}`,
      tw: (t0, d) => [
        nhapNhay(`#${id}-tia0`, t0, d, 1.4, 0.55),
        nhapNhay(`#${id}-tia1`, t0 + 0.4, d, 1.6, 0.55),
        `tl.fromTo("#${id}-clap", { rotation: -18 }, { rotation: 0, svgOrigin: "0 36", duration: 0.25, repeat: ${lap(d, 2.2)}, repeatDelay: 1.95, ease: "power2.in" }, ${f(t0 + 0.6)});`,
      ],
    }),
  }
}
