// Video hoạt hình hai nhân vật đối đáp (Mèo Mun hỏi, Robot Bit giải thích) cho HyperFrames, dọc 1080x1920.
// Vào (trong thư mục làm việc): artifacts/loi_thoai.json (lời thoại + cảm xúc + bối cảnh + bảng tin),
// artifacts/do_dai.json, hyperframes/assets/loi-<i>.wav. Miệng nhép theo độ to thật của giọng.
// Chạy: node tao_video.mjs <thư mục làm việc> → <thư mục>/hyperframes/index.html (thợ đọc giọng gọi, may-nha/tho_doc.py)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { BOI_CANH } from './boiCanh.mjs'
import { NHAN_VAT_PHU, nguoiKeSvg, nhanVatChinhSvg } from './nhanVatPhu.mjs'
import { meoSvg, robotSvg } from './nhanVatChinh.mjs'
import { DAO_CU } from './daoCu.mjs'
import { HANH_DONG } from './hanhDong.mjs'
import { lopSong } from './lopSong.mjs'
import { CSS_MINH_HOA, MINH_HOA, mocMoDau } from './minhHoa.mjs'

const GOC = resolve(process.argv[2] ?? '.')
const { nhan_vat, loi, moc, kenh = 'Công Nghệ 24H', chu_de = 'AI', kho = 'doc', the_chuong = null, man_ket = false, nhan_vat_chinh = null, dong_thoi_gian = null } = JSON.parse(readFileSync(join(GOC, 'artifacts/loi_thoai.json'), 'utf8'))
const doDai = JSON.parse(readFileSync(join(GOC, 'artifacts/do_dai.json'), 'utf8'))
// Câu có ảnh thật (phim tiểu sử): máy quay lùi ra toàn cảnh để khung ảnh phía trên không đè lên đầu nhân vật
for (const l of loi) if (l.anh_wiki?.tep) l.khung_hinh = 'toan_canh'
// Phim tiểu sử: người được kể là một nhân vật trên sân khấu như nhân vật phụ (xuất hiện, nói, nhép miệng, rời đi),
// vẽ theo bản thiết kế AI của chương này (lib/youtube.ts: loiThoaiGui)
if (nhan_vat_chinh?.hinh) {
  const v = nhanVatChinhSvg(nhan_vat_chinh.hinh)
  NHAN_VAT_PHU.nhan_vat_chinh = { mau: '#fde68a', bieu_tuong: '⭐', ten: nhan_vat_chinh.ten ?? 'Nhân vật chính', svg: v.svg, viewBox: v.viewBox }
}
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
// Thẻ chương (video YouTube nhiều phần). Có câu người kể đọc tên chương (la_chuong, lib/youtube.ts chèn) thì thẻ
// hiện đúng trong câu đó; không có thì như cũ: 2,4 giây đầu phần im lặng là màn tiêu đề. Màn kết 6 giây cuối video.
const I_CHUONG = the_chuong ? loi.findIndex((l) => l.la_chuong) : -1
const MO_CHUONG = the_chuong && I_CHUONG < 0 ? 2.4 : 0
// Màn kết: khung ngang (YouTube) 8 giây — vừa đủ cho "màn hình kết thúc" của YouTube (tối thiểu 5 giây, 2 ô video
// đề xuất); dọc 6 giây
const MAN_KET = man_ket ? (NGANG ? 8 : 6) : 0
let t = 0.4 + MO_CHUONG // nhịp mở đầu trước câu đầu tiên
for (const [i, d] of doDai.entries()) {
  // Khoảng lặng có chủ đích (AI đặt lang) trước câu quan trọng: im 0,9 giây, chỉ còn âm nền
  if (i && loi[i]?.lang) t += 0.9
  // Sau câu đọc tên chương: nghỉ thêm một nhịp cho thẻ chương mờ đi rồi mới vào chuyện
  if (i && loi[i - 1]?.la_chuong) t += 0.5
  // Đổi bối cảnh: nghỉ thêm 0,55 giây để chuyển cảnh chạy xong đúng lúc câu mới bắt đầu
  const canh = (l) => (BOI_CANH[l?.boi_canh] ? l.boi_canh : 'truong_quay')
  if (i && canh(loi[i]) !== canh(loi[i - 1])) t += 0.55
  batDau.push(t)
  t += d
}
const HET_NOI = t + DUOI // lúc lời cuối cùng dứt
const TONG = HET_NOI + MAN_KET
writeFileSync(join(GOC, 'artifacts/phu_de.json'), JSON.stringify(loi.map((l, i) => ({ bd: +batDau[i].toFixed(2), kt: +(batDau[i] + doDai[i]).toFixed(2), chu: l.chu }))))
const tw = []

// ── Nhân vật chính: nhanVatChinh.mjs (SVG vẽ tay, mỗi bộ phận một nhóm có điểm xoay) ─

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
const VAO_SAN = I_CHUONG === 0 ? batDau[0] + doDai[0] + 0.1 : MO_CHUONG
tw.push(`tl.from("#o-meo", { x: ${NGANG ? -1150 : -700}, duration: 0.6, ease: "back.out(1.4)" }, ${f(Math.max(0, VAO_SAN - 0.3))});`)
tw.push(`tl.from("#o-robot", { x: ${NGANG ? 1150 : 700}, duration: 0.6, ease: "back.out(1.4)" }, ${f(Math.max(0.1, VAO_SAN - 0.2))});`)

// ── Nhân vật phụ trên sân khấu: câu do nhân vật phụ nói, hoặc câu nhắc tới họ (AI chọn nhan_vat_phu).
// Các câu liền nhau cùng một nhân vật phụ gom thành một lần xuất hiện; phuCuaCau[i] là id phần tử của họ ở câu i.
// Các câu có nhân vật phụ cách nhau tối đa 2 câu và chỉ gồm tối đa 2 người khác nhau thì chung một "cảnh": cả hai cùng
// đứng trên sân khấu (lệch trái / phải) cho tới hết cảnh, để họ nói chuyện, phỏng vấn, tranh luận với nhau.
// Mỗi người có mặt theo "đợt": các câu họ nói hoặc được nhắc tới (nhan_vat_phu) cách nhau tối đa 4 câu thì họ Ở LẠI sân
// khấu suốt đợt (không ra rồi vào lại); hết đợt mới rời đi. Sân khấu tối đa 2 người cùng lúc: người thứ ba tới thì người
// có đợt kết thúc sớm nhất nhường chỗ (đợt của họ được cắt tại câu cuối của chính họ trước đó, phần còn lại thành đợt
// sau). Đứng một mình thì ở giữa, có người cùng đứng thì lệch trái / phải.
const GIAN_DOT = 4
const cuaCau = (l) => (NHAN_VAT_PHU[l.ai] ? l.ai : NHAN_VAT_PHU[l.nhan_vat_phu] ? l.nhan_vat_phu : null)
const dotPhu = []
{
  const theoNguoi = {}
  loi.forEach((l, i) => {
    const ten = cuaCau(l)
    if (ten) (theoNguoi[ten] ??= []).push(i)
  })
  for (const [ten, ds] of Object.entries(theoNguoi)) {
    let dot = null
    for (const i of ds) {
      if (dot && i - dot.het <= GIAN_DOT) {
        dot.het = i
        dot.cau.push(i)
      } else dotPhu.push((dot = { ten, tu: i, het: i, cau: [i] }))
    }
  }
  dotPhu.sort((x, y) => x.tu - y.tu)
  // Người mới bước vào: ai đang đứng mà KHÔNG tham gia câu ngay trước / câu này (không phải đang nói chuyện qua lại với
  // người mới) là đã hết nhiệm vụ → rời đi trước (đợt của họ cắt tại câu cuối của chính họ; nếu lát nữa còn được nhắc thì
  // vào lại thành đợt sau). Còn lại vẫn quá 2 người thì người hết đợt sớm nhất nhường chỗ.
  const cat = (x, tu) => {
    const truoc = x.cau.filter((i) => i < tu)
    const sau = x.cau.filter((i) => i >= tu)
    x.cau = truoc
    x.het = truoc.at(-1) ?? x.tu
    if (sau.length) {
      dotPhu.push({ ten: x.ten, tu: sau[0], het: sau.at(-1), cau: sau })
      dotPhu.sort((p, q) => p.tu - q.tu)
    }
  }
  for (let k = 0; k < dotPhu.length; k++) {
    const d = dotPhu[k]
    for (const x of dotPhu.slice(0, k).filter((x) => x.het >= d.tu && x.tu < d.tu && x.cau.some((i) => i < d.tu))) {
      if (!x.cau.includes(d.tu - 1) && !x.cau.includes(d.tu)) cat(x, d.tu)
    }
    const dangCo = dotPhu.slice(0, k).filter((x) => x.het >= d.tu && x.tu <= d.tu)
    if (dangCo.length >= 2) cat(dangCo.sort((x, y) => x.het - y.het)[0], d.tu)
  }
}
const LECH_PHU = 200
const chongNhau = (x, y) => x !== y && x.tu <= y.het && y.tu <= x.het
const doanPhu = dotPhu.map((d) => ({ ...d }))
doanPhu.forEach((d, k) => {
  // Đứng một mình suốt đợt: ở giữa; có người cùng đứng: người tới trước bên trái, người tới sau đứng phía còn trống
  const ban = doanPhu.filter((x) => chongNhau(x, d))
  d.doi = ban.length > 0
  d.lech = !d.doi ? 0 : ban.some((x) => doanPhu.indexOf(x) < k && x.lech === -LECH_PHU) ? LECH_PHU : -LECH_PHU
})
// hetCum: câu cuối của cả khối liên tục có người trên sân khấu (Mèo / Bit trở về chỗ cũ khi người cuối cùng rời đi)
for (const d of doanPhu) {
  let het = d.het
  for (let doi = true; doi; ) {
    doi = false
    for (const x of doanPhu) if (x.tu <= het + 1 && x.het > het && x.tu >= d.tu - 50) ((het = x.het), (doi = true))
  }
  d.hetCum = het
}
const phuCuaCau = {}
const viTriPhu = {} // id → toạ độ x giữa người đó (để máy quay cận vào)
doanPhu.forEach((dp, k) => {
  viTriPhu[`phu${k}`] = 540 + dp.lech
  for (const i of dp.cau) phuCuaCau[i] = `phu${k}`
})
const laPhu = (ai) => !!NHAN_VAT_PHU[ai]
// Ảnh thật (phim tiểu sử): các câu liền nhau cùng một ảnh gom một đoạn. Kiểu đặt: đoạn chỉ có người kể (Mèo / Bit đã
// lui ra mép) và không có hai nhân vật phụ cùng đứng → ảnh lớn bên phải; còn lại → ảnh nhỏ trên cao giữa màn hình
const doanAnh = []
loi.forEach((l, i) => {
  const a = l.anh_wiki
  if (!a?.tep) return
  const c = doanAnh.at(-1)
  if (c && c.a.tep === a.tep && c.het === i - 1) c.het = i
  else doanAnh.push({ a, tu: i, het: i })
})
for (const c of doanAnh) {
  const chiNguoiKe = loi.slice(c.tu, c.het + 1).every((l) => l.ai === 'nguoi_ke')
  const haiPhu = doanPhu.some((dp) => dp.doi && dp.tu <= c.het && dp.het >= c.tu)
  c.kieu = NGANG && chiNguoiKe && !haiPhu ? 'ben' : 'tren'
}
// Khung ngang: câu có thẻ nằm trên cao (thẻ minh hoạ, ảnh kiểu "trên") → máy quay lùi nhẹ + hạ khung (chừa khoảng
// trống trên đầu nhân vật cho thẻ), không cận mặt, để thẻ không đè lên đầu ai
const THE_TREN = new Set()
if (NGANG) {
  loi.forEach((l, i) => {
    if (MINH_HOA[l.minh_hoa?.kieu] && !l.anh_wiki?.tep) THE_TREN.add(i)
  })
  for (const c of doanAnh) if (c.kieu === 'tren') for (let i = c.tu; i <= c.het; i++) THE_TREN.add(i)
  loi.forEach((l, i) => {
    if (l.hanh_dong === 'lich_lat') THE_TREN.add(i)
  })
}
// Chữ động nhấn con số (khung ngang): câu có con số kèm đơn vị ("40.000 kỵ binh", "70%", "3 tỷ đô") → con số bật to giữa
// phía trên đúng lúc giọng đọc tới. Bỏ qua câu đã có thẻ / ảnh, năm đứng một mình (đã có thanh dòng thời gian); tối đa
// 1 lần mỗi 4 câu cho khỏi rối
const SO_DONG = {}
if (NGANG) {
  const reSo = /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(%|phần trăm|năm|tuổi|triệu|tỷ|nghìn|ngàn|vạn|km|kg|người|kỵ binh|binh sĩ|quân|đô la|đô|USD|đồng|lần|ngày|tháng|chiếc|công ty|quốc gia)(?![\p{L}])/iu
  let truoc = -9
  loi.forEach((l, i) => {
    if (THE_TREN.has(i) || l.anh_wiki?.tep || l.la_chuong || i - truoc < 4) return
    const m = String(l.chu).match(reSo)
    if (!m) return
    SO_DONG[i] = { chu: `${m[1]} ${m[2]}`.trim(), vt: m.index / Math.max(1, l.chu.length) }
    THE_TREN.add(i)
    truoc = i
  })
}

// Khung bao của nhân vật (để nhún, nhảy, phóng to khi nói)
const khung = (p) => (p.startsWith('phu') ? `#${p}` : `#o-${p}`)

// ── Từng câu thoại: nhép miệng theo giọng, cử chỉ theo cảm xúc, người nghe quay sang nhìn ─
// Cử chỉ theo cảm xúc, dùng chung cho cả hai nhân vật (bộ phận cùng tên: <ai>-dau, <ai>-tay-trai...)
// Nét mặt nhân vật phụ / nhân vật chính (khung người chung nhanVatPhu.mjs): lông mày, má ửng, nước mắt, mồ hôi, gân giận
const laNguoi = (ai) => ai.startsWith('phu')
const net = (ai, t0, o) =>
  laNguoi(ai)
    ? [
        ...(o.may !== undefined ? [`tl.to(["#${ai}-may-trai", "#${ai}-may-phai"], { y: ${o.may}, rotation: (i) => (i ? ${-(o.chau ?? 0)} : ${o.chau ?? 0}), svgOrigin: "200 165", duration: 0.25 }, ${f(t0)});`] : []),
        ...(o.lop ?? []).map((ten) => `tl.to("#${ai}-${ten}", { opacity: 1, duration: 0.25 }, ${f(t0 + 0.1)});`),
        ...(o.lop ?? []).includes('nuoc-mat') ? [`tl.fromTo("#${ai}-nuoc-mat", { y: 0 }, { y: 18, duration: 0.9, repeat: 2, ease: "power1.in" }, ${f(t0 + 0.2)});`] : [],
        ...(o.lop ?? []).includes('mo-hoi') ? [`tl.fromTo("#${ai}-mo-hoi", { y: 0 }, { y: 14, duration: 1, repeat: 1, ease: "power1.in" }, ${f(t0 + 0.2)});`] : [],
      ]
    : []

const CU_CHI = {
  // Tò mò: nghiêng đầu, tay lên cằm
  to_mo: (ai, t0) => [
    `tl.to("#${ai}-dau", { rotation: -10, duration: 0.4, ease: "back.out(1.3)" }, ${f(t0)});`,
    `tl.to("#${ai}-tay-phai", { rotation: -150, duration: 0.45, ease: "back.out(1.2)" }, ${f(t0 + 0.1)});`,
  ],
  // Bất ngờ: nhảy lên, mắt to, hai tay giơ lên (mèo dựng tai), nhướn mày
  bat_ngo: (ai, t0) => [
    ...net(ai, t0, { may: -12 }),
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
  // Vui: nhún nhảy, vẫy hai tay (robot tim đập nhanh), má ửng hồng
  vui: (ai, t0) => [
    ...net(ai, t0, { may: -6, lop: ['ma-hong'] }),
    `tl.to("${khung(ai)}", { y: -40, duration: 0.24, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t0)});`,
    `tl.to(["#${ai}-tay-trai", "#${ai}-tay-phai"], { rotation: (i) => (i ? -120 : 120), duration: 0.25, ease: "back.out(1.3)" }, ${f(t0)});`,
    `tl.to(["#${ai}-tay-trai", "#${ai}-tay-phai"], { rotation: (i) => (i ? -95 : 95), duration: 0.24, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t0 + 0.3)});`,
    ...(ai === 'robot' ? [`tl.to("#robot-tim", { scale: 1.4, duration: 0.15, yoyo: true, repeat: 5 }, ${f(t0)});`] : []),
  ],
  // Lo lắng: cúi đầu, khép tay, mắt nhỏ lại, run nhẹ, mày chau, đổ mồ hôi
  lo_lang: (ai, t0) => [
    ...net(ai, t0, { may: -4, chau: -12, lop: ['mo-hoi'] }),
    `tl.to("#${ai}-dau", { rotation: 8, duration: 0.4 }, ${f(t0)});`,
    `tl.to(["#${ai}-tay-trai", "#${ai}-tay-phai"], { rotation: (i) => (i ? 25 : -25), duration: 0.5, ease: "sine.inOut" }, ${f(t0)});`,
    ...(ai.startsWith('phu') ? [] : [`tl.to(["#${ai}-mat-trai", "#${ai}-mat-phai"], { scale: 0.85, duration: 0.3 }, ${f(t0)});`]),
    `tl.to("${khung(ai)}", { x: 4, duration: 0.1, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t0 + 0.3)});`,
  ],
  // Buồn: cúi đầu thấp, hai tay buông, mày chau xuống, khóc (nhân vật người), mèo cụp tai
  buon: (ai, t0) => [
    ...net(ai, t0, { may: 4, chau: -14, lop: ['nuoc-mat'] }),
    `tl.to("#${ai}-dau", { rotation: 12, duration: 0.6, ease: "sine.inOut" }, ${f(t0)});`,
    `tl.to(["#${ai}-tay-trai", "#${ai}-tay-phai"], { rotation: (i) => (i ? 12 : -12), duration: 0.6, ease: "sine.inOut" }, ${f(t0)});`,
    `tl.to("${khung(ai)}", { y: 14, duration: 0.6, ease: "sine.inOut" }, ${f(t0)});`,
    `tl.to("${khung(ai)}", { y: 0, duration: 0.5, ease: "sine.inOut" }, ${f(t0 + 2.2)});`,
    ...(ai === 'meo' ? [`tl.to("#meo-tai-trai", { rotation: 22, duration: 0.4 }, ${f(t0)});`, `tl.to("#meo-tai-phai", { rotation: -22, duration: 0.4 }, ${f(t0)});`] : []),
    ...(laNguoi(ai) ? [] : [`tl.to(["#${ai}-mat-trai", "#${ai}-mat-phai"], { scaleY: 0.7, duration: 0.4 }, ${f(t0)});`]),
  ],
  // Tức giận: giậm chân rung người, nắm tay giơ lên, mày chau nhọn, gân giận
  tuc_gian: (ai, t0) => [
    ...net(ai, t0, { may: 6, chau: 16, lop: ['gian'] }),
    `tl.to("#${ai}-tay-phai", { rotation: -165, duration: 0.25, ease: "back.out(2)" }, ${f(t0)});`,
    `tl.to("#${ai}-tay-phai", { rotation: -145, duration: 0.12, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t0 + 0.3)});`,
    `tl.to("${khung(ai)}", { x: 7, duration: 0.06, yoyo: true, repeat: 9, ease: "none" }, ${f(t0 + 0.1)});`,
    `tl.to("#${ai}-dau", { rotation: -5, duration: 0.15, yoyo: true, repeat: 3 }, ${f(t0 + 0.2)});`,
  ],
  // Suy nghĩ: nghiêng đầu ngược lại, tay chống cằm, mắt nhìn lên
  suy_nghi: (ai, t0) => [
    ...net(ai, t0, { may: -4, chau: 8 }),
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
  if (i && phuCuaCau[i - 1]) {
    const q = phuCuaCau[i - 1]
    tw.push(`tl.to(["#${q}-ma-hong", "#${q}-nuoc-mat", "#${q}-mo-hoi", "#${q}-gian"], { opacity: 0, duration: 0.3 }, ${f(t0 - 0.3)});`)
    tw.push(`tl.to(["#${q}-may-trai", "#${q}-may-phai"], { y: 0, rotation: 0, duration: 0.3 }, ${f(t0 - 0.3)});`)
  }
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
  const am = doTo(join(GOC, `hyperframes/assets/loi-${i}.wav`))
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
  tw.push(`tl.set("#${p}-mieng-mo", { opacity: 0 }, ${f(t0 + d)});`)
  tw.push(`tl.set("#${p}-mieng-dong", { opacity: 1 }, ${f(t0 + d)});`)
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
  if (l.la_chuong) doanPd.length = 0
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
// Lớp tiền cảnh (khung ngang): cảnh ngoài trời có bụi cỏ / gò cát mờ ở hai góc dưới, nằm TRƯỚC nhân vật và trôi
// ngược chiều nhẹ — tạo chiều sâu như máy quay thật. Hiện / tắt dần theo đoạn bối cảnh
const TIEN_CANH = {
  co: ['nong_thon', 'nui_rung', 'thao_nguyen', 'lang_xua', 'chien_truong', 'thanh_co', 'den_chua', 'pho_florida', 'cong_truong'],
  cat: ['sa_mac', 'bai_bien'],
}
const coTien = (mau) => `<svg viewBox="0 0 400 260" width="460" height="300"><path d="M0 260 L0 150 Q20 60 40 150 Q50 40 70 140 Q90 20 100 150 Q120 70 135 160 Q160 30 170 170 Q195 90 210 180 Q240 110 250 200 Q280 150 300 230 Q330 200 360 260 Z" fill="${mau}"/></svg>`
const catTien = (mau) => `<svg viewBox="0 0 400 200" width="520" height="260"><path d="M0 200 L0 110 Q120 40 260 110 Q330 140 400 200 Z" fill="${mau}"/></svg>`
const tienCanh = NGANG
  ? doanCanh.flatMap((dc, k) => {
      const loai = TIEN_CANH.co.includes(dc.ten) ? 'co' : TIEN_CANH.cat.includes(dc.ten) ? 'cat' : null
      if (!loai) return []
      const t0 = Math.max(0, batDau[dc.tu] - 0.3)
      const t1 = dc.het === loi.length - 1 ? TONG : batDau[dc.het + 1]
      const id = `tc${k}`
      tw.push(`tl.fromTo("#${id}", { opacity: 0 }, { opacity: 1, duration: 0.6, immediateRender: false }, ${f(t0)});`)
      tw.push(`tl.to("#${id}", { opacity: 0, duration: 0.5 }, ${f(Math.max(t0 + 0.6, t1 - 0.5))});`)
      tw.push(`tl.fromTo("#${id}-trai", { x: -20 }, { x: 30, duration: ${f(Math.max(1, t1 - t0))}, ease: "sine.inOut" }, ${f(t0)});`)
      tw.push(`tl.fromTo("#${id}-phai", { x: 20 }, { x: -30, duration: ${f(Math.max(1, t1 - t0))}, ease: "sine.inOut" }, ${f(t0)});`)
      const ve = loai === 'co' ? coTien(dc.ten === 'chien_truong' ? '#1c1917' : '#14532d') : catTien('#92400e')
      return [`<div id="${id}" class="tien-canh"><div id="${id}-trai" class="tc-trai">${ve}</div><div id="${id}-phai" class="tc-phai">${ve}</div></div>`]
    })
  : []
const KIEU_CHUYEN = ['truot', 'phong', 'quet', 'mo', 'xuyen']
const chuyenCanh = [] // { i: câu đầu cảnh mới, t: lúc đổi, kieu } (để chèn tiếng vút)
const nenCanh = doanCanh.map((dc, k) => {
  // Kiểu chuyển cảnh AI chọn theo cảm xúc (chuyen_canh ở câu đầu của cảnh mới); không có thì lần lượt từng kiểu
  const chon = loi[dc.tu].chuyen_canh
  const kieu = KIEU_CHUYEN.includes(chon) ? chon : KIEU_CHUYEN[(Math.max(1, k) - 1) % KIEU_CHUYEN.length]
  // Hiệu ứng chạy hết ~0,75 giây: bắt đầu 0,75 giây trước câu mới, nhưng không trước lúc câu trước dứt tiếng
  // (đuôi mỗi câu có 0,25 giây lặng)
  const dutTieng = k ? batDau[dc.tu - 1] + doDai[dc.tu - 1] - 0.25 : 0
  const t0 = k ? Math.max(dutTieng, batDau[dc.tu] - 0.75) : 0
  const het = dc.het === loi.length - 1 ? TONG : batDau[dc.het + 1]
  const bc = BOI_CANH[dc.ten](`bc${k}`)
  tw.push(...bc.tw(t0, het - t0))
  // Lớp sự sống + chiều sâu (người đi đường, chim, nắng xiên, bụi, mù xa, viền tối) — lopSong.mjs
  const song = lopSong(dc.ten, `bc${k}`, { f, lap, NGANG })
  tw.push(...song.tw(t0, het - t0))
  if (k) {
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
    ? `<svg class="nen-svg" viewBox="-1080 0 3240 1920" width="3240" height="1920" style="margin-left:-1080px"><g>${bc.svg}</g><g transform="scale(-1 1)">${guong}</g><g transform="translate(2160 0) scale(-1 1)">${guong}</g>${song.svg}</svg>`
    : `<svg class="nen-svg" viewBox="0 0 1080 1920" width="1080" height="1920">${bc.svg}${song.svg}</svg>`
  // Ảnh nền thật (video YouTube: ảnh Pixabay máy nhà tải theo từ khoá của cảnh, anh_nen_tep ở câu đầu cảnh): phủ phần
  // phía trên mặt sàn (y < 1180), mờ dần xuống sàn vẽ để nhân vật vẫn đứng trên sàn hoạt hình; hơi nhoè + tối nhẹ như
  // phông sân khấu, từ từ phóng to suốt cảnh. Không có ảnh thì giữ nguyên cảnh vẽ.
  const tepAnh = loi[dc.tu].anh_nen_tep
  let anh = ''
  if (tepAnh && existsSync(join(GOC, 'hyperframes/assets', tepAnh))) {
    const [x, y, w, h] = NGANG ? [-560, 160, 2200, 1040] : [-60, -60, 1200, 1260]
    anh = `<img id="bc${k}-anh" class="anh-nen-canh" src="assets/${esc(tepAnh)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"/>`
    tw.push(`tl.fromTo("#bc${k}-anh", { scale: 1 }, { scale: 1.06, duration: ${f(Math.max(1, het - t0))}, ease: "none", immediateRender: false }, ${f(t0)});`)
  }
  return `<div id="bc${k}" class="lop-nen"${k ? ' style="opacity:0"' : ''}>${svg}${anh}</div>`
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
  // Đi bộ vào từ mép gần chỗ họ đứng (người bên trái vào từ trái), xong bước trước khi câu của họ bắt đầu; không sớm
  // hơn lúc câu trước dứt tiếng. Bước đi: nhún người + đánh hai tay, số bước lẻ để kết thúc đúng tư thế
  const ben = dp.lech < 0 || (dp.lech === 0 && k % 2) ? -1 : 1
  // Người vừa xong việc ở câu trước rời đi từ 0,3 giây cuối câu đó → người mới chỉ bước vào khi họ đã đi hẳn
  const raTruoc = Math.max(0, ...doanPhu.filter((x) => x !== dp && x.het === dp.tu - 1).map((x) => batDau[x.het] + doDai[x.het] + 0.05))
  const vao = Math.max(raTruoc, dp.tu ? batDau[dp.tu - 1] + doDai[dp.tu - 1] - 0.3 : 0, t0 - 0.85)
  const diVao = Math.max(0.4, Math.min(0.8, t0 + 0.3 - vao))
  tw.push(`tl.fromTo("#${id}", { opacity: 0, x: ${ben * 620}, y: 0, scale: 1 }, { opacity: 1, x: 0, duration: ${f(diVao)}, ease: "power1.out" }, ${f(vao)});`)
  tw.push(`tl.fromTo("#${id} svg", { y: 0 }, { y: -14, duration: ${f(diVao / 6)}, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(vao)});`)
  tw.push(`tl.fromTo(["#${id}-tay-trai", "#${id}-tay-phai"], { rotation: (i) => (i ? -22 : 22) }, { rotation: (i) => (i ? 22 : -22), duration: ${f(diVao / 3)}, yoyo: true, repeat: 2, ease: "sine.inOut" }, ${f(vao)});`)
  tw.push(`tl.to(["#${id}-tay-trai", "#${id}-tay-phai"], { rotation: 0, duration: 0.2 }, ${f(vao + diVao)});`)
  tw.push(`tl.to("#${id}-tay-phai", { rotation: -140, duration: 0.3, ease: "back.out(2)" }, ${f(t0 + 0.5)});`)
  tw.push(`tl.to("#${id}-tay-phai", { rotation: -115, duration: 0.18, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t0 + 0.8)});`)
  tw.push(`tl.to("#${id}-tay-phai", { rotation: 0, duration: 0.3 }, ${f(t0 + 1.9)});`)
  tw.push(`tl.to("#${id}-dau", { rotation: 6, duration: 0.5, yoyo: true, repeat: ${lap(het - t0 - 2.2, 0.5) | 1}, ease: "sine.inOut" }, ${f(t0 + 2.2)});`)
  // Rời sân khấu: quay lưng đi ra phía mép đã vào
  // Hết nhiệm vụ: rời nhanh (0,35 giây) ngay cuối câu cuối của mình, nhường chỗ cho người kế tiếp
  tw.push(`tl.to("#${id}", { x: ${ben * 420}, opacity: 0, duration: 0.35, ease: "power2.in" }, ${f(het - 0.3)});`)
  tw.push(`tl.to("#${id} svg", { y: -12, duration: 0.1, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(het - 0.3)});`)
  // Không ghi tên trên đầu (trang phục tự nói lên họ là ai); hai nhân vật chính dạt sang hai bên chừa chỗ cho nhân vật phụ
  // Hai người cùng đứng thì Mèo / Bit dạt xa hơn
  tw.push(`tl.to("#o-meo", { x: ${dp.doi ? -240 : -80}, duration: 0.5, ease: "power2.inOut" }, ${f(vao)});`)
  tw.push(`tl.to("#o-robot", { x: ${dp.doi ? 240 : 80}, duration: 0.5, ease: "power2.inOut" }, ${f(vao)});`)
  // Mèo / Bit về chỗ cũ khi người cuối cùng của cảnh rời đi
  if (dp.het === dp.hetCum) tw.push(`tl.to(["#o-meo", "#o-robot"], { x: 0, duration: 0.5, ease: "power2.inOut" }, ${f(het - 0.1)});`)
  return `<div id="${id}" class="nv-phu" data-ten="${dp.ten}" style="left:${354 + dp.lech}px"><svg viewBox="${NHAN_VAT_PHU[dp.ten].viewBox ?? '0 0 400 600'}" width="372" height="558" class="nv">${NHAN_VAT_PHU[dp.ten].svg(id)}</svg></div>`
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
  const chuaDau = THE_TREN.has(i)
  const chiDan = !chuaDau && !laPhu(l.ai) && !gioiThieu.has(i) && KHUNG[l.khung_hinh] !== undefined
  let canCanhChiDan = false
  if (chuaDau) {
    // Thẻ trên cao: lùi nhẹ (0,92) và hạ khung ~170px để đầu mọi người nằm dưới thẻ; trôi rất chậm cho khỏi đứng hình
    lia(Math.max(0, t0 - 0.25), 0.92, GIUA_X, GIUA_Y - 185, 0.55)
    lia(t0 + 0.35, 0.93, GIUA_X + (i % 2 ? 12 : -12), GIUA_Y - 185, conLai, 'sine.inOut')
  } else if (chiDan) {
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
  } else if (l.cam_xuc === 'buon') {
    // Buồn: cận vừa rồi tiến rất chậm vào mặt, để nỗi buồn ngấm
    lia(Math.max(0, t0 - 0.3), 1.3, tam.x, tam.y - 40, 0.8, 'sine.inOut')
    lia(t0 + 0.5, 1.45, tam.x, tam.y - 55, conLai, 'sine.inOut')
  } else if (l.cam_xuc === 'tuc_gian') {
    // Tức giận: đẩy nhanh vào, máy rung tay
    lia(t0 - 0.1, 1.5, tam.x, tam.y - 50, 0.35, 'power3.out')
    rungTay(t0 + 0.3, Math.min(1.6, conLai))
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
  const canCanh = chuaDau ? false : chiDan
    ? canCanhChiDan
    : !laPhu(l.ai) && !gioiThieu.has(i) && i > 0 && i < loi.length - 1 && ['bat_ngo', 'lo_lang', 'vui', 'suy_nghi'].includes(l.cam_xuc)
  // Nhân vật phụ nói trong đoạn căng thẳng cũng có thể rung tay
  if (!chiDan && l.may_quay === 'rung_tay') rungTay(t0, conLai + 0.3)
  if (l.ai === 'nguoi_ke') {
    // B-roll: lời kể đi cùng cảnh minh hoạ, Mèo / Bit lui hẳn ra hai mép (quay lại khi tới lượt họ)
    tw.push(`tl.to("#o-meo", { xPercent: -150, duration: 0.6, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.35))});`)
    tw.push(`tl.to("#o-robot", { xPercent: 150, duration: 0.6, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.35))});`)
  } else {
    tw.push(`tl.to("#o-${nghe}", { xPercent: ${canCanh ? (nghe === 'robot' ? 45 : -45) : 0}, duration: 0.55, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.3))});`)
    tw.push(`tl.to("#o-${nghe === 'robot' ? 'meo' : 'robot'}", { xPercent: 0, duration: 0.55, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.3))});`)
  }
  if (canCanh && lui) tw.push(`tl.to("#o-${nghe}", { xPercent: 0, duration: ${f(lui)}, ease: "power2.inOut" }, ${f(t0 + d - lui)});`)
  // Nhịp giữa câu dài: người nghe gật đầu, đạo cụ / biểu cảm đã lo phần đầu câu
  if (d > 4.5) tw.push(`tl.to("#${nghe}-dau", { rotation: 6, duration: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t0 + d / 2)});`)
})

// ── Đạo cụ: hiện bên cạnh người nói theo nội dung câu (AI chọn), bay nhẹ rồi biến mất ─
// Con số bật to (chọn ở SO_DONG): phóng từ nhỏ, giữ 1,6 giây, vụt mờ
const tiengSoDong = [] // tiếng "ting" lúc con số bật ra (phát sau khi có themAm)
const soDong = Object.entries(SO_DONG).map(([k, s]) => {
  const i = Number(k)
  const t = batDau[i] + Math.max(0.1, s.vt * (doDai[i] - 0.25) - 0.15)
  const het = Math.min(t + 1.8, batDau[i] + doDai[i] + 0.2)
  tw.push(`tl.fromTo("#sd${i}", { opacity: 0, scale: 0.3, rotation: -6 }, { opacity: 1, scale: 1, rotation: -2, duration: 0.45, ease: "back.out(2.4)", immediateRender: false }, ${f(t)});`)
  tw.push(`tl.to("#sd${i}", { opacity: 0, scale: 1.25, duration: 0.3, ease: "power2.in" }, ${f(Math.max(t + 0.6, het - 0.3))});`)
  tiengSoDong.push(t)
  return `<div id="sd${i}" class="so-dong">${esc(s.chu)}</div>`
})

const daoCu = []
const daoCuKhung = [] // khung ngang: đạo cụ ở góc trên bên phải của khung hình
loi.forEach((l, i) => {
  const bt = DAO_CU[l.dao_cu]
  // Câu có ảnh lớn bên phải thì bỏ đạo cụ (cùng chỗ)
  if (!bt || (NGANG && doanAnh.some((c) => c.kieu === 'ben' && c.tu <= i && c.het >= i))) return
  const t0 = batDau[i]
  const d = doDai[i]
  const id = `dc${i}`
  // Đạo cụ của nhân vật phụ nằm cùng chỗ với đạo cụ của người kể
  if (NGANG) daoCuKhung.push(`<div id="${id}" class="dao-cu-khung">${bt}</div>`)
  else daoCu.push(`<div id="${id}" class="dao-cu ${laPhu(l.ai) ? 'nguoi_ke' : l.ai}">${bt}</div>`)
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

// ── Thời tiết (AI chọn thoi_tiet): tuyết rơi / mưa / sương mù phủ lên bối cảnh (trước nền, sau nhân vật), theo
// từng đoạn câu liền nhau cùng thời tiết; hiện / tắt dần. Hạt đặt theo công thức (không ngẫu nhiên), lặp hữu hạn.
const amHanhDong = [] // âm thanh cảnh hành động (phát sau khi có themAm)
const doanThoiTiet = []
loi.forEach((l, i) => {
  const tt = ['tuyet', 'mua', 'suong'].includes(l.thoi_tiet) ? l.thoi_tiet : null
  if (!tt) return
  const c = doanThoiTiet.at(-1)
  if (c && c.tt === tt && c.het === i - 1) c.het = i
  else doanThoiTiet.push({ tt, tu: i, het: i })
})
// ── Cảnh hành động (AI chọn hanh_dong): kỵ binh phi ngựa, xông trận, đám đông, tên lửa, pháo hoa (sau lưng nhân vật),
// lịch lật (khung hình). Các câu liền nhau cùng một cảnh gom một lần; hiện / tắt dần
const doanHanhDong = []
loi.forEach((l, i) => {
  if (!HANH_DONG[l.hanh_dong]) return
  const c = doanHanhDong.at(-1)
  if (c && c.ten === l.hanh_dong && c.het === i - 1) c.het = i
  else doanHanhDong.push({ ten: l.hanh_dong, tu: i, het: i })
})
const hanhDongNen = []
const hanhDongKhung = []
doanHanhDong.forEach((c, k) => {
  const id = `hd${k}`
  const t0 = Math.max(0, batDau[c.tu] - 0.2)
  const t1 = batDau[c.het] + doDai[c.het] + 0.2
  const hd = HANH_DONG[c.ten](id, t0, t1 - t0, { RONG, CAO, f, lap })
  tw.push(`tl.fromTo("#${id}", { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, ${f(t0)});`)
  tw.push(`tl.to("#${id}", { opacity: 0, duration: 0.4 }, ${f(Math.max(t0 + 0.4, t1 - 0.4))});`)
  tw.push(...hd.tw)
  ;(hd.khung ? hanhDongKhung : hanhDongNen).push(`<div id="${id}" class="hanh-dong">${hd.html}</div>`)
  if (c.ten === 'xung_tran' || c.ten === 'ky_binh') amHanhDong.push(['sfx-buoc-chan', t0, 0.35])
  if (c.ten === 'dam_dong') amHanhDong.push(['sfx-reo-ho', t0, 0.35])
  if (c.ten === 'ten_lua') amHanhDong.push(['sfx-vut', t0 + 0.3, 0.4])
  if (c.ten === 'phao_hoa') amHanhDong.push(['sfx-phao-hoa', t0 + 0.2, 0.35])
})
const thoiTiet = doanThoiTiet.map((c, k) => {
  const id = `tt${k}`
  const t0 = Math.max(0, batDau[c.tu] - 0.4)
  const t1 = Math.min(TONG, batDau[c.het] + doDai[c.het] + 0.3)
  const d = t1 - t0
  tw.push(`tl.fromTo("#${id}", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "sine.out", immediateRender: false }, ${f(t0)});`)
  tw.push(`tl.to("#${id}", { opacity: 0, duration: 0.6, ease: "sine.in" }, ${f(Math.max(t0 + 0.6, t1 - 0.6))});`)
  let hat = ''
  if (c.tt === 'tuyet') {
    hat = [...Array(54)].map((_, j) => {
      const r = 5 + (j % 4) * 3
      const ck = 4.2 + (j % 5) * 0.7
      const tre = (j % 9) * 0.45
      tw.push(`tl.fromTo("#${id}-h${j}", { y: -60, x: 0 }, { y: ${CAO + 80}, x: ${(j % 2 ? 1 : -1) * (30 + (j % 3) * 20)}, duration: ${f(ck)}, repeat: ${lap(d - tre, ck) + 1}, ease: "none" }, ${f(t0 + tre)});`)
      return `<div id="${id}-h${j}" class="tuyet-hat" style="left:${(j * 97) % RONG}px;width:${r * 2}px;height:${r * 2}px;opacity:${0.6 + (j % 3) * 0.13}"></div>`
    }).join('')
  } else if (c.tt === 'mua') {
    hat = [...Array(70)].map((_, j) => {
      const ck = 0.55 + (j % 4) * 0.08
      const tre = (j % 10) * 0.07
      tw.push(`tl.fromTo("#${id}-h${j}", { y: -120, x: 0 }, { y: ${CAO + 80}, x: -60, duration: ${f(ck)}, repeat: ${lap(d - tre, ck) + 1}, ease: "none" }, ${f(t0 + tre)});`)
      return `<div id="${id}-h${j}" class="mua-hat" style="left:${(j * 61) % (RONG + 60)}px"></div>`
    }).join('')
  } else {
    hat = [0, 1, 2, 3].map((j) => {
      tw.push(`tl.fromTo("#${id}-h${j}", { x: ${j % 2 ? -160 : 160} }, { x: ${j % 2 ? 160 : -160}, duration: ${f(Math.max(1, d))}, ease: "sine.inOut" }, ${f(t0)});`)
      return `<div id="${id}-h${j}" class="suong-may" style="left:${-200 + j * (RONG / 3)}px;top:${CAO * (0.25 + (j % 2) * 0.3)}px;width:${RONG * 0.6}px;height:${CAO * 0.35}px"></div>`
    }).join('')
  }
  return `<div id="${id}" class="thoi-tiet ${c.tt}">${hat}</div>`
})

// ── Thẻ năm / nơi chốn (phim tiểu sử): "1993 · Kharkov, Ukraina" trượt vào góc trên bên trái
let khungKeHtml = ''
{
  const dot = []
  loi.forEach((l, i) => {
    if (l.ai !== 'nguoi_ke') return
    const c = dot.at(-1)
    // Chỉ gộp các câu người kể liền nhau: câu của người khác thì Mèo Mun đã về đứng bên trái, khung sẽ che mặt Mun
    if (c && i - c.het <= 1) c.het = i
    else dot.push({ tu: i, het: i })
  })
  if (dot.length) {
    khungKeHtml = `<div id="khung-ke"><div class="ke-vong"></div><div class="ke-tron"><div class="ke-den"></div><svg viewBox="100 70 400 400" width="340" height="340">${nguoiKeSvg('nguoi_ke')}</svg></div><div class="ke-mic">🎙</div></div>`
    tw.push('gsap.set("#nguoi_ke-dau", { svgOrigin: "300 440" }); gsap.set("#nguoi_ke-mieng-mo", { svgOrigin: "300 340" }); gsap.set("#nguoi_ke-mat-trai", { svgOrigin: "238 268" }); gsap.set("#nguoi_ke-mat-phai", { svgOrigin: "362 268" });')
    for (const c of dot) {
      const vao = Math.max(0, batDau[c.tu] - 0.4)
      const ra = batDau[c.het] + doDai[c.het] - 0.1
      tw.push(`tl.fromTo("#khung-ke", { x: -400, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "back.out(1.4)", immediateRender: false }, ${f(vao)});`)
      tw.push(`tl.to("#nguoi_ke-dau", { rotation: 3, duration: 1.4, yoyo: true, repeat: ${lap(ra - vao, 1.4) | 1}, ease: "sine.inOut" }, ${f(vao)});`)
      tw.push(`tl.to("#khung-ke", { x: -400, opacity: 0, duration: 0.4, ease: "power2.in" }, ${f(ra)});`)
      tw.push(`tl.fromTo("#nguoi_ke-may", { y: 0 }, { y: -10, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false }, ${f(vao + 0.45)});`)
      tw.push(`tl.to(".ke-vong", { rotation: "+=" + ${Math.round((ra - vao) * 40)}, duration: ${f(ra - vao + 0.4)}, ease: "none" }, ${f(vao)});`)
      for (let k = vao + 1.1; k < ra - 0.3; k += 3.3) tw.push(`tl.to(["#nguoi_ke-mat-trai", "#nguoi_ke-mat-phai"], { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1 }, ${f(k)});`)
    }
  }
}
// Phim tiểu sử: dưới thẻ có năm hiện thanh dòng thời gian (năm đầu → năm cuối đời nhân vật), chấm vàng trượt từ năm
// trước tới năm này, phần đã qua tô sáng — người xem luôn biết đang ở đâu trong cuộc đời nhân vật
const tg = dong_thoi_gian && dong_thoi_gian.den > dong_thoi_gian.tu ? dong_thoi_gian : null
const viTriNam = (n) => Math.max(0, Math.min(1, (n - tg.tu) / (tg.den - tg.tu)))
let namTruoc = tg ? tg.tu : 0
const theMoc = []
loi.forEach((l, i) => {
  if (!l.the_moc) return
  const t0 = batDau[i] + 0.15
  const het = Math.min(t0 + 3.6, (batDau[i + 1] ?? TONG) - 0.1)
  if (het - t0 < 1) return
  const nam = Number(String(l.the_moc).match(/\b(\d{3,4})\b/)?.[1] ?? 0)
  const coThanh = tg && nam >= tg.tu - 5 && nam <= tg.den + 5
  const thanh = coThanh
    ? `<div class="tg-thanh"><span class="tg-dau">${tg.tu}</span><div class="tg-ray"><div id="tm${i}-da" class="tg-da"></div><div id="tm${i}-cham" class="tg-cham"></div></div><span class="tg-dau">${tg.den}</span></div>`
    : ''
  theMoc.push(`<div id="tm${i}" class="the-moc-khoi"><div class="the-moc">📍 ${esc(l.the_moc)}</div>${thanh}</div>`)
  tw.push(`tl.fromTo("#tm${i}", { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, ${f(t0)});`)
  if (coThanh) {
    const a = viTriNam(namTruoc) * 100
    const b = viTriNam(nam) * 100
    tw.push(`tl.fromTo("#tm${i}-cham", { left: "${f(a)}%" }, { left: "${f(b)}%", duration: 1.1, ease: "power2.inOut", immediateRender: false }, ${f(t0 + 0.35)});`)
    tw.push(`tl.fromTo("#tm${i}-da", { width: "${f(a)}%" }, { width: "${f(b)}%", duration: 1.1, ease: "power2.inOut", immediateRender: false }, ${f(t0 + 0.35)});`)
    namTruoc = nam
  }
  tw.push(`tl.to("#tm${i}", { opacity: 0, x: -40, duration: 0.35, ease: "power2.in" }, ${f(het - 0.35)});`)
})

// ── Câu giật tít 2 giây đầu + minh hoạ chèn đúng lúc giọng đọc tới chi tiết (con số, địa điểm, lời trích...) ─
const gtMoc = Math.min(batDau[0] + 2.2, batDau[0] + doDai[0])
const giatTit = mocMoDau(moc, gtMoc, Math.max(0, batDau[0] - 0.3))
tw.push(...giatTit.tw)
// Bảng tin câu đầu nhường chỗ cho câu giật tít
if (giatTit.html) {
  tw.push(`tl.set("#bang0", { opacity: 0 }, 0);`)
  tw.push(`tl.to("#bang0", { opacity: 1, duration: 0.3 }, ${f(gtMoc)});`)
}
const bangHien = []
const bangCuaCau = []
{
  let cuoi = -99
  loi.forEach((l, i) => {
    const canhMoi = i === 0 || (BOI_CANH[l.boi_canh] ? l.boi_canh : 'truong_quay') !== (BOI_CANH[loi[i - 1].boi_canh] ? loi[i - 1].boi_canh : 'truong_quay')
    const doi = i > 0 && (l.bang?.chu !== loi[cuoi]?.bang?.chu || l.bang?.bieu_tuong !== loi[cuoi]?.bang?.bieu_tuong)
    if (l.bang?.chu && (canhMoi || (doi && i - cuoi >= 3))) {
      bangHien.push(i)
      cuoi = i
    }
    bangCuaCau.push(cuoi >= 0 ? cuoi : null)
  })
}
// Thẻ minh hoạ nằm ngay trên đầu người nói (toạ độ trong lớp nhân vật nên đi theo máy quay)
const DAU = { meo: { x: 290 - GIAN, dinh: 715 }, robot: { x: 790 + GIAN, dinh: 715 } }
const DAU_PHU = { x: 540, dinh: 520 + PHU_XUONG }
const minhHoa = []
const minhHoaKhung = [] // khung ngang: thẻ minh hoạ ở lớp khung hình
loi.forEach((l, i) => {
  const m = l.minh_hoa
  const ve = MINH_HOA[m?.kieu]
  if (!ve || l.anh_wiki?.tep || l.hanh_dong === 'lich_lat') return
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
  if (NGANG) minhHoaKhung.push(`<div id="${id}" class="mh" style="left:${(RONG - 480) / 2}px;top:112px">${mh.html}</div>`)
  else minhHoa.push(`<div id="${id}" class="mh" style="left:${trai}px;top:${dau.dinh - 345}px">${mh.html}</div>`)
  // Bảng tin của câu tạm ẩn trong lúc thẻ minh hoạ hiện
  if (bangCuaCau[i] !== null) {
    tw.push(`tl.to("#bang${bangCuaCau[i]}", { opacity: 0, duration: 0.1 }, ${f(bd - 0.05)});`)
    tw.push(`tl.to("#bang${bangCuaCau[i]}", { opacity: 1, duration: 0.25 }, ${f(kt)});`)
  }
})

// ── Ảnh thật (phim tiểu sử, ảnh Wikimedia Commons máy nhà đã tải về assets/): khung ảnh viền trắng kiểu phim tài liệu
// ở giữa phía trên khung hình (chỗ thẻ minh hoạ / bảng tin, hai thứ đó tạm ẩn). Ảnh hiện trọn (không cắt mặt) trên nền
// chính nó làm mờ; từ từ phóng to + lia nhẹ (Ken Burns). Không ghi nguồn trên hình: ghi nguồn nằm ở mô tả YouTube
// (trang chi tiết có đoạn "Ghi nguồn ảnh" để chép).
// Các câu liền nhau cùng một ảnh thì giữ nguyên khung.
const anhThat = doanAnh.map((c, k) => {
  const id = `anh${k}`
  // Câu đầu phim: chờ dòng chữ mở đầu (móc câu) chạy xong rồi mới hiện ảnh
  const vao = Math.max(batDau[c.tu] + 0.15, c.tu === 0 && moc?.chu ? gtMoc + 0.1 : 0)
  const ra = batDau[c.het] + doDai[c.het] - 0.05
  // Hiện quá ngắn (dưới 1,6 giây) thì bỏ, tránh ảnh loé qua rồi tắt
  if (ra - vao < 1.6) return ''
  const huong = k % 2 ? 1 : -1
  tw.push(`tl.fromTo("#${id}", { opacity: 0, y: -40, rotation: ${-4 * huong}, scale: 0.9 }, { opacity: 1, y: 0, rotation: ${-1.2 * huong}, scale: 1, duration: 0.55, ease: "back.out(1.6)", immediateRender: false }, ${f(vao)});`)
  tw.push(`tl.fromTo("#${id}-anh", { scale: 1, xPercent: ${2 * huong} }, { scale: 1.12, xPercent: ${-2 * huong}, duration: ${f(ra - vao)}, ease: "none", immediateRender: false }, ${f(vao)});`)
  tw.push(`tl.to("#${id}", { opacity: 0, y: -24, duration: 0.35, ease: "power2.in" }, ${f(ra - 0.3)});`)
  for (let i = c.tu; i <= c.het; i++) {
    if (bangCuaCau[i] === null || bangCuaCau[i] === undefined) continue
    tw.push(`tl.to("#bang${bangCuaCau[i]}", { opacity: 0, duration: 0.1 }, ${f(vao - 0.05)});`)
    tw.push(`tl.to("#bang${bangCuaCau[i]}", { opacity: 1, duration: 0.25 }, ${f(ra)});`)
  }
  const kieu = c.kieu
  const src = `assets/${esc(c.a.tep)}`
  return `<div id="${id}" class="anh-that ${kieu}"><div class="anh-khung"><img class="anh-nen" src="${src}"/><img id="${id}-anh" class="anh-chinh" src="${src}"/></div></div>`
})

// Bảng tin phía sau đổi theo lời thoại
const bang = bangHien.map((i, j) => {
  const l = loi[i]
  const t0 = batDau[i]
  const het = j === bangHien.length - 1 ? HET_NOI : batDau[bangHien[j + 1]]
  tw.push(`tl.from("#bang${i} .bang-noi", { scale: 0.6, opacity: 0, duration: 0.4, ease: "back.out(2)" }, ${f(t0 + 0.05)});`)
  return `
    <div id="bang${i}" class="bang clip" data-start="${f(t0)}" data-duration="${f(het - t0)}" data-track-index="${NGANG ? 2500 : 2}">
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
  if (ten === 'loe_sang') tw.push(`tl.fromTo("#chop", { opacity: 0.45 }, { opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, ${f(t0)});`)
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
  gio: ['sfx-gio', 0.6], buoc_chan: ['sfx-buoc-chan', 0.3], vo_tay: ['sfx-vo-tay', 0.8], xe_chay: ['sfx-xe-chay', 0.25], bo_xe: ['sfx-bo-xe', 0.18],
  coi_xe: ['sfx-coi-xe', 0.2], mua: ['sfx-mua', 0.6], sam: ['sfx-sam', 1], chuong_dt: ['sfx-chuong-dt', 0.3], chuong_truong: ['sfx-chuong-truong', 0.3],
  tien: ['sfx-tien', 0.45], go_cua: ['sfx-go-cua', 0.45], chup_anh: ['sfx-chup-anh', 0.6], reo_ho: ['sfx-reo-ho', 0.7], bua: ['sfx-bua', 0.45],
  phao_hoa: ['sfx-phao-hoa', 0.45], may_bay: ['sfx-may-bay', 0.5], nuoc: ['sfx-nuoc', 0.6],
}
// Âm thanh tự gắn khi vào một bối cảnh (nếu câu đó AI chưa chọn hiệu ứng): có hình gì thì có tiếng đó
const AM_VAO_CANH = {
  pho_florida: 'xe_chay', thanh_pho_dem: 'xe_chay', nong_thon: 'gio', nui_rung: 'gio', thanh_pho_tuyet: 'gio', truong_hoc: 'chuong_truong',
  san_bay: 'may_bay', san_van_dong: 'reo_ho', san_khau: 'vo_tay', hoi_truong: 'vo_tay', cong_truong: 'bua', bai_bien: 'nuoc', cang_bien: 'nuoc',
  san_chung_khoan: 'tien', cho: 'buoc_chan', nha_ngheo: 'gio',
  thao_nguyen: 'gio', chien_truong: 'reo_ho', thanh_co: 'gio', sa_mac: 'gio', bien_ca: 'nuoc', ga_ra: 'bua', phim_truong: 'chup_anh',
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
  thao_nguyen: ['nen-thien-nhien', 0.25], cung_dien: ['nen-phong', 0.2], chien_truong: ['nen-dam-dong', 0.3], thanh_co: ['nen-thien-nhien', 0.2],
  lang_xua: ['nen-thien-nhien', 0.25], sa_mac: ['nen-thien-nhien', 0.15], bien_ca: ['nen-bien', 0.12], den_chua: ['nen-phong', 0.2],
  ga_ra: ['nen-may-moc', 0.05], be_phong: ['nen-may-moc', 0.08], phong_thu: ['nen-phong', 0.15], phim_truong: ['nen-van-phong', 0.3],
}
const amPhu = []
const themAm = (ten, luc, amLuong, toiDa = Infinity) => {
  const dai = Math.min(doDaiTep(ten), toiDa, TONG - luc)
  if (dai <= 0.05) return
  amPhu.push(`<audio id="ap-${amPhu.length}" src="assets/${ten}.wav" data-start="${f(luc)}" data-duration="${f(dai)}" data-track-index="${3000 + amPhu.length}" data-volume="${amLuong}"></audio>`)
}
for (const t of tiengSoDong) themAm('sfx-ting', t, 0.3)
for (const [ten, t, a] of amHanhDong) themAm(ten, t, a)
for (const c of doanThoiTiet) {
  if (c.tt === 'suong') continue
  for (let i = c.tu; i <= c.het; i++) themAm(c.tt === 'mua' ? 'sfx-mua' : 'sfx-gio', batDau[i], c.tt === 'mua' ? 0.3 : 0.2, doDai[i] + 0.3)
}
loi.forEach((l, i) => {
  const sfx = SFX[l.am_thanh]
  if (sfx) themAm(sfx[0], batDau[i] + (l.am_thanh === 'bum' ? 0 : 0.05), sfx[1])
})
// Đổi cảnh: tiếng vút; vào bối cảnh có âm thanh đặc trưng (phố → xe chạy, sân vận động → reo hò…) thì thêm tiếng đó
for (const cc of chuyenCanh) {
  if (SFX[loi[cc.i].am_thanh]) continue
  themAm('sfx-vut', Math.max(0, cc.t - 0.05), 0.28)
  const rieng = SFX[AM_VAO_CANH[BOI_CANH[loi[cc.i].boi_canh] ? loi[cc.i].boi_canh : '']]
  if (rieng) themAm(rieng[0], cc.t + 0.35, rieng[1] * 0.8)
}
// Cảnh mở đầu cũng có âm thanh đặc trưng của bối cảnh
{
  const rieng = SFX[AM_VAO_CANH[loi[0]?.boi_canh]]
  if (rieng && !SFX[loi[0]?.am_thanh]) themAm(rieng[0], 0.3, rieng[1] * 0.7)
}
// Nhân vật phụ bước ra sân khấu: tiếng bước chân (trừ khi câu đó đã có hiệu ứng)
for (const dp of doanPhu) if (!SFX[loi[dp.tu].am_thanh]) themAm('sfx-buoc-chan', batDau[dp.tu] + 0.05, 0.22, 1.1)
doanCanh.forEach((dc, k) => {
  const nen = AM_NEN[dc.ten]
  if (!nen) return
  const tu = k ? batDau[dc.tu] - 0.35 : 0
  const den = dc.het === loi.length - 1 ? TONG : batDau[dc.het + 1] - 0.35
  const doan = doDaiTep(nen[0])
  if (!doan) return
  for (let luc = tu; luc < den - 0.05; luc += doan) themAm(nen[0], luc, nen[1], den - luc)
})

// ── Thẻ chương đầu phần: tên kênh, "CHƯƠNG n", tên chương, vạch sáng chạy; mờ dần lúc câu đầu bắt đầu ─
let theChuongHtml = ''
if (the_chuong) {
  const ten = esc(the_chuong.ten ?? '')
  theChuongHtml = `<div id="the-chuong"><div class="tc-kenh">${esc(kenh)}</div><div class="tc-so">${esc(the_chuong.nhan ?? 'CHƯƠNG')} ${esc(the_chuong.so ?? '')}</div><div class="tc-ten">${ten}</div><div class="tc-vach"></div></div>`
  const tc0 = I_CHUONG >= 0 ? Math.max(0.05, batDau[I_CHUONG] - 0.35) : 0.05
  const tc1 = I_CHUONG >= 0 ? batDau[I_CHUONG] + doDai[I_CHUONG] - 0.05 : MO_CHUONG - 0.25
  tw.push(`tl.fromTo("#the-chuong", { opacity: 0, scale: 1 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power1.out", immediateRender: false }, ${f(tc0)});`)
  tw.push(`tl.fromTo("#the-chuong .tc-so", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, ${f(tc0 + 0.2)});`)
  tw.push(`tl.fromTo("#the-chuong .tc-ten", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" }, ${f(tc0 + 0.4)});`)
  tw.push(`tl.fromTo("#the-chuong .tc-vach", { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.inOut" }, ${f(tc0 + 0.45)});`)
  tw.push(`tl.to("#the-chuong", { opacity: 0, scale: 1.05, duration: 0.45, ease: "power2.in" }, ${f(tc1)});`)
  themAm('sfx-vut', tc0 + 0.35, 0.3)
}
// ── Màn kết: cảm ơn + nút ĐĂNG KÝ có con trỏ bấm + chuông; Mèo / Bit quay lại vẫy tay ─
let manKetHtml = ''
if (MAN_KET) {
  const t1 = HET_NOI
  // Khung ngang: 2 ô trống trái / phải đúng chỗ YouTube đặt video đề xuất (gắn trong YouTube Studio → Màn hình kết thúc)
  const oXem = NGANG ? [0, 1].map((k) => `<div class="mk-o mk-o${k}"><span>▶ Xem tiếp</span></div>`).join('') : ''
  manKetHtml = `${oXem}<div id="man-ket"><div class="mk-cam-on">Cảm ơn bạn đã xem!</div><div class="mk-nut"><span class="mk-chua"><span class="mk-play">▶</span> ĐĂNG KÝ</span><span class="mk-da">✓ ĐÃ ĐĂNG KÝ</span></div><div class="mk-chuong">🔔</div><div class="mk-tro">👆</div><div class="mk-phu">${esc(kenh)} · video mới mỗi tuần</div></div>`
  tw.push(`tl.to(["#o-meo", "#o-robot"], { xPercent: 0, duration: 0.5, ease: "power2.out" }, ${f(t1)});`)
  if (NGANG) {
    // Mèo / Bit nhỏ lại, đứng sát nhau ở giữa dưới, nhường hai bên cho ô video đề xuất
    tw.push(`tl.to("#o-meo", { x: 280, scale: 0.6, transformOrigin: "50% 100%", duration: 0.7, ease: "power2.inOut" }, ${f(t1 + 0.2)});`)
    tw.push(`tl.to("#o-robot", { x: -280, scale: 0.6, transformOrigin: "50% 100%", duration: 0.7, ease: "power2.inOut" }, ${f(t1 + 0.2)});`)
    tw.push(`tl.fromTo(".mk-o", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)", stagger: 0.15, immediateRender: false }, ${f(t1 + 0.8)});`)
    // nhún nhẹ, lặp hữu hạn cho tới hết màn kết
    tw.push(`tl.to(["#o-meo", "#o-robot"], { y: -14, duration: 0.8, yoyo: true, repeat: ${lap(MAN_KET - 4, 0.8)}, ease: "sine.inOut" }, ${f(t1 + 3.4)});`)
  }
  tw.push(`tl.fromTo("#man-ket", { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${f(t1 + 0.1)});`)
  tw.push(`tl.fromTo("#man-ket .mk-nut", { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(2)" }, ${f(t1 + 0.4)});`)
  tw.push(`tl.fromTo("#man-ket .mk-tro", { x: 260, y: 200, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, ${f(t1 + 1.1)});`)
  tw.push(`tl.to("#man-ket .mk-nut", { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1 }, ${f(t1 + 2)});`)
  tw.push(`tl.set("#man-ket .mk-nut", { backgroundColor: "#475569" }, ${f(t1 + 2.2)});`)
  tw.push(`tl.set("#man-ket .mk-chua", { display: "none" }, ${f(t1 + 2.2)});`)
  tw.push(`tl.set("#man-ket .mk-da", { display: "inline" }, ${f(t1 + 2.2)});`)
  tw.push(`tl.fromTo("#man-ket .mk-chuong", { scale: 0, rotation: 0 }, { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.5)" }, ${f(t1 + 2.6)});`)
  tw.push(`tl.to("#man-ket .mk-chuong", { rotation: 18, duration: 0.1, yoyo: true, repeat: 7 }, ${f(t1 + 3)});`)
  tw.push(...CU_CHI.vui('meo', t1 + 0.4), ...CU_CHI.vui('robot', t1 + 0.6))
  lia(t1, 1, GIUA_X, GIUA_Y, 0.8)
  themAm('sfx-vui', t1 + 0.3, 0.35)
  themAm('sfx-bop', t1 + 2.0, 0.4)
  themAm('sfx-ting', t1 + 2.6, 0.4)
}

// Khung ngang (YouTube): không có cột nút / dòng mô tả của TikTok che, nên phụ đề sát đáy, đầu trang và bảng tin gọn hơn
const CSS_NGANG = `
      .dau-trang { height: 130px; padding: 0 56px; }
      .kenh { font-size: 34px; }
      .chude { font-size: 26px; }
      .bang { padding-top: 30px; z-index: 6; }
      .bang-noi { width: auto; max-width: 860px; height: 74px; gap: 16px; padding: 0 30px 0 22px; border-radius: 40px; border-width: 4px; box-shadow: 0 0 0 4px #1e293b, 0 12px 28px #0009; }
      .bang-bt { font-size: 42px; }
      .bang-chu { font-size: 32px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 720px; }
      .tien-canh { position: absolute; inset: 0; pointer-events: none; opacity: 0; filter: blur(5px) brightness(0.75); }
      .tc-trai { position: absolute; left: -60px; bottom: -40px; }
      .tc-phai { position: absolute; right: -60px; bottom: -40px; transform: scaleX(-1); }
      .tc-phai svg { transform: scaleX(-1); }
      .hanh-dong { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
      .hanh-dong svg { position: absolute; left: 0; top: 0; }
      .lich { position: absolute; left: ${(RONG - 220) / 2}px; top: 112px; width: 220px; height: 240px; border-radius: 18px; background: #f8fafc; box-shadow: 0 18px 40px #0009; overflow: hidden; perspective: 600px; }
      .lich-dau { height: 56px; background: #dc2626; }
      .lich-to { position: absolute; left: 0; right: 0; top: 56px; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 110px; font-family: "Emoji", sans-serif; background: #fff; border-top: 4px dashed #cbd5e1; }
      .so-dong { position: absolute; left: 0; right: 0; top: 118px; text-align: center; font-size: 104px; font-weight: 700; line-height: 1.1; color: #fde047; -webkit-text-stroke: 10px #111827; paint-order: stroke fill; text-shadow: 0 10px 0 #111827, 0 18px 40px #000a; opacity: 0; }
      .dao-cu-khung { position: absolute; right: 80px; top: 140px; width: 170px; height: 170px; display: flex; align-items: center; justify-content: center; font-size: 128px; line-height: 1; font-family: "Emoji", sans-serif; filter: drop-shadow(0 14px 20px #0008); opacity: 0; }
      .moc { top: 110px; height: 400px; }
      .moc-chu { font-size: 76px; }
      .phu-de { height: 330px; padding: 0 160px 44px; background: linear-gradient(transparent, #00000080 45%, #00000099); }
      .pd-dong { font-size: 50px; }
      #the-chuong { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: radial-gradient(ellipse at center, #1e1b4bf2, #020617fa); opacity: 0; }
      .tc-kenh { font-size: 30px; font-weight: 700; letter-spacing: 8px; color: #38bdf8; }
      .tc-so { font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #fbbf24; }
      .tc-ten { max-width: 1400px; font-size: 76px; font-weight: 700; line-height: 1.15; text-align: center; color: #fff; text-shadow: 0 6px 30px #000; }
      .tc-vach { width: 520px; height: 6px; border-radius: 3px; background: linear-gradient(90deg, transparent, #fbbf24, transparent); transform-origin: 50% 50%; }
      #man-ket { position: absolute; left: 0; right: 0; top: 70px; display: flex; flex-direction: column; align-items: center; gap: 22px; opacity: 0; }
      .mk-cam-on { font-size: 64px; font-weight: 700; color: #fff; text-shadow: 0 0 12px #000, 0 6px 0 #e11d48; }
      .mk-nut { display: flex; align-items: center; gap: 16px; padding: 22px 56px; border-radius: 18px; background: #dc2626; font-size: 54px; font-weight: 700; color: #fff; box-shadow: 0 16px 40px #000a; }
      .mk-play { font-size: 40px; }
      .mk-da { display: none; }
      .mk-chuong { position: absolute; left: calc(50% + 250px); top: 120px; font-size: 80px; font-family: "Emoji", sans-serif; }
      .mk-tro { position: absolute; left: calc(50% + 90px); top: 190px; font-size: 80px; font-family: "Emoji", sans-serif; opacity: 0; }
      .mk-o { position: absolute; top: 380px; width: 520px; height: 293px; border-radius: 18px; border: 5px dashed #ffffffaa; background: #0f172a99; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 700; color: #fff; opacity: 0; }
      .mk-o0 { left: 70px; } .mk-o1 { right: 70px; }
      .mk-phu { font-size: 32px; font-weight: 500; color: #e2e8f0; text-shadow: 0 0 8px #000; }`

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
      .anh-nen-canh { position: absolute; object-fit: cover; transform-origin: 50% 70%; filter: blur(3.5px) brightness(0.74) saturate(0.92);
        -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 92%, transparent 100%); mask-image: linear-gradient(to bottom, #000 0, #000 92%, transparent 100%); }
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
      .the-moc-khoi { position: absolute; left: 56px; top: ${NGANG ? 150 : 240}px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; opacity: 0; }
      .tg-thanh { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-radius: 12px; background: #0f172acc; font-size: 22px; font-weight: 700; color: #cbd5e1; box-shadow: 0 10px 24px #0007; }
      .tg-ray { position: relative; width: 340px; height: 8px; border-radius: 4px; background: #334155; }
      .tg-da { position: absolute; left: 0; top: 0; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #f59e0b, #fbbf24); }
      .tg-cham { position: absolute; top: 50%; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: #fde68a; border: 4px solid #f59e0b; box-shadow: 0 0 12px #fbbf24; }
      .the-moc { position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 24px 12px 18px; border-radius: 14px; background: #0f172ae6; border-left: 8px solid #fbbf24; font-size: ${NGANG ? 34 : 38}px; font-weight: 700; color: #fff; box-shadow: 0 16px 36px #0008; }
      .dao-cu.nguoi_ke { left: ${NGANG ? 1220 : 445}px; top: ${NGANG ? 560 : 380}px; }
      .pd-dong { font-size: 48px; font-weight: 700; line-height: 1.2; white-space: nowrap; text-shadow: 0 0 5px #000, 0 3px 0 #000, 2.5px 2.5px 0 #000, -2.5px 2.5px 0 #000, 2.5px -2.5px 0 #000, -2.5px -2.5px 0 #000; }
      .pd-tu { display: inline-block; color: #fff; }
      #khung-ke { position: absolute; left: 30px; top: ${CAO - (NGANG ? 560 : 940)}px; width: 360px; height: 360px; opacity: 0; filter: drop-shadow(0 22px 40px #000b); }
      .ke-vong { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(#fbbf24, #f97316, #fde68a, #fbbf24, #f97316, #fde68a, #fbbf24); }
      .ke-tron { position: absolute; inset: 10px; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 50% 28%, #93c5fd 0%, #3b5b8c 38%, #1e293b 70%, #0f172a); box-shadow: inset 0 0 0 5px #0f172a; }
      .ke-den { position: absolute; inset: 0; background: radial-gradient(circle at 78% 18%, #fde68a55, transparent 40%), radial-gradient(circle at 15% 85%, #f9731633, transparent 45%); }
      #khung-ke svg { position: relative; display: block; }
      .thoi-tiet { position: absolute; inset: 0; overflow: hidden; opacity: 0; pointer-events: none; }
      .thoi-tiet.mua { background: #0f172a33; }
      .tuyet-hat { position: absolute; top: 0; border-radius: 50%; background: #fff; box-shadow: 0 0 8px #fff8; }
      .mua-hat { position: absolute; top: 0; width: 3px; height: 70px; border-radius: 2px; background: linear-gradient(#e0f2fe00, #e0f2fecc); transform: rotate(14deg); }
      .suong-may { position: absolute; border-radius: 50%; background: #f1f5f9; filter: blur(46px); opacity: 0.5; }
      .anh-that { position: absolute; opacity: 0; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 18px 30px #000b); }
      .anh-that.tren { left: ${(RONG - 500) / 2}px; top: ${NGANG ? 118 : 300}px; width: 500px; }
      .anh-that.ben { left: ${RONG - 60 - 720}px; top: 120px; width: 720px; }
      .anh-khung { position: relative; width: 100%; aspect-ratio: 5 / 3; overflow: hidden; border: 12px solid #fdfaf3; border-radius: 6px; background: #111; box-sizing: border-box; }
      .anh-nen { position: absolute; inset: -30px; width: calc(100% + 60px); height: calc(100% + 60px); object-fit: cover; filter: blur(18px) brightness(0.6); }
      .anh-chinh { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
      .anh-ghi { margin-top: 6px; max-width: 100%; padding: 4px 14px; border-radius: 8px; background: #000b; color: #f1f5f9; font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: "BVP", "Emoji", sans-serif; }
      .ke-mic { position: absolute; right: 14px; bottom: 18px; width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(#ef4444, #b91c1c); border: 4px solid #fde68a; display: flex; align-items: center; justify-content: center; font-size: 32px; font-family: "Emoji", sans-serif; box-shadow: 0 6px 14px #0008; }${NGANG ? CSS_NGANG : ''}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-width="${RONG}" data-height="${CAO}" data-duration="${f(TONG)}">
      <div id="canh" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="0">
        <div class="the-gioi"><div id="camera-nen" class="camera">${nenCanh.join('')}${hat.join('')}</div></div>
        <div id="toi-chuyen"></div>
        <div id="vet-quet"></div>
        ${hanhDongNen.join('')}
        ${thoiTiet.join('')}
      </div>
      <div id="dau-trang" class="dau-trang clip" data-start="0" data-duration="${f(TONG)}" data-track-index="6">
        <div class="kenh"><span class="vach"></span>${esc(kenh)}</div><div class="chude">${esc(chu_de)}</div>
      </div>${NGANG ? '' : bang.join('')}
      <div id="sau-khau" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="4">
        <div class="the-gioi"><div id="camera-nv" class="camera">
          ${nvPhu.join('')}
          <div id="o-meo" class="o-nv">${meoSvg}</div>
          <div id="o-robot" class="o-nv">${robotSvg}</div>
          ${daoCu.join('')}
          ${minhHoa.join('')}
        </div></div>
        ${tienCanh.join('')}
      </div>
${NGANG ? bang.join('') : ''}
      <div id="vien-toi" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="5"><div id="den"></div><div id="chop"></div></div>
      <div id="lop-minh-hoa" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="7">${giatTit.html}${theMoc.join('')}${minhHoaKhung.join('')}${anhThat.join('')}${daoCuKhung.join('')}${soDong.join('')}${hanhDongKhung.join('')}${khungKeHtml}${manKetHtml}${theChuongHtml}</div>${phuDe.join('')}
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
