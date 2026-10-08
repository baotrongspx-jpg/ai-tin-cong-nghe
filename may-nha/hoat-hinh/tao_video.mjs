// Video hoạt hình hai nhân vật đối đáp (Mèo Mun hỏi, Robot Bit giải thích) cho HyperFrames, dọc 1080x1920.
// Vào (trong thư mục làm việc): artifacts/loi_thoai.json (lời thoại + cảm xúc + bối cảnh + bảng tin),
// artifacts/do_dai.json, hyperframes/assets/loi-<i>.wav. Miệng nhép theo độ to thật của giọng.
// Chạy: node tao_video.mjs <thư mục làm việc> → <thư mục>/hyperframes/index.html (thợ đọc giọng gọi, may-nha/tho_doc.py)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { BOI_CANH } from './boiCanh.mjs'
import { NHAN_VAT_PHU } from './nhanVatPhu.mjs'
import { CSS_MINH_HOA, MINH_HOA, mocMoDau } from './minhHoa.mjs'

const GOC = resolve(process.argv[2] ?? '.')
const { nhan_vat, loi, moc, kenh = 'Công Nghệ 24H', chu_de = 'AI', kho = 'doc' } = JSON.parse(readFileSync(join(GOC, 'artifacts/loi_thoai.json'), 'utf8'))
const doDai = JSON.parse(readFileSync(join(GOC, 'artifacts/do_dai.json'), 'utf8'))
// kho "ngang" (YouTube 1920x1080): "thế giới" (nền, nhân vật, đạo cụ) vẫn vẽ theo toạ độ dọc 1080x1920, chỉ đặt lệch
// để khung hình thấy vùng x -420..1500, y 300..1380; nền nối dài hai bên bằng bản soi gương; hai nhân vật đứng giãn ra.
// Các lớp phủ (tên kênh, bảng tin, phụ đề, câu giật tít) đặt theo toạ độ khung hình.
const NGANG = kho === 'ngang'
const RONG = NGANG ? 1920 : 1080
const CAO = NGANG ? 1080 : 1920
const LECH_X = NGANG ? 420 : 0
const LECH_Y = NGANG ? -300 : 0
const GIUA_X = RONG / 2 - LECH_X // điểm của thế giới nằm giữa khung hình (máy quay xoay / phóng quanh đây)
const GIUA_Y = CAO / 2 - LECH_Y
const GIAN = NGANG ? 150 : 0 // mỗi nhân vật chính dạt ra thêm
const TRUOT = NGANG ? 2580 : 1080 // quãng trượt khi đổi cảnh (nền ngang rộng hơn khung vì có bản soi gương)
const MAX_DONG = NGANG ? 44 : 28 // ký tự mỗi dòng phụ đề
const PHU_XUONG = NGANG ? 160 : 0 // khung ngang thấp: nhân vật phụ đứng thấp hơn (chân chạm sàn), không đè bảng tin
const DUOI = 0.8
const f = (x) => (Math.round(x * 1000) / 1000).toString()
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const lap = (giay, chuKy) => Math.max(0, Math.floor(giay / chuKy) - 1)

// Độ to của giọng theo từng khung 1/15 giây (WAV PCM 16-bit), chuẩn hóa 0..1
function doTo(file) {
  const b = readFileSync(file)
  let i = 12, du = null, kenhAm = 1, tanSo = 48000
  while (i + 8 <= b.length) {
    const ten = b.toString('ascii', i, i + 4), co = b.readUInt32LE(i + 4)
    if (ten === 'fmt ') { kenhAm = b.readUInt16LE(i + 10); tanSo = b.readUInt32LE(i + 12) }
    if (ten === 'data') { du = b.subarray(i + 8, i + 8 + co); break }
    i += 8 + co + (co % 2)
  }
  const buoc = Math.round(tanSo / 15) * kenhAm * 2
  const ds = []
  for (let k = 0; k + buoc <= du.length; k += buoc) {
    let tong = 0
    for (let j = k; j < k + buoc; j += 2 * kenhAm) tong += (du.readInt16LE(j) / 32768) ** 2
    ds.push(Math.sqrt(tong / (buoc / 2 / kenhAm)))
  }
  const max = Math.max(...ds, 1e-6)
  return ds.map((x) => x / max)
}

const batDau = []
let t = 0.4 // nhịp mở đầu trước câu đầu tiên
for (const [i, d] of doDai.entries()) {
  // Khoảng lặng có chủ đích (AI đặt lang) trước câu quan trọng: im 0,9 giây, chỉ còn âm nền
  if (i && loi[i]?.lang) t += 0.9
  batDau.push(t)
  t += d
}
const TONG = t + DUOI
const tw = []

// ── Nhân vật (SVG vẽ tay, mỗi bộ phận một nhóm có điểm xoay) ─────────────
// Toạ độ nội bộ 0..600 (rộng) x 0..700 (cao), chân chạm y=680
const meoSvg = `
<svg id="meo" class="nv" viewBox="0 0 600 700" width="620" height="723">
  <g id="meo-than-tat">
    <path id="meo-duoi" d="M380 560 C520 560 560 440 520 360 C505 330 470 340 480 370 C505 440 470 520 380 520 Z" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
    <ellipse cx="300" cy="676" rx="170" ry="18" fill="#00000055"/>
    <g id="meo-than">
      <path d="M190 660 C170 520 200 420 300 420 C400 420 430 520 410 660 Z" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
      <path d="M240 650 C230 560 250 480 300 480 C350 480 370 560 360 650 Z" fill="#fde7c3"/>
      <rect x="215" y="640" width="70" height="40" rx="20" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
      <rect x="315" y="640" width="70" height="40" rx="20" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
      <path d="M215 455 Q300 495 385 455" fill="none" stroke="#0ea5e9" stroke-width="22" stroke-linecap="round"/>
    </g>
    <g id="meo-tay-trai"><rect x="160" y="450" width="60" height="150" rx="30" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/></g>
    <g id="meo-tay-phai"><rect x="380" y="450" width="60" height="150" rx="30" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/></g>
    <g id="meo-dau">
      <path id="meo-tai-trai" d="M150 250 L170 90 L265 175 Z" fill="#f59e0b" stroke="#7c2d12" stroke-width="8" stroke-linejoin="round"/>
      <path d="M175 220 L183 130 L237 180 Z" fill="#fda4af"/>
      <path id="meo-tai-phai" d="M450 250 L430 90 L335 175 Z" fill="#f59e0b" stroke="#7c2d12" stroke-width="8" stroke-linejoin="round"/>
      <path d="M425 220 L417 130 L363 180 Z" fill="#fda4af"/>
      <ellipse cx="300" cy="280" rx="175" ry="150" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
      <path d="M250 165 L262 205 M300 155 L300 200 M350 165 L338 205" stroke="#b45309" stroke-width="10" stroke-linecap="round"/>
      <ellipse cx="300" cy="335" rx="95" ry="70" fill="#fde7c3"/>
      <g id="meo-mat-trai"><ellipse cx="235" cy="265" rx="42" ry="50" fill="#fff" stroke="#7c2d12" stroke-width="6"/><g id="meo-con-ngoi-trai"><circle cx="240" cy="270" r="24" fill="#1e293b"/><circle cx="248" cy="260" r="8" fill="#fff"/></g></g>
      <g id="meo-mat-phai"><ellipse cx="365" cy="265" rx="42" ry="50" fill="#fff" stroke="#7c2d12" stroke-width="6"/><g id="meo-con-ngoi-phai"><circle cx="360" cy="270" r="24" fill="#1e293b"/><circle cx="368" cy="260" r="8" fill="#fff"/></g></g>
      <path d="M288 318 L312 318 L300 332 Z" fill="#f472b6"/>
      <g id="meo-mieng-dong"><path d="M272 345 Q286 360 300 345 Q314 360 328 345" fill="none" stroke="#7c2d12" stroke-width="6" stroke-linecap="round"/></g>
      <g id="meo-mieng-mo"><ellipse cx="300" cy="358" rx="26" ry="24" fill="#7f1d1d"/><ellipse cx="300" cy="370" rx="16" ry="9" fill="#fb7185"/></g>
      <path d="M200 330 L120 315 M200 345 L118 350 M400 330 L480 315 M400 345 L482 350" stroke="#7c2d12" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="200" cy="320" rx="22" ry="12" fill="#fb718566"/><ellipse cx="400" cy="320" rx="22" ry="12" fill="#fb718566"/>
    </g>
  </g>
</svg>`

const robotSvg = `
<svg id="robot" class="nv" viewBox="0 0 600 700" width="620" height="723">
  <g id="robot-than-tat">
    <ellipse cx="300" cy="676" rx="170" ry="18" fill="#00000055"/>
    <rect x="225" y="600" width="55" height="70" rx="12" fill="#94a3b8" stroke="#1e3a5f" stroke-width="8"/>
    <rect x="320" y="600" width="55" height="70" rx="12" fill="#94a3b8" stroke="#1e3a5f" stroke-width="8"/>
    <g id="robot-than">
      <rect x="175" y="400" width="250" height="220" rx="50" fill="#e0f2fe" stroke="#1e3a5f" stroke-width="8"/>
      <rect x="225" y="450" width="150" height="100" rx="20" fill="#0f172a"/>
      <g id="robot-tim"><path d="M300 525 C260 495 270 470 290 475 C296 477 300 482 300 487 C300 482 304 477 310 475 C330 470 340 495 300 525 Z" fill="#22d3ee"/></g>
    </g>
    <g id="robot-tay-trai"><rect x="115" y="420" width="62" height="170" rx="31" fill="#bae6fd" stroke="#1e3a5f" stroke-width="8"/><circle cx="146" cy="600" r="34" fill="#94a3b8" stroke="#1e3a5f" stroke-width="8"/></g>
    <g id="robot-tay-phai"><rect x="423" y="420" width="62" height="170" rx="31" fill="#bae6fd" stroke="#1e3a5f" stroke-width="8"/><circle cx="454" cy="600" r="34" fill="#94a3b8" stroke="#1e3a5f" stroke-width="8"/></g>
    <g id="robot-dau">
      <line x1="300" y1="140" x2="300" y2="70" stroke="#1e3a5f" stroke-width="10"/>
      <circle id="robot-ang-ten" cx="300" cy="62" r="24" fill="#f43f5e" stroke="#1e3a5f" stroke-width="6"/>
      <rect x="130" y="130" width="340" height="280" rx="80" fill="#e0f2fe" stroke="#1e3a5f" stroke-width="8"/>
      <rect x="110" y="235" width="30" height="80" rx="12" fill="#94a3b8" stroke="#1e3a5f" stroke-width="6"/>
      <rect x="460" y="235" width="30" height="80" rx="12" fill="#94a3b8" stroke="#1e3a5f" stroke-width="6"/>
      <rect x="170" y="175" width="260" height="190" rx="55" fill="#0f172a"/>
      <g id="robot-mat-trai"><rect x="208" y="215" width="58" height="70" rx="26" fill="#22d3ee"/></g>
      <g id="robot-mat-phai"><rect x="334" y="215" width="58" height="70" rx="26" fill="#22d3ee"/></g>
      <g id="robot-mieng-dong"><path d="M265 322 Q300 342 335 322" fill="none" stroke="#22d3ee" stroke-width="10" stroke-linecap="round"/></g>
      <g id="robot-mieng-mo"><rect x="262" y="305" width="76" height="44" rx="22" fill="#22d3ee"/><rect x="276" y="315" width="48" height="24" rx="12" fill="#0e7490"/></g>
    </g>
  </g>
</svg>`

// Điểm xoay (toạ độ SVG) của từng bộ phận
const XOAY = {
  'meo-dau': '300 420', 'meo-tay-trai': '190 465', 'meo-tay-phai': '410 465', 'meo-duoi': '400 540',
  'meo-tai-trai': '200 220', 'meo-tai-phai': '400 220', 'meo-mat-trai': '235 265', 'meo-mat-phai': '365 265',
  'meo-than-tat': '300 680', 'meo-mieng-mo': '300 350',
  'robot-dau': '300 410', 'robot-tay-trai': '146 430', 'robot-tay-phai': '454 430', 'robot-than-tat': '300 680',
  'robot-mat-trai': '237 250', 'robot-mat-phai': '363 250', 'robot-mieng-mo': '300 327', 'robot-tim': '300 500',
}
for (const [id, o] of Object.entries(XOAY)) tw.push(`gsap.set("#${id}", { svgOrigin: "${o}" });`)

// ── Chuyển động nền: thở, chớp mắt, đuôi, ăng-ten (suốt video, lặp hữu hạn) ─
tw.push(`tl.to("#meo-than-tat", { scaleY: 1.025, duration: 1.1, yoyo: true, repeat: ${lap(TONG, 1.1)}, ease: "sine.inOut" }, 0);`)
tw.push(`tl.to("#robot-than-tat", { scaleY: 1.02, duration: 1.3, yoyo: true, repeat: ${lap(TONG, 1.3)}, ease: "sine.inOut" }, 0.3);`)
tw.push(`gsap.set(["#o-meo", "#o-robot"], { transformOrigin: "50% 100%" });`)
tw.push(`tl.fromTo("#o-meo", { rotation: -1 }, { rotation: 1, duration: 2.3, yoyo: true, repeat: ${lap(TONG, 2.3)}, ease: "sine.inOut" }, 0);`)
tw.push(`tl.fromTo("#o-robot", { rotation: 0.8 }, { rotation: -0.8, duration: 2.7, yoyo: true, repeat: ${lap(TONG, 2.7)}, ease: "sine.inOut" }, 0);`)
tw.push(`tl.to("#meo-duoi", { rotation: 14, duration: 0.9, yoyo: true, repeat: ${lap(TONG, 0.9)}, ease: "sine.inOut" }, 0);`)
tw.push(`tl.to("#robot-ang-ten", { fill: "#facc15", duration: 0.5, yoyo: true, repeat: ${lap(TONG, 0.5)}, ease: "none" }, 0);`)
tw.push(`tl.to("#robot-tim", { scale: 1.18, duration: 0.45, yoyo: true, repeat: ${lap(TONG, 0.45)}, ease: "sine.inOut" }, 0);`)
// Chớp mắt ở các mốc cố định (không ngẫu nhiên để video luôn giống nhau)
for (let k = 1.7; k < TONG - 0.5; k += 3.1) {
  tw.push(`tl.to(["#meo-mat-trai", "#meo-mat-phai"], { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1 }, ${f(k)});`)
  tw.push(`tl.to(["#robot-mat-trai", "#robot-mat-phai"], { scaleY: 0.12, duration: 0.07, yoyo: true, repeat: 1 }, ${f(k + 1.3)});`)
}
// Mở đầu: hai nhân vật nhảy vào khung
tw.push(`tl.from("#o-meo", { x: ${NGANG ? -1150 : -700}, duration: 0.6, ease: "back.out(1.4)" }, 0);`)
tw.push(`tl.from("#o-robot", { x: ${NGANG ? 1150 : 700}, duration: 0.6, ease: "back.out(1.4)" }, 0.1);`)

// ── Nhân vật phụ trên sân khấu: câu do nhân vật phụ nói, hoặc câu nhắc tới họ (AI chọn nhan_vat_phu).
// Các câu liền nhau cùng một nhân vật phụ gom thành một lần xuất hiện; phuCuaCau[i] là id phần tử của họ ở câu i.
// Các câu có nhân vật phụ cách nhau tối đa 2 câu và chỉ gồm tối đa 2 người khác nhau thì chung một "cảnh": cả hai cùng
// đứng trên sân khấu (lệch trái / phải) cho tới hết cảnh, để họ nói chuyện, phỏng vấn, tranh luận với nhau.
const cumPhu = []
loi.forEach((l, i) => {
  const ten = NHAN_VAT_PHU[l.ai] ? l.ai : NHAN_VAT_PHU[l.nhan_vat_phu] ? l.nhan_vat_phu : null
  if (!ten) return
  const c = cumPhu.at(-1)
  if (c && i - c.het <= 2 && (c.ds.some((x) => x.ten === ten) || c.ds.length < 2)) {
    c.het = i
    if (!c.ds.some((x) => x.ten === ten)) c.ds.push({ ten, tu: i })
  } else cumPhu.push({ tu: i, het: i, ds: [{ ten, tu: i }] })
})
// Mỗi người trong mỗi cảnh là một phần tử phu<k>: xuất hiện từ câu đầu tiên của họ tới hết cảnh; lech: độ lệch ngang
const LECH_PHU = 140
const doanPhu = cumPhu.flatMap((c) =>
  c.ds.map((x, j) => ({ ten: x.ten, tu: x.tu, het: c.het, lech: c.ds.length === 2 ? (j ? LECH_PHU : -LECH_PHU) : 0, doi: c.ds.length === 2 })),
)
const phuCuaCau = {}
const viTriPhu = {} // id → toạ độ x giữa người đó (để máy quay cận vào)
doanPhu.forEach((dp, k) => {
  viTriPhu[`phu${k}`] = 540 + dp.lech
  for (let i = dp.tu; i <= dp.het; i++) {
    const l = loi[i]
    const ten = NHAN_VAT_PHU[l.ai] ? l.ai : l.nhan_vat_phu
    if (ten === dp.ten) phuCuaCau[i] = `phu${k}`
  }
})
const laPhu = (ai) => !!NHAN_VAT_PHU[ai]
// Khung bao của nhân vật (để nhún, nhảy, phóng to khi nói)
const khung = (p) => (p.startsWith('phu') ? `#${p}` : `#o-${p}`)

// ── Từng câu thoại: nhép miệng theo giọng, cử chỉ theo cảm xúc, người nghe quay sang nhìn ─
// Cử chỉ theo cảm xúc, dùng chung cho cả hai nhân vật (bộ phận cùng tên: <ai>-dau, <ai>-tay-trai...)
const CU_CHI = {
  // Tò mò: nghiêng đầu, tay lên cằm
  to_mo: (ai, t0) => [
    `tl.to("#${ai}-dau", { rotation: -10, duration: 0.4, ease: "back.out(1.3)" }, ${f(t0)});`,
    `tl.to("#${ai}-tay-phai", { rotation: -150, duration: 0.45, ease: "back.out(1.2)" }, ${f(t0 + 0.1)});`,
  ],
  // Bất ngờ: nhảy lên, mắt to, hai tay giơ lên (mèo dựng tai)
  bat_ngo: (ai, t0) => [
    `tl.to("${khung(ai)}", { y: -90, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.out" }, ${f(t0)});`,
    ...(ai.startsWith('phu') ? [] : [`tl.to(["#${ai}-mat-trai", "#${ai}-mat-phai"], { scale: 1.25, duration: 0.2, ease: "back.out(3)" }, ${f(t0)});`]),
    `tl.to(["#${ai}-tay-trai", "#${ai}-tay-phai"], { rotation: (i) => (i ? -160 : 160), duration: 0.38, ease: "back.out(1.3)" }, ${f(t0)});`,
    ...(ai === 'meo'
      ? [`tl.to("#meo-tai-trai", { rotation: -12, duration: 0.2 }, ${f(t0)});`, `tl.to("#meo-tai-phai", { rotation: 12, duration: 0.2 }, ${f(t0)});`]
      : []),
  ],
  // Giải thích: tay chỉ lên bảng tin, đầu nghiêng
  giai_thich: (ai, t0) => [
    `tl.to("#${ai}-tay-trai", { rotation: 140, duration: 0.45, ease: "back.out(1.2)" }, ${f(t0)});`,
    `tl.to("#${ai}-dau", { rotation: -6, duration: 0.4 }, ${f(t0)});`,
  ],
  // Khẳng định: giơ tay, gật đầu
  khang_dinh: (ai, t0) => [
    `tl.to("#${ai}-tay-phai", { rotation: -150, duration: 0.5, ease: "back.out(1.3)" }, ${f(t0)});`,
    `tl.to("#${ai}-dau", { rotation: 7, duration: 0.18, yoyo: true, repeat: 3 }, ${f(t0 + 0.4)});`,
  ],
  // Vui: nhún nhảy, vẫy hai tay (robot tim đập nhanh)
  vui: (ai, t0) => [
    `tl.to("${khung(ai)}", { y: -40, duration: 0.24, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t0)});`,
    `tl.to(["#${ai}-tay-trai", "#${ai}-tay-phai"], { rotation: (i) => (i ? -120 : 120), duration: 0.25, ease: "back.out(1.3)" }, ${f(t0)});`,
    `tl.to(["#${ai}-tay-trai", "#${ai}-tay-phai"], { rotation: (i) => (i ? -95 : 95), duration: 0.24, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t0 + 0.3)});`,
    ...(ai === 'robot' ? [`tl.to("#robot-tim", { scale: 1.4, duration: 0.15, yoyo: true, repeat: 5 }, ${f(t0)});`] : []),
  ],
  // Lo lắng: cúi đầu, khép tay, mắt nhỏ lại, run nhẹ
  lo_lang: (ai, t0) => [
    `tl.to("#${ai}-dau", { rotation: 8, duration: 0.4 }, ${f(t0)});`,
    `tl.to(["#${ai}-tay-trai", "#${ai}-tay-phai"], { rotation: (i) => (i ? 25 : -25), duration: 0.5, ease: "sine.inOut" }, ${f(t0)});`,
    ...(ai.startsWith('phu') ? [] : [`tl.to(["#${ai}-mat-trai", "#${ai}-mat-phai"], { scale: 0.85, duration: 0.3 }, ${f(t0)});`]),
    `tl.to("${khung(ai)}", { x: 4, duration: 0.1, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t0 + 0.3)});`,
  ],
  // Suy nghĩ: nghiêng đầu ngược lại, tay chống cằm, mắt nhìn lên
  suy_nghi: (ai, t0) => [
    `tl.to("#${ai}-dau", { rotation: 9, duration: 0.45, ease: "power2.out" }, ${f(t0)});`,
    `tl.to("#${ai}-tay-phai", { rotation: -130, duration: 0.45, ease: "back.out(1.1)" }, ${f(t0 + 0.1)});`,
    ...(ai === 'meo' ? [`tl.to(["#meo-con-ngoi-trai", "#meo-con-ngoi-phai"], { y: -12, duration: 0.3 }, ${f(t0)});`] : []),
  ],
}
// Về tư thế nghỉ (trước mỗi câu mới)
const NGHI = (t0, phu) => [
  `tl.to(["#meo-dau", "#meo-tay-trai", "#meo-tay-phai", "#meo-tai-trai", "#meo-tai-phai", "#robot-dau", "#robot-tay-trai", "#robot-tay-phai"${phu ? `, "#${phu}-dau", "#${phu}-tay-trai", "#${phu}-tay-phai"` : ''}], { rotation: 0, duration: 0.45, ease: "sine.inOut" }, ${f(t0)});`,
  `tl.to(["#meo-mat-trai", "#meo-mat-phai", "#robot-mat-trai", "#robot-mat-phai"], { scale: 1, duration: 0.4, ease: "sine.inOut" }, ${f(t0)});`,
  `tl.to(["#meo-con-ngoi-trai", "#meo-con-ngoi-phai"], { y: 0, duration: 0.4, ease: "sine.inOut" }, ${f(t0)});`,
]

const phuDe = []
const amThanh = []
loi.forEach((l, i) => {
  const t0 = batDau[i]
  const d = doDai[i]
  // Người kể (phim tiểu sử): giọng dẫn chuyện không đứng trên sân khấu, không nhép miệng, hai linh vật lắng nghe
  const ke = l.ai === 'nguoi_ke'
  const ai = ke || laPhu(l.ai) || l.ai === 'meo' ? l.ai : 'robot'
  // p: tiền tố bộ phận của người nói (meo / robot / phu<k>)
  const p = laPhu(ai) ? phuCuaCau[i] : ai
  const nghe = ai === 'meo' ? 'robot' : 'meo'
  if (i) tw.push(...NGHI(t0 - 0.3, phuCuaCau[i - 1] && phuCuaCau[i - 1] === phuCuaCau[i] ? phuCuaCau[i] : null))
  if (!ke) tw.push(...(CU_CHI[l.cam_xuc] ?? CU_CHI[ai === 'meo' ? 'to_mo' : 'giai_thich'])(p, t0))
  // Người nghe nhìn sang người nói
  if (ai === 'robot') tw.push(`tl.to(["#meo-con-ngoi-trai", "#meo-con-ngoi-phai"], { x: 14, duration: 0.35, ease: "sine.inOut" }, ${f(t0)});`)
  else tw.push(`tl.to(["#meo-con-ngoi-trai", "#meo-con-ngoi-phai"], { x: 0, duration: 0.35, ease: "sine.inOut" }, ${f(t0)});`)
  if (laPhu(ai) || ke) tw.push(`tl.to(["#o-meo", "#o-robot"], { scale: 0.96, duration: 0.45, ease: "sine.inOut" }, ${f(t0)});`)
  else {
    tw.push(`tl.to("#o-${nghe}", { scale: 0.96, duration: 0.45, ease: "sine.inOut" }, ${f(t0)});`)
    tw.push(`tl.to("#o-${ai}", { scale: 1.04, duration: 0.45, ease: "sine.inOut" }, ${f(t0)});`)
  }
  // Nhép miệng mượt: độ to giọng mỗi 1/15 giây được làm mềm (mở nhanh, khép chậm dần); miệng chỉ đổi mở / khép khi
  // vượt ngưỡng có trễ (không nháy liên tục), còn độ há trượt êm từ khung này sang khung sau.
  const am = ke ? [] : doTo(join(GOC, `hyperframes/assets/loi-${i}.wav`))
  let em = 0, dangMo = false
  am.forEach((v, k) => {
    em = Math.max(v, em * 0.62)
    const tk = t0 + k / 15
    const mo = dangMo ? em > 0.08 : em > 0.16
    if (mo !== dangMo) {
      dangMo = mo
      tw.push(`tl.set("#${p}-mieng-mo", { opacity: ${mo ? 1 : 0}${mo ? ', scaleY: 0.3' : ''} }, ${f(tk)});`)
      tw.push(`tl.set("#${p}-mieng-dong", { opacity: ${mo ? 0 : 1} }, ${f(tk)});`)
    }
    if (mo) tw.push(`tl.to("#${p}-mieng-mo", { scaleY: ${f(Math.min(1, 0.3 + em * 0.8))}, duration: 0.066, ease: "sine.inOut" }, ${f(tk)});`)
  })
  if (!ke) {
    tw.push(`tl.set("#${p}-mieng-mo", { opacity: 0 }, ${f(t0 + d)});`)
    tw.push(`tl.set("#${p}-mieng-dong", { opacity: 1 }, ${f(t0 + d)});`)
  }
  amThanh.push(`<audio id="am-${i}" src="assets/loi-${i}.wav" data-start="${f(t0)}" data-duration="${f(d)}" data-track-index="${8 + i}" data-volume="1"></audio>`)

  // Phụ đề gọn sát đáy: câu chia thành từng đoạn tối đa 2 dòng, hiện đúng lúc đọc tới, chữ sáng dần theo giọng.
  // Không khung đen lớn để không che nhân vật; thẻ tên nhỏ của người nói ở đoạn đầu.
  const tu = l.chu.split(/\s+/).filter(Boolean)
  const doanPd = []
  let dong = [], hien = []
  for (const w of tu) {
    if (hien.length && [...hien, w].join(' ').length > MAX_DONG) {
      dong.push(hien)
      hien = [w]
      if (dong.length === 2) {
        doanPd.push(dong)
        dong = []
      }
    } else hien.push(w)
  }
  if (hien.length) dong.push(hien)
  if (dong.length) doanPd.push(dong)
  const tongKt = tu.join('').length
  const noi = d - 0.25
  let dem = 0
  const het = i === loi.length - 1 ? d + DUOI : (batDau[i + 1] ?? t0 + d) - t0
  doanPd.forEach((dg, k) => {
    const batDauDoan = t0 + (dem / tongKt) * noi * 0.97
    const kyTuDoan = dg.flat().join('').length
    const ketThuc = k === doanPd.length - 1 ? t0 + het : t0 + ((dem + kyTuDoan) / tongKt) * noi * 0.97
    let w = 0
    const dongHtml = dg
      .map(
        (ds) =>
          `<div class="pd-dong">${ds
            .map((chu) => {
              const tw0 = batDauDoan + (w / kyTuDoan) * (ketThuc - batDauDoan) * 0.85
              w += chu.length
              const id = `pd${i}-${k}-${w}`
              tw.push(`tl.to("#${id}", { color: "${ke ? '#fde68a' : laPhu(ai) ? NHAN_VAT_PHU[ai].mau : ai === 'meo' ? '#fdba74' : '#67e8f9'}", duration: 0.08 }, ${f(tw0)});`)
              return `<span id="${id}" class="pd-tu">${esc(chu)}</span>`
            })
            .join(' ')}</div>`,
      )
      .join('')
    dem += kyTuDoan
    // Không ghi tên người nói (người xem nhận ra qua giọng, miệng nhép và màu chữ)
    const ten = ''
    phuDe.push(`
    <div id="pd${i}-${k}" class="phu-de clip" data-start="${f(batDauDoan)}" data-duration="${f(ketThuc - batDauDoan)}" data-track-index="3">
      <div class="pd-khung">${k === 0 && l.tai_hien ? '<div class="pd-tai-hien">Tái hiện</div>' : ''}${ten}${dongHtml}</div>
    </div>`)
    tw.push(`tl.from("#pd${i}-${k} .pd-khung", { y: 20, opacity: 0, duration: 0.15, ease: "power2.out" }, ${f(batDauDoan)});`)
  })
})

// ── Bối cảnh: các câu liền nhau cùng bối cảnh dùng chung một cảnh; đổi cảnh bằng mờ dần / trượt ngang / phóng to ─
// Mọi lớp nền nằm sẵn trong một khung chung (#camera-nen) để máy quay đẩy được cả nền.
const doanCanh = []
loi.forEach((l, i) => {
  const ten = BOI_CANH[l.boi_canh] ? l.boi_canh : 'truong_quay'
  const cuoi = doanCanh.at(-1)
  if (cuoi && cuoi.ten === ten) cuoi.het = i
  else doanCanh.push({ ten, tu: i, het: i })
})
const KIEU_CHUYEN = ['truot', 'phong', 'quet', 'mo', 'xuyen']
const chuyenCanh = [] // { i: câu đầu cảnh mới, t: lúc đổi, kieu } (để chèn tiếng vút)
const nenCanh = doanCanh.map((dc, k) => {
  const t0 = k ? batDau[dc.tu] - 0.35 : 0
  const het = dc.het === loi.length - 1 ? TONG : batDau[dc.het + 1]
  const bc = BOI_CANH[dc.ten](`bc${k}`)
  tw.push(...bc.tw(t0, het - t0))
  if (k) {
    // Kiểu chuyển cảnh AI chọn theo cảm xúc (chuyen_canh ở câu đầu của cảnh mới); không có thì lần lượt từng kiểu
    const chon = loi[dc.tu].chuyen_canh
    const kieu = KIEU_CHUYEN.includes(chon) ? chon : KIEU_CHUYEN[(k - 1) % KIEU_CHUYEN.length]
    chuyenCanh.push({ i: dc.tu, t: t0, kieu })
    const truoc = `#bc${k - 1}`
    if (kieu === 'truot') {
      tw.push(`tl.fromTo("#bc${k}", { opacity: 1, x: ${TRUOT} }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.inOut" }, ${f(t0)});`)
      tw.push(`tl.to("${truoc}", { x: -500, duration: 0.6, ease: "power3.inOut" }, ${f(t0)});`)
    } else if (kieu === 'phong') {
      tw.push(`tl.fromTo("#bc${k}", { opacity: 0, scale: 1.35 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }, ${f(t0)});`)
    } else if (kieu === 'quet') {
      // Quét nhanh (whip pan): cảnh vụt sang ngang, vệt sáng lướt qua
      tw.push(`tl.fromTo("#bc${k}", { opacity: 1, x: ${TRUOT} }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.inOut" }, ${f(t0 + 0.05)});`)
      tw.push(`tl.to("${truoc}", { x: -${TRUOT}, duration: 0.4, ease: "power3.inOut" }, ${f(t0 + 0.05)});`)
      tw.push(`tl.fromTo("#vet-quet", { opacity: 0, x: ${RONG * 0.85} }, { opacity: 0.6, x: -${RONG * 0.85}, duration: 0.46, ease: "power2.inOut" }, ${f(t0)});`)
      tw.push(`tl.set("#vet-quet", { opacity: 0 }, ${f(t0 + 0.48)});`)
    } else if (kieu === 'xuyen') {
      // Xuyên qua: máy quay lao vào cảnh cũ rồi bước ra cảnh mới
      tw.push(`tl.to("${truoc}", { scale: 2.4, opacity: 0, duration: 0.45, ease: "power3.in" }, ${f(t0 - 0.1)});`)
      tw.push(`tl.fromTo("#bc${k}", { opacity: 0, scale: 1.18 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }, ${f(t0 + 0.2)});`)
    } else {
      // Tối dần kiểu điện ảnh: khung tối lại, đổi cảnh trong bóng tối, sáng lên cảnh mới
      tw.push(`tl.to("#toi-chuyen", { opacity: 0.85, duration: 0.3, ease: "power1.in" }, ${f(t0 - 0.05)});`)
      tw.push(`tl.set("#bc${k}", { opacity: 1 }, ${f(t0 + 0.25)});`)
      tw.push(`tl.to("#toi-chuyen", { opacity: 0, duration: 0.45, ease: "power1.out" }, ${f(t0 + 0.3)});`)
    }
    tw.push(`tl.set("${truoc}", { opacity: 0 }, ${f(t0 + 0.65)});`)
    // Hai nhân vật nhún nhẹ khi đổi cảnh (khoảng 3% chiều cao)
    tw.push(`tl.to(["#o-meo", "#o-robot"], { y: -22, duration: 0.18, yoyo: true, repeat: 1, ease: "power1.out" }, ${f(t0 + 0.1)});`)
  }
  // Khung ngang: thêm hai bản soi gương của nền hai bên. Bản soi gương bỏ hết chữ (chữ soi gương bị ngược); trùng id
  // với bản giữa nên các chuyển động (chọn theo id) chạy đồng thời ở cả ba bản
  const guong = bc.svg.replace(/<text\b[\s\S]*?<\/text>/g, '')
  const svg = NGANG
    ? `<svg class="nen-svg" viewBox="-1080 0 3240 1920" width="3240" height="1920" style="margin-left:-1080px"><g>${bc.svg}</g><g transform="scale(-1 1)">${guong}</g><g transform="translate(2160 0) scale(-1 1)">${guong}</g></svg>`
    : `<svg class="nen-svg" viewBox="0 0 1080 1920" width="1080" height="1920">${bc.svg}</svg>`
  return `<div id="bc${k}" class="lop-nen"${k ? ' style="opacity:0"' : ''}>${svg}</div>`
})

// ── Máy quay: cảnh rộng, cảnh vừa và cận mặt người nói; nền trôi chậm hơn nhân vật để có chiều sâu ─
// Điểm nhìn (toạ độ khung hình) của từng nhân vật khi cận cảnh
const TAM = { meo: { x: 290 - GIAN, y: 870 }, robot: { x: 790 + GIAN, y: 870 } }
const SAU_NEN = 0.55 // nền dịch chuyển bằng 55% nhân vật
// Khung ngang thấp: cận nhân vật phụ nhắm thấp hơn 100 để cả người lọt khung, thẻ tên không đè bảng tin
const HA_PHU = NGANG ? 100 - PHU_XUONG : 0
const lia = (t, scale, ox, oy, giay, ease = 'power2.inOut', xoay = 0) => {
  // đưa điểm (ox, oy) về giữa khung với độ phóng `scale` (gốc biến đổi ở điểm giữa khung GIUA_X, GIUA_Y), nghiêng `xoay` độ
  const x = scale === 1 ? 0 : -(ox - GIUA_X) * scale
  const y = scale === 1 ? 0 : -(oy - GIUA_Y) * scale
  tw.push(`tl.to("#camera-nv", { scale: ${f(scale)}, x: ${f(x)}, y: ${f(y)}, rotation: ${f(xoay)}, duration: ${f(giay)}, ease: "${ease}" }, ${f(t)});`)
  // Nền luôn phủ kín khung: phóng thêm cho mép mờ (blur) và góc nghiêng, rồi giới hạn độ dịch để mép nền không lộ thành sọc
  const xn = xoay * SAU_NEN
  const sn = (1 + (scale - 1) * SAU_NEN) * (1.03 + Math.abs(xn) * 0.035)
  const kep = (v, du) => Math.max(-du, Math.min(du, v))
  const nx = kep(x * SAU_NEN, (RONG * sn - RONG) / 2 - 8)
  const ny = kep(y * SAU_NEN, (CAO * sn - CAO) / 2 - 8)
  tw.push(`tl.to("#camera-nen", { scale: ${f(sn)}, x: ${f(nx)}, y: ${f(ny)}, rotation: ${f(xn)}, duration: ${f(giay)}, ease: "${ease}" }, ${f(t)});`)
}
tw.push(`gsap.set("#camera-nen", { scale: 1.03 });`)
// ── Nhân vật phụ (AI chọn khi lời thoại nhắc tới): đứng phía sau giữa hai nhân vật chính, vẫy tay / gật đầu ─
const daGioiThieu = new Set()
const gioiThieu = new Set() // câu có nhân vật phụ lần đầu xuất hiện → máy quay quay sang giới thiệu
const nvPhu = doanPhu.map((dp, k) => {
  const id = `phu${k}`
  const t0 = batDau[dp.tu]
  const het = batDau[dp.het] + doDai[dp.het]
  const lanDau = !daGioiThieu.has(dp.ten)
  if (lanDau) {
    daGioiThieu.add(dp.ten)
    gioiThieu.add(dp.tu)
  }
  if (dp.lech < 0) tw.push(`gsap.set("#${id} svg", { scaleX: -1 });`)
  tw.push(`gsap.set("#${id}-dau", { svgOrigin: "200 250" }); gsap.set("#${id}-tay-phai", { svgOrigin: "270 300" }); gsap.set("#${id}-tay-trai", { svgOrigin: "130 300" }); gsap.set("#${id}-mieng-mo", { svgOrigin: "200 226" });`)
  tw.push(`tl.fromTo("#${id}", { opacity: 0, y: 90, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.8)" }, ${f(t0 + 0.1)});`)
  tw.push(`tl.to("#${id}-tay-phai", { rotation: -140, duration: 0.3, ease: "back.out(2)" }, ${f(t0 + 0.5)});`)
  tw.push(`tl.to("#${id}-tay-phai", { rotation: -115, duration: 0.18, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t0 + 0.8)});`)
  tw.push(`tl.to("#${id}-tay-phai", { rotation: 0, duration: 0.3 }, ${f(t0 + 1.9)});`)
  tw.push(`tl.to("#${id}-dau", { rotation: 6, duration: 0.5, yoyo: true, repeat: ${lap(het - t0 - 2.2, 0.5) | 1}, ease: "sine.inOut" }, ${f(t0 + 2.2)});`)
  tw.push(`tl.to("#${id}", { opacity: 0, y: 60, duration: 0.35, ease: "power2.in" }, ${f(het - 0.1)});`)
  // Không ghi tên trên đầu (trang phục tự nói lên họ là ai); hai nhân vật chính dạt sang hai bên chừa chỗ cho nhân vật phụ
  // Hai người cùng đứng thì Mèo / Bit dạt xa hơn
  tw.push(`tl.to("#o-meo", { x: ${dp.doi ? -170 : -80}, duration: 0.5, ease: "power2.inOut" }, ${f(t0)});`)
  tw.push(`tl.to("#o-robot", { x: ${dp.doi ? 170 : 80}, duration: 0.5, ease: "power2.inOut" }, ${f(t0)});`)
  tw.push(`tl.to(["#o-meo", "#o-robot"], { x: 0, duration: 0.5, ease: "power2.inOut" }, ${f(het - 0.1)});`)
  return `<div id="${id}" class="nv-phu" style="left:${354 + dp.lech}px"><svg viewBox="0 0 400 600" width="372" height="558" class="nv">${NHAN_VAT_PHU[dp.ten].svg(id)}</svg></div>`
})

// ── Chỉ dẫn đạo diễn AI chọn cho từng câu (khi có): khung hình + chuyển động máy quay ─
// Độ phóng theo khung hình; góc thấp / góc cao giả lập bằng cách nhìn thấp xuống chân / cao trên đầu nhân vật
const KHUNG = { toan_canh: 1, trung_canh: 1.2, can_canh: 1.48, sieu_can: 1.85, goc_thap: 1.3, goc_cao: 1.16 }
// Rung tay (handheld): lắc nhẹ cả thế giới (nền + nhân vật), số lần lẻ để kết thúc đúng chỗ cũ
const rungTay = (t0, d) =>
  tw.push(`tl.fromTo(".the-gioi", { x: ${LECH_X}, y: ${LECH_Y}, rotation: 0 }, { x: ${LECH_X + 7}, y: ${LECH_Y - 5}, rotation: 0.25, duration: 0.19, yoyo: true, repeat: ${2 * Math.max(1, Math.floor(d / 0.38)) + 1}, ease: "sine.inOut" }, ${f(t0)});`)
function quayChiDan(l, i, t0, conLai) {
  const tam = TAM[l.ai] ?? (l.ai === 'nguoi_ke' ? { x: GIUA_X, y: 900 } : TAM.robot)
  const ben = TAM[l.ai === 'meo' ? 'robot' : 'meo']
  const s = KHUNG[l.khung_hinh]
  const ox = l.khung_hinh === 'toan_canh' ? GIUA_X : ['trung_canh', 'goc_cao'].includes(l.khung_hinh) ? (tam.x + GIUA_X) / 2 : tam.x
  const oy = { toan_canh: GIUA_Y, trung_canh: 960, can_canh: tam.y - 40, sieu_can: tam.y - 20, goc_thap: tam.y + 170, goc_cao: tam.y - 230 }[l.khung_hinh]
  const vao = Math.max(0, t0 - 0.2)
  switch (l.may_quay) {
    case 'day_vao': // đẩy vào: nhấn mạnh
      lia(vao, s, ox, oy, 0.5)
      lia(t0 + 0.3, s * 1.13, ox, oy - 15, conLai, 'sine.inOut')
      break
    case 'keo_ra': // kéo ra: mở rộng thông tin
      lia(vao, s * 1.16, ox, oy, 0.5)
      lia(t0 + 0.3, s, ox, oy, conLai, 'sine.inOut')
      break
    case 'lia_sang': // lia từ người nghe sang người nói (pan)
      lia(vao, s, l.khung_hinh === 'toan_canh' ? GIUA_X : ben.x, oy, 0.4)
      lia(t0 + 0.25, s, ox, oy, Math.min(1, conLai), 'power2.inOut')
      break
    case 'truot_ngang': // tracking ngang chậm
      lia(vao, s, ox - 70, oy, 0.5)
      lia(t0 + 0.3, s, ox + 70, oy, conLai, 'none')
      break
    case 'nang_len': // nâng máy lên (crane / tilt up): hy vọng, mở ra
      lia(vao, s, ox, oy + 70, 0.5)
      lia(t0 + 0.3, s * 1.03, ox, oy - 70, conLai, 'sine.inOut')
      break
    case 'rung_tay': // máy cầm tay: căng thẳng, gấp gáp
      lia(vao, s, ox, oy, 0.4)
      rungTay(t0, conLai + 0.3)
      break
    default: // dung_yen: đứng yên, chỉ trôi rất nhẹ
      lia(vao, s, ox, oy, 0.5)
      lia(t0 + 0.3, s * 1.015, ox, oy, conLai, 'sine.inOut')
  }
  // Cận / siêu cận: người nghe lùi ra ngoài khung (trừ khi đang lia từ họ sang)
  return l.ai !== 'nguoi_ke' && ['can_canh', 'sieu_can'].includes(l.khung_hinh) && l.may_quay !== 'lia_sang'
}

// Câu cuối của mỗi đoạn bối cảnh (sắp đổi cảnh): máy quay lùi về cảnh rộng để có điểm nghỉ
const truocDoiCanh = new Set(doanCanh.slice(0, -1).map((dc) => dc.het))
loi.forEach((l, i) => {
  const t0 = batDau[i]
  const d = doDai[i]
  const tam = TAM[l.ai] ?? (l.ai === 'nguoi_ke' ? { x: GIUA_X, y: 900 } : TAM.robot)
  const nghe = l.ai === 'meo' ? 'robot' : 'meo'
  const lui = truocDoiCanh.has(i) && d > 2.2 ? 0.7 : 0 // chừa cuối câu để lùi về cảnh rộng
  const conLai = Math.max(0.5, d - 0.5 - lui)
  const chiDan = !laPhu(l.ai) && !gioiThieu.has(i) && KHUNG[l.khung_hinh] !== undefined
  let canCanhChiDan = false
  if (chiDan) {
    canCanhChiDan = quayChiDan(l, i, t0, conLai)
  } else if (laPhu(l.ai)) {
    // Nhân vật phụ đang nói: cận vừa vào họ (đứng giữa, phía sau), đẩy vào nhẹ
    const xPhu = viTriPhu[phuCuaCau[i]] ?? 540
    lia(Math.max(0, t0 - 0.2), 1.42, xPhu, 720 - HA_PHU, 0.6)
    lia(t0 + 0.4, 1.47, xPhu + (i % 2 ? 15 : -15), 715 - HA_PHU, conLai, 'sine.inOut')
  } else if (gioiThieu.has(i)) {
    // Nhân vật phụ vừa xuất hiện: cận vào họ một nhịp, rồi về cảnh vừa nghiêng về người nói
    const xPhu = viTriPhu[phuCuaCau[i]] ?? 540
    lia(Math.max(0, t0 - 0.1), 1.5, xPhu, 760 - HA_PHU, 0.5)
    lia(t0 + 0.45, 1.54, xPhu, 750 - HA_PHU, 0.9, 'sine.inOut')
    lia(t0 + 1.4, 1.18, (tam.x + 540) / 2, 940, 0.6)
    if (d > 2.4) lia(t0 + 2.0, 1.21, (tam.x + 540) / 2 + 15, 940, Math.max(0.4, d - 2.5 - lui), 'sine.inOut')
  } else if (i === 0 || i === loi.length - 1) {
    // Mở đầu / kết thúc: cảnh rộng, đẩy vào rất chậm 3%
    lia(Math.max(0, t0 - 0.2), 1, 540, 960, 0.6)
    lia(t0 + 0.4, 1.03, 540, 960, conLai, 'sine.inOut')
  } else if (l.cam_xuc === 'bat_ngo') {
    // Bất ngờ: cận mặt thật nhanh rồi đứng gần như yên
    lia(t0 - 0.1, 1.6, tam.x, tam.y - 60, 0.42, 'power2.out')
    lia(t0 + 0.35, 1.63, tam.x, tam.y - 60, conLai, 'sine.out')
  } else if (l.cam_xuc === 'lo_lang') {
    // Lo lắng: cận cảnh rồi tiến chậm dần vào mặt
    lia(Math.max(0, t0 - 0.2), 1.45, tam.x, tam.y - 50, 0.6)
    lia(t0 + 0.4, 1.62, tam.x, tam.y - 60, conLai, 'sine.inOut')
  } else if (l.cam_xuc === 'vui') {
    // Vui: cận cảnh, máy quay nâng nhẹ lên
    lia(Math.max(0, t0 - 0.2), 1.45, tam.x, tam.y - 20, 0.6)
    lia(t0 + 0.4, 1.5, tam.x, tam.y - 110, conLai, 'sine.inOut')
  } else if (l.cam_xuc === 'suy_nghi') {
    // Suy nghĩ: cận vừa, máy quay xoay vòng nhẹ quanh người nói
    lia(Math.max(0, t0 - 0.2), 1.32, tam.x + (l.ai === 'meo' ? 60 : -60), tam.y - 30, 0.6, 'power2.inOut', -1.2)
    lia(t0 + 0.4, 1.36, tam.x + (l.ai === 'meo' ? -20 : 20), tam.y - 40, conLai, 'sine.inOut', 1.2)
  } else {
    // Nói bình thường: cảnh vừa nghiêng về người nói, đẩy vào / kéo ra 2–5%
    const s = i % 2 ? 1.22 : 1.15
    const ox = (tam.x + 540) / 2
    lia(Math.max(0, t0 - 0.2), s, ox, 980, 0.6)
    lia(t0 + 0.4, s + (i % 3 ? 0.04 : -0.03), ox + (i % 2 ? 20 : -20), 980, conLai, 'sine.inOut')
  }
  if (lui) lia(t0 + d - lui, 1, 540, 960, lui, 'power2.inOut')
  // Cận cảnh một nhân vật chính: người nghe lùi hẳn ra ngoài khung (không lộ một lát mỏng ở mép màn hình như vệt sọc),
  // cảnh rộng / cảnh vừa / có nhân vật phụ thì về chỗ cũ. Dùng xPercent để không đụng độ dịch x của các chuyển động khác.
  const canCanh = chiDan
    ? canCanhChiDan
    : !laPhu(l.ai) && !gioiThieu.has(i) && i > 0 && i < loi.length - 1 && ['bat_ngo', 'lo_lang', 'vui', 'suy_nghi'].includes(l.cam_xuc)
  // Nhân vật phụ nói trong đoạn căng thẳng cũng có thể rung tay
  if (!chiDan && l.may_quay === 'rung_tay') rungTay(t0, conLai + 0.3)
  tw.push(`tl.to("#o-${nghe}", { xPercent: ${canCanh ? (nghe === 'robot' ? 45 : -45) : 0}, duration: 0.55, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.2))});`)
  tw.push(`tl.to("#o-${nghe === 'robot' ? 'meo' : 'robot'}", { xPercent: 0, duration: 0.55, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.2))});`)
  if (canCanh && lui) tw.push(`tl.to("#o-${nghe}", { xPercent: 0, duration: ${f(lui)}, ease: "power2.inOut" }, ${f(t0 + d - lui)});`)
  // Nhịp giữa câu dài: người nghe gật đầu, đạo cụ / biểu cảm đã lo phần đầu câu
  if (d > 4.5) tw.push(`tl.to("#${nghe}-dau", { rotation: 6, duration: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t0 + d / 2)});`)
})

// ── Đạo cụ: hiện bên cạnh người nói theo nội dung câu (AI chọn), bay nhẹ rồi biến mất ─
const DAO_CU = {
  dien_thoai: '📱', laptop: '💻', kinh_lup: '🔍', bieu_do: '📈', tien: '💰', khien: '🛡️', coi_bao: '🚨',
  chip: '🔌', o_to: '🚗', ten_lua: '🚀', bong_den: '💡', o_khoa: '🔒', the_ngan_hang: '💳', robot: '🤖',
  tai_lieu: '📄', dong_ho: '⏰', trai_dat: '🌍', tay_cam_game: '🎮', may_anh: '📷', tai_nghe: '🎧',
  cup: '🏆', tin_nhan: '💬', canh_bao: '⚠️', vu_tru: '🛰️', pin: '🔋', mang: '📶',
  internet: '🌐', tin_nong: '📰', toc_do: '⚡',
}
const daoCu = []
loi.forEach((l, i) => {
  const bt = DAO_CU[l.dao_cu]
  if (!bt) return
  const t0 = batDau[i]
  const d = doDai[i]
  const id = `dc${i}`
  // Đạo cụ của nhân vật phụ nằm cùng chỗ với đạo cụ của người kể
  daoCu.push(`<div id="${id}" class="dao-cu ${laPhu(l.ai) ? 'nguoi_ke' : l.ai}">${bt}</div>`)
  tw.push(`tl.fromTo("#${id}", { opacity: 0, scale: 0, rotation: -30 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2.2)" }, ${f(t0 + 0.25)});`)
  tw.push(`tl.to("#${id}", { y: -24, rotation: 6, duration: 0.6, yoyo: true, repeat: ${lap(d - 1.2, 0.6) | 1}, ease: "sine.inOut" }, ${f(t0 + 0.75)});`)
  tw.push(`tl.to("#${id}", { opacity: 0, scale: 0.3, duration: 0.3, ease: "power2.in" }, ${f(t0 + d - 0.2)});`)
})

// ── Không khí: hạt sáng lơ lửng trước nền (vị trí cố định theo công thức, không ngẫu nhiên) ─
const hat = [...Array(16)].map((_, k) => {
  const x = NGANG ? -400 + ((k * 263) % 1860) : (k * 263) % 1040, y = 260 + ((k * 397) % 1100), r = 6 + (k % 4) * 5
  tw.push(`tl.to("#hat${k}", { y: ${-60 - (k % 5) * 25}, x: ${(k % 2 ? 1 : -1) * (20 + (k % 3) * 15)}, opacity: ${0.15 + (k % 3) * 0.15}, duration: ${f(TONG)}, ease: "sine.inOut" }, 0);`)
  return `<div id="hat${k}" class="hat" style="left:${x}px;top:${y}px;width:${r * 2}px;height:${r * 2}px;opacity:${0.5 + (k % 3) * 0.15}"></div>`
})

// ── Thẻ năm / nơi chốn (phim tiểu sử): "1993 · Kharkov, Ukraina" trượt vào góc trên bên trái
const theMoc = []
loi.forEach((l, i) => {
  if (!l.the_moc) return
  const t0 = batDau[i] + 0.15
  const het = Math.min(t0 + 3.6, (batDau[i + 1] ?? TONG) - 0.1)
  if (het - t0 < 1) return
  theMoc.push(`<div id="tm${i}" class="the-moc">📍 ${esc(l.the_moc)}</div>`)
  tw.push(`tl.fromTo("#tm${i}", { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, ${f(t0)});`)
  tw.push(`tl.to("#tm${i}", { opacity: 0, x: -40, duration: 0.35, ease: "power2.in" }, ${f(het - 0.35)});`)
})

// ── Câu giật tít 2 giây đầu + minh hoạ chèn đúng lúc giọng đọc tới chi tiết (con số, địa điểm, lời trích...) ─
const gtMoc = Math.min(2.2, batDau[0] + doDai[0])
const giatTit = mocMoDau(moc, gtMoc)
tw.push(...giatTit.tw)
// Bảng tin câu đầu nhường chỗ cho câu giật tít
if (giatTit.html) {
  tw.push(`tl.set("#bang0", { opacity: 0 }, 0);`)
  tw.push(`tl.to("#bang0", { opacity: 1, duration: 0.3 }, ${f(gtMoc)});`)
}
// Thẻ minh hoạ nằm ngay trên đầu người nói (toạ độ trong lớp nhân vật nên đi theo máy quay)
const DAU = { meo: { x: 290 - GIAN, dinh: 715 }, robot: { x: 790 + GIAN, dinh: 715 } }
const DAU_PHU = { x: 540, dinh: 520 + PHU_XUONG }
const minhHoa = []
const minhHoaKhung = [] // khung ngang: thẻ minh hoạ ở lớp khung hình
loi.forEach((l, i) => {
  const m = l.minh_hoa
  const ve = MINH_HOA[m?.kieu]
  if (!ve) return
  const t0 = batDau[i]
  const d = doDai[i]
  // Vị trí từ khoá trong câu → thời điểm giọng đọc tới (chia theo số ký tự)
  const vt = m.tu_khoa ? l.chu.toLowerCase().indexOf(String(m.tu_khoa).toLowerCase()) : -1
  let bd = t0 + (vt >= 0 ? (vt / l.chu.length) * (d - 0.25) : d * 0.3) - 0.1
  bd = Math.max(bd, t0 + 0.2, i === 0 && moc?.chu ? gtMoc + 0.1 : 0)
  const kt = Math.min(bd + 2.3, t0 + d + 0.35)
  if (kt - bd < 1.3) return
  const id = `mh${i}`
  const mh = ve(id, m)
  tw.push(...mh.tw(bd, kt - bd))
  const dau = laPhu(l.ai) ? { ...DAU_PHU, x: viTriPhu[phuCuaCau[i]] ?? DAU_PHU.x } : l.ai === 'nguoi_ke' ? DAU_PHU : DAU[l.ai === 'meo' ? 'meo' : 'robot']
  const trai = Math.min(Math.max(dau.x - 240, 10 - LECH_X), RONG - LECH_X - 490)
  // Khung ngang: đặt cố định ở giữa phía trên khung hình (chỗ bảng tin), không phóng theo máy quay nên không bị cắt mép
  if (NGANG) minhHoaKhung.push(`<div id="${id}" class="mh" style="left:${(RONG - 480) / 2}px;top:14px">${mh.html}</div>`)
  else minhHoa.push(`<div id="${id}" class="mh" style="left:${trai}px;top:${dau.dinh - 345}px">${mh.html}</div>`)
  // Bảng tin của câu tạm ẩn trong lúc thẻ minh hoạ hiện
  tw.push(`tl.to("#bang${i}", { opacity: 0, duration: 0.1 }, ${f(bd - 0.05)});`)
  tw.push(`tl.to("#bang${i}", { opacity: 1, duration: 0.25 }, ${f(kt)});`)
})

// Bảng tin phía sau đổi theo lời thoại
const bang = loi.map((l, i) => {
  const t0 = batDau[i]
  const het = i === loi.length - 1 ? TONG : batDau[i + 1]
  tw.push(`tl.from("#bang${i} .bang-noi", { scale: 0.6, opacity: 0, duration: 0.4, ease: "back.out(2)" }, ${f(t0 + 0.05)});`)
  return `
    <div id="bang${i}" class="bang clip" data-start="${f(t0)}" data-duration="${f(het - t0)}" data-track-index="2">
      <div class="bang-noi"><div class="bang-bt">${l.bang?.bieu_tuong ?? ''}</div><div class="bang-chu">${esc(l.bang?.chu ?? '')}</div></div>
    </div>`
})

// ── Ánh sáng & tông màu theo câu (AI chọn anh_sang): lớp màu hoà trộn mềm (soft-light) phủ cả khung, đổi êm giữa
// các câu cùng nhịp cảm xúc; loé sáng cho khoảnh khắc bất ngờ; đỏ nhấp nháy khi cảnh báo
const ANH_SANG = {
  binh_thuong: ['#000000', 0], am_ap: ['#ffa53d', 0.32], lanh: ['#3b6dff', 0.32], cang_thang: ['#0b0b2a', 0.5],
  tuoi_sang: ['#fff1a6', 0.3], mo_mong: ['#d59cff', 0.35], bi_an: ['#3a0a55', 0.48], canh_bao: ['#ff1f1f', 0.3], loe_sang: ['#000000', 0],
}
let anhTruoc = 'binh_thuong'
loi.forEach((l, i) => {
  const ten = ANH_SANG[l.anh_sang] ? l.anh_sang : 'binh_thuong'
  const t0 = batDau[i]
  const d = doDai[i]
  if (ten !== anhTruoc) {
    const [mau, op] = ANH_SANG[ten]
    tw.push(`tl.to("#den", { backgroundColor: "${mau}", opacity: ${op}, duration: 0.6, ease: "sine.inOut" }, ${f(Math.max(0, t0 - 0.3))});`)
  }
  if (ten === 'canh_bao') tw.push(`tl.to("#den", { opacity: 0.1, duration: 0.45, yoyo: true, repeat: ${2 * Math.max(1, Math.floor(d / 0.9)) - 1}, ease: "sine.inOut" }, ${f(t0 + 0.3)});`)
  if (ten === 'loe_sang') tw.push(`tl.fromTo("#chop", { opacity: 0.8 }, { opacity: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, ${f(t0)});`)
  anhTruoc = ten
})

// ── Âm thanh: hiệu ứng theo câu (AI chọn am_thanh), tiếng vút khi đổi cảnh, âm nền theo bối cảnh (ambience).
// Tệp ở may-nha/hoat-hinh/am-thanh, thợ máy nhà chép vào assets; thiếu tệp (thợ đời cũ) thì bỏ qua.
const doDaiTep = (ten) => {
  const tep = join(GOC, 'hyperframes', 'assets', `${ten}.wav`)
  if (!existsSync(tep)) return 0
  const b = readFileSync(tep)
  let i = 12, byteGiay = 0
  while (i + 8 <= b.length) {
    const loai = b.toString('ascii', i, i + 4), co = b.readUInt32LE(i + 4)
    if (loai === 'fmt ') byteGiay = b.readUInt32LE(i + 16)
    if (loai === 'data') return byteGiay ? Math.min(co, b.length - i - 8) / byteGiay : 0
    i += 8 + co + (co % 2)
  }
  return 0
}
const SFX = {
  vut: ['sfx-vut', 0.45], bum: ['sfx-bum', 0.55], ting: ['sfx-ting', 0.4], bop: ['sfx-bop', 0.4], coi_bao: ['sfx-coi', 0.3],
  go_phim: ['sfx-go-phim', 0.45], tim_dap: ['sfx-tim-dap', 0.55], tich_tac: ['sfx-tich-tac', 0.7], vui: ['sfx-vui', 0.35], hut_hang: ['sfx-hut-hang', 0.4],
}
const AM_NEN = {
  truong_quay: ['nen-phong', 0.25], pho_florida: ['nen-pho', 0.09], may_chu: ['nen-may-chu', 0.07], don_canh_sat: ['nen-phong', 0.3],
  phong_khach: ['nen-phong', 0.28], van_phong: ['nen-van-phong', 0.4], vu_tru: ['nen-vu-tru', 0.05], cua_hang: ['nen-van-phong', 0.35],
  thanh_pho_dem: ['nen-pho', 0.08], nong_thon: ['nen-thien-nhien', 0.25], truong_hoc: ['nen-phong', 0.25], benh_vien: ['nen-van-phong', 0.35],
  nha_may: ['nen-may-moc', 0.08], cong_truong: ['nen-may-moc', 0.07], san_bay: ['nen-dam-dong', 0.25], bai_bien: ['nen-bien', 0.1],
  nui_rung: ['nen-thien-nhien', 0.25], cho: ['nen-dam-dong', 0.35], nha_hang: ['nen-dam-dong', 0.25], san_van_dong: ['nen-dam-dong', 0.45],
  phong_hop: ['nen-van-phong', 0.35], phong_thi_nghiem: ['nen-may-chu', 0.05], hoi_truong: ['nen-phong', 0.3], cang_bien: ['nen-bien', 0.08],
  nha_ngheo: ['nen-phong', 0.25], san_khau: ['nen-dam-dong', 0.4], thanh_pho_tuyet: ['nen-thien-nhien', 0.15], thu_vien: ['nen-phong', 0.2],
  san_chung_khoan: ['nen-dam-dong', 0.25],
}
const amPhu = []
const themAm = (ten, luc, amLuong, toiDa = Infinity) => {
  const dai = Math.min(doDaiTep(ten), toiDa, TONG - luc)
  if (dai <= 0.05) return
  amPhu.push(`<audio id="ap-${amPhu.length}" src="assets/${ten}.wav" data-start="${f(luc)}" data-duration="${f(dai)}" data-track-index="${3000 + amPhu.length}" data-volume="${amLuong}"></audio>`)
}
loi.forEach((l, i) => {
  const sfx = SFX[l.am_thanh]
  if (sfx) themAm(sfx[0], batDau[i] + (l.am_thanh === 'bum' ? 0 : 0.05), sfx[1])
})
for (const cc of chuyenCanh) if (!SFX[loi[cc.i].am_thanh]) themAm('sfx-vut', Math.max(0, cc.t - 0.05), 0.28)
doanCanh.forEach((dc, k) => {
  const nen = AM_NEN[dc.ten]
  if (!nen) return
  const tu = k ? batDau[dc.tu] - 0.35 : 0
  const den = dc.het === loi.length - 1 ? TONG : batDau[dc.het + 1] - 0.35
  const doan = doDaiTep(nen[0])
  if (!doan) return
  for (let luc = tu; luc < den - 0.05; luc += doan) themAm(nen[0], luc, nen[1], den - luc)
})

// Khung ngang (YouTube): không có cột nút / dòng mô tả của TikTok che, nên phụ đề sát đáy, đầu trang và bảng tin gọn hơn
const CSS_NGANG = `
      .dau-trang { height: 130px; padding: 0 56px; }
      .kenh { font-size: 34px; }
      .chude { font-size: 26px; }
      .bang { padding-top: 34px; }
      .bang-noi { width: 760px; height: 176px; gap: 24px; }
      .bang-bt { font-size: 90px; }
      .bang-chu { font-size: 40px; }
      .moc { top: 110px; height: 400px; }
      .moc-chu { font-size: 76px; }
      .phu-de { height: 330px; padding: 0 160px 44px; background: linear-gradient(transparent, #00000080 45%, #00000099); }
      .pd-dong { font-size: 50px; }`

const trang = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${RONG}, height=${CAO}" />
    <title>Robot Bit và Mèo Mun</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "BVP"; src: url("assets/BeVietnamPro-Bold.ttf"); font-weight: 700; }
      @font-face { font-family: "BVP"; src: url("assets/BeVietnamPro-Medium.ttf"); font-weight: 500; }
      @font-face { font-family: "Emoji"; src: local("Segoe UI Emoji"); }
      body { margin: 0; background: #0b1020; color: #fff; font-family: "BVP", "Emoji", sans-serif; }
      #root { position: relative; width: ${RONG}px; height: ${CAO}px; overflow: hidden; }
      .clip { position: absolute; inset: 0; }
      .the-gioi { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; transform: translate(${LECH_X}px, ${LECH_Y}px); }
      .camera { position: absolute; inset: 0; transform-origin: ${GIUA_X}px ${GIUA_Y}px; }${CSS_MINH_HOA}
      /* Nền hơi nhoè như ống kính lấy nét vào nhân vật; nhân vật có viền sáng và bóng đổ mềm */
      #camera-nen { filter: blur(1.6px) saturate(1.08); }
      #toi-chuyen { position: absolute; inset: 0; background: #000; opacity: 0; }
      #den { position: absolute; inset: 0; background: #000; opacity: 0; mix-blend-mode: soft-light; }
      #chop { position: absolute; inset: 0; background: #fff; opacity: 0; }
      .nv { filter: drop-shadow(0 0 10px #ffffff66) drop-shadow(0 24px 30px #0000008c); }
      .lop-nen { position: absolute; inset: 0; }
      .nen-svg { display: block; }
      .hat { position: absolute; border-radius: 50%; background: radial-gradient(circle, #ffffffcc, #ffffff00 70%); }
      #vien-toi { background: radial-gradient(ellipse 85% 70% at 50% 45%, transparent 55%, #00000099 100%); }
      .dao-cu { position: absolute; top: 560px; width: 190px; height: 190px; display: flex; align-items: center; justify-content: center; font-size: 150px; line-height: 1; font-family: "Emoji", sans-serif; filter: drop-shadow(0 18px 24px #0008); opacity: 0; }
      .dao-cu.meo { left: ${NGANG ? -330 : 10}px; top: ${NGANG ? 690 : 470}px; }
      .dao-cu.robot { left: ${NGANG ? 1220 : 880}px; top: ${NGANG ? 690 : 470}px; }
      .nv-phu { position: absolute; left: 354px; top: ${440 + PHU_XUONG}px; width: 372px; height: 600px; opacity: 0; }
      #vet-quet { position: absolute; top: 0; left: 0; width: ${RONG}px; height: ${CAO}px; opacity: 0; background: linear-gradient(90deg, transparent, #ffffffaa 45%, #ffffffaa 55%, transparent); }
      .dau-trang { height: 200px; background: linear-gradient(#000000aa, transparent); display: flex; align-items: center; justify-content: space-between; padding: 0 64px; box-sizing: border-box; }
      .kenh { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 700; }
      .vach { display: block; width: 10px; height: 48px; border-radius: 6px; background: #38bdf8; }
      .chude { font-size: 30px; font-weight: 700; padding: 10px 26px; border-radius: 999px; background: #e11d48; }
      .bang { display: flex; justify-content: center; padding-top: 230px; box-sizing: border-box; }
      .bang-noi { display: flex; align-items: center; gap: 30px; width: 860px; height: 210px; padding: 0 40px; box-sizing: border-box; border-radius: 32px; background: #0f172a; border: 8px solid #475569; box-shadow: 0 0 0 8px #1e293b, 0 30px 60px #0008; }
      .bang-bt { display: block; font-size: 110px; line-height: 1; font-family: "Emoji", sans-serif; }
      .bang-chu { font-size: 46px; font-weight: 700; line-height: 1.2; text-align: left; }
      .o-nv { position: absolute; top: 590px; width: 620px; height: 723px; }
      #o-meo { left: ${-30 - GIAN}px; }
      #o-robot { right: ${-30 - GIAN}px; }
      .nv { display: block; overflow: visible; }
      #meo-mieng-mo, #robot-mieng-mo { opacity: 0; }
      /* Phụ đề nằm trên vùng an toàn của TikTok: ~420px dưới cùng là tên kênh / mô tả / nhạc, ~130px bên phải là cột nút
         (tim, bình luận, chia sẻ) nên chữ đặt cao hơn đáy 430px và lệch trái một chút. Nền mờ dần chỉ quanh dòng chữ. */
      .phu-de { top: auto; height: 680px; display: flex; align-items: flex-end; justify-content: center; padding: 0 130px 430px 40px; box-sizing: border-box; background: linear-gradient(transparent 20%, #00000080 52%, #00000080 72%, transparent 92%); }
      .pd-khung { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .pd-ten { font-size: 25px; font-weight: 700; padding: 5px 16px; border-radius: 999px; margin-bottom: 4px; background: #f59e0b; color: #1c1917; }
      .pd-ten.robot { background: #22d3ee; color: #082f49; }
      .pd-ten.ke { background: #fde68a; color: #422006; }
      .pd-tai-hien { font-size: 20px; font-weight: 700; padding: 3px 12px; border-radius: 6px; margin-bottom: 4px; background: #00000099; color: #fbbf24; border: 2px solid #fbbf24; letter-spacing: 1px; text-transform: uppercase; }
      .the-moc { position: absolute; left: 56px; top: ${NGANG ? 150 : 240}px; display: flex; align-items: center; gap: 12px; padding: 12px 24px 12px 18px; border-radius: 14px; background: #0f172ae6; border-left: 8px solid #fbbf24; font-size: ${NGANG ? 34 : 38}px; font-weight: 700; color: #fff; box-shadow: 0 16px 36px #0008; opacity: 0; }
      .dao-cu.nguoi_ke { left: ${NGANG ? 1220 : 445}px; top: ${NGANG ? 560 : 380}px; }
      .pd-dong { font-size: 48px; font-weight: 700; line-height: 1.2; white-space: nowrap; text-shadow: 0 0 5px #000, 0 3px 0 #000, 2.5px 2.5px 0 #000, -2.5px 2.5px 0 #000, 2.5px -2.5px 0 #000, -2.5px -2.5px 0 #000; }
      .pd-tu { display: inline-block; color: #fff; }${NGANG ? CSS_NGANG : ''}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-width="${RONG}" data-height="${CAO}" data-duration="${f(TONG)}">
      <div id="canh" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="0">
        <div class="the-gioi"><div id="camera-nen" class="camera">${nenCanh.join('')}${hat.join('')}</div></div>
        <div id="toi-chuyen"></div>
        <div id="vet-quet"></div>
      </div>
      <div id="dau-trang" class="dau-trang clip" data-start="0" data-duration="${f(TONG)}" data-track-index="6">
        <div class="kenh"><span class="vach"></span>${esc(kenh)}</div><div class="chude">${esc(chu_de)}</div>
      </div>${bang.join('')}
      <div id="sau-khau" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="4">
        <div class="the-gioi"><div id="camera-nv" class="camera">
          ${nvPhu.join('')}
          <div id="o-meo" class="o-nv">${meoSvg}</div>
          <div id="o-robot" class="o-nv">${robotSvg}</div>
          ${daoCu.join('')}
          ${minhHoa.join('')}
        </div></div>
      </div>
      <div id="vien-toi" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="5"><div id="den"></div><div id="chop"></div></div>
      <div id="lop-minh-hoa" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="7">${giatTit.html}${theMoc.join('')}${minhHoaKhung.join('')}</div>${phuDe.join('')}
      ${[...amThanh, ...amPhu].join('\n      ')}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${tw.join('\n      ')}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`
writeFileSync(join(GOC, 'hyperframes/index.html'), trang)
console.log(`Đã sinh ${loi.length} câu thoại, dài ${f(TONG)} giây`)
