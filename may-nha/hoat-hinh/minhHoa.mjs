// Minh hoạ chèn theo từng chi tiết: đúng lúc giọng đọc tới một chi tiết (con số, địa điểm, lời trích, sự vật, so sánh),
// một khung minh hoạ bật lên ~2 giây phủ lên cảnh rồi trả lại cảnh, để video luôn có hình mới mỗi 2–3 giây.
// Mỗi kiểu trả { html, tw(t0, d) } với `id` duy nhất. Tên kiểu phải khớp lib/ai.ts (MINH_HOA).
// Thêm kiểu mới: viết thêm một hàm ở đây + thêm tên vào MINH_HOA trong lib/ai.ts (mô tả cho AI khi nào dùng).
const f = (x) => (Math.round(x * 1000) / 1000).toString()
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Vào / ra chung: nền tối mờ hiện lên, khung chính bật vào, cuối thì thu nhỏ biến mất
const vaoRa = (id, t0, d) => [
  `tl.fromTo("#${id}", { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "power1.out" }, ${f(t0)});`,
  `tl.fromTo("#${id} .mh-khung", { scale: 0.6, y: 60 }, { scale: 1, y: 0, duration: 0.42, ease: "back.out(1.9)" }, ${f(t0)});`,
  `tl.to("#${id} .mh-khung", { scale: 1.04, duration: Math.max(0.3, ${f(d - 0.75)}), ease: "sine.inOut" }, ${f(t0 + 0.42)});`,
  `tl.to("#${id}", { opacity: 0, duration: 0.25, ease: "power1.in" }, ${f(t0 + d - 0.25)});`,
]

export const MINH_HOA = {
  // Con số lớn: "30 tuổi", "1 tỷ USD", "tăng 200%"
  so_lieu: (id, m) => ({
    html: `<div class="mh-khung mh-so"><div class="mh-vong" id="${id}-vong"></div><div class="mh-so-lon${String(m.chu_chinh ?? '').length > 6 ? ' dai' : ''}">${esc(m.chu_chinh)}</div><div class="mh-phu">${esc(m.chu_phu)}</div></div>`,
    tw: (t0, d) => [
      ...vaoRa(id, t0, d),
      `tl.fromTo("#${id}-vong", { scale: 0.4, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.9, ease: "power2.out" }, ${f(t0 + 0.15)});`,
      `tl.fromTo("#${id} .mh-so-lon", { rotation: -6 }, { rotation: 0, duration: 0.5, ease: "back.out(3)" }, ${f(t0 + 0.1)});`,
    ],
  }),
  // Địa điểm: ghim rơi xuống bản đồ, sóng lan ra, tên nơi chốn
  dia_diem: (id, m) => ({
    html: `<div class="mh-khung mh-ban-do"><svg viewBox="0 0 800 520" width="800" height="520"><rect width="800" height="520" rx="40" fill="#0c4a6e"/>
      <path d="M90 140 Q170 70 260 120 Q330 160 300 240 Q250 320 160 300 Q80 270 90 140 Z M430 90 Q560 50 640 120 Q700 200 640 280 Q560 340 470 300 Q400 240 430 90 Z M300 360 Q380 330 450 380 Q480 440 400 470 Q320 480 300 360 Z" fill="#38bdf8" opacity="0.55"/>
      ${[...Array(9)].map((_, k) => `<line x1="${k * 100}" y1="0" x2="${k * 100}" y2="520" stroke="#7dd3fc" stroke-opacity="0.12" stroke-width="2"/>`).join('')}
      <circle id="${id}-song" cx="400" cy="300" r="40" fill="none" stroke="#f43f5e" stroke-width="8"/>
      <g id="${id}-ghim"><path d="M400 300 C370 250 350 225 350 195 A50 50 0 1 1 450 195 C450 225 430 250 400 300 Z" fill="#f43f5e" stroke="#fff" stroke-width="6"/><circle cx="400" cy="195" r="18" fill="#fff"/></g></svg>
      <div class="mh-ten-noi">📍 ${esc(m.chu_chinh)}</div><div class="mh-phu">${esc(m.chu_phu)}</div></div>`,
    tw: (t0, d) => [
      ...vaoRa(id, t0, d),
      `tl.fromTo("#${id}-ghim", { y: -260, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "bounce.out" }, ${f(t0 + 0.2)});`,
      `gsap.set("#${id}-song", { svgOrigin: "400 300" });`,
      `tl.fromTo("#${id}-song", { scale: 0.3, opacity: 1 }, { scale: 3, opacity: 0, duration: 0.9, ease: "power2.out", repeat: 1 }, ${f(t0 + 0.65)});`,
    ],
  }),
  // Lời trích: khung lời nói lớn, dấu ngoặc kép, tên người nói
  trich_dan: (id, m) => ({
    html: `<div class="mh-khung mh-trich"><div class="mh-ngoac">“</div><div class="mh-loi">${esc(m.chu_chinh)}</div><div class="mh-phu">— ${esc(m.chu_phu)}</div></div>`,
    tw: (t0, d) => [...vaoRa(id, t0, d), `tl.fromTo("#${id} .mh-ngoac", { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(2.5)" }, ${f(t0 + 0.15)});`],
  }),
  // Biểu tượng: emoji khổng lồ, tia sáng xoay phía sau, nhãn bên dưới
  bieu_tuong: (id, m) => ({
    html: `<div class="mh-khung mh-bt"><div class="mh-tia" id="${id}-tia"></div><div class="mh-emoji">${esc(m.bieu_tuong)}</div><div class="mh-nhan">${esc(m.chu_chinh)}</div><div class="mh-phu">${esc(m.chu_phu)}</div></div>`,
    tw: (t0, d) => [
      ...vaoRa(id, t0, d),
      `tl.fromTo("#${id}-tia", { rotation: 0 }, { rotation: 90, duration: ${f(d)}, ease: "none" }, ${f(t0)});`,
      `tl.fromTo("#${id} .mh-emoji", { scale: 0, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2.6)" }, ${f(t0 + 0.1)});`,
    ],
  }),
  // So sánh: hai cột A đấu B, chữ VS ở giữa
  so_sanh: (id, m) => {
    const [a = '', b = ''] = String(m.chu_chinh ?? '').split(/\s*\|\s*/)
    const [pa = '', pb = ''] = String(m.chu_phu ?? '').split(/\s*\|\s*/)
    return {
      html: `<div class="mh-khung mh-ss"><div class="mh-cot a" id="${id}-a"><div class="mh-cot-ten">${esc(a)}</div><div class="mh-cot-phu">${esc(pa)}</div></div><div class="mh-vs" id="${id}-vs">VS</div><div class="mh-cot b" id="${id}-b"><div class="mh-cot-ten">${esc(b)}</div><div class="mh-cot-phu">${esc(pb)}</div></div></div>`,
      tw: (t0, d) => [
        ...vaoRa(id, t0, d),
        `tl.fromTo("#${id}-a", { x: -300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, ${f(t0 + 0.1)});`,
        `tl.fromTo("#${id}-b", { x: 300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, ${f(t0 + 0.2)});`,
        `tl.fromTo("#${id}-vs", { scale: 3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "power4.in" }, ${f(t0 + 0.45)});`,
      ],
    }
  },
}

// Câu giật tít mở đầu (2 giây đầu, cũng là ảnh bìa TikTok): chữ lớn, từng chữ bật lên, rung nhẹ
// giay: lúc tắt; tu: lúc bắt đầu hiện (sau thẻ chương thì > 0)
export function mocMoDau(moc, giay, tu = 0) {
  if (!moc?.chu) return { html: '', tw: [] }
  const tuNgu = String(moc.chu).split(/\s+/).filter(Boolean)
  return {
    html: `<div id="moc" class="moc"><div class="moc-bt">${esc(moc.bieu_tuong ?? '🔥')}</div><div class="moc-chu">${tuNgu.map((w, k) => `<span id="moc-${k}" class="moc-tu">${esc(w)}</span>`).join(' ')}</div></div>`,
    tw: [
      `tl.set("#moc", { opacity: 1 }, ${f(tu)});`,
      `tl.fromTo("#moc .moc-bt", { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.5)" }, ${f(tu)});`,
      ...tuNgu.map((_, k) => `tl.fromTo("#moc-${k}", { y: 70, scale: 0.5, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.2)" }, ${f(tu + 0.05 + k * 0.08)});`),
      `tl.to("#moc .moc-chu", { x: 7, duration: 0.05, yoyo: true, repeat: 5 }, ${f(tu + 0.15 + tuNgu.length * 0.08)});`,
      `tl.to("#moc", { opacity: 0, scale: 1.15, duration: 0.3, ease: "power2.in" }, ${f(giay - 0.3)});`,
    ],
  }
}

export const CSS_MINH_HOA = `
      /* Thẻ minh hoạ nhỏ trên đầu người nói (đuôi nhọn chỉ xuống như bong bóng thoại), không phủ tối, không che nhân vật */
      .mh { position: absolute; width: 480px; height: 330px; display: flex; align-items: flex-end; justify-content: center; opacity: 0; }
      .mh-khung { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; max-width: 480px; padding: 18px 26px 20px; border-radius: 30px; background: #0f172aeb; border: 4px solid #facc15; box-shadow: 0 18px 40px #0009; box-sizing: border-box; transform-origin: 50% 100%; }
      .mh-khung::after { content: ''; position: absolute; left: 50%; bottom: -22px; margin-left: -18px; border: 18px solid transparent; border-top-color: #facc15; border-bottom: 0; }
      .mh-phu { font-size: 28px; font-weight: 500; color: #cbd5e1; line-height: 1.2; }
      .mh-so { position: relative; }
      .mh-vong { position: absolute; left: 50%; top: 50%; width: 260px; height: 260px; margin: -150px 0 0 -130px; border-radius: 50%; border: 8px solid #facc15; }
      .mh-so-lon.dai { font-size: 58px; white-space: nowrap; }
      .mh-so-lon { display: block; font-size: 104px; font-weight: 700; line-height: 1; color: #facc15; text-shadow: 0 0 24px #facc1599, 0 6px 0 #a16207; }
      .mh-ban-do svg { display: block; width: 360px; height: 234px; border-radius: 20px; }
      .mh-ten-noi { font-size: 42px; font-weight: 700; color: #fff; }
      .mh-trich { background: #f8fafc; color: #0f172a; border-color: #f43f5e; padding-top: 30px; }
      .mh-trich::after { border-top-color: #f43f5e; }
      .mh-trich .mh-phu { color: #475569; }
      .mh-ngoac { position: absolute; left: 14px; top: -38px; font-size: 110px; line-height: 1; color: #f43f5e; font-family: Georgia, serif; }
      .mh-loi { font-size: 36px; font-weight: 700; line-height: 1.22; }
      .mh-bt { position: relative; overflow: hidden; }
      .mh-tia { position: absolute; left: 50%; top: 80px; width: 460px; height: 460px; margin: -230px 0 0 -230px; background: repeating-conic-gradient(#facc1530 0deg 12deg, transparent 12deg 30deg); border-radius: 50%; }
      .mh-emoji { position: relative; display: block; font-size: 120px; line-height: 1; font-family: "Emoji", sans-serif; filter: drop-shadow(0 10px 18px #000a); }
      .mh-nhan { position: relative; font-size: 42px; font-weight: 700; color: #fff; }
      .mh-ss { flex-direction: row; align-items: stretch; gap: 10px; padding: 14px; }
      .mh-cot { display: flex; flex-direction: column; justify-content: center; gap: 6px; width: 180px; min-height: 180px; padding: 14px 10px; border-radius: 22px; box-sizing: border-box; }
      .mh-cot.a { background: linear-gradient(160deg, #2563eb, #1e3a8a); }
      .mh-cot.b { background: linear-gradient(160deg, #e11d48, #881337); }
      .mh-cot-ten { font-size: 32px; font-weight: 700; line-height: 1.15; }
      .mh-cot-phu { font-size: 22px; font-weight: 500; color: #e2e8f0; }
      .mh-vs { display: flex; align-items: center; font-size: 44px; font-weight: 700; color: #facc15; text-shadow: 0 4px 0 #000; }
      /* Câu giật tít: dải chữ lớn ở vùng trên cùng, không phủ tối nhân vật */
      .moc { position: absolute; left: 0; right: 0; top: 210px; height: 420px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 0 50px; box-sizing: border-box; opacity: 0; }
      .moc-bt { display: block; font-size: 110px; line-height: 1; font-family: "Emoji", sans-serif; }
      .moc-chu { font-size: 84px; font-weight: 700; line-height: 1.1; text-align: center; text-transform: uppercase; }
      .moc-tu { display: inline-block; color: #fff; text-shadow: 0 0 8px #000, 0 0 2px #000, 0 7px 0 #e11d48; }
`