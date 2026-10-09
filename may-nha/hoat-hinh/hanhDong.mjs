// Cảnh hành động dựng sẵn (AI chọn hanh_dong cho câu): lớp chuyển động lớn sau lưng nhân vật, trước bối cảnh — đoàn kỵ
// binh phi ngựa, hai đạo quân xông trận, đám đông reo hò, tên lửa phóng, pháo hoa; riêng "lịch lật" là thẻ ở khung
// hình (thời gian trôi). Toạ độ khung hình (RONG x CAO). Mọi chuyển động lặp hữu hạn, vị trí theo công thức.
// HANH_DONG[ten](id, t0, d, { RONG, CAO, f, lap }) → { html, tw: [], khung?: true (nằm ở lớp khung hình) }

const ngua = (x, y, s, mau) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="62" ry="26" fill="${mau}"/><path d="M44 -8 L82 -58 L102 -50 L70 2 Z" fill="${mau}"/>` +
  `<path d="M-40 14 L-56 62 M-20 18 L-14 66 M26 18 L40 64 M44 12 L60 58" stroke="${mau}" stroke-width="9" stroke-linecap="round"/>` +
  `<path d="M-58 -6 q-30 6 -26 40" fill="none" stroke="${mau}" stroke-width="9" stroke-linecap="round"/>` +
  `<rect x="-12" y="-74" width="22" height="50" rx="10" fill="${mau}"/><circle cx="0" cy="-86" r="15" fill="${mau}"/><path d="M14 -70 L70 -120" stroke="${mau}" stroke-width="5"/></g>`
const linh = (x, y, s, mau, co) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-16" y="-70" width="32" height="70" rx="12" fill="${mau}"/><circle cx="0" cy="-86" r="16" fill="${mau}"/>` +
  `<path d="M18 -60 L40 -150" stroke="${mau}" stroke-width="5"/><path d="M-10 0 L-16 40 M10 0 L16 40" stroke="${mau}" stroke-width="10" stroke-linecap="round"/>` +
  (co ? `<path d="M40 -150 l46 10 l-46 16 Z" fill="${co}"/>` : '') + '</g>'
const bui = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#d6c7a8"/>`

export const HANH_DONG = {
  // Đoàn kỵ binh phi ngựa băng ngang phía sau, bụi tung mù mịt
  ky_binh: (id, t0, d, { RONG, CAO, f, lap }) => {
    const y = CAO * 0.62
    const tw = [
      `tl.fromTo("#${id}-doan", { x: -150 }, { x: ${RONG + 1950}, duration: ${f(Math.max(3.5, Math.min(d, 7)))}, ease: "none", immediateRender: false }, ${f(t0)});`,
      `tl.to("#${id}-doan", { y: -10, duration: 0.18, yoyo: true, repeat: ${lap(d, 0.18) | 1}, ease: "sine.inOut" }, ${f(t0)});`,
      `tl.fromTo("#${id}-bui", { opacity: 0.2, scale: 0.8 }, { opacity: 0.7, scale: 1.15, transformOrigin: "50% 50%", duration: 0.6, yoyo: true, repeat: ${lap(d, 0.6) | 1} }, ${f(t0)});`,
    ]
    const doan = [...Array(9)].map((_, k) => ngua(-k * 190 - (k % 2) * 60, y - (k % 3) * 34, 0.85 - (k % 3) * 0.12, k % 3 ? '#44403c' : '#292524')).join('')
    return {
      html: `<svg viewBox="0 0 ${RONG} ${CAO}" width="${RONG}" height="${CAO}"><g id="${id}-bui" opacity="0.4">${[...Array(10)].map((_, k) => bui(k * RONG / 9, y + 70, 60 + (k % 3) * 20)).join('')}</g><g id="${id}-doan">${doan}</g></svg>`,
      tw,
    }
  },
  // Hai đạo quân xông vào nhau từ hai phía, cờ đỏ / cờ xanh, bụi bùng lên ở giữa
  xung_tran: (id, t0, d, { RONG, CAO, f, lap }) => {
    const y = CAO * 0.66
    const ben = (huong, mau, co) =>
      [...Array(10)].map((_, k) => linh(huong < 0 ? -k * 70 : RONG + k * 70, y - (k % 3) * 26, 0.75 - (k % 3) * 0.1, mau, k % 3 === 0 ? co : null)).join('')
    const tw = [
      `tl.fromTo("#${id}-trai", { x: 0 }, { x: ${RONG * 0.52}, duration: ${f(Math.min(2.2, d * 0.6))}, ease: "power1.in", immediateRender: false }, ${f(t0)});`,
      `tl.fromTo("#${id}-phai", { x: 0 }, { x: ${-RONG * 0.52}, duration: ${f(Math.min(2.2, d * 0.6))}, ease: "power1.in", immediateRender: false }, ${f(t0)});`,
      `tl.to(["#${id}-trai", "#${id}-phai"], { y: -8, duration: 0.15, yoyo: true, repeat: ${lap(d, 0.15) | 1}, ease: "sine.inOut" }, ${f(t0)});`,
      `tl.fromTo("#${id}-no", { opacity: 0, scale: 0.3 }, { opacity: 0.85, scale: 1.3, transformOrigin: "50% 50%", duration: 0.5, ease: "power2.out", immediateRender: false }, ${f(t0 + Math.min(2.2, d * 0.6) - 0.2)});`,
      `tl.to("#${id}-no", { opacity: 0.5, scale: 1.45, duration: ${f(Math.max(0.5, d * 0.4))}, ease: "sine.out" }, ${f(t0 + Math.min(2.2, d * 0.6) + 0.3)});`,
    ]
    return {
      html: `<svg viewBox="0 0 ${RONG} ${CAO}" width="${RONG}" height="${CAO}"><g id="${id}-trai">${ben(-1, '#7f1d1d', '#dc2626')}</g><g id="${id}-phai">${ben(1, '#1e3a8a', '#2563eb')}</g><g id="${id}-no" opacity="0">${[...Array(7)].map((_, k) => bui(RONG / 2 + Math.cos(k) * 120, y - 40 + Math.sin(k * 2) * 60, 70 + (k % 3) * 25)).join('')}</g></svg>`,
      tw,
    }
  },
  // Đám đông reo hò: ba hàng bóng người phía trước bối cảnh, giơ tay, nhún nhảy so le
  dam_dong: (id, t0, d, { RONG, CAO, f, lap }) => {
    const hang = [0, 1, 2]
    const nguoi = hang
      .map((h) =>
        [...Array(16)]
          .map((_, k) => {
            const x = (k + (h % 2) * 0.5) * (RONG / 15)
            const y = CAO * (0.78 + h * 0.06)
            const mau = ['#1e293b', '#334155', '#0f172a'][h]
            return `<g id="${id}-n${h}-${k}"><circle cx="${x}" cy="${y - 60}" r="26" fill="${mau}"/><rect x="${x - 34}" y="${y - 34}" width="68" height="120" rx="26" fill="${mau}"/>${k % 3 === 0 ? `<path d="M${x + 24} ${y - 24} L${x + 50} ${y - 96}" stroke="${mau}" stroke-width="14" stroke-linecap="round"/>` : ''}</g>`
          })
          .join(''),
      )
      .join('')
    const tw = hang.flatMap((h) =>
      [...Array(16)].map((_, k) => `tl.to("#${id}-n${h}-${k}", { y: -18, duration: ${f(0.28 + ((k + h) % 4) * 0.05)}, yoyo: true, repeat: ${lap(d, 0.28) | 1}, ease: "sine.inOut" }, ${f(t0 + ((k * 7 + h * 3) % 10) * 0.04)});`),
    )
    return { html: `<svg viewBox="0 0 ${RONG} ${CAO}" width="${RONG}" height="${CAO}">${nguoi}</svg>`, tw }
  },
  // Tên lửa phóng vút lên trời, vệt khói trắng
  ten_lua: (id, t0, d, { RONG, CAO, f }) => {
    const x = RONG * 0.72
    const tw = [
      `tl.fromTo("#${id}-tl", { y: ${CAO * 0.55} }, { y: ${-CAO * 1.1}, duration: ${f(Math.min(3.2, Math.max(2.2, d)))}, ease: "power1.in", immediateRender: false }, ${f(t0)});`,
      `tl.fromTo("#${id}-khoi", { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 100%", duration: ${f(Math.min(3.2, Math.max(2.2, d)))}, ease: "power1.in", immediateRender: false }, ${f(t0)});`,
    ]
    return {
      html: `<svg viewBox="0 0 ${RONG} ${CAO}" width="${RONG}" height="${CAO}"><rect id="${id}-khoi" x="${x - 26}" y="0" width="52" height="${CAO}" rx="26" fill="#f8fafc" opacity="0.7"/><g id="${id}-tl"><path d="M${x} ${CAO * 0.25} q30 40 30 80 l0 140 l-60 0 l0 -140 q0 -40 30 -80 Z" fill="#f8fafc" stroke="#334155" stroke-width="6"/><path d="M${x - 30} ${CAO * 0.25 + 200} l-26 50 l26 -10 Z M${x + 30} ${CAO * 0.25 + 200} l26 50 l-26 -10 Z" fill="#dc2626"/><path d="M${x - 20} ${CAO * 0.25 + 222} q20 90 40 0 Z" fill="#f97316"/></g></svg>`,
      tw,
    }
  },
  // Pháo hoa nổ trên trời (ăn mừng, chiến thắng, lên ngôi)
  phao_hoa: (id, t0, d, { RONG, CAO, f, lap }) => {
    const cum = [...Array(5)].map((_, k) => ({ x: RONG * (0.15 + k * 0.18), y: CAO * (0.3 + (k % 2) * 0.12), mau: ['#facc15', '#f472b6', '#38bdf8', '#4ade80', '#fb923c'][k] }))
    const html = cum
      .map((c, k) => `<g id="${id}-p${k}" opacity="0">${[...Array(12)].map((_, j) => `<line x1="${c.x}" y1="${c.y}" x2="${c.x + Math.cos((j / 12) * Math.PI * 2) * 110}" y2="${c.y + Math.sin((j / 12) * Math.PI * 2) * 110}" stroke="${c.mau}" stroke-width="7" stroke-linecap="round"/>`).join('')}</g>`)
      .join('')
    const tw = cum.map((c, k) => `tl.fromTo("#${id}-p${k}", { opacity: 0, scale: 0.1 }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.5, ease: "power2.out", repeat: ${lap(d - k * 0.35, 1.4)}, repeatDelay: 0.9, immediateRender: false }, ${f(t0 + k * 0.35)});`)
    return { html: `<svg viewBox="0 0 ${RONG} ${CAO}" width="${RONG}" height="${CAO}">${html}</svg>`, tw }
  },
  // Lịch lật: thời gian trôi qua (nhiều năm sau…) — thẻ lịch ở khung hình, tờ lịch lật liên tục
  lich_lat: (id, t0, d, { f, lap }) => ({
    khung: true,
    html: `<div class="lich"><div class="lich-dau"></div><div id="${id}-to" class="lich-to"><span>⏳</span></div></div>`,
    tw: [
      `tl.fromTo("#${id}-to", { rotationX: 0 }, { rotationX: -90, transformOrigin: "50% 0%", duration: 0.3, repeat: ${lap(Math.min(d, 3), 0.45)}, repeatDelay: 0.15, ease: "power1.in", immediateRender: false }, ${f(t0 + 0.3)});`,
    ],
  }),
}
