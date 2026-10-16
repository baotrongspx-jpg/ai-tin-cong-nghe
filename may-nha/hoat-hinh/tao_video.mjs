// Video hoạt hình hai nhân vật đối đáp (Mèo Mun hỏi, Robot Bit giải thích) cho HyperFrames, dọc 1080x1920.
// Vào (trong thư mục làm việc): artifacts/loi_thoai.json (lời thoại + cảm xúc + bối cảnh + bảng tin),
// artifacts/do_dai.json, hyperframes/assets/loi-<i>.wav. Miệng nhép theo độ to thật của giọng.
// Chạy: node tao_video.mjs <thư mục làm việc> → <thư mục>/hyperframes/index.html (thợ đọc giọng gọi, may-nha/tho_doc.py)
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { HINH_MIENG } from './mieng.mjs'
import { BOI_CANH } from './boiCanh.mjs'
import { anhSangMuot } from './anhSang.mjs'
import { NHAN_VAT_PHU, nguoiKeSvg, nhanVatChinhSvg, GOC_NHIN, TAM_GOC, chonGoc } from './nhanVatPhu.mjs'
import { meoSvg, robotSvg } from './nhanVatChinh.mjs'
import { DAO_CU } from './daoCu.mjs'
import { logoTrongCau } from './logoThuongHieu.mjs'
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
// ── Nhép miệng theo âm (Rhubarb Lip Sync, MIT): đọc từng loi-<i>.wav ra các mốc hình miệng A–H / X. Bộ nhận dạng
// "phonetic" không phụ thuộc ngôn ngữ (giọng tiếng Việt). Kết quả lưu artifacts/mieng-<i>.json (kèm cỡ tệp wav để biết
// khi nào phải đọc lại). Không có rhubarb.exe hoặc đọc lỗi → câu đó nhép theo độ to giọng như cũ.
const RHUBARB = process.env.RHUBARB ?? 'C:\\Users\\Admin\\VieNeu-TTS\\rhubarb\\Rhubarb-Lip-Sync-1.14.0-Windows\\rhubarb.exe'
const docMieng = (i) =>
  new Promise((xong) => {
    const wav = join(GOC, `hyperframes/assets/loi-${i}.wav`)
    const ra = join(GOC, `artifacts/mieng-${i}.json`)
    if (!existsSync(wav) || !existsSync(RHUBARB)) return xong(null)
    const co = statSync(wav).size
    try {
      const cu = JSON.parse(readFileSync(ra, 'utf8'))
      if (cu.co === co) return xong(cu.moc)
    } catch {}
    // Ghi ra tệp (-o): gọi từ Node, rhubarb.exe không in kết quả ra stdout
    const tam = `${ra}.rhubarb`
    execFile(RHUBARB, ['-q', '-r', 'phonetic', '-f', 'json', '--extendedShapes', 'GHX', '-o', tam, wav], { timeout: 120_000 }, (loi) => {
      if (loi) return xong(null)
      try {
        const moc = JSON.parse(readFileSync(tam, 'utf8')).mouthCues.map((c) => [+c.start, c.value])
        rmSync(tam, { force: true })
        writeFileSync(ra, JSON.stringify({ co, moc }))
        xong(moc)
      } catch {
        xong(null)
      }
    })
  })
const MIENG = []
for (let i = 0; i < loi.length; i += 6) MIENG.push(...(await Promise.all(loi.slice(i, i + 6).map((_, k) => docMieng(i + k)))))

// ── Đồng bộ theo bản thu thật: thời điểm giọng đọc tới một chữ trong câu. Đếm số tiếng (âm tiết tiếng Việt, cách nhau
// bởi khoảng trắng) đứng trước chữ đó, rồi trải tỉ lệ ấy lên các đoạn ĐANG CÓ TIẾNG trong bản thu (mốc Rhubarb khác X;
// không có Rhubarb thì theo độ to giọng), bỏ qua chỗ ngắt hơi / dấu phẩy — không ước theo số ký tự của câu.
const DOAN_NOI = {}
function doanNoi(i) {
  if (DOAN_NOI[i]) return DOAN_NOI[i]
  const d = doDai[i]
  const ds = []
  const moc = MIENG[i]
  if (moc?.length) {
    moc.forEach(([bd, v], k) => {
      const kt = Math.min(moc[k + 1]?.[0] ?? d, d)
      if (v !== 'X' && kt > bd) ds.push([bd, kt])
    })
  } else {
    const tep = join(GOC, `hyperframes/assets/loi-${i}.wav`)
    if (existsSync(tep))
      doTo(tep).forEach((v, k) => {
        if (v > 0.05) ds.push([k / 15, Math.min(d, (k + 1) / 15)])
      })
  }
  return (DOAN_NOI[i] = ds.length ? ds : [[0, Math.max(0.1, d - 0.25)]])
}
// vt: vị trí ký tự của chữ trong l.chu → giây tuyệt đối trên dòng thời gian
function lucTu(i, vt) {
  const chu = String(loi[i].chu ?? '').trim()
  const tieng = chu.split(/\s+/).filter(Boolean).length || 1
  const truoc = chu.slice(0, Math.max(0, vt)).trim()
  const k = truoc ? truoc.split(/\s+/).length : 0
  const ds = doanNoi(i)
  let can = (k / tieng) * ds.reduce((a, [x, y]) => a + y - x, 0)
  for (const [x, y] of ds) {
    if (can <= y - x) return batDau[i] + x + can
    can -= y - x
  }
  return batDau[i] + ds.at(-1)[1]
}

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

// ── Chống cảnh nhảy qua lại (phim Jensen Huang 15/10/2026: nhà hàng → phòng thu Mèo / Bit → nhà hàng mỗi câu một lần):
// đoạn chen giữa hai câu cùng một cảnh mà chỉ gồm lời Mèo / Bit (tối đa 3 câu), hoặc chỉ một câu ngắn dưới 4,5 giây,
// thì ở luôn cảnh đang có; lời Mèo / Bit nối sau một cảnh (tối đa 3 câu) cũng ở lại cảnh đó — Mèo / Bit bình luận ngay tại chỗ, không cắt về phòng thu rồi cắt ngược lại.
{
  const canh = (l) => (BOI_CANH[l?.boi_canh] ? l.boi_canh : 'truong_quay')
  const linhVat = (l) => l.ai === 'meo' || l.ai === 'robot'
  let i = 1
  while (i < loi.length) {
    const truoc = loi[i - 1]
    if (canh(loi[i]) === canh(truoc)) { i++; continue }
    let j = i
    while (j < loi.length && j - i < 3 && canh(loi[j]) !== canh(truoc) && (j === i || linhVat(loi[j]) === linhVat(loi[i]))) j++
    const doan = loi.slice(i, j)
    const giay = doan.reduce((tong, _, k) => tong + (doDai[i + k] ?? 0), 0)
    // Lời Mèo / Bit nối sau một cảnh: bình luận ngay tại cảnh đó (dù câu sau sang cảnh khác: 1 lần cắt thay vì 2)
    // (chỉ khi câu trước là người kể / nhân vật khác: video tin chỉ có Mèo / Bit thì cảnh vẫn đổi theo lời như cũ)
    if ((doan.every(linhVat) && !linhVat(truoc)) || (j < loi.length && canh(loi[j]) === canh(truoc) && doan.length === 1 && giay < 4.5)) {
      for (const l of doan) {
        l.boi_canh = truoc.boi_canh
        if (truoc.dia_diem) l.dia_diem = truoc.dia_diem
      }
      i = j
    } else i++
  }
}
// ── Cảnh hành động sau lưng nhân vật (pháo hoa, tên lửa, đám đông…): AI hay rải quá tay (Jensen Huang: 9 lần pháo hoa,
// có lần bắn trên cảnh trường cải huấn u ám). Pháo hoa chỉ ở câu VUI; câu buồn không có cảnh hành động nào; cùng một
// loại cách nhau ít nhất 60 giây, hai cảnh hành động bất kỳ cách nhau ít nhất 20 giây.
{
  const cuoiLoai = {}
  let cuoi = -99
  let luc = 0
  loi.forEach((l, i) => {
    const hd = l.hanh_dong
    if (hd && hd !== 'khong' && hd !== 'lich_lat') {
      const sai = (hd === 'phao_hoa' && l.cam_xuc !== 'vui') || l.cam_xuc === 'buon' || luc - (cuoiLoai[hd] ?? -99) < 60 || luc - cuoi < 20
      // Câu sau nối tiếp đúng cảnh đó (hành động kéo dài) thì giữ
      const noi = i && loi[i - 1].hanh_dong === hd
      if (sai && !noi) l.hanh_dong = 'khong'
      else {
        cuoiLoai[hd] = luc
        cuoi = luc
      }
    }
    luc += doDai[i] ?? 0
  })
}

const batDau = []
// Thẻ chương (video YouTube nhiều phần). Có câu người kể đọc tên chương (la_chuong, lib/youtube.ts chèn) thì thẻ
// hiện đúng trong câu đó; không có thì như cũ: 2,4 giây đầu phần im lặng là màn tiêu đề. Màn kết 6 giây cuối video.
const I_CHUONG = the_chuong ? loi.findIndex((l) => l.la_chuong) : -1
const MO_CHUONG = the_chuong && I_CHUONG < 0 ? 2.4 : 0
// Màn kết: khung ngang (YouTube) 8 giây — vừa đủ cho "màn hình kết thúc" của YouTube (tối thiểu 5 giây, 2 ô video
// đề xuất); dọc 6 giây
// Mèo Mun đọc lời mời đăng ký ở màn kết (máy nhà đọc sẵn assets/ket.wav); lời dài thì màn kết dài theo
const KET_WAV = join(GOC, 'hyperframes/assets/ket.wav')
const KET_GIAY = man_ket && existsSync(KET_WAV) ? doTo(KET_WAV).length / 15 : 0
const MAN_KET = man_ket ? Math.max(NGANG ? 8 : 6, KET_GIAY + 1.8) : 0
let t = 0.4 + MO_CHUONG // nhịp mở đầu trước câu đầu tiên
for (const [i, d] of doDai.entries()) {
  // Khoảng lặng có chủ đích (AI đặt lang): sau câu sốc / câu nặng cảm xúc, im 1,5 giây cho hình "thở", người xem kịp thấm
  // (góp ý dựng phim 12/10/2026: khoảng lặng 1–2 giây), chỉ còn âm nền
  if (i && loi[i]?.lang) t += 1.5
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
const DONG_BO = [] // artifacts/dong_bo.json: mỗi câu thoại truy ra cảnh của nó (kiểm định sau khi dựng)
// lang: câu có khoảng lặng có chủ đích ngay trước — máy nhà hạ nhạc nền ở khoảng đó khi ghép cả phim (tho_doc.py)
writeFileSync(join(GOC, 'artifacts/phu_de.json'), JSON.stringify(loi.map((l, i) => ({ bd: +batDau[i].toFixed(2), kt: +(batDau[i] + doDai[i]).toFixed(2), chu: l.chu, ...(l.lang && i ? { lang: true } : {}) }))))
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
// ── Diễn qua lại: mỗi câu người nói có người phản ứng (người nghe không đứng đờ). Người phản ứng chính: người nói là Mèo →
// Bit, là Bit → Mèo, là nhân vật phụ / nhân vật chính → Mèo; thêm nhân vật phụ khác đang đứng trên sân khấu. Câu người kể
// (giọng dẫn) thì nhân vật trên sân khấu diễn theo lời kể (xem vòng câu thoại), không có người phản ứng riêng.
const coMatCau = (i) => doanPhu.map((dp, k) => [dp, `phu${k}`]).filter(([dp]) => dp.tu <= i && i <= dp.het).map(([, q]) => q)
const nguoiNoiCau = (i) => {
  const ai = laPhu(loi[i].ai) || loi[i].ai === 'meo' ? loi[i].ai : 'robot'
  return laPhu(ai) ? phuCuaCau[i] : ai
}
const nguoiPhanUng = (i) => {
  if (loi[i].ai === 'nguoi_ke') return []
  const p = nguoiNoiCau(i)
  return [p === 'meo' ? 'robot' : 'meo', ...coMatCau(i).filter((q) => q !== p)]
}
// Câu bi kịch: cảm xúc buồn hoặc lời nói về cái chết / chiến tranh / thảm hoạ / bệnh hiểm nghèo
const TU_BI_KICH = /chết|tử vong|thiệt mạng|qua đời|hy sinh|giết|thảm sát|thảm họa|thảm hoạ|bom|tàn phá|xóa sổ|xoá sổ|đổ nát|chiến tranh|ung thư|tro bụi|bức xạ|nạn nhân/
const biKich = (i) => !!loi[i] && (loi[i].cam_xuc === 'buon' || TU_BI_KICH.test(String(loi[i].chu ?? '').toLowerCase()))
// Phản ứng theo lời người nói (tạo tương phản: người nổi giận → người nghe chột dạ; người kể khổ → người nghe buồn theo;
// giải thích → người nghe ngẫm nghĩ; tò mò hỏi → người nghe suy nghĩ tìm câu trả lời)
const PHAN_UNG = {
  tuc_gian: 'lo_lang', bat_ngo: 'bat_ngo', buon: 'buon', vui: 'vui', lo_lang: 'lo_lang', to_mo: 'suy_nghi',
  giai_thich: 'suy_nghi', khang_dinh: 'khang_dinh', suy_nghi: 'to_mo',
}
// Lời mạnh: máy quay cắt qua mặt người phản ứng cuối câu (shot / reverse shot)
const PHAN_UNG_MANH = new Set(['tuc_gian', 'bat_ngo', 'buon', 'lo_lang'])
// Ảnh thật (phim tiểu sử): các câu liền nhau cùng một ảnh gom một đoạn. Kiểu đặt: đoạn chỉ có người kể (khung ngang)
// → ảnh tư liệu phủ kín khung hình, nhân vật nhường chỗ cho tư liệu như phim tài liệu
// (góp ý 14/10/2026: nhân vật "gánh" quá nhiều thời lượng, ảnh nhỏ góc phải như slide); còn lại → ảnh nhỏ trên cao
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
  c.kieu = NGANG && chiNguoiKe ? 'toan' : 'tren'
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
} else {
  // Khung dọc: thẻ minh hoạ nằm cố định dưới tên kênh → câu có thẻ cũng lùi máy, hạ khung (không cận mặt lên đụng thẻ)
  loi.forEach((l, i) => {
    if (MINH_HOA[l.minh_hoa?.kieu] && !l.anh_wiki?.tep && l.hanh_dong !== 'lich_lat') THE_TREN.add(i)
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
    SO_DONG[i] = { chu: `${m[1]} ${m[2]}`.trim(), vt: m.index / Math.max(1, l.chu.length), kyTu: m.index }
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
// ── Động tác theo lời thoại (AI chọn dong_tac cho từng câu): người nói làm, câu người kể thì người đang được kể làm.
// Chỉ dùng đầu và hai tay (xoay quanh vai): tay trái quay dương / tay phải quay âm là giơ ra ngoài – lên trên, ngược lại
// là khép vào trước ngực. Có động tác thì cử chỉ cảm xúc chỉ giữ nét mặt (không tranh tay / đầu với động tác).
const DONG_TAC = {
  chi_tay: (p, t0) => [
    `tl.to("#${p}-tay-phai", { rotation: -100, duration: 0.3, ease: "back.out(1.6)" }, ${f(t0)});`,
    `tl.to("#${p}-tay-phai", { rotation: -88, duration: 0.14, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t0 + 0.4)});`,
    `tl.to("#${p}-dau", { rotation: -5, duration: 0.3 }, ${f(t0)});`,
  ],
  khoanh_tay: (p, t0) => [
    `tl.to("#${p}-tay-trai", { rotation: -55, duration: 0.4, ease: "power2.out" }, ${f(t0)});`,
    `tl.to("#${p}-tay-phai", { rotation: 55, duration: 0.4, ease: "power2.out" }, ${f(t0 + 0.05)});`,
    `tl.to("#${p}-dau", { rotation: -6, duration: 0.4 }, ${f(t0 + 0.1)});`,
  ],
  cui_dau: (p, t0) => [
    `tl.to("#${p}-dau", { rotation: 13, duration: 0.6, ease: "sine.inOut" }, ${f(t0)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 10 : -10), duration: 0.6, ease: "sine.inOut" }, ${f(t0)});`,
  ],
  dap_tay: (p, t0) => [
    `tl.to("#${p}-tay-phai", { rotation: -150, duration: 0.28, ease: "power2.out" }, ${f(t0)});`,
    `tl.to("#${p}-tay-phai", { rotation: -25, duration: 0.12, ease: "power4.in" }, ${f(t0 + 0.5)});`,
    `tl.to("#${p}-dau", { rotation: 6, duration: 0.12, ease: "power4.in" }, ${f(t0 + 0.5)});`,
  ],
  vo_tay: (p, t0) => [
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -55 : 55), duration: 0.25, ease: "power2.out" }, ${f(t0)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -25 : 25), duration: 0.12, yoyo: true, repeat: 7, ease: "sine.inOut" }, ${f(t0 + 0.3)});`,
  ],
  tay_len_nguc: (p, t0) => [
    `tl.to("#${p}-tay-phai", { rotation: 48, duration: 0.45, ease: "power2.out" }, ${f(t0)});`,
    `tl.to("#${p}-dau", { rotation: -5, duration: 0.45 }, ${f(t0)});`,
  ],
  nhun_vai: (p, t0) => [
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -50 : 50), duration: 0.3, ease: "back.out(1.6)" }, ${f(t0)});`,
    `tl.to("#${p}-dau", { rotation: 9, duration: 0.3 }, ${f(t0)});`,
  ],
  gio_tay: (p, t0) => [`tl.to("#${p}-tay-phai", { rotation: -165, duration: 0.35, ease: "back.out(1.6)" }, ${f(t0)});`],
  vay_tay: (p, t0) => [
    `tl.to("#${p}-tay-phai", { rotation: -140, duration: 0.3, ease: "back.out(2)" }, ${f(t0)});`,
    `tl.to("#${p}-tay-phai", { rotation: -112, duration: 0.18, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t0 + 0.32)});`,
  ],
  cam_vat: (p, t0) => [
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -78 : 78), duration: 0.45, ease: "power2.out" }, ${f(t0)});`,
    `tl.to("#${p}-dau", { rotation: 9, duration: 0.45 }, ${f(t0 + 0.1)});`,
  ],
  viet: (p, t0) => [
    `tl.to("#${p}-tay-phai", { rotation: -55, duration: 0.3 }, ${f(t0)});`,
    `tl.to("#${p}-tay-phai", { rotation: -44, duration: 0.12, yoyo: true, repeat: 9, ease: "sine.inOut" }, ${f(t0 + 0.32)});`,
    `tl.to("#${p}-dau", { rotation: 10, duration: 0.35 }, ${f(t0)});`,
  ],
  om_dau: (p, t0) => [
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -168 : 168), duration: 0.35, ease: "power2.out" }, ${f(t0)});`,
    `tl.to("#${p}-dau", { rotation: 6, duration: 0.22, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t0 + 0.35)});`,
  ],
  chong_cam: (p, t0) => [
    `tl.to("#${p}-tay-phai", { rotation: -130, duration: 0.45, ease: "back.out(1.1)" }, ${f(t0)});`,
    `tl.to("#${p}-dau", { rotation: 9, duration: 0.45, ease: "power2.out" }, ${f(t0)});`,
  ],
  xoe_tay: (p, t0) => [
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -70 : 70), duration: 0.4, ease: "back.out(1.4)" }, ${f(t0)});`,
    `tl.to("#${p}-dau", { rotation: -4, duration: 0.4 }, ${f(t0)});`,
  ],
}

// ── HÀNH ĐỘNG KỂ CHUYỆN (chủ trang 15/10/2026: "nhân vật phải diễn theo từng lời thoại chứ không phải đứng nói không"):
// lời kể nói nhân vật LÀM gì thì nhân vật đứng trên sân khấu làm đúng việc đó, cầm đúng đồ vật, suốt phần còn lại của câu
// — rửa bát, xách vali ra đi, khóc, gõ máy tính, đọc sách, bị xô đẩy, ăn mừng, phát biểu, bắt tay, kiệt sức, ăn, đếm
// tiền, lắp ráp, chạy. Tay quay: tay phải xoay dương / tay trái xoay âm = đưa vào trước người (gõ máy, rửa bát, đưa
// micro lên miệng); ngược lại = dang ra ngoài / giơ lên. Đồ vật là emoji gắn vào tay (đi theo tay khi tay chuyển động) hoặc đặt trước người. Chỉ nhân vật
// người (nhân vật chính / phụ, mã phu<k>); Mèo / Bit vẫn dùng cử chỉ. Đồ vật cần dùng ghi vào VAT_CAN rồi mới chèn vào
// hình nhân vật (nvPhu).
// Đồ vật không có emoji: vẽ sẵn (khung 100×100), dùng như emoji trong VAT (chuỗi bắt đầu bằng "<svg")
const VE_VAT = {
  // Bộ 13 (phim Lionel Messi 16/10/2026): khung thành, hình nộm tập, tường gạch, áo đấu (cầm tay / mặc trên người), bục họp
  // báo, sân vận động rực đèn, bong bóng la ó, khăn giấy hợp đồng
  khung_thanh: '<svg viewBox="0 0 100 100"><g class="luoi"><path d="M10 30 L90 30 L96 100 L4 100 Z" fill="#ffffff22"/><path d="M10 30 L4 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M20 30 L15.5 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M30 30 L27 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M40 30 L38.5 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M50 30 L50 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M60 30 L61.5 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M70 30 L73 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M80 30 L84.5 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M90 30 L96 100" stroke="#e2e8f0" stroke-width="0.8"/><path d="M10 40 L90 40" stroke="#e2e8f0" stroke-width="0.8"/><path d="M9 50 L91 50" stroke="#e2e8f0" stroke-width="0.8"/><path d="M8 60 L92 60" stroke="#e2e8f0" stroke-width="0.8"/><path d="M7 70 L93 70" stroke="#e2e8f0" stroke-width="0.8"/><path d="M6 80 L94 80" stroke="#e2e8f0" stroke-width="0.8"/><path d="M5 90 L95 90" stroke="#e2e8f0" stroke-width="0.8"/><path d="M4 100 L96 100" stroke="#e2e8f0" stroke-width="0.8"/></g><path d="M6 100 L6 28 L94 28 L94 100" fill="none" stroke="#f8fafc" stroke-width="5" stroke-linejoin="round"/><path d="M6 100 L6 28 L94 28 L94 100" fill="none" stroke="#94a3b8" stroke-width="1.2"/></svg>',
  hinh_nom: '<svg viewBox="0 0 100 100"><rect x="44" y="30" width="12" height="62" rx="5" fill="#facc15" stroke="#854d0e" stroke-width="2"/><circle cx="50" cy="22" r="10" fill="#facc15" stroke="#854d0e" stroke-width="2"/><rect x="30" y="40" width="40" height="10" rx="4" fill="#facc15" stroke="#854d0e" stroke-width="2"/><ellipse cx="50" cy="94" rx="20" ry="5" fill="#1f2937"/></svg>',
  tuong_tap: '<svg viewBox="0 0 100 100"><rect x="20" y="10" width="70" height="90" fill="#b45309" stroke="#78350f" stroke-width="2"/><path d="M20 20 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M20 30 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M20 40 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M20 50 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M20 60 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M20 70 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M20 80 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M20 90 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M20 100 H90" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M26 10 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M48 10 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M70 10 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M32 20 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M54 20 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M76 20 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M26 30 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M48 30 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M70 30 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M32 40 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M54 40 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M76 40 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M26 50 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M48 50 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M70 50 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M32 60 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M54 60 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M76 60 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M26 70 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M48 70 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M70 70 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M32 80 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M54 80 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M76 80 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M26 90 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M48 90 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><path d="M70 90 v10" stroke="#fde68a" stroke-width="1.2" opacity="0.7"/><circle cx="44" cy="62" r="7" fill="none" stroke="#f8fafc" stroke-width="2" stroke-dasharray="3 2"/></svg>',
  ao_psg_cam: '<svg viewBox="0 0 100 100"><path d="M30 20 L44 14 Q50 20 56 14 L70 20 L84 38 L72 46 L70 40 L70 88 L30 88 L30 40 L28 46 L16 38 Z" fill="#1e3a8a" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/><rect x="42" y="16" width="16" height="72" fill="#dc2626"/><path d="M42 16 V88 M58 16 V88" stroke="#f8fafc" stroke-width="2"/></svg>',
  ao_psg: '<svg viewBox="0 0 100 100"><path d="M32 59 Q32 48 43 47 L57 47 Q68 48 68 59 L66.5 94 Q50 97.5 33.5 94 Z" fill="#1e3a8a" stroke="#1f2937" stroke-width="1.6"/><rect x="44" y="47" width="12" height="49" fill="#dc2626"/><path d="M44 47 V96 M56 47 V96" stroke="#f8fafc" stroke-width="1.2"/><path d="M44 47 Q50 52 56 47" fill="none" stroke="#f8fafc" stroke-width="1.6"/></svg>',
  ao_hong: '<svg viewBox="0 0 100 100"><path d="M32 59 Q32 48 43 47 L57 47 Q68 48 68 59 L66.5 94 Q50 97.5 33.5 94 Z" fill="#f472b6" stroke="#1f2937" stroke-width="1.6"/><path d="M38 66 Q50 60 62 66" fill="none" stroke="#1f2937" stroke-width="1.4"/><text x="50" y="82" text-anchor="middle" font-size="9" font-weight="900" fill="#1f2937" font-family="Arial">10</text><path d="M44 47 Q50 52 56 47" fill="none" stroke="#1f2937" stroke-width="1.6"/></svg>',
  buc_hop_bao: '<svg viewBox="0 0 100 100"><path d="M20 44 L80 44 L74 100 L26 100 Z" fill="#1e3a8a" stroke="#0f172a" stroke-width="2.5"/><rect x="16" y="40" width="68" height="8" rx="2" fill="#334155" stroke="#0f172a" stroke-width="2"/><circle cx="50" cy="70" r="9" fill="#f8fafc" opacity="0.9"/><path d="M36 40 L42 22 M64 40 L58 22 M50 40 L50 20" stroke="#111827" stroke-width="2"/><circle cx="42" cy="21" r="3" fill="#111827"/><circle cx="58" cy="21" r="3" fill="#111827"/><circle cx="50" cy="19" r="3" fill="#dc2626"/></svg>',
  san_den: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><defs><linearGradient id="sd-troi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1026"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs><rect width="100" height="100" fill="url(#sd-troi)"/><g fill="#fef9c3" opacity="0.18"><path d="M8 10 L-10 64 L30 64 Z"/><path d="M92 10 L70 64 L110 64 Z"/><path d="M40 6 L28 64 L56 64 Z"/></g><g fill="#fef08a"><rect x="4" y="6" width="10" height="5" rx="1"/><rect x="86" y="6" width="10" height="5" rx="1"/><rect x="36" y="2" width="10" height="5" rx="1"/></g><path d="M0 40 Q50 30 100 40 L100 64 L0 64 Z" fill="#334155"/><circle cx="2" cy="46" r="1.6" fill="#f8fafc"/><circle cx="6" cy="50" r="1.6" fill="#93c5fd"/><circle cx="10" cy="54" r="1.6" fill="#fca5a5"/><circle cx="14" cy="46" r="1.6" fill="#f8fafc"/><circle cx="18" cy="50" r="1.6" fill="#93c5fd"/><circle cx="22" cy="54" r="1.6" fill="#fca5a5"/><circle cx="26" cy="46" r="1.6" fill="#f8fafc"/><circle cx="30" cy="50" r="1.6" fill="#93c5fd"/><circle cx="34" cy="54" r="1.6" fill="#fca5a5"/><circle cx="38" cy="46" r="1.6" fill="#f8fafc"/><circle cx="42" cy="50" r="1.6" fill="#93c5fd"/><circle cx="46" cy="54" r="1.6" fill="#fca5a5"/><circle cx="50" cy="46" r="1.6" fill="#f8fafc"/><circle cx="54" cy="50" r="1.6" fill="#93c5fd"/><circle cx="58" cy="54" r="1.6" fill="#fca5a5"/><circle cx="62" cy="46" r="1.6" fill="#f8fafc"/><circle cx="66" cy="50" r="1.6" fill="#93c5fd"/><circle cx="70" cy="54" r="1.6" fill="#fca5a5"/><circle cx="74" cy="46" r="1.6" fill="#f8fafc"/><circle cx="78" cy="50" r="1.6" fill="#93c5fd"/><circle cx="82" cy="54" r="1.6" fill="#fca5a5"/><circle cx="86" cy="46" r="1.6" fill="#f8fafc"/><circle cx="90" cy="50" r="1.6" fill="#93c5fd"/><circle cx="94" cy="54" r="1.6" fill="#fca5a5"/><circle cx="98" cy="46" r="1.6" fill="#f8fafc"/><circle cx="102" cy="50" r="1.6" fill="#93c5fd"/><rect x="0" y="62" width="100" height="38" fill="#15803d"/><path d="M0 62 H100 M50 62 V100" stroke="#bbf7d0" stroke-width="0.8" opacity="0.8"/><ellipse cx="50" cy="82" rx="14" ry="5" fill="none" stroke="#bbf7d0" stroke-width="0.8" opacity="0.8"/></svg>',
  la_o: '<svg viewBox="0 0 100 100"><g font-family="Arial Black, Arial" font-weight="900"><rect x="4" y="10" width="40" height="20" rx="10" fill="#f8fafc" stroke="#1f2937" stroke-width="2"/><text x="24" y="25" text-anchor="middle" font-size="12" fill="#dc2626">BOO!</text><rect x="54" y="40" width="40" height="20" rx="10" fill="#f8fafc" stroke="#1f2937" stroke-width="2"/><text x="74" y="55" text-anchor="middle" font-size="12" fill="#dc2626">BOO!</text><rect x="10" y="70" width="40" height="20" rx="10" fill="#f8fafc" stroke="#1f2937" stroke-width="2"/><text x="30" y="85" text-anchor="middle" font-size="12" fill="#dc2626">BOO!</text></g></svg>',
  khan_giay: '<svg viewBox="0 0 100 100"><path d="M22 32 L80 30 L92 70 L10 72 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="2" stroke-linejoin="round"/><path d="M26 42 Q40 38 52 44 T78 42 M22 52 Q38 48 54 54 T82 52" fill="none" stroke="#2563eb" stroke-width="1.8"/><path d="M30 62 L60 60" stroke="#2563eb" stroke-width="1.8"/></svg>',
  // Bộ 12 (phim Ferrari 16/10/2026): bảng tên trên tường, chớp đèn máy ảnh
  bang_ten: '<svg viewBox="0 0 100 100"><rect x="6" y="30" width="88" height="40" rx="4" fill="#facc15" stroke="#713f12" stroke-width="3"/><rect x="11" y="35" width="78" height="30" rx="2" fill="none" stroke="#1f2937" stroke-width="1.5"/><text x="50" y="56" text-anchor="middle" font-size="15" font-weight="900" fill="#b91c1c" font-family="Arial Black, Arial">FERRARI</text><circle cx="12" cy="34" r="2.2" fill="#6b7280"/><circle cx="88" cy="34" r="2.2" fill="#6b7280"/><circle cx="12" cy="66" r="2.2" fill="#6b7280"/><circle cx="88" cy="66" r="2.2" fill="#6b7280"/></svg>',
  chop_den: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="#fff" opacity="0.95"/><path d="M50 4 L54 40 L50 50 L46 40 Z M50 96 L54 60 L50 50 L46 60 Z M4 50 L40 46 L50 50 L40 54 Z M96 50 L60 46 L50 50 L60 54 Z" fill="#fef9c3"/></svg>',
  // Bộ 11 (phim Ferrari 16/10/2026): bàn làm việc, giấy trên bàn, giấy thành lập, xe ô tô cổ, xe đua 1930, tấm bạt phủ xe,
  // khói lửa chiến tranh, cỗ máy xưởng cơ khí
  ban_go: '<svg viewBox="0 0 100 100"><rect x="0" y="40" width="100" height="12" rx="3" fill="#92400e" stroke="#451a03" stroke-width="2"/><path d="M2 43 H98" stroke="#b45309" stroke-width="1.5"/><rect x="4" y="52" width="92" height="46" fill="#78350f" stroke="#451a03" stroke-width="2"/><rect x="10" y="58" width="36" height="16" rx="2" fill="#92400e" stroke="#451a03" stroke-width="1.5"/><rect x="54" y="58" width="36" height="16" rx="2" fill="#92400e" stroke="#451a03" stroke-width="1.5"/><circle cx="28" cy="66" r="1.8" fill="#fbbf24"/><circle cx="72" cy="66" r="1.8" fill="#fbbf24"/><rect x="10" y="78" width="80" height="14" rx="2" fill="#92400e" stroke="#451a03" stroke-width="1.5"/></svg>',
  giay_ban: '<svg viewBox="0 0 100 100"><path d="M18 30 L82 30 L94 70 L6 70 Z" fill="#fefce8" stroke="#92400e" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 38 H78 M20 46 H80 M18 54 H82 M16 62 H66" stroke="#a8a29e" stroke-width="2.5"/><circle cx="76" cy="62" r="4" fill="#dc2626"/></svg>',
  van_ban: '<svg viewBox="0 0 100 100"><rect x="14" y="8" width="72" height="86" rx="3" fill="#fefce8" stroke="#92400e" stroke-width="3"/><rect x="20" y="14" width="60" height="74" fill="none" stroke="#d97706" stroke-width="1.5"/><path d="M38 22 h24 M34 28 h32" stroke="#92400e" stroke-width="3"/><path d="M28 42 H72 M28 50 H72 M28 58 H72 M28 66 H60" stroke="#a8a29e" stroke-width="2.5"/><circle cx="66" cy="78" r="8" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/><path d="M62 86 l-3 8 l7 -4 l7 4 l-3 -8" fill="#dc2626"/><path d="M26 80 q8 -6 16 0" stroke="#1f2937" stroke-width="1.5" fill="none"/></svg>',
  xe_co: '<svg viewBox="0 0 100 100"><path d="M6 70 Q8 56 22 54 L34 52 L42 40 Q48 36 60 36 L72 38 L80 52 L92 56 Q96 60 95 70 Z" fill="#b91c1c" stroke="#450a0a" stroke-width="2.5" stroke-linejoin="round"/><path d="M45 41 L58 39 L66 40 L72 51 L44 52 Z" fill="#bae6fd" stroke="#450a0a" stroke-width="1.5"/><path d="M58 39 L58 52" stroke="#450a0a" stroke-width="1.5"/><path d="M4 72 L96 72" stroke="#1f2937" stroke-width="3"/><path d="M8 64 Q22 52 34 66 M66 66 Q78 52 92 64" fill="#7f1d1d" stroke="#450a0a" stroke-width="2"/><circle cx="8" cy="62" r="3" fill="#fde68a" stroke="#a16207" stroke-width="1"/><rect x="40" y="60" width="10" height="2" fill="#fde68a"/><circle cx="21" cy="74" r="11" fill="#111827"/><circle cx="21" cy="74" r="6.82" fill="#e5e7eb" stroke="#4b5563" stroke-width="1"/><path d="M14.4 74 H27.6 M21 67.4 V80.6 M16.38 69.38 L25.62 78.62 M25.62 69.38 L16.38 78.62" stroke="#6b7280" stroke-width="0.9"/><circle cx="79" cy="74" r="11" fill="#111827"/><circle cx="79" cy="74" r="6.82" fill="#e5e7eb" stroke="#4b5563" stroke-width="1"/><path d="M72.4 74 H85.6 M79 67.4 V80.6 M74.38 69.38 L83.62 78.62 M83.62 69.38 L74.38 78.62" stroke="#6b7280" stroke-width="0.9"/></svg>',
  xe_dua: '<svg viewBox="0 0 100 100"><path d="M4 66 Q4 58 14 56 L38 54 L46 46 Q52 42 58 46 L62 54 L88 56 Q97 58 96 66 Z" fill="#dc2626" stroke="#450a0a" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="52" cy="48" rx="6" ry="3" fill="#1f2937"/><path d="M48 44 Q52 38 56 44" fill="none" stroke="#bae6fd" stroke-width="2"/><circle cx="74" cy="60" r="6" fill="#fff" stroke="#450a0a" stroke-width="1.5"/><text x="74" y="63" text-anchor="middle" font-size="8" font-weight="900" fill="#111827" font-family="Arial">8</text><path d="M14 58 L30 58 M18 62 L28 62" stroke="#7f1d1d" stroke-width="1.5"/><path d="M6 60 L4 66" stroke="#9ca3af" stroke-width="2"/><circle cx="20" cy="70" r="12" fill="#111827"/><circle cx="20" cy="70" r="7.4399999999999995" fill="#e5e7eb" stroke="#4b5563" stroke-width="1"/><path d="M12.8 70 H27.2 M20 62.8 V77.2 M14.96 64.96 L25.04 75.04 M25.04 64.96 L14.96 75.04" stroke="#6b7280" stroke-width="0.9"/><circle cx="80" cy="70" r="12" fill="#111827"/><circle cx="80" cy="70" r="7.4399999999999995" fill="#e5e7eb" stroke="#4b5563" stroke-width="1"/><path d="M72.8 70 H87.2 M80 62.8 V77.2 M74.96 64.96 L85.04 75.04 M85.04 64.96 L74.96 75.04" stroke="#6b7280" stroke-width="0.9"/></svg>',
  vai_bat: '<svg viewBox="0 0 100 100"><path d="M3 74 Q2 58 16 52 Q26 34 52 32 Q76 32 86 48 Q98 56 97 74 Q90 70 84 76 Q76 70 68 76 Q58 70 50 76 Q42 70 34 76 Q24 70 16 76 Q10 70 3 74 Z" fill="#6b7f5e" stroke="#2f3a28" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 44 Q34 58 30 72 M52 34 Q56 54 52 74 M74 40 Q76 58 72 74" fill="none" stroke="#4d5c43" stroke-width="2"/></svg>',
  khoi_lua: '<svg viewBox="0 0 100 100"><g fill="#6b7280" opacity="0.75"><circle cx="24" cy="40" r="14"/><circle cx="44" cy="26" r="18"/><circle cx="66" cy="34" r="15"/><circle cx="82" cy="46" r="11"/></g><g fill="#9ca3af" opacity="0.55"><circle cx="36" cy="12" r="10"/><circle cx="58" cy="10" r="12"/></g><path d="M8 100 Q4 76 18 64 Q16 78 26 80 Q24 58 40 48 Q38 68 50 72 Q50 54 62 50 Q60 66 72 70 Q76 58 86 60 Q96 76 92 100 Z" fill="#ea580c"/><path d="M20 100 Q18 86 28 78 Q30 88 38 88 Q38 74 50 68 Q50 84 60 86 Q62 76 72 76 Q80 88 78 100 Z" fill="#facc15"/></svg>',
  xuong_may: '<svg viewBox="0 0 100 100"><rect x="10" y="40" width="80" height="34" rx="3" fill="#64748b" stroke="#1e293b" stroke-width="2.5"/><rect x="16" y="46" width="30" height="20" rx="2" fill="#475569" stroke="#1e293b" stroke-width="1.5"/><circle cx="64" cy="57" r="11" fill="#94a3b8" stroke="#1e293b" stroke-width="2"/><path d="M64 46 V68 M53 57 H75 M56 49 L72 65 M72 49 L56 65" stroke="#334155" stroke-width="1.5"/><rect x="80" y="50" width="16" height="6" fill="#94a3b8" stroke="#1e293b" stroke-width="1.5"/><rect x="16" y="74" width="10" height="24" fill="#334155"/><rect x="74" y="74" width="10" height="24" fill="#334155"/><rect x="22" y="30" width="12" height="10" fill="#78716c" stroke="#1e293b" stroke-width="1.5"/><path d="M28 30 V18 H52" stroke="#78716c" stroke-width="3" fill="none"/><circle cx="20" cy="56" r="2" fill="#f87171"/></svg>',
  // Bộ 10 (phim Soichiro Honda 16/10/2026): xe máy Type D nhìn ngang (đầu xe bên trái), bàn xưởng, ghế chủ tịch, con dấu,
  // vết dấu đỏ
  xe_may: '<svg viewBox="0 0 100 100"><g class="banh-truoc"><circle cx="20" cy="80" r="15" fill="#111827"/><circle cx="20" cy="80" r="10" fill="#e5e7eb" stroke="#374151" stroke-width="1.5"/><path d="M10 80 H30 M20 70 V90 M13 73 L27 87 M27 73 L13 87" stroke="#6b7280" stroke-width="1.2"/><circle cx="20" cy="80" r="2.5" fill="#374151"/></g><g class="banh-sau"><circle cx="78" cy="80" r="15" fill="#111827"/><circle cx="78" cy="80" r="10" fill="#e5e7eb" stroke="#374151" stroke-width="1.5"/><path d="M68 80 H88 M78 70 V90 M71 73 L85 87 M85 73 L71 87" stroke="#6b7280" stroke-width="1.2"/><circle cx="78" cy="80" r="2.5" fill="#374151"/></g><path d="M20 80 L30 46 M78 80 L66 60" stroke="#475569" stroke-width="3" fill="none"/><path d="M30 46 L44 54 L62 54 L72 64" stroke="#991b1b" stroke-width="4" fill="none" stroke-linejoin="round"/><path d="M38 44 Q48 38 58 44 L58 52 L38 52 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/><rect x="56" y="45" width="18" height="5" rx="2.5" fill="#1f2937"/><rect x="42" y="56" width="16" height="12" rx="2" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/><path d="M44 58 H56 M44 61 H56 M44 64 H56" stroke="#4b5563" stroke-width="1"/><path d="M56 66 L86 69" stroke="#6b7280" stroke-width="3.5" stroke-linecap="round"/><path d="M30 46 L26 34 M22 32 L32 34" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="44" r="3.5" fill="#fde68a" stroke="#a16207" stroke-width="1"/><path d="M16 70 Q20 64 26 66" stroke="#991b1b" stroke-width="3" fill="none"/><path class="chan-chong" d="M52 70 L52 70" stroke="#374151" stroke-width="2.5" stroke-linecap="round"/><text x="44" y="51" font-size="5" font-weight="900" fill="#fff" font-family="Arial">HONDA</text></svg>',
  khoi_xe: '<svg viewBox="0 0 100 100"><g fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"><circle cx="30" cy="60" r="14"/><circle cx="52" cy="50" r="18"/><circle cx="74" cy="58" r="12"/></g></svg>',
  ban_xuong: '<svg viewBox="0 0 100 100"><rect x="4" y="52" width="92" height="10" rx="2" fill="#78716c" stroke="#292524" stroke-width="2"/><rect x="10" y="62" width="7" height="38" fill="#57534e"/><rect x="83" y="62" width="7" height="38" fill="#57534e"/><rect x="16" y="86" width="68" height="5" fill="#57534e"/><g transform="translate(24 34)"><rect x="0" y="8" width="22" height="10" rx="2" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/><circle cx="6" cy="6" r="5" fill="#6b7280"/><circle cx="16" cy="6" r="4" fill="#6b7280"/></g><path d="M58 50 L74 40" stroke="#b45309" stroke-width="3"/><rect x="72" y="36" width="8" height="6" fill="#4b5563" transform="rotate(-30 76 39)"/><path d="M60 48 h14" stroke="#9ca3af" stroke-width="2"/></svg>',
  ghe_ct: '<svg viewBox="0 0 100 100"><path d="M22 60 L22 10 Q22 2 50 2 Q78 2 78 10 L78 60 Z" fill="#7f1d1d" stroke="#3b0a0a" stroke-width="3"/><path d="M32 14 Q50 8 68 14 L68 54 L32 54 Z" fill="#991b1b" opacity="0.7"/><circle cx="40" cy="24" r="1.5" fill="#fbbf24"/><circle cx="60" cy="24" r="1.5" fill="#fbbf24"/><circle cx="50" cy="36" r="1.5" fill="#fbbf24"/><rect x="14" y="56" width="72" height="12" rx="4" fill="#991b1b" stroke="#3b0a0a" stroke-width="2.5"/><rect x="10" y="46" width="12" height="7" rx="3" fill="#78350f"/><rect x="78" y="46" width="12" height="7" rx="3" fill="#78350f"/><rect x="47" y="68" width="6" height="20" fill="#374151"/><path d="M28 96 L50 88 L72 96 M50 88 L50 98" stroke="#374151" stroke-width="4" stroke-linecap="round"/><circle cx="28" cy="97" r="2.5" fill="#111827"/><circle cx="72" cy="97" r="2.5" fill="#111827"/><circle cx="50" cy="98" r="2.5" fill="#111827"/></svg>',
  con_dau: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="22" rx="14" ry="12" fill="#92400e" stroke="#451a03" stroke-width="3"/><rect x="42" y="30" width="16" height="34" rx="4" fill="#b45309" stroke="#451a03" stroke-width="3"/><path d="M46 36 V60" stroke="#d97706" stroke-width="2"/><rect x="32" y="62" width="36" height="14" rx="3" fill="#78350f" stroke="#451a03" stroke-width="3"/><rect x="34" y="76" width="32" height="6" rx="1.5" fill="#dc2626"/></svg>',
  dau_do: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="36" fill="none" stroke="#dc2626" stroke-width="7" opacity="0.85"/><text x="50" y="62" text-anchor="middle" font-size="34" font-weight="900" fill="#dc2626" opacity="0.85" font-family="serif">印</text></svg>',
  // Bộ 9 (phim Nikola Tesla 16/10/2026): gậy chống gỗ, cửa sổ khách sạn
  gay_chong: '<svg viewBox="0 0 100 100"><path d="M50 98 L50 14 Q50 2 38 2 Q27 2 27 12" fill="none" stroke="#451a03" stroke-width="9" stroke-linecap="round"/><path d="M50 98 L50 14 Q50 2 38 2 Q27 2 27 12" fill="none" stroke="#92400e" stroke-width="5.5" stroke-linecap="round"/><rect x="45.5" y="92" width="9" height="7" rx="2" fill="#1f2937"/><path d="M51.5 20 V88" stroke="#b45309" stroke-width="1.2" opacity="0.7"/></svg>',
  cua_so: '<svg viewBox="0 0 100 100"><rect x="14" y="6" width="72" height="80" fill="#1e293b" stroke="#78350f" stroke-width="5"/><rect x="18" y="10" width="64" height="72" fill="#1e3a8a"/><g fill="#fde68a" opacity="0.85"><rect x="24" y="52" width="6" height="30"/><rect x="34" y="40" width="8" height="42"/><rect x="46" y="58" width="7" height="24"/><rect x="58" y="34" width="9" height="48"/><rect x="70" y="48" width="7" height="34"/></g><circle cx="70" cy="20" r="5" fill="#f8fafc" opacity="0.9"/><path d="M50 10 V82 M18 46 H82" stroke="#78350f" stroke-width="3"/><path d="M8 4 Q20 40 12 92 L22 92 Q30 46 22 4 Z" fill="#991b1b" stroke="#450a0a" stroke-width="2"/><path d="M92 4 Q80 40 88 92 L78 92 Q70 46 78 4 Z" fill="#991b1b" stroke="#450a0a" stroke-width="2"/><rect x="4" y="0" width="92" height="5" rx="2" fill="#78350f"/><rect x="10" y="86" width="80" height="5" fill="#a16207"/></svg>',
  // Bộ 8 (phim Nikola Tesla 16/10/2026): giường, giường bệnh có cậu bé, sương, lan can tàu, bờ biển Mỹ, bản vẽ, người nhận
  giuong: '<svg viewBox="0 0 100 100"><rect x="4" y="30" width="10" height="70" rx="3" fill="#7c2d12" stroke="#431407" stroke-width="2"/><rect x="86" y="54" width="8" height="46" rx="3" fill="#7c2d12" stroke="#431407" stroke-width="2"/><rect x="12" y="62" width="80" height="20" rx="4" fill="#f1f5f9" stroke="#475569" stroke-width="2.5"/><rect x="12" y="58" width="80" height="10" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="2"/><path d="M34 60 L92 60 L92 80 L34 80 Z" fill="#64748b" stroke="#334155" stroke-width="2"/><ellipse cx="24" cy="57" rx="10" ry="6" fill="#fff" stroke="#94a3b8" stroke-width="2"/><rect x="10" y="82" width="84" height="6" fill="#7c2d12"/><rect x="12" y="88" width="5" height="12" fill="#431407"/><rect x="88" y="88" width="5" height="12" fill="#431407"/></svg>',
  giuong_benh: '<svg viewBox="0 0 100 100"><rect x="80" y="34" width="10" height="66" rx="3" fill="#a16207" stroke="#422006" stroke-width="2"/><rect x="6" y="56" width="8" height="44" rx="3" fill="#a16207" stroke="#422006" stroke-width="2"/><rect x="8" y="66" width="80" height="16" rx="4" fill="#f8fafc" stroke="#475569" stroke-width="2.5"/><ellipse cx="74" cy="60" rx="11" ry="6" fill="#fff" stroke="#94a3b8" stroke-width="2"/><circle cx="72" cy="54" r="8" fill="#fcd9b8" stroke="#1f2937" stroke-width="2"/><path d="M64 50 Q72 42 80 50" fill="#3f2a1d"/><path d="M68 55 q2 2 4 0" stroke="#1f2937" stroke-width="1.5" fill="none"/><rect x="70" y="58" width="3" height="3" fill="#fb7185" opacity="0.7"/><path d="M10 62 Q40 56 66 60 L66 72 L10 72 Z" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/><path d="M20 62 L20 72 M34 60 L34 72 M48 60 L48 72" stroke="#60a5fa" stroke-width="2"/><ellipse cx="26" cy="60" rx="5" ry="3.5" fill="#fcd9b8" stroke="#1f2937" stroke-width="1.5"/><path d="M50 66 Q58 62 62 66" stroke="#fcd9b8" stroke-width="0"/><rect x="6" y="82" width="84" height="5" fill="#a16207"/><circle cx="80" cy="44" r="3" fill="#ef4444" opacity="0.6"/></svg>',
  suong: '<svg viewBox="0 0 100 100"><g fill="#f8fafc"><ellipse cx="22" cy="78" rx="26" ry="12" opacity="0.55"/><ellipse cx="58" cy="84" rx="34" ry="13" opacity="0.5"/><ellipse cx="84" cy="74" rx="20" ry="10" opacity="0.45"/><ellipse cx="40" cy="60" rx="30" ry="10" opacity="0.35"/><ellipse cx="74" cy="52" rx="24" ry="9" opacity="0.3"/><ellipse cx="16" cy="44" rx="18" ry="8" opacity="0.28"/><ellipse cx="50" cy="94" rx="50" ry="8" opacity="0.6"/></g></svg>',
  lan_can: '<svg viewBox="0 0 100 100"><rect x="0" y="30" width="100" height="7" rx="3" fill="#92400e" stroke="#451a03" stroke-width="1.5"/><path d="M0 33 H100" stroke="#fbbf24" stroke-width="1" opacity="0.5"/><g stroke="#78350f" stroke-width="2.2"><path d="M4 37 V74"/><path d="M11.6 37 V74"/><path d="M19.2 37 V74"/><path d="M26.799999999999997 37 V74"/><path d="M34.4 37 V74"/><path d="M42 37 V74"/><path d="M49.599999999999994 37 V74"/><path d="M57.199999999999996 37 V74"/><path d="M64.8 37 V74"/><path d="M72.39999999999999 37 V74"/><path d="M80 37 V74"/><path d="M87.6 37 V74"/><path d="M95.19999999999999 37 V74"/></g><rect x="0" y="72" width="100" height="4" rx="2" fill="#92400e" stroke="#451a03" stroke-width="1"/></svg>',
  bo_bien: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><defs><linearGradient id="bb-troi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs><rect width="100" height="100" fill="url(#bb-troi)"/><circle cx="80" cy="30" r="6" fill="#fef3c7"/><g transform="translate(0 16)"><path d="M0 44 L6 44 L6 36 L10 36 L10 40 L15 40 L15 30 L19 30 L19 38 L24 38 L24 33 L28 33 L28 41 L34 41 L34 37 L38 37 L38 44 L100 44 L100 48 L0 48 Z" fill="#64748b" opacity="0.7"/><g fill="#0f766e"><rect x="66" y="36" width="3.4" height="9"/><path d="M64.6 36 L70.8 36 L69.4 31.5 L66 31.5 Z"/><circle cx="67.7" cy="29.6" r="2"/><path d="M68.4 28 L71.6 22.4 L72.4 23.2 L70 28.6 Z"/><path d="M66 28.4 L65.2 25.4 M67.6 27.6 L67.6 25 M69.2 28 L70 25.4" stroke="#0f766e" stroke-width="0.8"/></g><rect x="0" y="46" width="100" height="54" fill="#0284c7"/><path d="M0 54 q5 -2 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 M0 66 q5 -2 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 M0 80 q5 -2 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0" fill="none" stroke="#bae6fd" stroke-width="1.2" opacity="0.8"/></g><text x="14" y="63" font-size="6" font-family="Segoe UI Emoji">🚢</text><path d="M44 34 q2 -2 4 0 q2 -2 4 0 M56 40 q1.5 -1.5 3 0 q1.5 -1.5 3 0" stroke="#334155" stroke-width="0.7" fill="none"/></svg>',
  ban_ve: '<svg viewBox="0 0 100 100"><rect x="14" y="40" width="72" height="20" rx="10" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="3"/><ellipse cx="86" cy="50" rx="5" ry="10" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="2"/><path d="M24 46 H74 M24 52 H70 M30 56 H60" stroke="#bfdbfe" stroke-width="1.5"/><rect x="44" y="38" width="6" height="24" fill="#dc2626"/></svg>',
  nguoi_nhan: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="99" rx="18" ry="2" fill="#00000040"/><rect x="38" y="70" width="10" height="27" rx="4" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/><rect x="52" y="70" width="10" height="27" rx="4" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/><path d="M36 97 Q36 93 43 93 Q49 93 49 97 Z M51 97 Q51 93 57 93 Q64 93 64 97 Z" fill="#111827"/><rect x="25" y="47" width="11" height="28" rx="5.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/><rect x="64" y="47" width="11" height="28" rx="5.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/><circle cx="30" cy="76" r="4.5" fill="#fcd9b8" stroke="#1f2937" stroke-width="1.2"/><circle cx="70" cy="76" r="4.5" fill="#fcd9b8" stroke="#1f2937" stroke-width="1.2"/><path d="M33 52 Q33 46 43 45 L57 45 Q67 46 67 52 L66 75 Q50 79 34 75 Z" fill="#334155" stroke="#0f172a" stroke-width="1.8"/><path d="M50 47 L50 76" stroke="#1e293b" stroke-width="1.2"/><rect x="44" y="37" width="12" height="10" rx="2" fill="#fcd9b8" stroke="#1f2937" stroke-width="1.2"/><path d="M42 45 Q50 41 58 45 L57 47 Q50 44 43 47 Z" fill="#f8fafc" stroke="#475569" stroke-width="0.8"/><ellipse cx="31.5" cy="28" rx="3.2" ry="4.2" fill="#fcd9b8" stroke="#1f2937" stroke-width="1"/><ellipse cx="68.5" cy="28" rx="3.2" ry="4.2" fill="#fcd9b8" stroke="#1f2937" stroke-width="1"/><path d="M31 30 C29 8 71 8 69 30 Q66 38 58 39 L42 39 Q34 38 31 30 Z" fill="#4a2c17" stroke="#1c1917" stroke-width="1.6"/><path d="M40 14 Q50 10 60 14 M36 22 Q50 16 64 22 M38 30 Q44 27 50 30 Q56 27 62 30" fill="none" stroke="#7c4a24" stroke-width="1.3" stroke-linecap="round"/></svg>',
  // Bộ 7 (phim Nikola Tesla 16/10/2026): ghế gỗ, kim đan, xẻng, đất, hạt thóc, giấy xé đôi, nến
  ghe_go: '<svg viewBox="0 0 100 100"><path d="M14 72 L14 14 Q14 2 50 2 Q86 2 86 14 L86 72 Z" fill="#b45309" stroke="#451a03" stroke-width="3"/><path d="M30 10 L30 66 M42 7 L42 66 M58 7 L58 66 M70 10 L70 66" stroke="#92400e" stroke-width="3"/><rect x="1" y="46" width="17" height="8" rx="3" fill="#92400e" stroke="#451a03" stroke-width="2"/><rect x="82" y="46" width="17" height="8" rx="3" fill="#92400e" stroke="#451a03" stroke-width="2"/><rect x="4" y="54" width="6" height="16" fill="#78350f"/><rect x="90" y="54" width="6" height="16" fill="#78350f"/><rect x="4" y="68" width="92" height="9" rx="3" fill="#b45309" stroke="#451a03" stroke-width="2.5"/><rect x="8" y="77" width="8" height="23" fill="#92400e" stroke="#451a03" stroke-width="2"/><rect x="84" y="77" width="8" height="23" fill="#92400e" stroke="#451a03" stroke-width="2"/></svg>',
  kim_dan: '<svg viewBox="0 0 100 100"><path d="M22 92 L78 10" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round"/><path d="M22 92 L78 10" stroke="#64748b" stroke-width="2"/><path d="M34 94 L90 22" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round"/><path d="M34 94 L90 22" stroke="#64748b" stroke-width="2"/><circle cx="78" cy="10" r="6" fill="#f472b6" stroke="#9d174d" stroke-width="2"/><circle cx="90" cy="22" r="6" fill="#f472b6" stroke="#9d174d" stroke-width="2"/><path d="M30 62 q8 -7 16 0 q8 7 16 0 q8 -7 16 0 M28 72 q8 -7 16 0 q8 7 16 0 q8 -7 16 0" fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round"/></svg>',
  xeng: '<svg viewBox="0 0 100 100"><rect x="36" y="0" width="28" height="6" rx="3" fill="#78350f" stroke="#451a03" stroke-width="2"/><rect x="47" y="4" width="6" height="64" fill="#a16207" stroke="#451a03" stroke-width="1.5"/><path d="M36 64 L64 64 L63 90 Q50 100 37 90 Z" fill="#9ca3af" stroke="#374151" stroke-width="3"/><path d="M42 70 L42 86" stroke="#e5e7eb" stroke-width="3" stroke-linecap="round"/></svg>',
  dat_bay: '<svg viewBox="0 0 100 100"><circle cx="40" cy="52" r="16" fill="#78350f"/><circle cx="60" cy="44" r="12" fill="#92400e"/><circle cx="58" cy="64" r="9" fill="#713f12"/><circle cx="26" cy="38" r="6" fill="#92400e"/><circle cx="78" cy="60" r="5" fill="#78350f"/></svg>',
  dong_dat: '<svg viewBox="0 0 100 100"><path d="M2 100 Q14 52 50 46 Q86 52 98 100 Z" fill="#92400e" stroke="#451a03" stroke-width="3"/><path d="M22 80 Q36 64 50 62" fill="none" stroke="#b45309" stroke-width="4" stroke-linecap="round"/><circle cx="64" cy="76" r="5" fill="#a8a29e"/><circle cx="34" cy="90" r="4" fill="#a8a29e"/></svg>',
  hat: '<svg viewBox="0 0 100 100"><ellipse cx="40" cy="40" rx="6" ry="4" fill="#facc15" stroke="#a16207" stroke-width="1.5"/><ellipse cx="58" cy="52" rx="6" ry="4" fill="#fde047" stroke="#a16207" stroke-width="1.5"/><ellipse cx="46" cy="62" rx="6" ry="4" fill="#facc15" stroke="#a16207" stroke-width="1.5"/><ellipse cx="66" cy="34" rx="5" ry="3.5" fill="#fde047" stroke="#a16207" stroke-width="1.5"/><ellipse cx="30" cy="56" rx="5" ry="3.5" fill="#facc15" stroke="#a16207" stroke-width="1.5"/></svg>',
  giay_trai: '<svg viewBox="0 0 100 100"><path d="M8 8 L50 8 L45 22 L52 36 L44 50 L51 64 L45 78 L50 92 L8 92 Z" fill="#fef9c3" stroke="#92400e" stroke-width="3" stroke-linejoin="round"/><path d="M16 24 H40 M16 36 H42 M16 48 H38 M16 60 H40 M16 72 H36" stroke="#a8a29e" stroke-width="3"/><text x="16" y="18" font-size="9" font-weight="700" fill="#92400e" font-family="Arial">$</text></svg>',
  giay_phai: '<svg viewBox="0 0 100 100"><path d="M50 8 L92 8 L92 92 L50 92 L45 78 L51 64 L44 50 L52 36 L45 22 Z" fill="#fef9c3" stroke="#92400e" stroke-width="3" stroke-linejoin="round"/><path d="M56 24 H84 M58 36 H84 M56 48 H82 M58 60 H84 M56 72 H80" stroke="#a8a29e" stroke-width="3"/><circle cx="76" cy="84" r="5" fill="#dc2626"/></svg>',
  manh_giay: '<svg viewBox="0 0 100 100"><rect x="20" y="20" width="12" height="9" fill="#fef9c3" stroke="#92400e" stroke-width="1.5" transform="rotate(20 26 24)"/><rect x="56" y="14" width="10" height="8" fill="#fef9c3" stroke="#92400e" stroke-width="1.5" transform="rotate(-30 61 18)"/><rect x="40" y="46" width="12" height="8" fill="#fef9c3" stroke="#92400e" stroke-width="1.5" transform="rotate(45 46 50)"/><rect x="70" y="40" width="9" height="7" fill="#fef9c3" stroke="#92400e" stroke-width="1.5" transform="rotate(10 74 43)"/><rect x="28" y="66" width="10" height="8" fill="#fef9c3" stroke="#92400e" stroke-width="1.5" transform="rotate(-15 33 70)"/></svg>',
  nen_dat: '<svg viewBox="0 0 100 100"><g stroke="#78350f" stroke-width="1.5"><rect x="6" y="70" width="12" height="28" rx="2" fill="#fef3c7"/><rect x="28" y="62" width="12" height="36" rx="2" fill="#fef3c7"/><rect x="50" y="74" width="12" height="24" rx="2" fill="#fef3c7"/><rect x="72" y="64" width="12" height="34" rx="2" fill="#fef3c7"/></g><g fill="#f59e0b"><path d="M12 68 q-5 -8 0 -16 q5 8 0 16 Z"/><path d="M34 60 q-5 -8 0 -16 q5 8 0 16 Z"/><path d="M56 72 q-5 -8 0 -16 q5 8 0 16 Z"/><path d="M78 62 q-5 -8 0 -16 q5 8 0 16 Z"/></g><g fill="#fde68a" opacity="0.5"><circle cx="12" cy="60" r="9"/><circle cx="34" cy="52" r="9"/><circle cx="56" cy="64" r="9"/><circle cx="78" cy="54" r="9"/></g></svg>',
  quang_nen: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#fde68a" opacity="0.18"/><circle cx="50" cy="50" r="34" fill="#fde68a" opacity="0.22"/><circle cx="50" cy="50" r="18" fill="#fef3c7" opacity="0.35"/></svg>',
  cong: '<svg viewBox="0 0 100 100"><circle cx="28" cy="58" r="20" fill="none" stroke="#9ca3af" stroke-width="8"/><circle cx="72" cy="58" r="20" fill="none" stroke="#9ca3af" stroke-width="8"/><path d="M46 52 L54 52" stroke="#6b7280" stroke-width="6"/><rect x="20" y="30" width="16" height="12" rx="3" fill="#6b7280"/><rect x="64" y="30" width="16" height="12" rx="3" fill="#6b7280"/></svg>',
  bao_cat: '<svg viewBox="0 0 100 100"><path d="M50 0 L50 14" stroke="#4b5563" stroke-width="4"/><rect x="28" y="12" width="44" height="86" rx="20" fill="#b91c1c" stroke="#111827" stroke-width="4"/><rect x="28" y="24" width="44" height="8" fill="#7f1d1d"/><rect x="28" y="78" width="44" height="8" fill="#7f1d1d"/></svg>',
  can: '<svg viewBox="0 0 100 100"><rect x="8" y="58" width="84" height="30" rx="8" fill="#e5e7eb" stroke="#374151" stroke-width="4"/><circle cx="50" cy="73" r="10" fill="#fff" stroke="#374151" stroke-width="3"/><path d="M50 73 L56 66" stroke="#dc2626" stroke-width="3"/></svg>',
  dai: '<svg viewBox="0 0 100 100"><rect x="0" y="40" width="100" height="22" rx="6" fill="#111827"/><ellipse cx="50" cy="51" rx="24" ry="18" fill="#facc15" stroke="#a16207" stroke-width="4"/><circle cx="50" cy="51" r="6" fill="#dc2626"/></svg>',
  day: '<svg viewBox="0 0 100 100"><rect x="0" y="10" width="6" height="90" fill="#334155"/><rect x="94" y="10" width="6" height="90" fill="#334155"/><path d="M0 30 H100" stroke="#dc2626" stroke-width="5"/><path d="M0 50 H100" stroke="#f8fafc" stroke-width="5"/><path d="M0 70 H100" stroke="#2563eb" stroke-width="5"/></svg>',
  ban_bai: '<svg viewBox="0 0 100 100"><rect x="10" y="56" width="6" height="42" fill="#78350f"/><rect x="84" y="56" width="6" height="42" fill="#78350f"/><rect x="0" y="40" width="100" height="18" rx="6" fill="#14532d"/><rect x="2" y="41" width="96" height="11" rx="4" fill="#15803d"/><circle cx="72" cy="46" r="4" fill="#ef4444" stroke="#fff" stroke-width="1"/><circle cx="80" cy="47" r="4" fill="#3b82f6" stroke="#fff" stroke-width="1"/><circle cx="76" cy="43" r="4" fill="#facc15" stroke="#fff" stroke-width="1"/></svg>',
  bien: '<svg viewBox="0 0 100 100"><rect x="4" y="26" width="92" height="48" rx="6" fill="#92400e" stroke="#451a03" stroke-width="4"/><rect x="12" y="34" width="76" height="32" rx="3" fill="#fde68a"/><path d="M22 50 H78" stroke="#92400e" stroke-width="6" stroke-linecap="round"/></svg>',
  bang_do: '<svg viewBox="0 0 100 100"><path d="M0 46 Q50 56 100 46" fill="none" stroke="#dc2626" stroke-width="7"/><rect x="0" y="30" width="4" height="40" fill="#334155"/><rect x="96" y="30" width="4" height="40" fill="#334155"/><circle cx="50" cy="52" r="8" fill="#ef4444" stroke="#991b1b" stroke-width="2"/></svg>',
  dem: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="66" rx="48" ry="24" fill="#7c3aed" stroke="#4c1d95" stroke-width="4"/><ellipse cx="50" cy="58" rx="36" ry="10" fill="#a78bfa" opacity="0.7"/></svg>',
}
// Cờ quốc gia: Windows không vẽ emoji cờ (🇬🇧 hiện thành chữ "GB") → vẽ sẵn lá cờ trên cán (khung 100×100, chân cán ở
// đáy giữa-trái, cầm tay được). Chỉ vài nước hay gặp; nước khác giữ emoji.
const CAN_CO = '<rect x="8" y="6" width="5" height="94" rx="2" fill="#78350f"/>'
const VE_CO = {
  GB: `<svg viewBox="0 0 100 100">${CAN_CO}<rect x="13" y="8" width="80" height="48" fill="#012169"/><path d="M13 8 L93 56 M93 8 L13 56" stroke="#fff" stroke-width="10"/><path d="M13 8 L93 56 M93 8 L13 56" stroke="#C8102E" stroke-width="4"/><path d="M53 8 V56 M13 32 H93" stroke="#fff" stroke-width="14"/><path d="M53 8 V56 M13 32 H93" stroke="#C8102E" stroke-width="8"/></svg>`,
  US: `<svg viewBox="0 0 100 100">${CAN_CO}<rect x="13" y="8" width="80" height="48" fill="#fff"/>${[0, 2, 4, 6].map((k) => `<rect x="13" y="${8 + k * 7}" width="80" height="7" fill="#B22234"/>`).join('')}<rect x="13" y="50" width="80" height="6" fill="#B22234"/><rect x="13" y="8" width="34" height="27" fill="#3C3B6E"/></svg>`,
  KR: `<svg viewBox="0 0 100 100">${CAN_CO}<rect x="13" y="8" width="80" height="48" fill="#fff" stroke="#e5e7eb"/><circle cx="53" cy="32" r="12" fill="#0047A0"/><path d="M41 32 A12 12 0 0 1 65 32 A6 6 0 0 1 53 32 A6 6 0 0 0 41 32 Z" fill="#CD2E3A"/></svg>`,
  JP: `<svg viewBox="0 0 100 100">${CAN_CO}<rect x="13" y="8" width="80" height="48" fill="#fff" stroke="#e5e7eb"/><circle cx="53" cy="32" r="13" fill="#BC002D"/></svg>`,
  VN: `<svg viewBox="0 0 100 100">${CAN_CO}<rect x="13" y="8" width="80" height="48" fill="#DA251D"/><polygon points="53,18 56.5,28.5 67.5,28.5 58.5,35 62,45.5 53,39 44,45.5 47.5,35 38.5,28.5 49.5,28.5" fill="#FFFF00"/></svg>`,
  CN: `<svg viewBox="0 0 100 100">${CAN_CO}<rect x="13" y="8" width="80" height="48" fill="#DE2910"/><polygon points="28,14 30.5,21 38,21 32,25.5 34,33 28,28.5 22,33 24,25.5 18,21 25.5,21" fill="#FFDE00"/></svg>`,
  FR: `<svg viewBox="0 0 100 100">${CAN_CO}<rect x="13" y="8" width="27" height="48" fill="#002395"/><rect x="40" y="8" width="26" height="48" fill="#fff"/><rect x="66" y="8" width="27" height="48" fill="#ED2939"/></svg>`,
  DE: `<svg viewBox="0 0 100 100">${CAN_CO}<rect x="13" y="8" width="80" height="16" fill="#000"/><rect x="13" y="24" width="80" height="16" fill="#DD0000"/><rect x="13" y="40" width="80" height="16" fill="#FFCE00"/></svg>`,
}
// Emoji cờ (hai ký tự chỉ vùng) → hình cờ vẽ sẵn, không có thì null
const veCo = (bt) => {
  const ma = [...String(bt)].filter((c) => /\p{Regional_Indicator}/u.test(c)).map((c) => String.fromCharCode(c.codePointAt(0) - 0x1f1e6 + 65)).join('')
  return ma.length === 2 ? (VE_CO[ma] ?? null) : null
}
const VAT = {
  dia: ['🍽️', 'truoc'], bot: ['🧽', 'phai'], vali: ['🧳', 'phai'], laptop: ['💻', 'truoc'], sach: ['📖', 'truoc'],
  mic: ['🎤', 'phai'], tien: ['💵', 'phai'], bat: ['🍜', 'truoc'], dua: ['🥢', 'phai'], co_le: ['🔧', 'phai'], chip: ['🔌', 'truoc'],
  zzz: ['💤', 'dau'], tuc: ['💢', 'dau'], tim: ['💖', 'dau'],
  cua: ['🚪', 'canh'], em_be: ['👶', 'nguc'], ba_lo: ['🎒', 'vai'], la: ['🍂', 'trai'], chop: ['⚡', 'troi'], xe: ['🚗', 'xe'],
  chuong: ['🔔', 'canh_cao'], bua: ['🔨', 'phai'], nhan: ['💍', 'phai'], kinh_tay: ['🥽', 'truoc'], kinh_mat: ['🥽', 'mat'],
  dong_ho_cat: ['⏳', 'nguc'], bang_ck: ['📈', 'canh_xa'], chuong_tay: ['🔔', 'trai'], hoa: ['💐', 'nguc'], man_hinh: ['🖥️', 'canh'], nut: ['🔴', 'ban'],
  noi: ['🛏️', 'noi'], be: ['👶', 'be'], binh: ['🍼', 'binh'], zzz_be: ['💤', 'be_ngu'],
  gang_p: ['🥊', 'phai'], gang_t: ['🥊', 'trai'], no: ['💥', 'va_cham'], no_t: ['💥', 'va_cham_t'], bao_cat: [VE_VAT.bao_cat, 'canh_cao'], day_dai: [VE_VAT.day, 'day'],
  gio_do: ['🧺', 'truoc'], cong: [VE_VAT.cong, 'truoc'], can_sk: [VE_VAT.can, 'canh'], dai: [VE_VAT.dai, 'eo'], ly: ['🍸', 'phai'],
  ban_bai: [VE_VAT.ban_bai, 'ban_ngoi'], bai_tay: ['🃏', 'bai_nguc'], la_danh: ['🃏', 'tren_ban'],
  bong: ['⚽', 'bong_chan'], khung_thanh: [VE_VAT.khung_thanh, 'khung'], hinh_nom: [VE_VAT.hinh_nom, 'canh_truoc'], tuong_tap: [VE_VAT.tuong_tap, 'canh_truoc'],
  ao_psg_cam: [VE_VAT.ao_psg_cam, 'giay'], ao_psg: [VE_VAT.ao_psg, 'than_ao'], ao_hong: [VE_VAT.ao_hong, 'than_ao'],
  buc_hop_bao: [VE_VAT.buc_hop_bao, 'buc_truoc'], san_den: [VE_VAT.san_den, 'xa_bo'], la_o: [VE_VAT.la_o, 'canh_cao'], khan_giay: [VE_VAT.khan_giay, 'giay_ban'],
  hoa_don: ['📃', 'phai'], tien_giay: ['💵', 'tren_ban'], xi_lanh: ['💉', 'phai'], choi_quet: ['🧹', 'phai'],
  bang_ten: [VE_VAT.bang_ten, 'canh_cao'], may_anh_tay: ['📷', 'trai'], may_anh_mat: ['📷', 'mat_trai'], chop_den: [VE_VAT.chop_den, 'chop_mat'],
  ban_go: [VE_VAT.ban_go, 'ban_ngoi'], giay_ban: [VE_VAT.giay_ban, 'giay_ban'], ho_so_ban: ['🗂️', 'tren_ban'], van_ban: [VE_VAT.van_ban, 'giay'],
  but_ky: ['🖊️', 'phai'], ho_so_tay: ['🗂️', 'trai'], ho_so_nguc: ['🗂️', 'giay'], xe_co: [VE_VAT.xe_co, 'xe_canh'], vai_bat: [VE_VAT.vai_bat, 'xe_canh'],
  xe_dua: [VE_VAT.xe_dua, 'xe_canh'], xe_dua_xa: [VE_VAT.xe_dua, 'canh_xa'], co_dua: ['🏁', 'phai'], cuon_giay: ['📜', 'trai'],
  khoi_lua: [VE_VAT.khoi_lua, 'lua_san'], xuong_may: [VE_VAT.xuong_may, 'canh'],
  xe_may: [VE_VAT.xe_may, 'xe_may'], khoi_xe: [VE_VAT.khoi_xe, 'khoi_xe'], hop_dong: ['📜', 'phai'], ban_xuong: [VE_VAT.ban_xuong, 'canh'],
  ghe_ct: [VE_VAT.ghe_ct, 'ghe_day'], con_dau: [VE_VAT.con_dau, 'phai'], so_hoc: ['📒', 'so_tay'], dau_do: [VE_VAT.dau_do, 'dau_so'],
  gay_chong: [VE_VAT.gay_chong, 'phai_gay'], cua_so: [VE_VAT.cua_so, 'canh_cao'],
  ghe_go: [VE_VAT.ghe_go, 'ghe'], giuong: [VE_VAT.giuong, 'giuong'], giuong_benh: [VE_VAT.giuong_benh, 'giuong_gan'], suong: [VE_VAT.suong, 'suong'],
  lan_can: [VE_VAT.lan_can, 'lan_can'], bo_bien: [VE_VAT.bo_bien, 'xa_bo'], ban_ve: [VE_VAT.ban_ve, 'trai'], ban_ve_p: [VE_VAT.ban_ve, 'phai'],
  nguoi_nhan: [VE_VAT.nguoi_nhan, 'nguoi_ben'], ban_ve_nhan: [VE_VAT.ban_ve, 'tay_nhan'], cuon_len: ['🧶', 'long'], kim_dan: [VE_VAT.kim_dan, 'phai'], dung_cu: ['🔧', 'phai'],
  xeng: [VE_VAT.xeng, 'phai_xeng'], dat_bay: [VE_VAT.dat_bay, 'va_cham'], dong_dat: [VE_VAT.dong_dat, 'canh_thap'],
  chim_1: ['🕊️', 'chim'], chim_2: ['🕊️', 'chim_xa'], tui_hat: ['🌾', 'trai'], hat: [VE_VAT.hat, 'phai'],
  giay_trai: [VE_VAT.giay_trai, 'giay'], giay_phai: [VE_VAT.giay_phai, 'giay'], manh_giay: [VE_VAT.manh_giay, 'giay'],
  nen: ['🕯️', 'nen_tay'], quang_nen: [VE_VAT.quang_nen, 'nen_quang'], nen_dat: [VE_VAT.nen_dat, 'nen_san'],
  bien: [VE_VAT.bien, 'nguc'], can_dia: ['⚖️', 'canh_cao'], gao: ['🌾', 'phai'], ca_kho: ['🐟', 'trai'], bang_do: [VE_VAT.bang_do, 'day'], keo: ['✂️', 'phai'],
  xe_dap: ['🚲', 'xe'], nha_que: ['🏡', 'canh_xa'],
  den_tiec: ['🪩', 'troi'], not_nhac: ['🎵', 'dau'], may_bay: ['✈️', 'bay'], dem_thien: [VE_VAT.dem, 'dem'], hao_quang: ['✨', 'dau'],
}
const VAT_CAN = {} // phu<k> → Set(tên đồ vật)
// Cất đồ nhân vật cầm sẵn (nhóm <id>-cam-tay-trai / -phai trong hình nhân vật) từ lúc a tới lúc b
const catDoSan = (p, a, b) => {
  tw.push(`tl.to(["#${p}-cam-tay-trai", "#${p}-cam-tay-phai"], { opacity: 0, duration: 0.2 }, ${f(Math.max(0, a - 0.15))});`)
  tw.push(`tl.to(["#${p}-cam-tay-trai", "#${p}-cam-tay-phai"], { opacity: 1, duration: 0.3 }, ${f(b)});`)
}
// Câu có đạo cụ của hành động (hành động kể chuyện hoặc đạo cụ phụ vat_them): mỗi lúc một bộ đạo cụ — tắt đạo cụ
// minh hoạ bật lên (dao_cu), dấu ! / ? cạnh đầu
const coDoVatHanhDong = (i) => !!(LUC_DONG_TAC[i] && TRUYEN[LUC_DONG_TAC[i][0]]) || (Array.isArray(loi[i]?.vat_them) && loi[i].vat_them.length > 0)
// Đồ vật mỗi hành động kể chuyện dùng (để đạo cụ phụ vat_them chọn chỗ cầm còn trống)
// Cử chỉ bận tay (đạo cụ phụ không đặt vào tay đó)
const TAY_BAN = { viet: ['phai'], chi_tay: ['phai'], dap_tay: ['phai'], tay_len_nguc: ['phai'], cam_vat: [], vay_tay: ['phai'] }
const VAT_DUNG_BOI = {
  rua_bat: ['dia', 'bot'], xach_vali: ['vali'], go_may: ['laptop'], doc_sach: ['sach'], phat_bieu: ['mic'], an_com: ['bat', 'dua'],
  dem_tien: ['tien'], lap_rap: ['co_le', 'chip'], bi_xo: ['tuc'], an_mung: ['tim'], kiet_suc: ['zzz'],
  mo_cua: ['cua'], be_em_be: ['em_be'], di_bo: ['ba_lo'], nhin_ra_ngoai: ['la'], dong_may_tinh: ['laptop'], nhin_bao_giong: ['chop'],
  lai_xe: ['xe'], gong_chuong: ['chuong', 'bua'], trao_nhan: ['nhan', 'tim'], deo_kinh: ['kinh_tay', 'kinh_mat'],
  lat_dong_ho: ['dong_ho_cat'], rung_chuong: ['bang_ck', 'chuong_tay'], om_ap: ['hoa', 'nhan', 'tim'], bam_nut: ['man_hinh', 'nut'], nam_noi: ['noi', 'be', 'binh', 'zzz_be'],
  doi_dau: ['gang_p', 'gang_t', 'no', 'no_t'], dam_boc: ['gang_p', 'gang_t', 'no', 'no_t'], dam_moc: ['gang_p', 'gang_t', 'no'], ha_guc: ['gang_p', 'gang_t', 'no_t'],
  dung_cho_dem: ['gang_p', 'gang_t'], buoc_vao_dai: ['gang_p', 'gang_t', 'day_dai'], dam_bao_cat: ['gang_p', 'gang_t', 'no', 'bao_cat'],
  can_tai: ['gang_p', 'gang_t', 'tuc'], ganh_vac: ['gio_do'], bat_giu: ['cong'], kham_suc_khoe: ['can_sk'], nhan_dai: ['dai'],
  cam_but_run: ['ghe_go', 'ban_go', 'khan_giay', 'but_ky'], lao_dong_vat_va: ['bua', 'choi_quet'], da_bong: ['bong'], ghi_ban: ['bong', 'khung_thanh'],
  cam_hoa_don: ['ghe_go', 'ban_go', 'hoa_don', 'tien_giay'], tiem_thuoc: ['ghe_go', 'xi_lanh'], re_bong: ['bong', 'hinh_nom'], tap_luyen: ['bong', 'tuong_tap'],
  buoc_vao_phong: ['buc_hop_bao'], mac_ao_dau: ['ao_psg_cam', 'ao_psg'], dung_nghe: ['san_den', 'la_o'], buoc_ra_san: ['san_den'],
  sut_bong: ['bong', 'khung_thanh'], choi_bong: ['bong', 'ao_hong'],
  gan_bien: ['bua', 'bang_ten'], chup_anh_vay_co: ['co_dua', 'may_anh_tay', 'may_anh_mat', 'chop_den', 'xe_dua_xa'],
  noi_chuyen: ['ghe_go', 'ban_go', 'hop_dong', 'giay_ban'], ngoi_doi_dien: ['ghe_go', 'ban_go', 'ho_so_ban'], hop_dong_tren_ban: ['ghe_go', 'ban_go', 'giay_ban'],
  thanh_lap_cong_ty: ['van_ban', 'but_ky'], ban_hang: ['xe_co', 'ho_so_tay'], to_chuc_giai_dua: ['co_dua', 'xe_dua_xa'], dai_dien: ['xe_dua', 'cuon_giay'],
  giai_the: ['ho_so_nguc'], che_giau: ['xuong_may'], chien_tranh_bung_no: ['khoi_lua'], ra_doi_xe: ['xe_co', 'vai_bat'],
  lai_xe_may: ['xe_may', 'khoi_xe'], buoc_vao: ['hop_dong', 'ban_xuong'], nhuong_vi_tri: ['ghe_ct'], dong_dau: ['con_dau', 'so_hoc', 'dau_do'],
  chong_gay: ['gay_chong', 'cua_so'],
  ngoi_lang_le: ['ghe_go', 'giuong'], buoc_qua_suong: ['suong'], nam_tay: ['giuong_benh'], nhin_bien: ['lan_can', 'bo_bien'],
  vo_vai: ['nguoi_nhan', 'ban_ve', 'ban_ve_p', 'ban_ve_nhan'],
  dan_lat: ['ghe_go', 'cuon_len', 'kim_dan', 'dung_cu'], dao_dat: ['xeng', 'dat_bay', 'dong_dat'], cho_chim_an: ['chim_1', 'chim_2', 'tui_hat', 'hat'],
  xe_tai_lieu: ['giay_trai', 'giay_phai', 'manh_giay'], thap_nen: ['nen', 'quang_nen', 'nen_dat'],
  choi_bai: ['ban_bai', 'bai_tay', 'la_danh'], treo_bien: ['bien'], can_hang: ['can_dia', 'gao', 'ca_kho'], cat_bang: ['bang_do', 'keo'], dap_xe: ['xe_dap', 'nha_que'],
  tiec_tung: ['ly', 'den_tiec', 'not_nhac'], di_may_bay: ['may_bay', 'vali'], ngoi_thien: ['dem_thien', 'hao_quang'],
}
const vatHien = (p, ten, t, dd) => {
  if (!VAT[ten] || !(p.startsWith('phu') || p === 'meo' || p === 'robot')) return []
  ;(VAT_CAN[p] ??= new Set()).add(ten)
  const id = `#${p}-vat-${ten}`
  const bay = VAT[ten][1] === 'dau'
  return [
    `tl.fromTo("${id}", { opacity: 0, scale: 0.4, transformOrigin: "50% 50%"${bay ? ', y: 0' : ''} }, { opacity: 1, scale: 1${bay ? ', y: -40' : ''}, duration: ${bay ? 0.9 : 0.25}, ease: "back.out(2)", immediateRender: false }, ${f(t)});`,
    `tl.to("${id}", { opacity: 0, duration: 0.25 }, ${f(t + Math.max(0.6, dd) - 0.25)});`,
  ]
}
const solan = (giay, chuKy) => Math.max(1, Math.floor(giay / chuKy / 2)) * 2 - 1 // số lần lặp lẻ (yoyo về đúng chỗ)
const TRUYEN = {
  rua_bat: (p, t, dd) => [
    ...vatHien(p, 'dia', t, dd), ...vatHien(p, 'bot', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -16, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 14, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 28, duration: 0.16, yoyo: true, repeat: ${solan(dd - 0.4, 0.16)}, ease: "sine.inOut" }, ${f(t + 0.32)});`,
    `tl.to("#${p}-dau", { rotation: 10, duration: 0.35 }, ${f(t)});`,
  ],
  xach_vali: (p, t, dd) => {
    const di = Math.min(dd, 2.6)
    return [
      ...vatHien(p, 'vali', t, dd),
      `tl.to("#${p}-tay-phai", { rotation: -6, duration: 0.25 }, ${f(t)});`,
      `tl.fromTo("#${p}-tay-trai", { rotation: 18 }, { rotation: -18, duration: 0.3, yoyo: true, repeat: ${solan(di, 0.3)}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      `tl.fromTo("#${p} svg", { x: 0 }, { x: 150, duration: ${f(di)}, ease: "none", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p} svg", { y: -10, duration: 0.15, yoyo: true, repeat: ${solan(di, 0.15)}, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5, ease: "power1.inOut" }, ${f(t + Math.max(di, dd) + 0.05)});`,
      `tl.to("#${p}-dau", { rotation: 4, duration: 0.3 }, ${f(t)});`,
    ]
  },
  khoc: (p, t, dd) => [
    `tl.to("#${p}-nuoc-mat", { opacity: 1, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-nuoc-mat", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(0.8, dd) - 0.3)});`,
    `tl.to("#${p}-tay-trai", { rotation: 148, duration: 0.4, ease: "power2.out" }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: -148, duration: 0.4, ease: "power2.out" }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: 14, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p} svg", { y: 3, duration: 0.11, yoyo: true, repeat: ${solan(dd - 0.4, 0.11)}, ease: "sine.inOut" }, ${f(t + 0.4)});`,
  ],
  go_may: (p, t, dd) => [
    ...vatHien(p, 'laptop', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -14, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 14, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: -20, duration: 0.09, yoyo: true, repeat: ${solan(dd - 0.4, 0.09)}, ease: "none" }, ${f(t + 0.32)});`,
    `tl.to("#${p}-tay-phai", { rotation: 20, duration: 0.09, yoyo: true, repeat: ${solan(dd - 0.5, 0.09)}, ease: "none" }, ${f(t + 0.41)});`,
    `tl.to("#${p}-dau", { rotation: 9, duration: 0.35 }, ${f(t)});`,
  ],
  doc_sach: (p, t, dd) => [
    ...vatHien(p, 'sach', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -18, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 18, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 40, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + Math.max(0.4, dd / 2))});`,
    `tl.to("#${p}-dau", { rotation: 12, duration: 0.35 }, ${f(t)});`,
  ],
  bi_xo: (p, t, dd) => [
    ...vatHien(p, 'tuc', t + 0.1, Math.min(dd, 1.6)),
    `tl.to("#${p}-tay-trai", { rotation: 120, duration: 0.2, ease: "power3.out" }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: -120, duration: 0.2, ease: "power3.out" }, ${f(t)});`,
    `tl.fromTo("#${p} svg", { x: 0 }, { x: -70, duration: 0.22, ease: "power3.out", immediateRender: false }, ${f(t)});`,
    `tl.to("#${p} svg", { x: 0, duration: 0.7, ease: "power1.inOut" }, ${f(t + Math.max(0.5, dd - 0.7))});`,
    `tl.to("#${p}-dau", { rotation: -10, duration: 0.2 }, ${f(t)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(0.8, dd) - 0.3)});`,
  ],
  an_mung: (p, t, dd) => [
    ...vatHien(p, 'tim', t + 0.2, Math.min(dd, 1.8)),
    `tl.to("#${p}-tay-trai", { rotation: 168, duration: 0.3, ease: "back.out(1.6)" }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: -168, duration: 0.3, ease: "back.out(1.6)" }, ${f(t)});`,
    `tl.to("#${p} svg", { y: -55, duration: 0.24, yoyo: true, repeat: ${Math.min(5, solan(dd, 0.24))}, ease: "sine.out" }, ${f(t)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t)});`,
  ],
  phat_bieu: (p, t, dd) => [
    ...vatHien(p, 'mic', t, dd),
    `tl.to("#${p}-tay-phai", { rotation: 118, duration: 0.35, ease: "power2.out" }, ${f(t)});`,
    `tl.fromTo("#${p}-tay-trai", { rotation: 40 }, { rotation: 95, duration: 0.55, yoyo: true, repeat: ${solan(dd - 0.4, 0.55)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.2)});`,
    `tl.to("#${p}-dau", { rotation: -5, duration: 0.4 }, ${f(t)});`,
  ],
  bat_tay: (p, t, dd) => [
    `tl.to("#${p}-tay-phai", { rotation: -72, duration: 0.35, ease: "power2.out" }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: -62, duration: 0.14, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t + 0.4)});`,
    `tl.to("#${p}-dau", { rotation: 6, duration: 0.2, yoyo: true, repeat: 1 }, ${f(t + 0.4)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t)});`,
  ],
  kiet_suc: (p, t, dd) => [
    ...vatHien(p, 'zzz', t + 0.3, dd),
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -4 : 4), duration: 0.6, ease: "sine.inOut" }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: 16, duration: 0.8, ease: "sine.inOut" }, ${f(t)});`,
    `tl.to("#${p} svg", { y: 8, duration: 0.8, ease: "sine.inOut" }, ${f(t)});`,
    `tl.to("#${p} svg", { y: 0, duration: 0.5, ease: "sine.inOut" }, ${f(t + Math.max(1, dd))});`,
  ],
  an_com: (p, t, dd) => [
    ...vatHien(p, 'bat', t, dd), ...vatHien(p, 'dua', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -16, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 30, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 112, duration: 0.3, yoyo: true, repeat: ${solan(dd - 0.4, 0.3)}, ease: "sine.inOut" }, ${f(t + 0.35)});`,
    `tl.to("#${p}-dau", { rotation: 8, duration: 0.35 }, ${f(t)});`,
  ],
  dem_tien: (p, t, dd) => [
    ...vatHien(p, 'tien', t, dd),
    `tl.to("#${p}-tay-phai", { rotation: 34, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: -26, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: -36, duration: 0.2, yoyo: true, repeat: ${solan(dd - 0.4, 0.2)}, ease: "sine.inOut" }, ${f(t + 0.35)});`,
    `tl.to("#${p}-dau", { rotation: 10, duration: 0.35 }, ${f(t)});`,
  ],
  lap_rap: (p, t, dd) => [
    ...vatHien(p, 'co_le', t, dd), ...vatHien(p, 'chip', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -16, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 26, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 52, duration: 0.18, yoyo: true, repeat: ${solan(dd - 0.4, 0.18)}, ease: "power1.inOut" }, ${f(t + 0.35)});`,
    `tl.to("#${p}-dau", { rotation: 10, duration: 0.35 }, ${f(t)});`,
  ],
  chay: (p, t, dd) => {
    const di = Math.min(dd, 2)
    return [
      `tl.fromTo(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 40 : -40) }, { rotation: (i) => (i ? -40 : 40), duration: 0.16, yoyo: true, repeat: ${solan(di, 0.16)}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      `tl.fromTo("#${p} svg", { x: 0 }, { x: 190, duration: ${f(di)}, ease: "power1.in", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p} svg", { y: -16, duration: 0.1, yoyo: true, repeat: ${solan(di, 0.1)}, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5, ease: "power1.inOut" }, ${f(t + Math.max(di, dd) + 0.05)});`,
      `tl.to("#${p}-dau", { rotation: -6, duration: 0.2 }, ${f(t)});`,
    ]
  },
  // ── Bộ 2 (phim Mark Zuckerberg 15/10/2026, theo kịch bản diễn của bước chuẩn bị hành động) ──
  // Mở cửa: vươn tay phải nắm tay nắm, cửa xoay quanh bản lề mở ra (co ngang), lùi nửa bước nhường cửa, thả tay, mỉm cười
  mo_cua: (p, t, dd) => {
    const mo = Math.min(1.2, Math.max(0.6, dd * 0.45))
    return [
      ...vatHien(p, 'cua', t, dd),
      `tl.to("#${p}-tay-phai", { rotation: -64, duration: 0.35, ease: "power2.out" }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: 12, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: -6, duration: 0.3 }, ${f(t)});`,
      `tl.fromTo("#${p}-vat-cua", { scaleX: 1, transformOrigin: "100% 50%" }, { scaleX: 0.28, duration: ${f(mo)}, ease: "power2.inOut", immediateRender: false }, ${f(t + 0.45)});`,
      `tl.fromTo("#${p} svg", { x: 0 }, { x: -26, duration: 0.4, ease: "power1.out", immediateRender: false }, ${f(t + 0.5)});`,
      `tl.to("#${p}-tay-phai", { rotation: -8, duration: 0.4, ease: "sine.inOut" }, ${f(t + 0.5 + mo)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + 0.5 + mo)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5, ease: "power1.inOut" }, ${f(t + Math.max(dd, 0.9 + mo) + 0.05)});`,
    ]
  },
  // Bế em bé: hai tay ôm em bé trước ngực, ru nhẹ theo nhịp, đầu nghiêng nhìn xuống trìu mến, má ửng hồng
  be_em_be: (p, t, dd) => [
    ...vatHien(p, 'em_be', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -34, duration: 0.4, ease: "sine.out" }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 34, duration: 0.4, ease: "sine.out" }, ${f(t)});`,
    `tl.fromTo(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 34 : -34) }, { rotation: (i) => (i ? 26 : -42), duration: 0.5, yoyo: true, repeat: ${solan(dd - 0.5, 0.5)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.45)});`,
    `tl.to("#${p}-dau", { rotation: 12, duration: 0.5 }, ${f(t)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(t + 0.3)});`,
  ],
  // Đi bộ (bước vào trường, bước qua cổng): ba lô trên vai, hai tay nắm quai, bước đều, ngước nhìn tự tin
  di_bo: (p, t, dd) => {
    const di = Math.min(dd, 2.4)
    return [
      ...vatHien(p, 'ba_lo', t, dd),
      `tl.fromTo(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 10 : -10) }, { rotation: (i) => (i ? 16 : -16), duration: 0.32, yoyo: true, repeat: ${solan(di, 0.32)}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      `tl.fromTo("#${p} svg", { x: 0 }, { x: 130, duration: ${f(di)}, ease: "none", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p} svg", { y: -9, duration: 0.16, yoyo: true, repeat: ${solan(di, 0.16)}, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: -5, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5, ease: "power1.inOut" }, ${f(t + Math.max(di, dd) + 0.05)});`,
    ]
  },
  // Nhìn ra ngoài: tay trái nâng chiếc lá lên ngang mắt ngắm, xoay nhẹ cuống lá, đầu nghiêng đăm chiêu, hạ tay
  nhin_ra_ngoai: (p, t, dd) => [
    ...vatHien(p, 'la', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -126, duration: 0.5, ease: "sine.out" }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: -8, duration: 0.5 }, ${f(t)});`,
    `tl.fromTo("#${p}-vat-la", { rotation: -12, transformOrigin: "50% 100%" }, { rotation: 14, duration: 0.45, yoyo: true, repeat: ${solan(dd - 1, 0.45)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.55)});`,
    `tl.to("#${p}-tay-trai", { rotation: -24, duration: 0.45, ease: "sine.inOut" }, ${f(t + Math.max(0.9, dd - 0.5))});`,
  ],
  // Gập máy tính: laptop trước người, hai tay nắm viền màn hình gập xuống chậm, vai chùng, đầu gục buồn bã
  dong_may_tinh: (p, t, dd) => [
    ...vatHien(p, 'laptop', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -16, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 16, duration: 0.3 }, ${f(t)});`,
    `tl.fromTo("#${p}-vat-laptop", { scaleY: 1, transformOrigin: "50% 100%" }, { scaleY: 0.22, duration: 0.7, ease: "power1.inOut", immediateRender: false }, ${f(t + 0.5)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 6 : -6), duration: 0.7, ease: "power1.inOut" }, ${f(t + 0.5)});`,
    `tl.to("#${p}-dau", { rotation: 16, duration: 0.8, ease: "sine.inOut" }, ${f(t + 0.6)});`,
    `tl.to("#${p} svg", { y: 7, duration: 0.8, ease: "sine.inOut" }, ${f(t + 0.6)});`,
    `tl.to("#${p} svg", { y: 0, duration: 0.5, ease: "sine.inOut" }, ${f(t + Math.max(1.5, dd))});`,
  ],
  // Nhìn bão giông (sóng gió sắp tới): ngước nhìn lên, tia chớp loé trên đầu, tay trái nắm chặt, đổ mồ hôi, đứng vững
  nhin_bao_giong: (p, t, dd) => [
    ...vatHien(p, 'chop', t + 0.2, dd),
    `tl.to("#${p}-dau", { rotation: -12, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: 10, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: -24, duration: 0.4 }, ${f(t)});`,
    // Tia chớp loé (số lần lặp vừa khít trước lúc tia chớp tắt, không thì lệnh loé kết thúc sau và tia chớp sót sang câu sau)
    ...(dd > 1.9 ? [`tl.fromTo("#${p}-vat-chop", { opacity: 1 }, { opacity: 0.15, duration: 0.1, yoyo: true, repeat: ${Math.min(5, solan(dd - 1.5, 0.1))}, ease: "none", immediateRender: false }, ${f(t + 1.15)});`] : []),
    `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(t + 0.3)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(1, dd) - 0.3)});`,
  ],
  // Lái xe: ngồi sau chiếc xe (xe che nửa người), hai tay đặt trên vô lăng, đánh lái nhẹ, xe chạy ngang rồi dừng
  lai_xe: (p, t, dd) => {
    const di = Math.min(dd, 2.6)
    return [
      ...vatHien(p, 'xe', t, dd),
      `tl.to("#${p}-tay-trai", { rotation: -26, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-tay-phai", { rotation: 26, duration: 0.3 }, ${f(t)});`,
      `tl.fromTo(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 26 : -26) }, { rotation: (i) => (i ? 36 : -16), duration: 0.5, yoyo: true, repeat: ${solan(di, 0.5)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.35)});`,
      `tl.fromTo("#${p} svg", { x: 0 }, { x: 170, duration: ${f(di)}, ease: "power1.inOut", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p} svg", { y: -4, duration: 0.12, yoyo: true, repeat: ${solan(di, 0.12)}, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5, ease: "power1.inOut" }, ${f(t + Math.max(di, dd) + 0.05)});`,
    ]
  },
  // Gõ chuông (khai mạc phiên giao dịch, niêm yết): búa tay phải vung qua đầu rồi gõ xuống chuông bên cạnh nhiều nhịp,
  // chuông rung theo cú gõ, tay trái chống hông, cười rạng rỡ
  gong_chuong: (p, t, dd) => [
    ...vatHien(p, 'chuong', t, dd), ...vatHien(p, 'bua', t, dd),
    `tl.to("#${p}-tay-phai", { rotation: -150, duration: 0.3, ease: "power2.out" }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: -92, duration: 0.14, yoyo: true, repeat: 5, ease: "power2.in" }, ${f(t + 0.35)});`,
    `tl.fromTo("#${p}-vat-chuong", { rotation: -9, transformOrigin: "50% 0%" }, { rotation: 9, duration: 0.14, yoyo: true, repeat: 5, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.49)});`,
    `tl.to("#${p}-tay-trai", { rotation: 26, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + 0.4)});`,
  ],
  // Trao nhẫn (cầu hôn, kết hôn): tay phải cầm nhẫn chậm rãi đưa ra phía trước, dừng một nhịp, rồi hai tay đan trước ngực,
  // trái tim bay lên, má ửng hồng
  trao_nhan: (p, t, dd) => [
    ...vatHien(p, 'nhan', t, Math.min(dd, 1.6)), ...vatHien(p, 'tim', t + 1.2, Math.max(0.6, dd - 1.2)),
    `tl.to("#${p}-tay-phai", { rotation: -52, duration: 0.8, ease: "sine.inOut" }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: 8, duration: 0.6 }, ${f(t)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 20 : -20), duration: 0.5, ease: "sine.inOut" }, ${f(t + 1.4)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(t + 0.4)});`,
  ],
  // Đeo kính thực tế ảo: hai tay cầm kính trước người, nâng lên áp vào mắt (kính chuyển lên mặt), buông tay, ngẩng đầu hào hứng
  deo_kinh: (p, t, dd) => [
    ...vatHien(p, 'kinh_tay', t, 1.15), ...vatHien(p, 'kinh_mat', t + 1.05, Math.max(0.6, dd - 1.05)),
    `tl.to("#${p}-tay-trai", { rotation: -16, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 16, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: -142, duration: 0.45, ease: "power1.inOut" }, ${f(t + 0.6)});`,
    `tl.to("#${p}-tay-phai", { rotation: 142, duration: 0.45, ease: "power1.inOut" }, ${f(t + 0.6)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: 0, duration: 0.45, ease: "sine.inOut" }, ${f(t + 1.3)});`,
    `tl.to("#${p}-dau", { rotation: -6, duration: 0.4 }, ${f(t + 1.3)});`,
  ],
  // ── Bộ 3 (phim Mark Zuckerberg, lượt 2) ──
  // Lật đồng hồ cát (quay ngược thời gian): hai tay ôm đồng hồ cát ở tầm ngực, lật ngược dứt khoát, ngẩng nhìn hoài niệm
  lat_dong_ho: (p, t, dd) => [
    ...vatHien(p, 'dong_ho_cat', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: -32, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 32, duration: 0.35 }, ${f(t)});`,
    `tl.fromTo("#${p}-vat-dong_ho_cat", { rotation: 0, transformOrigin: "50% 50%" }, { rotation: 180, duration: 0.55, ease: "power2.inOut", immediateRender: false }, ${f(t + 0.55)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 44 : -20), duration: 0.28, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + 0.55)});`,
    `tl.to("#${p}-dau", { rotation: 8, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: -7, duration: 0.5, ease: "sine.inOut" }, ${f(t + 1.2)});`,
  ],
  // Lắc chuông (mở phiên giao dịch, IPO): đứng trước bảng chứng khoán, tay phải lắc chuông liên tục, tay trái giơ nắm đấm,
  // nhún nhảy theo nhịp, cười rạng rỡ
  rung_chuong: (p, t, dd) => [
    ...vatHien(p, 'bang_ck', t, dd), ...vatHien(p, 'chuong_tay', t, dd),
    `tl.to("#${p}-tay-trai", { rotation: 118, duration: 0.3, ease: "power2.out" }, ${f(t)});`,
    `tl.fromTo("#${p}-tay-trai", { rotation: 104 }, { rotation: 134, duration: 0.13, yoyo: true, repeat: ${solan(dd - 0.5, 0.13)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.32)});`,
    `tl.to("#${p}-tay-phai", { rotation: -150, duration: 0.35, ease: "back.out(1.6)" }, ${f(t)});`,
    `tl.to("#${p} svg", { y: -10, duration: 0.2, yoyo: true, repeat: ${solan(dd - 0.4, 0.2)}, ease: "sine.inOut" }, ${f(t + 0.3)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t)});`,
  ],
  // Ôm chầm (đám cưới, đoàn tụ): tay trái cầm bó hoa, tay phải đưa nhẫn ra trước; rồi buông đồ, vòng hai tay ôm chặt trước
  // ngực, đầu nghiêng tựa, tim bay lên, má hồng
  om_ap: (p, t, dd) => {
    const om = Math.min(1.3, Math.max(0.5, dd * 0.4))
    return [
      ...vatHien(p, 'hoa', t, om + 0.2), ...vatHien(p, 'nhan', t, om + 0.2), ...vatHien(p, 'tim', t + om, Math.max(0.6, dd - om)),
      `tl.to("#${p}-tay-trai", { rotation: -30, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-tay-phai", { rotation: -50, duration: 0.5, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -64 : 64), duration: 0.3, ease: "power2.out" }, ${f(t + om + 0.1)});`,
      `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -26 : 26), duration: 0.4, yoyo: true, repeat: ${solan(dd - om - 0.6, 0.4)}, ease: "sine.inOut" }, ${f(t + om + 0.6)});`,
      `tl.to("#${p}-dau", { rotation: 13, duration: 0.5 }, ${f(t + om)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(t + 0.2)});`,
    ]
  },
  // Bấm nút (công bố, đổi tên, kích hoạt): màn hình lớn bên cạnh, nút bấm trước người; tay phải vươn ấn mạnh, nút lún rồi
  // bật lại, màn hình loé; rụt tay, hai tay chống hông cười hài lòng
  bam_nut: (p, t, dd) => [
    ...vatHien(p, 'man_hinh', t, dd), ...vatHien(p, 'nut', t, dd),
    `tl.to("#${p}-tay-phai", { rotation: 26, duration: 0.4, ease: "power2.out" }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 40, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.in" }, ${f(t + 0.5)});`,
    `tl.fromTo("#${p}-vat-nut", { scaleY: 1, transformOrigin: "50% 100%" }, { scaleY: 0.6, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.in", immediateRender: false }, ${f(t + 0.55)});`,
    `tl.fromTo("#${p}-vat-man_hinh", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.1, duration: 0.18, yoyo: true, repeat: 1, ease: "sine.out", immediateRender: false }, ${f(t + 0.75)});`,
    `tl.to("#${p}-dau", { rotation: -8, duration: 0.3 }, ${f(t + 0.7)});`,
    `tl.to("#${p}-tay-phai", { rotation: -24, duration: 0.4, ease: "sine.inOut" }, ${f(t + 1.1)});`,
    `tl.to("#${p}-tay-trai", { rotation: 24, duration: 0.4, ease: "sine.inOut" }, ${f(t + 1.1)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + 1)});`,
  ],
  // Em bé nằm nôi (chào đời, ngày sinh): nôi trước người, em bé nằm trong nôi bú bình sữa, cựa quậy, nôi đung đưa theo
  // nhịp; người đứng sau vịn thành nôi cúi nhìn trìu mến; cuối câu em bé ngủ, 💤 bay lên
  nam_noi: (p, t, dd) => [
    ...vatHien(p, 'noi', t, dd), ...vatHien(p, 'be', t + 0.15, dd - 0.15), ...vatHien(p, 'binh', t + 0.3, Math.max(0.6, dd - 0.3)),
    ...vatHien(p, 'zzz_be', t + Math.max(0.8, dd - 1.2), Math.min(1.2, dd)),
    `tl.fromTo("#${p}-vat-noi", { rotation: -3, transformOrigin: "50% 100%" }, { rotation: 3, duration: 0.6, yoyo: true, repeat: ${solan(dd - 0.4, 0.6)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.3)});`,
    `tl.fromTo("#${p}-vat-be", { rotation: 4, transformOrigin: "50% 80%" }, { rotation: -4, duration: 0.6, yoyo: true, repeat: ${solan(dd - 0.6, 0.6)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.45)});`,
    `tl.fromTo("#${p}-vat-binh", { y: 0 }, { y: -6, duration: 0.3, yoyo: true, repeat: ${solan(dd - 0.8, 0.3)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.6)});`,
    `tl.to("#${p}-tay-trai", { rotation: -22, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 22, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: 14, duration: 0.5, ease: "sine.inOut" }, ${f(t)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(t + 0.3)});`,
  ],
  // ── Bộ 4 (phim Mike Tyson 15/10/2026) ── quyền anh: hai tay đeo găng 🥊, thế thủ hai găng sát cằm, đấm thẳng / móc
  // (tay vụt ra rồi thu về, người lao theo), tia va chạm 💥 cạnh nắm đấm; đời thường: gánh vác, còng tay, cân, đai vô
  // địch, tiệc tùng, đi máy bay, ngồi thiền. Đồ không có emoji vẽ sẵn (VE_VAT): còng, bao cát, cân, đai, dây đài, đệm.
  // ── Bộ 5 (phim Samsung 15/10/2026) ──
  // Treo biển hiệu: ôm biển trước ngực, nhón chân nâng lên cao áp vào tường, căn chỉnh, buông tay lùi lại ngắm tự hào
  treo_bien: (p, t, dd) => [
    ...vatHien(p, 'bien', t, dd),
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 24 : -24), duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-vat-bien", { y: -200, duration: 0.7, ease: "power2.inOut" }, ${f(t + 0.4)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -158 : 158), duration: 0.7, ease: "power2.inOut" }, ${f(t + 0.4)});`,
    `tl.to("#${p} svg", { y: -14, duration: 0.35, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + 0.5)});`,
    `tl.to("#${p}-dau", { rotation: -10, duration: 0.4 }, ${f(t + 0.4)});`,
    `tl.fromTo("#${p}-vat-bien", { rotation: -3, transformOrigin: "50% 50%" }, { rotation: 0, duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, ${f(t + 1.15)});`,
    `tl.to("#${p}-dau", { rotation: -4, duration: 0.18, yoyo: true, repeat: 1 }, ${f(t + 1.2)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: 0, duration: 0.4, ease: "sine.inOut" }, ${f(t + Math.max(1.7, dd - 0.8))});`,
    `tl.fromTo("#${p} svg", { x: 0 }, { x: -24, duration: 0.4, ease: "sine.out", immediateRender: false }, ${f(t + Math.max(1.7, dd - 0.8))});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + Math.max(1.7, dd - 0.8))});`,
    `tl.to("#${p} svg", { x: 0, duration: 0.4 }, ${f(t + Math.max(2.2, dd) + 0.05)});`,
  ],
  // Cân hàng (buôn bán): cân đĩa bên cạnh lắc lư tới khi thăng bằng; tay phải nhấc bao gạo, tay trái cá khô; cúi nhìn đĩa
  // cân, lau mồ hôi, cuối đưa hàng ra trước mời khách, niềm nở
  can_hang: (p, t, dd) => [
    ...vatHien(p, 'can_dia', t, dd), ...vatHien(p, 'gao', t, dd), ...vatHien(p, 'ca_kho', t, dd),
    `tl.to("#${p}-tay-phai", { rotation: -60, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: 30, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: 12, duration: 0.35 }, ${f(t)});`,
    `tl.fromTo("#${p}-vat-can_dia", { rotation: -10, transformOrigin: "50% 100%" }, { rotation: 10, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.4)});`,
    `tl.to("#${p}-vat-can_dia", { rotation: 0, duration: 0.3 }, ${f(t + 2)});`,
    `tl.to("#${p}-tay-phai", { rotation: 150, duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + Math.min(1.3, dd * 0.45))});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 22 : -22), duration: 0.4 }, ${f(t + Math.max(2, dd - 0.8))});`,
    `tl.to("#${p}-dau", { rotation: -3, duration: 0.3 }, ${f(t + Math.max(2, dd - 0.8))});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + Math.max(2, dd - 0.8))});`,
  ],
  // Cắt băng khánh thành: dải băng đỏ căng ngang trước người, tay phải cầm kéo; khép kéo cắt, băng đứt rủ xuống rơi, rồi
  // giơ cao kéo, tay trái vẫy đám đông
  cat_bang: (p, t, dd) => [
    ...vatHien(p, 'bang_do', t, Math.min(dd, 1.6)), ...vatHien(p, 'keo', t, dd),
    `tl.to("#${p}-tay-phai", { rotation: 30, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: -18, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: 10, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 22, duration: 0.12, yoyo: true, repeat: 1 }, ${f(t + 0.7)});`,
    `tl.to("#${p}-vat-bang_do", { y: 60, rotation: 6, duration: 0.5, ease: "power2.in" }, ${f(t + 0.85)});`,
    `tl.to("#${p}-tay-phai", { rotation: -150, duration: 0.35, ease: "back.out(1.6)" }, ${f(t + 1.2)});`,
    `tl.fromTo("#${p}-tay-trai", { rotation: 120 }, { rotation: 150, duration: 0.25, yoyo: true, repeat: ${solan(Math.max(0.6, dd - 1.4), 0.25)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 1.25)});`,
    `tl.to("#${p}-dau", { rotation: -5, duration: 0.3 }, ${f(t + 1.2)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + 1.2)});`,
  ],
  // Dắt xe đạp ở vùng quê: ngôi nhà phía sau, xe đạp trước người, tay nắm ghi-đông, bước chậm dắt xe đi, dừng ngắm cảnh
  dap_xe: (p, t, dd) => {
    const di = Math.min(dd - 0.4, 2.6)
    return [
      ...vatHien(p, 'xe_dap', t, dd), ...vatHien(p, 'nha_que', t, dd),
      `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 18 : -18), duration: 0.3 }, ${f(t)});`,
      `tl.fromTo("#${p} svg", { x: -90 }, { x: 60, duration: ${f(Math.max(0.6, di))}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p} svg", { y: -7, duration: 0.24, yoyo: true, repeat: ${solan(Math.max(0.6, di), 0.24)}, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: -8, duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + di / 2)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + di)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5 }, ${f(t + Math.max(di, dd) + 0.05)});`,
    ]
  },
  // ── Bộ 6 (phim Nikola Tesla 16/10/2026) ──
  // Chơi bài (cờ bạc, sòng bạc): bàn dạ xanh trước người (như ngồi sau bàn), tay trái cầm xấp bài trước ngực, người chồm
  // tới, mắt dán vào bài, mồ hôi; tay phải rút một lá đánh xuống bàn dứt khoát; cuối thở dài, cúi đầu tiếc nuối
  // ── Bộ 7 (phim Nikola Tesla 16/10/2026, dùng khớp khuỷu / gối) ──
  // Đan lát: ngồi ghế gỗ (gối hơi mở, ống chân thẳng đứng), cuộn len trên lòng, tay phải đưa hai kim đan qua lại trước
  // ngực, đầu cúi chăm chú; giữa chừng đặt kim xuống, cầm cờ lê nhỏ lên ngang mắt xem rồi đan tiếp; cuối ngẩng lên mỉm cười
  // ── Bộ 8 (phim Nikola Tesla 16/10/2026) ──
  // Ngồi lặng lẽ: ghế dựa cạnh giường khách sạn, ngồi (gối hơi mở), hai tay buông trên gối, vai rụt, đầu cúi nhìn sàn, ngực
  // phập phồng theo nhịp thở; giữa chừng ngẩng nhẹ, chớp mắt rồi rủ xuống; cuối nhìn xa xăm về góc phòng, mặt buồn
  // ── Bộ 9 (phim Nikola Tesla 16/10/2026) ──
  // Chống gậy: già yếu lê bước trong khách sạn — gậy gỗ trong tay phải, mũi gậy chạm sàn và chống xuống theo từng bước;
  // vai gù, đầu cúi, bước chậm (máy dựng lo dáng nghiêng); giữa chừng dừng lại tựa gậy thở dốc rồi lê bước tiếp; cuối dừng
  // hẳn, chống gậy đứng vững, ngoảnh nhìn sang cửa sổ phòng khách sạn
  // ── Bộ 10 (phim Soichiro Honda 16/10/2026) ──
  // Lái xe máy Type D: ngồi trên xe nhìn ngang (máy dựng lo dáng nghiêng nhìn sang trái), đùi đặt dọc yên, tay nắm ghi-đông,
  // người rướn tới; xe chạy từ phải sang trái, bánh quay, khói bô phụt; giữa chừng nhún qua gờ giảm tốc; cuối giảm tốc dừng
  // giữa khung, gạt chân chống xuống
  // ── Bộ 11 (phim Ferrari 16/10/2026) ──
  // Nói chuyện qua bàn: ngồi sau bàn làm việc, tay phải nhấc góc tờ hợp đồng lên, đưa tới rồi hạ, đầu gật theo nhịp nói,
  // giữa câu chớp mắt nhún vai; cuối đặt tờ hợp đồng phẳng xuống bàn, ngồi nghiêm chờ phản ứng
  // ── Bộ 12 (phim Ferrari 16/10/2026) ──
  // Gắn bảng tên lên tường: bảng vàng chữ FERRARI áp trên tường cạnh người, tay phải cầm búa vung lên giáng xuống đóng đinh
  // theo nhịp đều (bảng rung nhẹ mỗi nhát), chùng gối, người nhún theo nhát búa; giữa chừng dừng kiểm tra bảng rồi bồi vài
  // nhát nhẹ; cuối hạ búa, lùi nửa bước, ngước nhìn bảng tự hào
  // ── Bộ 13 (phim Lionel Messi 16/10/2026) ──
  // Ký lên khăn giấy, tay run: ngồi sau bàn, khăn giấy trên bàn, tay phải cầm bút đặt sát khăn, cổ tay run bần bật, vai gồng,
  // ngực phập phồng; giữa chừng thả lỏng rồi siết lại; cuối nhắm mắt một nhịp, mở ra kiên định
  cam_but_run: (p, t, dd) => [
    ...ngoiBan(p, t, dd), ...vatHien(p, 'khan_giay', t, dd), ...vatHien(p, 'but_ky', t, dd),
    `tl.to("#${p}-cang-phai", { rotation: 60, duration: 0.35 }, ${f(t + 0.35)});`,
    `tl.to("#${p}-dau", { rotation: 14, duration: 0.35 }, ${f(t + 0.3)});`,
    `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { rotation: (i) => (i ? -10 : 10), svgOrigin: "200 166", duration: 0.3 }, ${f(t + 0.3)});`,
    `tl.fromTo("#${p}-cang-phai", { rotation: 58 }, { rotation: 63, duration: 0.05, yoyo: true, repeat: ${solan(Math.max(0.6, dd * 0.4), 0.05)}, ease: "none", immediateRender: false }, ${f(t + 0.75)});`,
    `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t + 0.75)});`,
    `tl.fromTo("#${p}-cang-phai", { rotation: 58 }, { rotation: 64, duration: 0.04, yoyo: true, repeat: ${solan(Math.max(0.6, dd * 0.3), 0.04)}, ease: "none", immediateRender: false }, ${f(t + 0.85 + dd * 0.4)});`,
    `tl.to("#${p}-mat", { scaleY: 0.1, duration: 0.2, yoyo: true, repeat: 1 }, ${f(t + Math.max(1.6, dd - 0.8))});`,
    `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(1.8, dd - 0.4))});`,
  ],
  // Lao động vất vả: hai tay nắm búa vung lên giáng xuống (người cha), rồi đổi sang cầm chổi cúi quét (người mẹ); mồ hôi,
  // giữa chừng lau mồ hôi; cuối đứng thẳng cầm chắc dụng cụ, mỉm cười hy vọng
  lao_dong_vat_va: (p, t, dd) => {
    const doi = t + dd * 0.5
    const ra = [...vatHien(p, 'bua', t, doi - t), ...vatHien(p, 'choi_quet', doi, dd - (doi - t))]
    ra.push(`tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(t + 0.3)});`, `tl.to(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: (i) => (i ? -8 : 8), duration: 0.3 }, ${f(t)});`)
    for (let k = t + 0.2; k + 0.5 <= doi - 0.1; k += 0.5) ra.push(
      `tl.to("#${p}-tay-phai", { rotation: -150, duration: 0.25, ease: "power2.out" }, ${f(k)});`,
      `tl.to("#${p}-tay-phai", { rotation: 10, duration: 0.15, ease: "power3.in" }, ${f(k + 0.27)});`,
      `tl.fromTo("#${p} svg", { y: 0 }, { y: 8, duration: 0.07, yoyo: true, repeat: 1, immediateRender: false }, ${f(k + 0.4)});`,
    )
    ra.push(
      `tl.to("#${p}-tay-phai", { rotation: 14, duration: 0.25 }, ${f(doi)});`,
      `tl.to("#${p} svg", { y: 14, duration: 0.3 }, ${f(doi)});`,
      `tl.to("#${p}-dau", { rotation: 14, duration: 0.3 }, ${f(doi)});`,
      `tl.fromTo("#${p}-tay-phai", { rotation: 4 }, { rotation: 30, duration: 0.35, yoyo: true, repeat: ${solan(Math.max(0.7, dd * 0.3), 0.35)}, ease: "sine.inOut", immediateRender: false }, ${f(doi + 0.25)});`,
      `tl.fromTo("#${p}-vat-choi_quet", { rotation: -14, transformOrigin: "50% 15%" }, { rotation: 18, duration: 0.35, yoyo: true, repeat: ${solan(Math.max(0.7, dd * 0.3), 0.35)}, ease: "sine.inOut", immediateRender: false }, ${f(doi + 0.25)});`,
      `tl.to("#${p}-tay-trai", { rotation: 150, duration: 0.25, yoyo: true, repeat: 1 }, ${f(t + Math.max(1.4, dd - 1.4))});`,
      `tl.to("#${p}-cang-trai", { rotation: -105, duration: 0.25, yoyo: true, repeat: 1 }, ${f(t + Math.max(1.4, dd - 1.4))});`,
      `tl.to("#${p} svg", { y: 0, duration: 0.3 }, ${f(t + Math.max(1.8, dd - 0.7))});`,
      `tl.to(["#${p}-tay-phai", "#${p}-dau"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(1.8, dd - 0.7))});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + Math.max(1.8, dd - 0.7))});`,
      `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(2, dd))});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(2, dd) + 0.05)});`,
    )
    return ra
  },
  // Đá bóng: chùng gối, vung chân sút bóng lăn đi, chạy theo bóng chạm nhẹ đổi hướng; cuối đặt chân lên bóng, cười tự hào
  da_bong: (p, t, dd) => {
    const chay = t + 0.75
    const ket = t + Math.max(1.8, dd - 0.8)
    return [
      ...vatHien(p, 'bong', t, dd),
      `tl.to(["#${p}-ong-trai", "#${p}-ong-phai"], { rotation: -10, duration: 0.2 }, ${f(t)});`,
      ...sutBong(p, t + 0.1, 'phai', 140),
      `tl.to("#${p}-vat-bong", { x: 0, y: 0, duration: 0.01 }, ${f(chay + 0.2)});`,
      `tl.fromTo("#${p} svg", { x: -60 }, { x: 120, duration: ${f(ket - chay)}, ease: "none", immediateRender: false }, ${f(chay)});`,
      ...reBong(p, chay + 0.05, ket),
      `tl.to("#${p}-chan-phai", { rotation: 30, duration: 0.2 }, ${f(ket)});`,
      `tl.to("#${p}-ong-phai", { rotation: -30, duration: 0.2 }, ${f(ket)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(ket)});`,
      `tl.to(["#${p}-chan-phai", "#${p}-ong-phai", "#${p}-ong-trai"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(2.2, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(2.2, dd) + 0.05)});`,
    ]
  },
  // Ghi bàn: rê bóng tốc độ, ngoặt qua lại, sút chân trái căng vào khung thành (lưới rung); cuối bật nhảy, hai tay giơ cao
  ghi_ban: (p, t, dd) => {
    const sut = t + Math.max(1, dd * 0.45)
    return [
      ...vatHien(p, 'bong', t, sut - t + 0.9), ...vatHien(p, 'khung_thanh', t - 0.1, dd + 0.2),
      `tl.fromTo("#${p} svg", { x: -80 }, { x: 60, duration: ${f(sut - t)}, ease: "none", immediateRender: false }, ${f(t)});`,
      ...reBong(p, t, sut - 0.05, 0.16),
      `tl.fromTo("#${p} svg", { rotation: -4, transformOrigin: "50% 100%" }, { rotation: 4, duration: 0.18, yoyo: true, repeat: 3, immediateRender: false }, ${f(t + 0.3)});`,
      ...sutBong(p, sut, 'trai', 360),
      ...rungLuoi(p, sut + 0.85),
      ...anMung(p, sut + 1.0),
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(sut - t + 1.9, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(sut - t + 1.9, dd) + 0.05)});`,
    ]
  },
  // Cầm hoá đơn: ngồi sau bàn, tay phải cầm xấp hoá đơn, vài tờ tiền trên bàn, mắt nhắm, mày chau; hạ giấy xuống, đầu gục,
  // vai gù, thở dài; giữa chừng tay ôm trán; cuối buông tay, ngẩng lên nhìn vô định
  cam_hoa_don: (p, t, dd) => [
    ...ngoiBan(p, t, dd), ...vatHien(p, 'hoa_don', t, dd), ...vatHien(p, 'tien_giay', t, dd),
    `tl.to("#${p}-cang-phai", { rotation: 80, duration: 0.35 }, ${f(t + 0.35)});`,
    `tl.to("#${p}-mat", { scaleY: 0.12, duration: 0.25 }, ${f(t + 0.4)});`,
    `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { rotation: (i) => (i ? -12 : 12), svgOrigin: "200 166", duration: 0.3 }, ${f(t + 0.4)});`,
    `tl.to("#${p}-cang-phai", { rotation: 45, duration: 0.6, ease: "sine.inOut" }, ${f(t + 1)});`,
    `tl.to("#${p}-dau", { rotation: 18, duration: 0.6 }, ${f(t + 1)});`,
    `tl.to("#${p} svg", { scaleY: 0.97, y: 36, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + 1.2)});`,
    `tl.to("#${p}-tay-phai", { rotation: 30, duration: 0.3 }, ${f(t + dd * 0.55)});`,
    `tl.to("#${p}-cang-phai", { rotation: 150, duration: 0.3 }, ${f(t + dd * 0.55)});`,
    `tl.to("#${p}-tay-phai", { rotation: 12, duration: 0.3 }, ${f(t + dd * 0.55 + 0.8)});`,
    `tl.to("#${p}-cang-phai", { rotation: 40, duration: 0.3 }, ${f(t + dd * 0.55 + 0.8)});`,
    `tl.to("#${p}-mat", { scaleY: 1, duration: 0.25 }, ${f(t + Math.max(1.8, dd - 0.8))});`,
    `tl.to("#${p}-dau", { rotation: -3, duration: 0.4 }, ${f(t + Math.max(1.8, dd - 0.8))});`,
    `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(2, dd))});`,
  ],
  // Tự tiêm thuốc: ngồi ghế, tay phải cầm ống tiêm, cúi nhìn đùi, đưa kim xuống đùi, ấn piston (tay đẩy nhẹ); giữa chừng nhắm
  // mắt nén đau; cuối rút kim, đặt xuống, ngẩng lên thở phào, kiên cường
  tiem_thuoc: (p, t, dd) => {
    const het = t + Math.max(1.4, dd) + 0.05
    return [
      ...vatHien(p, 'ghe_go', t - 0.1, dd + 0.2), ...vatHien(p, 'xi_lanh', t, Math.max(1.2, dd - 0.6)),
      `tl.to("#${p} svg", { y: 32, duration: 0.4, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => [40, -40, -40, 40][i], duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 16, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-tay-phai", { rotation: 22, duration: 0.4 }, ${f(t + 0.3)});`,
      `tl.to("#${p}-cang-phai", { rotation: 20, duration: 0.4 }, ${f(t + 0.3)});`,
      `tl.to("#${p}-vat-xi_lanh", { rotation: -60, transformOrigin: "50% 50%", duration: 0.4 }, ${f(t + 0.3)});`,
      `tl.to("#${p}-tay-phai", { rotation: 16, duration: 0.4, ease: "sine.inOut" }, ${f(t + 0.9)});`,
      `tl.to("#${p}-mat", { scaleY: 0.12, duration: 0.15 }, ${f(t + dd * 0.45)});`,
      `tl.to("#${p}-mat", { scaleY: 1, duration: 0.2 }, ${f(t + dd * 0.45 + 0.6)});`,
      `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.2 }, ${f(t + dd * 0.45)});`,
      `tl.to("#${p}-tay-phai", { rotation: -10, duration: 0.3 }, ${f(t + Math.max(1.2, dd - 0.8))});`,
      `tl.to("#${p}-dau", { rotation: -4, duration: 0.4 }, ${f(t + Math.max(1.3, dd - 0.6))});`,
      `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + Math.max(1.3, dd - 0.6))});`,
      `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(het - 0.2)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai", "#${p}-tay-phai", "#${p}-cang-phai", "#${p}-dau"], { rotation: 0, duration: 0.4 }, ${f(het)});`,
      `tl.to("#${p} svg", { y: 0, duration: 0.4 }, ${f(het)});`,
    ]
  },
  // Rê bóng qua đối thủ: chạy đà rê bóng sát mũi giày, ngoặt nghiêng người vượt hình nộm, tăng tốc đẩy bóng lên; cuối trụ
  // chân, đặt chân lên bóng, ngẩng nhìn khung thành, cười
  re_bong: (p, t, dd) => {
    const ket = t + Math.max(1.6, dd - 0.8)
    return [
      ...vatHien(p, 'bong', t, dd), ...vatHien(p, 'hinh_nom', t - 0.1, dd + 0.2),
      `tl.fromTo("#${p} svg", { x: -110 }, { x: 180, duration: ${f(ket - t)}, ease: "power1.in", immediateRender: false }, ${f(t)});`,
      ...reBong(p, t, ket, 0.17),
      `tl.fromTo("#${p} svg", { rotation: 0, transformOrigin: "50% 100%" }, { rotation: -8, duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, ${f(t + (ket - t) * 0.45)});`,
      `tl.to("#${p}-chan-phai", { rotation: 28, duration: 0.2 }, ${f(ket)});`,
      `tl.to("#${p}-ong-phai", { rotation: -28, duration: 0.2 }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: -6, duration: 0.3 }, ${f(ket)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(ket)});`,
      `tl.to(["#${p}-chan-phai", "#${p}-ong-phai", "#${p}-dau"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(2, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(2, dd) + 0.05)});`,
    ]
  },
  // Tập luyện: đá bóng vào tường gạch, bóng nảy lại chân, đá tiếp theo nhịp; giữa chừng gập bụng (khom người, tay ôm gáy);
  // cuối đứng thẳng, lau mồ hôi, kiên trì
  tap_luyen: (p, t, dd) => {
    const giua = t + dd * 0.5
    const ra = [...vatHien(p, 'bong', t, dd), ...vatHien(p, 'tuong_tap', t - 0.1, dd + 0.2), `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(t + 0.5)});`]
    for (let k = t + 0.2; k + 0.9 <= giua; k += 0.9) ra.push(
      `tl.to("#${p}-chan-phai", { rotation: -30, duration: 0.15 }, ${f(k)});`,
      `tl.to("#${p}-chan-phai", { rotation: 46, duration: 0.12, ease: "power3.out" }, ${f(k + 0.16)});`,
      `tl.to("#${p}-chan-phai", { rotation: 0, duration: 0.2 }, ${f(k + 0.32)});`,
      `tl.fromTo("#${p}-vat-bong", { x: 0 }, { x: -210, duration: 0.3, yoyo: true, repeat: 1, ease: "power1.out", immediateRender: false }, ${f(k + 0.26)});`,
    )
    ra.push(
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 150 : -150), duration: 0.3 }, ${f(giua)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -120 : 120), duration: 0.3 }, ${f(giua)});`,
      `tl.fromTo("#${p} svg", { y: 0, scaleY: 1 }, { y: 30, scaleY: 0.92, duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, ${f(giua + 0.3)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(1.8, dd - 0.8))});`,
      `tl.to("#${p}-tay-trai", { rotation: 150, duration: 0.25, yoyo: true, repeat: 1 }, ${f(t + Math.max(2, dd - 0.6))});`,
      `tl.to("#${p}-cang-trai", { rotation: -105, duration: 0.25, yoyo: true, repeat: 1 }, ${f(t + Math.max(2, dd - 0.6))});`,
      `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(2.2, dd))});`,
    )
    return ra
  },
  // Bước vào phòng họp báo: bước nặng nề (máy dựng lo dáng nghiêng + bước chân), đầu cúi; giữa chừng khựng lại hít sâu; tới
  // bục micro, đứng trước bục, hai tay đặt lên mép bục, ngước nhìn buồn bã
  buoc_vao_phong: (p, t, dd) => {
    const toi = t + Math.max(1, dd - 1.2)
    return [
      ...vatHien(p, 'buc_hop_bao', toi - 0.2, dd - (toi - t) + 0.4),
      `tl.fromTo("#${p} svg", { x: -120 }, { x: 0, duration: ${f(toi - t)}, ease: "none", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 12, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + (toi - t) * 0.5)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -18 : 20), duration: 0.35 }, ${f(toi + 0.1)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -50 : 56), duration: 0.35 }, ${f(toi + 0.1)});`,
      `tl.to("#${p}-dau", { rotation: -3, duration: 0.5 }, ${f(toi + 0.3)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(toi - t + 1.2, dd) + 0.05)});`,
    ]
  },
  // Mặc áo đấu: hai tay cầm chiếc áo xanh đỏ trước ngực, cúi nhìn lạc lõng; đưa áo lên luồn vào người (áo trên người hiện
  // ra), thở dài kéo vạt áo; cuối buông tay, ngước nhìn cô độc
  mac_ao_dau: (p, t, dd) => {
    const mac = t + Math.max(0.9, dd * 0.35)
    return [
      ...vatHien(p, 'ao_psg_cam', t, mac - t + 0.3), ...vatHien(p, 'ao_psg', mac + 0.25, dd - (mac - t) + 0.6),
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -24 : 30), duration: 0.35 }, ${f(t)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -60 : 76), duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 12, duration: 0.35 }, ${f(t)});`,
      // đưa áo lên qua đầu rồi xuống người
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -150 : 150), duration: 0.3 }, ${f(mac - 0.2)});`,
      `tl.to("#${p}-vat-ao_psg_cam", { y: -150, scale: 1.3, duration: 0.3 }, ${f(mac - 0.2)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.35 }, ${f(mac + 0.3)});`,
      `tl.to("#${p}-dau", { rotation: 0, duration: 0.3 }, ${f(mac + 0.3)});`,
      `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.3, yoyo: true, repeat: 1 }, ${f(mac + 0.9)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -8 : 8), duration: 0.2, yoyo: true, repeat: 1 }, ${f(mac + 1)});`,
      `tl.to("#${p}-dau", { rotation: -5, duration: 0.4 }, ${f(t + Math.max(mac - t + 1.4, dd - 0.6))});`,
      `tl.to("#${p}-dau", { rotation: 0, duration: 0.3 }, ${f(t + Math.max(mac - t + 1.8, dd) + 0.05)});`,
    ]
  },
  // Đứng nghe la ó: sân vận động về đêm, bong bóng "BOO!" từ khán đài, vai gù, đầu cúi, mắt đảo hai bên, bước chậm vòng cung;
  // giữa chừng khựng lại ngẩng nhìn khán đài; cuối đứng yên, cằm ngẩng, kiên cường
  dung_nghe: (p, t, dd) => [
    ...vatHien(p, 'san_den', t - 0.2, dd + 0.4), ...vatHien(p, 'la_o', t + 0.2, dd - 0.2),
    `tl.fromTo("#${p}-vat-la_o", { scale: 0.9, transformOrigin: "50% 50%" }, { scale: 1.06, duration: 0.25, yoyo: true, repeat: ${solan(Math.max(0.6, dd - 0.4), 0.25)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.3)});`,
    `tl.to("#${p}-dau", { rotation: 12, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p} svg", { y: 8, duration: 0.4 }, ${f(t)});`,
    `tl.fromTo("#${p}-mat", { x: -6 }, { x: 6, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.3)});`,
    `tl.fromTo("#${p} svg", { x: 0 }, { x: 60, duration: ${f(Math.max(0.8, dd * 0.4))}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.4)});`,
    `tl.fromTo(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: 0 }, { rotation: (i) => (i ? -6 : 6), duration: 0.4, yoyo: true, repeat: ${solan(Math.max(0.8, dd * 0.4), 0.4)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.4)});`,
    `tl.to("#${p}-dau", { rotation: -6, duration: 0.5 }, ${f(t + dd * 0.6)});`,
    `tl.to("#${p}-mat", { x: 0, duration: 0.3 }, ${f(t + dd * 0.6)});`,
    `tl.to("#${p} svg", { y: 0, duration: 0.4 }, ${f(t + dd * 0.6)});`,
    `tl.to("#${p}-dau", { rotation: 0, duration: 0.3 }, ${f(t + Math.max(1.8, dd) + 0.05)});`,
    `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(1.8, dd) + 0.05)});`,
  ],
  // Bước ra sân rực đèn: sân vận động về đêm đèn pha rọi, bước chắc nịch tiến ra (máy dựng lo dáng nghiêng + bước chân);
  // giữa đường ngẩng cao đầu, nhếch môi cười; cuối dừng ở mép sân, nhìn khán đài tự hào
  buoc_ra_san: (p, t, dd) => {
    const di = Math.min(Math.max(1, dd - 0.9), 2.6)
    return [
      ...vatHien(p, 'san_den', t - 0.2, dd + 0.4),
      `tl.fromTo("#${p} svg", { x: -130 }, { x: 40, duration: ${f(di)}, ease: "sine.out", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: -6, duration: 0.5 }, ${f(t + di * 0.5)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(t + di * 0.5)});`,
      `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + di * 0.5)});`,
      `tl.to("#${p}-dau", { rotation: 0, duration: 0.3 }, ${f(t + Math.max(di + 0.8, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(di + 0.8, dd) + 0.05)});`,
    ]
  },
  // Sút luân lưu: đặt bóng, chạy đà ngắn, chân trụ bám cỏ, vung chân phải sút căng vào khung thành — lưới rung; cuối khựng
  // lại một nhịp rồi hai tay giơ cao, ngửa cổ hét vỡ oà
  sut_bong: (p, t, dd) => {
    const sut = t + Math.min(1.2, Math.max(0.7, dd * 0.3))
    return [
      ...vatHien(p, 'bong', t, sut - t + 0.9), ...vatHien(p, 'khung_thanh', t - 0.1, dd + 0.2),
      `tl.fromTo("#${p} svg", { x: -70 }, { x: 0, duration: ${f(sut - t)}, ease: "power1.in", immediateRender: false }, ${f(t)});`,
      ...buocChan(p, t, sut - t - 0.05, 0.2, true),
      `tl.set("#${p}-vat-bong", { x: -60 }, ${f(t)});`,
      `tl.to("#${p}-vat-bong", { x: 0, duration: ${f(sut - t)}, ease: "none" }, ${f(t)});`,
      ...sutBong(p, sut, 'phai', 380),
      ...rungLuoi(p, sut + 0.85),
      ...anMung(p, sut + 1.25),
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(sut - t + 2.1, dd) + 0.05)});`,
    ]
  },
  // Chơi bóng áo hồng: mặc áo hồng số 10, rê bóng sát chân, đổi hướng giả đánh lừa; cuối dừng bóng dưới chân, cười nhẹ
  choi_bong: (p, t, dd) => {
    const ket = t + Math.max(1.6, dd - 0.8)
    return [
      ...vatHien(p, 'ao_hong', t - 0.2, dd + 0.4), ...vatHien(p, 'bong', t, dd),
      `tl.fromTo("#${p} svg", { x: -90 }, { x: 120, duration: ${f(ket - t)}, ease: "none", immediateRender: false }, ${f(t)});`,
      ...reBong(p, t, ket, 0.19),
      `tl.fromTo("#${p} svg", { rotation: 0, transformOrigin: "50% 100%" }, { rotation: 7, duration: 0.2, yoyo: true, repeat: 1, immediateRender: false }, ${f(t + (ket - t) * 0.5)});`,
      `tl.to("#${p}-chan-phai", { rotation: 28, duration: 0.2 }, ${f(ket)});`,
      `tl.to("#${p}-ong-phai", { rotation: -28, duration: 0.2 }, ${f(ket)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(ket)});`,
      `tl.to(["#${p}-chan-phai", "#${p}-ong-phai"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(2, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(2, dd) + 0.05)});`,
    ]
  },
  gan_bien: (p, t, dd) => {
    const ket = t + Math.max(1.6, dd - 0.9)
    const giua = t + (ket - t) * 0.5
    const go = (a, b, manh) => {
      const ra = []
      for (let k = a; k + 0.42 <= b; k += 0.42) ra.push(
        `tl.to("#${p}-tay-phai", { rotation: ${manh ? -150 : -128}, duration: 0.2, ease: "power2.out" }, ${f(k)});`,
        `tl.to("#${p}-tay-phai", { rotation: -108, duration: 0.1, ease: "power3.in" }, ${f(k + 0.22)});`,
        `tl.fromTo("#${p}-vat-bang_ten", { x: 0 }, { x: ${manh ? 3 : 1.5}, duration: 0.04, yoyo: true, repeat: 1, immediateRender: false }, ${f(k + 0.32)});`,
        `tl.fromTo("#${p} svg", { y: 12 }, { y: 16, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, ${f(k + 0.3)});`,
      )
      return ra
    }
    return [
      ...vatHien(p, 'bang_ten', t - 0.1, dd + 0.3), ...vatHien(p, 'bua', t, ket - t + 0.4),
      `tl.to("#${p} svg", { y: 12, duration: 0.3 }, ${f(t)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: (i) => (i ? -8 : 8), duration: 0.3 }, ${f(t)});`,
      `tl.to(["#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => (i ? 8 : -8), duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: -10, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-cang-phai", { rotation: 20, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: 24, duration: 0.3 }, ${f(t)});`,
      ...go(t + 0.3, giua, true),
      // dừng, kiểm tra bảng
      `tl.to("#${p}-tay-phai", { rotation: -60, duration: 0.3 }, ${f(giua)});`,
      `tl.to("#${p}-dau", { rotation: -14, duration: 0.3, yoyo: true, repeat: 1 }, ${f(giua)});`,
      ...go(giua + 0.6, ket, false),
      // hạ búa, lùi nửa bước, ngước nhìn tự hào
      `tl.to(["#${p}-tay-phai", "#${p}-cang-phai", "#${p}-tay-trai", "#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai"], { rotation: 0, duration: 0.35 }, ${f(ket)});`,
      `tl.to("#${p} svg", { y: 0, x: -26, duration: 0.4, ease: "sine.out" }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: -12, duration: 0.4 }, ${f(ket + 0.1)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(ket + 0.1)});`,
      `tl.to("#${p}-dau", { rotation: 0, duration: 0.35 }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
    ]
  },
  // Vẫy cờ và chụp ảnh: cờ ca-rô tay phải phất vòng cung rộng, tay trái giữ máy ảnh cổ trước ngực rồi đưa lên mắt bấm (đèn
  // chớp), xe đua đỏ lao qua phía sau, người nhún nhảy hào hứng; giữa chừng hạ cờ, xoay người bắt khoảnh khắc; cuối hạ máy
  // ảnh, giơ cờ cao qua đầu, cười lớn nhìn theo xe
  chup_anh_vay_co: (p, t, dd) => {
    const chup = t + Math.min(1.1, dd * 0.3)
    const ket = t + Math.max(1.8, dd - 0.8)
    return [
      ...vatHien(p, 'co_dua', t, dd), ...vatHien(p, 'xe_dua_xa', t + dd * 0.25, 1.5),
      `tl.fromTo("#${p}-vat-xe_dua_xa", { x: 420 }, { x: -620, duration: 1.3, ease: "none", immediateRender: false }, ${f(t + dd * 0.25)});`,
      ...vatHien(p, 'may_anh_tay', t, chup - t + 0.05), ...vatHien(p, 'may_anh_mat', chup, ket - chup), ...vatHien(p, 'may_anh_tay', ket, dd - (ket - t)),
      `tl.fromTo("#${p}-vat-chop_den", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1.2, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, ${f(chup + 0.35)});`,
      `tl.fromTo("#${p}-vat-chop_den", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1.2, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, ${f(t + dd * 0.62)});`,
      (VAT_CAN[p] ??= new Set()).add('chop_den') && '',
      `tl.to("#${p}-tay-trai", { rotation: -18, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -60, duration: 0.3 }, ${f(t)});`,
      // phất cờ vòng cung
      `tl.fromTo("#${p}-tay-phai", { rotation: -155 }, { rotation: -105, duration: 0.24, yoyo: true, repeat: ${solan(Math.max(0.8, ket - t - 0.2), 0.24)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
      `tl.fromTo("#${p}-vat-co_dua", { rotation: -24, transformOrigin: "20% 90%" }, { rotation: 22, duration: 0.24, yoyo: true, repeat: ${solan(Math.max(0.8, ket - t - 0.2), 0.24)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
      `tl.fromTo("#${p} svg", { y: 0 }, { y: -10, duration: 0.24, yoyo: true, repeat: ${solan(Math.max(0.8, ket - t), 0.24)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
      // đưa máy ảnh lên mắt
      `tl.to("#${p}-tay-trai", { rotation: 150, duration: 0.25 }, ${f(chup)});`,
      `tl.to("#${p}-cang-trai", { rotation: -110, duration: 0.25 }, ${f(chup)});`,
      `tl.to("#${p}-dau", { rotation: 5, duration: 0.25 }, ${f(chup)});`,
      // giữa chừng: xoay người bắt khoảnh khắc
      `tl.to("#${p} svg", { rotation: -5, transformOrigin: "50% 100%", duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + dd * 0.55)});`,
      // hạ máy ảnh, cờ giơ cao, cười lớn
      `tl.to("#${p}-tay-trai", { rotation: -18, duration: 0.3 }, ${f(ket)});`,
      `tl.to("#${p}-cang-trai", { rotation: -60, duration: 0.3 }, ${f(ket)});`,
      `tl.to("#${p}-tay-phai", { rotation: -168, duration: 0.3, ease: "back.out(1.6)" }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: -6, duration: 0.3 }, ${f(ket)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(ket)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(2.1, dd) + 0.05)});`,
    ].filter(Boolean)
  },
  noi_chuyen: (p, t, dd) => {
    const dat = t + Math.max(1.2, dd - 0.9)
    return [
      ...ngoiBan(p, t, dd), ...vatHien(p, 'hop_dong', t, dat - t + 0.1), ...vatHien(p, 'giay_ban', dat, dd - (dat - t) + 0.2),
      `tl.to("#${p}-tay-phai", { rotation: 22, duration: 0.35 }, ${f(t + 0.2)});`,
      `tl.to("#${p}-cang-phai", { rotation: 70, duration: 0.35 }, ${f(t + 0.2)});`,
      `tl.to("#${p}-tay-phai", { rotation: 30, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + 0.8)});`,
      `tl.fromTo("#${p}-dau", { rotation: 0 }, { rotation: 6, duration: 0.35, yoyo: true, repeat: ${solan(Math.max(0.7, dat - t - 0.6), 0.35)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.5)});`,
      `tl.to("#${p}-mat", { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1 }, ${f(t + dd * 0.45)});`,
      `tl.to("#${p} svg", { y: 26, duration: 0.15, yoyo: true, repeat: 1 }, ${f(t + dd * 0.45 + 0.1)});`,
      `tl.to("#${p}-tay-phai", { rotation: 14, duration: 0.3 }, ${f(dat)});`,
      `tl.to("#${p}-cang-phai", { rotation: 40, duration: 0.3 }, ${f(dat)});`,
      `tl.to("#${p}-dau", { rotation: -3, duration: 0.3 }, ${f(dat + 0.1)});`,
    ]
  },
  // Ngồi đối diện: ngồi sau bàn, tập hồ sơ trên bàn, hai tay đặt trên bàn, đầu cúi nhìn hồ sơ; ngẩng lên nhìn người đối
  // diện, tay phải nhấc nhẹ rồi đặt lại; giữa chừng chớp mắt chậm, ngả lưng ra ghế; cuối ngồi thẳng, hai tay đan trên mép bàn
  ngoi_doi_dien: (p, t, dd) => [
    ...ngoiBan(p, t, dd), ...vatHien(p, 'ho_so_ban', t, dd),
    `tl.to("#${p}-dau", { rotation: 12, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: -2, duration: 0.6, ease: "sine.inOut" }, ${f(t + 0.8)});`,
    `tl.to("#${p}-cang-phai", { rotation: 60, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + 1.2)});`,
    `tl.to("#${p}-mat", { scaleY: 0.1, duration: 0.15, yoyo: true, repeat: 1 }, ${f(t + dd * 0.45)});`,
    `tl.to("#${p} svg", { y: 22, scaleY: 1.02, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + dd * 0.45)});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -26 : 26), duration: 0.4 }, ${f(t + Math.max(1.6, dd - 0.8))});`,
    `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -70 : 70), duration: 0.4 }, ${f(t + Math.max(1.6, dd - 0.8))});`,
  ],
  // Hợp đồng trên bàn: ngồi sau bàn, tờ hợp đồng nằm giữa bàn, tay phải kéo nó nhích lại gần để đọc, đầu nghiêng, vai nhô
  // căng thẳng; giữa chừng thở ra (ngực hóp); cuối buông tay đặt phẳng lên bàn, ánh mắt lạnh nhìn tờ giấy, chau mày
  hop_dong_tren_ban: (p, t, dd) => [
    ...ngoiBan(p, t, dd), ...vatHien(p, 'giay_ban', t, dd),
    `tl.to("#${p}-dau", { rotation: 14, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-cang-phai", { rotation: 58, duration: 0.3 }, ${f(t + 0.4)});`,
    `tl.to("#${p}-vat-giay_ban", { y: 8, x: -6, duration: 0.6, ease: "sine.inOut" }, ${f(t + 0.55)});`,
    `tl.to("#${p}-dau", { rotation: 18, duration: 0.4 }, ${f(t + 0.7)});`,
    `tl.to("#${p} svg", { y: 22, duration: 0.25 }, ${f(t + 0.7)});`,
    `tl.to("#${p} svg", { scaleY: 0.97, y: 34, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + dd * 0.5)});`,
    `tl.to("#${p}-cang-phai", { rotation: 40, duration: 0.3 }, ${f(t + Math.max(1.6, dd - 0.8))});`,
    `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { rotation: (i) => (i ? -12 : 12), svgOrigin: "200 166", duration: 0.3 }, ${f(t + Math.max(1.6, dd - 0.8))});`,
    `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(2, dd) + 0.05)});`,
  ],
  // Thành lập công ty: hai tay cầm tờ giấy thành lập trước ngực, cúi đọc, nâng lên ưỡn ngực tự hào; giữa chừng hạ giấy, tay
  // phải cầm bút ký dứt khoát; cuối giơ giấy lên trước ngực, nhìn thẳng, rạng rỡ
  thanh_lap_cong_ty: (p, t, dd) => {
    const ky = t + Math.max(1.1, dd * 0.42)
    return [
      ...vatHien(p, 'van_ban', t, dd), ...vatHien(p, 'but_ky', ky, 1.1),
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -24 : 30), duration: 0.35 }, ${f(t)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -60 : 76), duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 12, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-vat-van_ban", { y: -24, duration: 0.5, ease: "sine.out" }, ${f(t + 0.6)});`,
      `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.5 }, ${f(t + 0.6)});`,
      `tl.to("#${p}-dau", { rotation: -4, duration: 0.4 }, ${f(t + 0.6)});`,
      // hạ giấy, ký
      `tl.to("#${p}-vat-van_ban", { y: 40, scale: 0.9, duration: 0.3 }, ${f(ky - 0.3)});`,
      `tl.to("#${p} svg", { scaleY: 1, duration: 0.3 }, ${f(ky - 0.3)});`,
      `tl.to("#${p}-dau", { rotation: 14, duration: 0.3 }, ${f(ky - 0.3)});`,
      `tl.to("#${p}-cang-phai", { rotation: 48, duration: 0.25 }, ${f(ky)});`,
      `tl.fromTo("#${p}-cang-phai", { rotation: 48 }, { rotation: 62, duration: 0.12, yoyo: true, repeat: 5, ease: "sine.inOut", immediateRender: false }, ${f(ky + 0.25)});`,
      // giơ giấy lên, rạng rỡ
      `tl.to("#${p}-vat-van_ban", { y: -18, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, ${f(ky + 1.05)});`,
      `tl.to("#${p}-cang-phai", { rotation: 76, duration: 0.35 }, ${f(ky + 1.05)});`,
      `tl.to("#${p}-dau", { rotation: -3, duration: 0.35 }, ${f(ky + 1.05)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(ky + 1.05)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(ky - t + 1.6, dd) + 0.05)});`,
    ]
  },
  // Bán hàng: ô tô cổ bên cạnh, tay trái kẹp tập hồ sơ, tay phải chỉ giới thiệu chiếc xe, tươi cười nhìn khách, bước dọc
  // thân xe; giữa chừng dừng, nâng hồ sơ lên cho khách xem; cuối đứng thẳng ôm hồ sơ, cười rạng rỡ
  ban_hang: (p, t, dd) => [
    ...vatHien(p, 'xe_co', t - 0.1, dd + 0.2), ...vatHien(p, 'ho_so_tay', t, dd),
    `tl.to("#${p}-tay-phai", { rotation: -64, duration: 0.35, ease: "back.out(1.4)" }, ${f(t)});`,
    `tl.to("#${p}-cang-phai", { rotation: -18, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: -12, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-cang-trai", { rotation: -40, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + 0.2)});`,
    `tl.fromTo("#${p} svg", { x: -50 }, { x: 40, duration: ${f(Math.min(2, Math.max(0.8, dd * 0.4)))}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.3)});`,
    `tl.fromTo(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: 0 }, { rotation: (i) => (i ? -7 : 7), duration: 0.3, yoyo: true, repeat: ${solan(Math.min(2, Math.max(0.8, dd * 0.4)), 0.3)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.3)});`,
    `tl.to("#${p}-tay-phai", { rotation: -80, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t + 0.6)});`,
    // nâng hồ sơ cho khách xem
    `tl.to("#${p}-tay-trai", { rotation: 40, duration: 0.3 }, ${f(t + dd * 0.55)});`,
    `tl.to("#${p}-cang-trai", { rotation: -100, duration: 0.3 }, ${f(t + dd * 0.55)});`,
    `tl.to("#${p}-tay-phai", { rotation: 0, duration: 0.3 }, ${f(t + dd * 0.55)});`,
    `tl.to("#${p}-tay-trai", { rotation: -14, duration: 0.3 }, ${f(t + Math.max(1.6, dd - 0.7))});`,
    `tl.to("#${p}-cang-trai", { rotation: -50, duration: 0.3 }, ${f(t + Math.max(1.6, dd - 0.7))});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(2, dd) + 0.05)});`,
    `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(2, dd) + 0.05)});`,
  ],
  // Tổ chức giải đua: cờ ca-rô trong tay phải vẫy vòng tròn rộng, tay trái chống hông, chiếc xe đua lao qua phía sau; giữa
  // chừng hạ cờ, ngó xa theo xe; cuối giơ cao cờ, cười phấn khởi
  to_chuc_giai_dua: (p, t, dd) => [
    ...vatHien(p, 'co_dua', t, dd), ...vatHien(p, 'xe_dua_xa', t + dd * 0.3, 1.6),
    `tl.fromTo("#${p}-vat-xe_dua_xa", { x: 420 }, { x: -620, duration: 1.4, ease: "none", immediateRender: false }, ${f(t + dd * 0.3)});`,
    `tl.to("#${p}-tay-trai", { rotation: 30, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-cang-trai", { rotation: -42, duration: 0.3 }, ${f(t)});`,
    `tl.fromTo("#${p}-tay-phai", { rotation: -150 }, { rotation: -110, duration: 0.22, yoyo: true, repeat: ${solan(Math.max(0.8, dd * 0.4), 0.22)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
    `tl.fromTo("#${p}-vat-co_dua", { rotation: -20, transformOrigin: "20% 90%" }, { rotation: 20, duration: 0.22, yoyo: true, repeat: ${solan(Math.max(0.8, dd * 0.4), 0.22)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
    `tl.to("#${p}-tay-phai", { rotation: -20, duration: 0.3 }, ${f(t + dd * 0.5)});`,
    `tl.to("#${p}-dau", { rotation: -8, duration: 0.4 }, ${f(t + dd * 0.5)});`,
    `tl.to("#${p}-mat", { x: -7, duration: 0.3 }, ${f(t + dd * 0.5)});`,
    `tl.to("#${p}-mat", { x: 0, duration: 0.3 }, ${f(t + Math.max(1.6, dd - 0.7))});`,
    `tl.to("#${p}-tay-phai", { rotation: -165, duration: 0.35, ease: "back.out(1.6)" }, ${f(t + Math.max(1.6, dd - 0.7))});`,
    `tl.to("#${p}-dau", { rotation: -4, duration: 0.3 }, ${f(t + Math.max(1.6, dd - 0.7))});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + Math.max(1.6, dd - 0.7))});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(2, dd) + 0.05)});`,
  ],
  // Đại diện đội đua: xe đua đỏ bên cạnh, tay phải đặt lên thân xe, tay trái cầm văn bản cuộn tròn, đứng ưỡn ngực tự hào;
  // bước chậm ra phía trước, giơ văn bản chỉ tới; giữa chừng vỗ nhẹ thân xe; cuối đứng thẳng nhìn thẳng ống kính
  dai_dien: (p, t, dd) => [
    ...vatHien(p, 'xe_dua', t - 0.1, dd + 0.2), ...vatHien(p, 'cuon_giay', t, dd),
    `tl.to("#${p}-tay-phai", { rotation: -40, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-cang-phai", { rotation: 20, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: -4, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: 60, duration: 0.35 }, ${f(t + dd * 0.25)});`,
    `tl.to("#${p}-cang-trai", { rotation: -40, duration: 0.35 }, ${f(t + dd * 0.25)});`,
    `tl.fromTo("#${p}-cang-phai", { rotation: 20 }, { rotation: 34, duration: 0.14, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, ${f(t + dd * 0.5)});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(1.5, dd - 0.6))});`,
    `tl.to("#${p}-dau", { rotation: 0, duration: 0.35 }, ${f(t + Math.max(1.5, dd - 0.6))});`,
    `tl.to("#${p} svg", { scaleY: 1, duration: 0.35 }, ${f(t + Math.max(2, dd) + 0.05)});`,
  ],
  // Mô tả tình huống giằng co: bước chậm sang trái, thân xoay qua lại giữa hai hướng, vai nhún, hai tay co lên đan trước
  // bụng căng thẳng; giữa chừng khựng lại ngoái nhìn sau; cuối đứng dạng chân, cằm hếch, mặt bất an
  mo_ta_tinh_huong: (p, t, dd) => [
    `tl.fromTo("#${p} svg", { x: 30 }, { x: -50, duration: ${f(Math.max(1, dd * 0.45))}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
    `tl.fromTo("#${p} svg", { rotation: -3, transformOrigin: "50% 100%" }, { rotation: 3, duration: 0.5, yoyo: true, repeat: ${solan(Math.max(1, dd * 0.45), 0.5)}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -22 : 26), duration: 0.4 }, ${f(t + 0.2)});`,
    `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -70 : 84), duration: 0.4 }, ${f(t + 0.2)});`,
    `tl.to("#${p}-dau", { rotation: -10, duration: 0.4, yoyo: true, repeat: 1 }, ${f(t + dd * 0.5)});`,
    `tl.to("#${p}-mat", { x: 8, duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + dd * 0.5)});`,
    `tl.to(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: (i) => (i ? -6 : 6), duration: 0.3 }, ${f(t + Math.max(1.4, dd - 0.8))});`,
    `tl.to("#${p}-dau", { rotation: -6, duration: 0.3 }, ${f(t + Math.max(1.4, dd - 0.8))});`,
    `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(t + Math.max(1.4, dd - 0.8))});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-chan-trai", "#${p}-chan-phai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(1.8, dd) + 0.05)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(1.8, dd))});`,
    `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(1.8, dd) + 0.05)});`,
  ],
  // Phản đối: chống nạnh ưỡn ngực, trừng mắt giận; lùi nửa bước rồi vung mạnh tay phải sang ngang gạt đi, người chồm tới;
  // giữa chừng dang rộng hai tay từ chối tuyệt đối; cuối chống nạnh, thở hổn hển, mặt hầm hầm
  phan_doi: (p, t, dd) => [
    ...chongNanh(p, t),
    `tl.to("#${p}-gian", { opacity: 1, duration: 0.2 }, ${f(t + 0.1)});`,
    `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { rotation: (i) => (i ? -14 : 14), svgOrigin: "200 166", duration: 0.25 }, ${f(t)});`,
    `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.3 }, ${f(t)});`,
    `tl.fromTo("#${p} svg", { x: 0 }, { x: -24, duration: 0.3, ease: "power2.out", immediateRender: false }, ${f(t + 0.4)});`,
    // vung tay gạt đi
    `tl.to("#${p}-tay-phai", { rotation: -100, duration: 0.14, ease: "power3.out" }, ${f(t + 0.75)});`,
    `tl.to("#${p}-cang-phai", { rotation: 0, duration: 0.14 }, ${f(t + 0.75)});`,
    `tl.to("#${p} svg", { x: 18, duration: 0.2, ease: "power2.out" }, ${f(t + 0.75)});`,
    ...chongNanh(p, t + 1.15),
    // dang rộng hai tay từ chối
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 70 : -70), duration: 0.25, ease: "back.out(1.6)" }, ${f(t + dd * 0.55)});`,
    `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? 20 : -20), duration: 0.25 }, ${f(t + dd * 0.55)});`,
    ...chongNanh(p, t + Math.max(1.6, dd - 0.8)),
    `tl.to("#${p} svg", { scaleY: 1.045, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t + Math.max(1.7, dd - 0.7))});`,
    `tl.to("#${p}-gian", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(2, dd))});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-may-trai", "#${p}-may-phai"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(2.1, dd) + 0.05)});`,
    `tl.to("#${p} svg", { x: 0, scaleY: 1, duration: 0.4 }, ${f(t + Math.max(2.1, dd) + 0.05)});`,
  ],
  // Giải thể: ôm tập hồ sơ giải thể trước ngực, cúi nhìn buồn, lùi chậm hai bước, vai trĩu; buông tay — tập hồ sơ rơi
  // xuống sàn (nằm lại đó); giữa chừng tay che nửa mặt; cuối buông thõng hai tay, đầu cúi, mắt nhắm hờ
  giai_the: (p, t, dd) => {
    const roi = t + Math.max(0.9, dd * 0.35)
    return [
      ...vatHien(p, 'ho_so_nguc', t, dd),
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -24 : 30), duration: 0.35 }, ${f(t)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -60 : 80), duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 14, duration: 0.4 }, ${f(t)});`,
      `tl.fromTo("#${p} svg", { x: 0 }, { x: -40, y: 8, duration: ${f(roi - t)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.2)});`,
      // buông tay, hồ sơ rơi xuống sàn
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.3 }, ${f(roi)});`,
      `tl.to("#${p}-vat-ho_so_nguc", { y: 175, rotation: 24, transformOrigin: "50% 50%", duration: 0.45, ease: "power2.in" }, ${f(roi + 0.05)});`,
      // che nửa mặt
      `tl.to("#${p}-tay-phai", { rotation: 34, duration: 0.3 }, ${f(roi + 0.6)});`,
      `tl.to("#${p}-cang-phai", { rotation: 150, duration: 0.3 }, ${f(roi + 0.6)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-cang-phai"], { rotation: 0, duration: 0.35 }, ${f(roi + 1.4)});`,
      `tl.to("#${p}-dau", { rotation: 18, duration: 0.4 }, ${f(roi + 1.4)});`,
      `tl.to("#${p}-mat", { scaleY: 0.35, duration: 0.3 }, ${f(roi + 1.5)});`,
      `tl.to("#${p}-mat", { scaleY: 1, duration: 0.2 }, ${f(t + Math.max(roi - t + 2, dd))});`,
      `tl.to("#${p}-dau", { rotation: 0, duration: 0.35 }, ${f(t + Math.max(roi - t + 2, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, y: 0, duration: 0.45 }, ${f(t + Math.max(roi - t + 2, dd) + 0.05)});`,
    ]
  },
  // Che giấu: xưởng cơ khí với cỗ máy bên cạnh, hai tay chắp sau lưng, bước chậm suy tư, mắt lướt quanh xưởng; giữa chừng
  // dừng, tay phải vuốt khung máy, mắt loé tham vọng, nhếch mép cười bí hiểm; cuối chắp tay sau lưng, nhìn về tương lai
  che_giau: (p, t, dd) => {
    const cham = t + Math.max(1, dd * 0.45)
    return [
      ...vatHien(p, 'xuong_may', t - 0.1, dd + 0.2),
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -70 : 70), duration: 0.4 }, ${f(t)});`,
      `tl.fromTo("#${p} svg", { x: -70 }, { x: 10, duration: ${f(cham - t)}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      `tl.fromTo(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: 0 }, { rotation: (i) => (i ? -6 : 6), duration: 0.4, yoyo: true, repeat: ${solan(cham - t, 0.4)}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      `tl.fromTo("#${p}-dau", { rotation: -6 }, { rotation: 8, duration: 0.8, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      // vuốt khung máy, mắt loé, nhếch mép
      `tl.to("#${p}-tay-phai", { rotation: -46, duration: 0.4, ease: "sine.out" }, ${f(cham)});`,
      `tl.to("#${p}-cang-phai", { rotation: 12, duration: 0.4 }, ${f(cham)});`,
      `tl.fromTo("#${p}-cang-phai", { rotation: 12 }, { rotation: 24, duration: 0.4, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false }, ${f(cham + 0.45)});`,
      `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { rotation: (i) => (i ? -10 : 10), svgOrigin: "200 166", duration: 0.25 }, ${f(cham + 0.5)});`,
      `tl.to("#${p}-dau", { rotation: -5, duration: 0.3 }, ${f(cham + 0.5)});`,
      `tl.to("#${p}-tay-phai", { rotation: 70, duration: 0.4 }, ${f(t + Math.max(cham - t + 1.4, dd - 0.6))});`,
      `tl.to("#${p}-cang-phai", { rotation: 0, duration: 0.4 }, ${f(t + Math.max(cham - t + 1.4, dd - 0.6))});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-may-trai", "#${p}-may-phai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(cham - t + 1.8, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(cham - t + 1.8, dd) + 0.05)});`,
    ]
  },
  // Chiến tranh bùng nổ: khói lửa bốc lên từ mặt đất sau lưng và lan rộng; người cúi lo âu, giật mình lùi nửa bước, hai tay
  // vung lên che ngực; giữa chừng quay nhìn ngọn lửa, người run; cuối co tay sát ngực, mắt trừng lớn hoảng sợ
  chien_tranh_bung_no: (p, t, dd) => [
    ...vatHien(p, 'khoi_lua', t, dd + 0.2),
    `tl.fromTo("#${p}-vat-khoi_lua", { scaleY: 0.35, transformOrigin: "50% 100%" }, { scaleY: 1, duration: ${f(Math.max(1, dd * 0.6))}, ease: "power1.out", immediateRender: false }, ${f(t + 0.1)});`,
    `tl.fromTo("#${p}-vat-khoi_lua", { scaleX: 0.96 }, { scaleX: 1.04, duration: 0.18, yoyo: true, repeat: ${solan(Math.max(0.8, dd), 0.18)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
    `tl.to("#${p}-dau", { rotation: 12, duration: 0.3 }, ${f(t)});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -16 : 18), duration: 0.3 }, ${f(t)});`,
    `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -40 : 46), duration: 0.3 }, ${f(t)});`,
    // giật mình lùi, tay che ngực
    `tl.fromTo("#${p} svg", { x: 0 }, { x: -34, duration: 0.2, ease: "power3.out", immediateRender: false }, ${f(t + 0.6)});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -30 : 36), duration: 0.2, ease: "power3.out" }, ${f(t + 0.6)});`,
    `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -120 : 120), duration: 0.2, ease: "power3.out" }, ${f(t + 0.6)});`,
    `tl.to("#${p}-dau", { rotation: -8, duration: 0.25 }, ${f(t + 0.6)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.25 }, ${f(t + 0.7)});`,
    // quay nhìn ngọn lửa, run
    `tl.to("#${p}-dau", { rotation: 6, duration: 0.4 }, ${f(t + dd * 0.5)});`,
    `tl.fromTo("#${p} svg", { x: -34 }, { x: -30, duration: 0.06, yoyo: true, repeat: 9, ease: "none", immediateRender: false }, ${f(t + dd * 0.5)});`,
    `tl.to("#${p}-mat", { scale: 1.15, svgOrigin: "200 188", duration: 0.25 }, ${f(t + Math.max(1.5, dd - 0.7))});`,
    `tl.to("#${p}-mat", { scale: 1, duration: 0.25 }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(1.9, dd))});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
    `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
  ],
  // Chiếc xe đầu tiên ra đời: chiếc xe phủ tấm bạt bên cạnh, tay phải nắm mép bạt; giật mạnh tay lên — tấm bạt bay vút
  // đi, chiếc xe đỏ hiện ra; giữa chừng chớp mắt ngạc nhiên, cười rạng rỡ, hai tay đan trước ngực; cuối dang nhẹ tay ngắm xe
  ra_doi_xe: (p, t, dd) => {
    const keo = t + Math.min(0.9, dd * 0.25)
    return [
      ...vatHien(p, 'xe_co', t - 0.1, dd + 0.2), ...vatHien(p, 'vai_bat', t - 0.1, keo - t + 0.8),
      `tl.to("#${p}-tay-phai", { rotation: -42, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-cang-phai", { rotation: 16, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 6, duration: 0.3 }, ${f(t)});`,
      // giật bạt
      `tl.to("#${p}-tay-phai", { rotation: -160, duration: 0.22, ease: "power3.out" }, ${f(keo)});`,
      `tl.to("#${p}-cang-phai", { rotation: 0, duration: 0.22 }, ${f(keo)});`,
      `tl.to("#${p}-vat-vai_bat", { y: -260, x: 120, rotation: 24, scale: 0.8, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.out" }, ${f(keo + 0.05)});`,
      `tl.fromTo("#${p} svg", { x: 0 }, { x: -24, duration: 0.3, ease: "power2.out", immediateRender: false }, ${f(keo)});`,
      // ngạc nhiên, cười, tay đan trước ngực
      `tl.to("#${p}-mat", { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1 }, ${f(keo + 0.7)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -24 : 32), duration: 0.3 }, ${f(keo + 0.85)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -70 : 96), duration: 0.3 }, ${f(keo + 0.85)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(keo + 0.85)});`,
      `tl.to("#${p}-dau", { rotation: -5, duration: 0.3 }, ${f(keo + 0.85)});`,
      // dang nhẹ tay ngắm xe
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 26 : -30), duration: 0.35 }, ${f(t + Math.max(keo - t + 1.8, dd - 0.6))});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(keo - t + 1.8, dd - 0.6))});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(keo - t + 2.2, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(keo - t + 2.2, dd) + 0.05)});`,
    ]
  },
  lai_xe_may: (p, t, dd) => {
    const chay = Math.max(1, Math.min(dd - 0.6, 3.2))
    const gio = t + chay * 0.5
    return [
      ...vatHien(p, 'xe_may', t, dd), ...vatHien(p, 'khoi_xe', t, chay),
      `tl.set("#${p} svg", { y: -52 }, ${f(t)});`,
      `tl.set(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => [70, 78, -70, -80][i] }, ${f(t)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 54 : 60), duration: 0.25 }, ${f(t)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: -14, duration: 0.25 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: -4, duration: 0.25 }, ${f(t)});`,
      // chạy từ phải sang trái, chậm dần rồi dừng giữa khung
      `tl.fromTo("#${p} svg", { x: 330 }, { x: 0, duration: ${f(chay)}, ease: "power1.out", immediateRender: false }, ${f(t)});`,
      `tl.fromTo("#${p}-vat-xe_may .banh-truoc", { rotation: 0, svgOrigin: "20 80" }, { rotation: -1440, svgOrigin: "20 80", duration: ${f(chay)}, ease: "power1.out", immediateRender: false }, ${f(t)});`,
      `tl.fromTo("#${p}-vat-xe_may .banh-sau", { rotation: 0, svgOrigin: "78 80" }, { rotation: -1440, svgOrigin: "78 80", duration: ${f(chay)}, ease: "power1.out", immediateRender: false }, ${f(t)});`,
      `tl.fromTo("#${p}-vat-khoi_xe", { scale: 0.5, x: 0, opacity: 0.9, transformOrigin: "30% 60%" }, { scale: 1.3, x: 40, opacity: 0, duration: 0.45, repeat: ${Math.max(1, Math.floor(chay / 0.45) - 1)}, ease: "power1.out", immediateRender: false }, ${f(t + 0.1)});`,
      // gờ giảm tốc: nhún xuống rồi nảy lên
      `tl.to("#${p} svg", { y: -44, duration: 0.09, ease: "power2.in" }, ${f(gio)});`,
      `tl.to("#${p} svg", { y: -62, duration: 0.12, ease: "power2.out" }, ${f(gio + 0.09)});`,
      `tl.to("#${p} svg", { y: -52, duration: 0.16, ease: "sine.inOut" }, ${f(gio + 0.21)});`,
      // dừng, gạt chân chống
      `tl.fromTo("#${p}-vat-xe_may .chan-chong", { attr: { d: "M52 70 L52 70" } }, { attr: { d: "M52 70 L46 84" }, duration: 0.2, immediateRender: false }, ${f(t + chay + 0.05)});`,
      `tl.to("#${p}-dau", { rotation: 2, duration: 0.3 }, ${f(t + chay + 0.1)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai", "#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(chay + 0.4, dd) + 0.05)});`,
      `tl.to("#${p} svg", { y: 0, duration: 0.3 }, ${f(t + Math.max(chay + 0.4, dd) + 0.05)});`,
    ]
  },
  // Bước vào xưởng: tay phải cầm tờ hợp đồng gấp đôi, bước đều từ trái vào (máy dựng lo dáng nghiêng + bước chân), bàn xưởng
  // bên cạnh; tới nơi quay ra, gật đầu chào, mỉm cười, giơ hợp đồng lên trước ngực
  buoc_vao: (p, t, dd) => {
    const di = Math.min(Math.max(1, dd - 1.2), 2.4)
    return [
      ...vatHien(p, 'hop_dong', t, dd), ...vatHien(p, 'ban_xuong', t - 0.1, dd + 0.2),
      `tl.fromTo("#${p} svg", { x: -120 }, { x: 40, duration: ${f(di)}, ease: "sine.out", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: -4, duration: 0.3 }, ${f(t)});`,
      // tới nơi: giơ hợp đồng lên ngực, gật đầu chào, mỉm cười
      `tl.to("#${p}-tay-phai", { rotation: 30, duration: 0.35, ease: "sine.out" }, ${f(t + di + 0.25)});`,
      `tl.to("#${p}-cang-phai", { rotation: 105, duration: 0.35 }, ${f(t + di + 0.25)});`,
      `tl.to("#${p}-tay-trai", { rotation: -22, duration: 0.35 }, ${f(t + di + 0.25)});`,
      `tl.to("#${p}-cang-trai", { rotation: -70, duration: 0.35 }, ${f(t + di + 0.25)});`,
      `tl.to("#${p}-dau", { rotation: 9, duration: 0.2, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + di + 0.45)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + di + 0.45)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-cang-phai", "#${p}-tay-trai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(di + 1.2, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.45, ease: "power1.inOut" }, ${f(t + Math.max(di + 1.2, dd) + 0.05)});`,
    ]
  },
  // Nhường ghế chủ tịch: ghế lưng cao bọc da cạnh người, hai tay nắm lưng ghế, mặt hơi cúi lưu luyến; đẩy ghế tới từng
  // bước nhỏ (người chồm theo), giữa chừng dừng hít sâu rồi đẩy tiếp tới giữa; cuối buông tay, đứng thẳng, quay sang mỉm cười
  nhuong_vi_tri: (p, t, dd) => {
    const ket = t + Math.max(1.6, dd - 0.9)
    const giua = t + (ket - t) * 0.5
    const day = (a, b, x0, x1) => (b - a < 0.4 ? [] : [
      `tl.fromTo("#${p} svg", { x: ${x0} }, { x: ${x1}, duration: ${f(b - a)}, ease: "sine.inOut", immediateRender: false }, ${f(a)});`,
      `tl.fromTo("#${p} svg", { rotation: 0, transformOrigin: "50% 100%" }, { rotation: 3, duration: ${f((b - a) / 2)}, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false }, ${f(a)});`,
      `tl.fromTo(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: 0 }, { rotation: (i) => (i ? -6 : 6), duration: ${f((b - a) / 4)}, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, ${f(a)});`,
    ])
    return [
      ...vatHien(p, 'ghe_ct', t - 0.1, dd + 0.2),
      `tl.to("#${p}-tay-phai", { rotation: 16, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-cang-phai", { rotation: 26, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: -30, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -60, duration: 0.35 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 11, duration: 0.4 }, ${f(t)});`,
      ...day(t + 0.35, giua, -60, 0),
      // dừng, hít một hơi sâu
      `tl.to("#${p} svg", { scaleY: 1.035, duration: 0.35, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(giua + 0.05)});`,
      ...day(giua + 0.8, ket, 0, 60),
      // buông ghế, đứng thẳng, quay sang mỉm cười
      `tl.to(["#${p}-tay-phai", "#${p}-cang-phai", "#${p}-tay-trai", "#${p}-cang-trai"], { rotation: 0, duration: 0.4 }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: -7, duration: 0.5, ease: "sine.inOut" }, ${f(ket + 0.15)});`,
      `tl.to("#${p}-mat", { x: -6, duration: 0.4 }, ${f(ket + 0.15)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(ket + 0.15)});`,
      `tl.to("#${p}-mat", { x: 0, duration: 0.3 }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
      `tl.to("#${p}-dau", { rotation: 0, duration: 0.35 }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5, ease: "power1.inOut" }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
    ]
  },
  // Đóng dấu: cuốn sổ trước người, tay phải cầm con dấu gỗ, nhấc lên rồi dập xuống trang sổ hai lần (lần sau hiện vết dấu
  // đỏ), nghiêng đầu ngắm, cười tinh nghịch
  dong_dau: (p, t, dd) => {
    const dap = (a) => [
      `tl.to("#${p}-tay-phai", { rotation: 34, duration: 0.2, ease: "sine.out" }, ${f(a)});`,
      `tl.to("#${p}-cang-phai", { rotation: 60, duration: 0.2 }, ${f(a)});`,
      `tl.to("#${p}-tay-phai", { rotation: 26, duration: 0.09, ease: "power3.in" }, ${f(a + 0.25)});`,
      `tl.to("#${p}-cang-phai", { rotation: 30, duration: 0.09, ease: "power3.in" }, ${f(a + 0.25)});`,
    ]
    return [
      ...vatHien(p, 'so_hoc', t, dd), ...vatHien(p, 'con_dau', t, dd),
      `tl.to("#${p}-tay-trai", { rotation: -20, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -50, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 10, duration: 0.3 }, ${f(t)});`,
      ...dap(t + 0.3), ...dap(t + 0.85),
      ...vatHien(p, 'dau_do', t + 1.2, Math.max(0.6, dd - 1.2)),
      `tl.to("#${p}-tay-phai", { rotation: 10, duration: 0.3 }, ${f(t + 1.3)});`,
      `tl.to("#${p}-cang-phai", { rotation: 40, duration: 0.3 }, ${f(t + 1.3)});`,
      `tl.to("#${p}-dau", { rotation: -6, duration: 0.35 }, ${f(t + 1.4)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t + 1.4)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-cang-phai", "#${p}-tay-trai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(1.9, dd) + 0.05)});`,
    ]
  },
  chong_gay: (p, t, dd) => {
    const nghi = dd > 3 ? t + dd * 0.42 : 0
    const ket = t + Math.max(1.4, dd - 0.9)
    const nhip = 0.55
    const doan = (a, b, x0, x1) => (b - a < 0.5 ? [] : [
      `tl.fromTo("#${p} svg", { x: ${x0} }, { x: ${x1}, duration: ${f(b - a)}, ease: "none", immediateRender: false }, ${f(a)});`,
      ...buocChan(p, a, b - a, nhip),
      // gậy nhấc lên, chống xuống theo nhịp bước
      `tl.fromTo("#${p}-tay-phai", { rotation: 6 }, { rotation: -6, duration: ${f(nhip)}, yoyo: true, repeat: ${solan(b - a, nhip)}, ease: "sine.inOut", immediateRender: false }, ${f(a)});`,
      `tl.fromTo("#${p} svg", { y: 6 }, { y: 10, duration: ${f(nhip)}, yoyo: true, repeat: ${solan(b - a, nhip)}, ease: "sine.inOut", immediateRender: false }, ${f(a)});`,
    ])
    const giuaX = nghi ? -70 + 150 * ((nghi - t) / (ket - t)) : 80
    return [
      ...vatHien(p, 'gay_chong', t, dd), ...vatHien(p, 'cua_so', t - 0.1, dd + 0.2),
      `tl.to("#${p}-dau", { rotation: 10, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-cang-phai", { rotation: 10, duration: 0.3 }, ${f(t)});`,
      ...doan(t + 0.15, nghi || ket, -70, nghi ? giuaX : 80),
      ...(nghi ? [
        // tựa gậy thở dốc
        `tl.to("#${p} svg", { y: 14, duration: 0.3 }, ${f(nghi)});`,
        `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(nghi + 0.1)});`,
        `tl.to("#${p}-dau", { rotation: 16, duration: 0.3, yoyo: true, repeat: 1 }, ${f(nghi + 0.1)});`,
        ...doan(nghi + 1.1, ket, giuaX, 80),
      ] : []),
      // dừng hẳn, chống gậy, nhìn sang cửa sổ
      `tl.to("#${p} svg", { y: 6, duration: 0.3 }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: -8, duration: 0.6, ease: "sine.inOut" }, ${f(ket + 0.1)});`,
      `tl.to("#${p}-mat", { x: 7, duration: 0.5 }, ${f(ket + 0.1)});`,
      `tl.to("#${p}-mat", { x: 0, duration: 0.3 }, ${f(t + Math.max(1.6, dd) + 0.05)});`,
      `tl.to(["#${p}-dau", "#${p}-tay-phai", "#${p}-cang-phai"], { rotation: 0, duration: 0.4 }, ${f(t + Math.max(1.6, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, y: 0, duration: 0.5, ease: "power1.inOut" }, ${f(t + Math.max(1.6, dd) + 0.05)});`,
    ]
  },
  ngoi_lang_le: (p, t, dd) => {
    const giua = t + dd * 0.45
    const ket = t + Math.max(1.2, dd - 1)
    return [
      ...vatHien(p, 'giuong', t - 0.15, dd + 0.3), ...vatHien(p, 'ghe_go', t - 0.1, dd + 0.2),
      `tl.to("#${p} svg", { y: 32, duration: 0.5, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => [40, -40, -40, 40][i], duration: 0.5, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -6 : 8), duration: 0.5 }, ${f(t)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -16 : 14), duration: 0.5 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 14, duration: 0.7, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p}-goc-than", { scaleX: 0.95, svgOrigin: "200 400", duration: 0.6 }, ${f(t + 0.2)});`,
      `tl.fromTo("#${p} svg", { scaleY: 1 }, { scaleY: 1.022, duration: 1.1, yoyo: true, repeat: ${solan(Math.max(1.2, dd - 0.6), 1.1)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.55)});`,
      // ngẩng nhẹ, chớp mắt, rủ xuống
      `tl.to("#${p}-dau", { rotation: 4, duration: 0.6, ease: "sine.inOut" }, ${f(giua)});`,
      `tl.to("#${p}-mat", { scaleY: 0.1, duration: 0.08, yoyo: true, repeat: 1 }, ${f(giua + 0.6)});`,
      `tl.to("#${p}-dau", { rotation: 12, duration: 0.7, ease: "sine.inOut" }, ${f(giua + 0.9)});`,
      // nhìn xa xăm về góc phòng
      `tl.to("#${p}-dau", { rotation: -7, duration: 0.8, ease: "sine.inOut" }, ${f(ket)});`,
      `tl.to("#${p}-mat", { x: -6, duration: 0.6 }, ${f(ket)});`,
      `tl.to("#${p}-mat", { x: 0, duration: 0.3 }, ${f(t + Math.max(1.4, dd) + 0.05)});`,
      `tl.to("#${p}-goc-than", { scaleX: 1, duration: 0.4 }, ${f(t + Math.max(1.4, dd) + 0.05)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai", "#${p}-cang-trai", "#${p}-cang-phai", "#${p}-tay-phai", "#${p}-tay-trai", "#${p}-dau"], { rotation: 0, duration: 0.45 }, ${f(t + Math.max(1.4, dd) + 0.05)});`,
      `tl.to("#${p} svg", { y: 0, duration: 0.45, ease: "sine.inOut" }, ${f(t + Math.max(1.4, dd) + 0.05)});`,
    ]
  },
  // Bước qua màn sương thời gian: sương trắng trôi dưới chân, bước đều từ trái sang phải (máy dựng lo dáng nghiêng + bước
  // chân), giữa chừng tay phải đưa lên ngang ngực gạt sương; cuối dừng lại, ngoảnh nhìn về phía đã đi qua, mặt hoài niệm
  buoc_qua_suong: (p, t, dd) => {
    const di = Math.min(Math.max(1.2, dd - 0.6), 2.6)
    return [
      ...vatHien(p, 'suong', t - 0.2, dd + 0.4),
      `tl.fromTo("#${p}-vat-suong", { x: -40 }, { x: 40, duration: ${f(dd + 0.4)}, ease: "none", immediateRender: false }, ${f(t - 0.2)});`,
      `tl.fromTo("#${p} svg", { x: -60 }, { x: 110, duration: ${f(di)}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p} svg", { y: -6, duration: 0.32, yoyo: true, repeat: ${solan(di, 0.32)}, ease: "sine.inOut" }, ${f(t)});`,
      // gạt sương
      `tl.to("#${p}-tay-phai", { rotation: 38, duration: 0.35, ease: "sine.out" }, ${f(t + di * 0.45)});`,
      `tl.to("#${p}-cang-phai", { rotation: 80, duration: 0.35 }, ${f(t + di * 0.45)});`,
      `tl.to("#${p}-tay-phai", { rotation: -20, duration: 0.45, ease: "sine.inOut" }, ${f(t + di * 0.45 + 0.4)});`,
      `tl.to("#${p}-cang-phai", { rotation: 10, duration: 0.45 }, ${f(t + di * 0.45 + 0.4)});`,
      `tl.to("#${p}-tay-phai", { rotation: 0, duration: 0.3 }, ${f(t + di * 0.45 + 0.9)});`,
      // dừng, ngoảnh nhìn lại
      `tl.to("#${p}-dau", { rotation: -9, duration: 0.6, ease: "sine.inOut" }, ${f(t + di + 0.15)});`,
      `tl.to("#${p}-mat", { x: -7, duration: 0.5 }, ${f(t + di + 0.15)});`,
      `tl.to("#${p}-mat", { x: 0, duration: 0.3 }, ${f(t + Math.max(di + 0.8, dd) + 0.05)});`,
      `tl.to(["#${p}-dau", "#${p}-cang-phai"], { rotation: 0, duration: 0.4 }, ${f(t + Math.max(di + 0.8, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5, ease: "power1.inOut" }, ${f(t + Math.max(di + 0.8, dd) + 0.05)});`,
    ]
  },
  // Nắm tay con trai: giường bệnh có cậu bé nằm bên cạnh, người cha khom người nghiêng về phía giường, tay vươn ra nắm bàn
  // tay nhỏ trên chăn, siết nhẹ theo nhịp nói, đầu gật động viên; giữa chừng cúi thấp hơn; cuối nắm chặt lần cuối, mỉm cười,
  // gật đầu quả quyết
  nam_tay: (p, t, dd) => {
    const ket = t + Math.max(1.3, dd - 0.9)
    return [
      ...vatHien(p, 'giuong_benh', t - 0.15, dd + 0.3),
      `tl.to("#${p} svg", { y: 30, rotation: 11, transformOrigin: "50% 100%", duration: 0.5, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to(["#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => (i ? 14 : -14), duration: 0.5 }, ${f(t)});`,
      `tl.to("#${p}-tay-phai", { rotation: -44, duration: 0.5, ease: "sine.out" }, ${f(t)});`,
      `tl.to("#${p}-cang-phai", { rotation: 8, duration: 0.5 }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: -14, duration: 0.5 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -45, duration: 0.5 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 14, duration: 0.5 }, ${f(t)});`,
      // siết tay, gật đầu theo nhịp nói
      `tl.fromTo("#${p}-cang-phai", { rotation: 8 }, { rotation: 0, duration: 0.3, yoyo: true, repeat: ${solan(Math.max(0.6, ket - t - 0.6), 0.3)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.6)});`,
      `tl.fromTo("#${p}-dau", { rotation: 14 }, { rotation: 20, duration: 0.45, yoyo: true, repeat: ${solan(Math.max(0.9, ket - t - 0.6), 0.45)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.6)});`,
      // cúi thấp hơn giữa chừng
      `tl.to("#${p} svg", { y: 38, rotation: 13, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + dd * 0.4)});`,
      // nắm chặt lần cuối, cười, gật quả quyết
      `tl.to("#${p}-cang-phai", { rotation: 16, duration: 0.15, yoyo: true, repeat: 1 }, ${f(ket)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: 4, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, ${f(ket + 0.35)});`,
      `tl.to(["#${p}-ong-trai", "#${p}-ong-phai", "#${p}-tay-phai", "#${p}-cang-phai", "#${p}-tay-trai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.45 }, ${f(t + Math.max(1.5, dd) + 0.05)});`,
      `tl.to("#${p} svg", { y: 0, rotation: 0, duration: 0.45, ease: "sine.inOut" }, ${f(t + Math.max(1.5, dd) + 0.05)});`,
    ]
  },
  // Đứng trên tàu nhìn bờ biển Mỹ: bờ biển New York + tượng Nữ thần Tự do phía xa, lan can gỗ trước bụng, hai tay đặt lên
  // lan can, người tròng trành theo sóng, đầu quay chậm trái – phải ngắm, tóc bay trong gió; giữa chừng sửa cổ áo; cuối ngước
  // nhìn, hé cười đầy hoài bão
  nhin_bien: (p, t, dd) => {
    const giua = t + dd * 0.45
    const ket = t + Math.max(1.3, dd - 0.9)
    return [
      ...vatHien(p, 'bo_bien', t - 0.2, dd + 0.4), ...vatHien(p, 'lan_can', t, dd),
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -14 : 16), duration: 0.4 }, ${f(t)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -36 : 38), duration: 0.4 }, ${f(t)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: (i) => (i ? -6 : 6), duration: 0.4 }, ${f(t)});`,
      `tl.fromTo("#${p} svg", { rotation: -2, transformOrigin: "50% 100%" }, { rotation: 2, duration: 1, yoyo: true, repeat: ${solan(Math.max(1, dd - 0.4), 1)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.3)});`,
      `tl.fromTo("#${p}-dau", { rotation: -6 }, { rotation: 6, duration: 1.3, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.3)});`,
      `tl.fromTo("#${p}-goc-toc", { x: 0 }, { x: -5, duration: 0.25, yoyo: true, repeat: ${solan(Math.max(0.6, dd - 0.4), 0.25)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.3)});`,
      // sửa cổ áo
      `tl.to("#${p}-tay-phai", { rotation: 32, duration: 0.3 }, ${f(giua)});`,
      `tl.to("#${p}-cang-phai", { rotation: 150, duration: 0.3 }, ${f(giua)});`,
      `tl.to("#${p}-cang-phai", { rotation: 140, duration: 0.12, yoyo: true, repeat: 3 }, ${f(giua + 0.32)});`,
      `tl.to("#${p}-tay-phai", { rotation: 16, duration: 0.3 }, ${f(giua + 0.85)});`,
      `tl.to("#${p}-cang-phai", { rotation: 38, duration: 0.3 }, ${f(giua + 0.85)});`,
      // ngước nhìn, hé cười
      `tl.to("#${p}-dau", { rotation: -7, duration: 0.5, ease: "sine.out" }, ${f(ket)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(ket)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-chan-trai", "#${p}-chan-phai", "#${p}-dau"], { rotation: 0, duration: 0.4 }, ${f(t + Math.max(1.5, dd) + 0.05)});`,
    ]
  },
  // Vỗ vai giao bản vẽ: người nhận (Tesla, nhìn từ phía sau) đứng cạnh; bước tới nửa bước, tay vươn sang vỗ vai hai cái,
  // rồi cầm cuộn bản vẽ đưa ra trao (bản vẽ chuyển sang tay người nhận); giữa chừng nhướng mày cười nửa miệng; cuối hai tay
  // chống nạnh, ngẩng cao đầu ra lệnh
  vo_vai: (p, t, dd) => {
    const trao = t + Math.min(1.5, Math.max(1.1, dd * 0.35))
    const ket = t + Math.max(trao - t + 1, dd - 0.9)
    return [
      ...vatHien(p, 'nguoi_nhan', t - 0.2, dd + 0.4), ...vatHien(p, 'ban_ve', t, trao - t - 0.25),
      `tl.fromTo("#${p} svg", { x: 0 }, { x: 34, duration: 0.45, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: -5, duration: 0.4 }, ${f(t)});`,
      // vỗ vai hai cái
      `tl.to("#${p}-tay-phai", { rotation: -86, duration: 0.3, ease: "power2.out" }, ${f(t + 0.35)});`,
      `tl.to("#${p}-cang-phai", { rotation: -12, duration: 0.3 }, ${f(t + 0.35)});`,
      `tl.to("#${p}-cang-phai", { rotation: 14, duration: 0.11, yoyo: true, repeat: 3, ease: "power2.inOut" }, ${f(t + 0.68)});`,
      `tl.to("#${p}-vat-nguoi_nhan", { y: 4, duration: 0.11, yoyo: true, repeat: 3 }, ${f(t + 0.7)});`,
      // đổi cuộn bản vẽ sang tay phải, đưa ra trao
      ...vatHien(p, 'ban_ve_p', trao - 0.3, 0.75),
      `tl.to("#${p}-tay-phai", { rotation: -58, duration: 0.3 }, ${f(trao - 0.3)});`,
      `tl.to("#${p}-cang-phai", { rotation: 4, duration: 0.3 }, ${f(trao - 0.3)});`,
      ...vatHien(p, 'ban_ve_nhan', trao + 0.35, Math.max(0.6, dd - (trao - t) - 0.2)),
      // nhướng mày, cười nửa miệng
      `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { y: (i) => (i ? -8 : -2), duration: 0.25 }, ${f(trao + 0.4)});`,
      `tl.to(["#${p}-may-trai", "#${p}-may-phai"], { y: 0, duration: 0.3 }, ${f(t + Math.max(trao - t + 1.2, dd))});`,
      // chống nạnh, ngẩng cao đầu
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 30 : -30), duration: 0.4 }, ${f(ket)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -42 : 42), duration: 0.4 }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: -7, duration: 0.4 }, ${f(ket)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.4 }, ${f(t + Math.max(trao - t + 1.6, dd) + 0.05)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.4 }, ${f(t + Math.max(trao - t + 1.6, dd) + 0.05)});`,
    ]
  },
  dan_lat: (p, t, dd) => {
    const giua = dd > 2.6 ? t + dd * 0.45 : 0
    const ket = t + Math.max(1.2, dd - 0.8)
    const dan = (a, b) => (b - a > 0.4 ? [
      `tl.fromTo("#${p}-cang-phai", { rotation: 96 }, { rotation: 114, duration: 0.2, yoyo: true, repeat: ${solan(b - a, 0.2)}, ease: "sine.inOut", immediateRender: false }, ${f(a)});`,
      `tl.fromTo("#${p}-vat-kim_dan", { rotation: -8, transformOrigin: "50% 80%" }, { rotation: 10, duration: 0.2, yoyo: true, repeat: ${solan(b - a, 0.2)}, ease: "sine.inOut", immediateRender: false }, ${f(a)});`,
    ] : [])
    return [
      ...vatHien(p, 'ghe_go', t - 0.1, dd + 0.2), ...vatHien(p, 'cuon_len', t, dd), ...vatHien(p, 'kim_dan', t, dd),
      `tl.to("#${p} svg", { y: 32, duration: 0.45, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => [42, -42, -42, 42][i], duration: 0.45, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p}-tay-phai", { rotation: 14, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-cang-phai", { rotation: 100, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: -10, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -55, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 12, duration: 0.45 }, ${f(t)});`,
      ...dan(t + 0.45, giua || ket),
      ...(giua ? [
        `tl.to("#${p}-vat-kim_dan", { opacity: 0, duration: 0.15 }, ${f(giua)});`,
        ...vatHien(p, 'dung_cu', giua + 0.1, 1),
        `tl.to("#${p}-tay-phai", { rotation: -6, duration: 0.3 }, ${f(giua + 0.1)});`,
        `tl.to("#${p}-cang-phai", { rotation: 142, duration: 0.3 }, ${f(giua + 0.1)});`,
        `tl.to("#${p}-dau", { rotation: -4, duration: 0.3 }, ${f(giua + 0.1)});`,
        `tl.to("#${p}-vat-dung_cu", { rotation: 25, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(giua + 0.45)});`,
        `tl.to("#${p}-tay-phai", { rotation: 14, duration: 0.3 }, ${f(giua + 1.1)});`,
        `tl.to("#${p}-cang-phai", { rotation: 100, duration: 0.3 }, ${f(giua + 1.1)});`,
        `tl.to("#${p}-dau", { rotation: 12, duration: 0.3 }, ${f(giua + 1.1)});`,
        `tl.to("#${p}-vat-kim_dan", { opacity: 1, duration: 0.15 }, ${f(giua + 1.15)});`,
        ...dan(giua + 1.4, ket),
      ] : []),
      `tl.to("#${p}-dau", { rotation: -5, duration: 0.45, ease: "sine.out" }, ${f(ket)});`,
      `tl.to("#${p}-cang-phai", { rotation: 80, duration: 0.4 }, ${f(ket)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(ket)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai", "#${p}-cang-trai", "#${p}-cang-phai", "#${p}-dau"], { rotation: 0, duration: 0.4 }, ${f(t + Math.max(1.4, dd) + 0.05)});`,
      `tl.to("#${p} svg", { y: 0, duration: 0.4, ease: "sine.inOut" }, ${f(t + Math.max(1.4, dd) + 0.05)});`,
    ]
  },
  // Đào mương: xẻng dài trong tay phải (lưỡi chạm đất), đứng dạng chân; mỗi nhịp: khom người cắm xẻng xuống, nâng lên,
  // xoay người hất đất sang bên (cục đất bay ra, đống đất bên cạnh cao dần); giữa chừng quệt mồ hôi trán; cuối chống xẻng
  // đứng thẳng thở dốc
  dao_dat: (p, t, dd) => {
    const giua = dd > 3.4 ? t + dd * 0.5 : 0
    const ket = t + Math.max(1.4, dd - 0.9)
    const nhip = 1.1
    const ra = [
      ...vatHien(p, 'xeng', t, dd), ...vatHien(p, 'dong_dat', t, dd + 0.3),
      `tl.fromTo("#${p}-vat-dong_dat", { scaleY: 0.45, transformOrigin: "50% 100%" }, { scaleY: 1, duration: ${f(Math.max(0.6, ket - t - 0.3))}, ease: "none", immediateRender: false }, ${f(t + 0.3)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: (i) => (i ? -13 : 13), duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 10, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: -12, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -40, duration: 0.3 }, ${f(t)});`,
    ]
    ;(VAT_CAN[p] ??= new Set()).add('dat_bay')
    for (let a = t + 0.3; a + nhip <= ket + 0.05; a += nhip) {
      if (giua && a + nhip > giua && a < giua + 0.9) continue
      ra.push(
        `tl.to("#${p} svg", { y: 22, duration: 0.25, ease: "power2.in" }, ${f(a)});`,
        `tl.to(["#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => (i ? 16 : -16), duration: 0.25 }, ${f(a)});`,
        `tl.to("#${p}-tay-phai", { rotation: 6, duration: 0.25 }, ${f(a)});`,
        `tl.to("#${p}-cang-phai", { rotation: 18, duration: 0.25 }, ${f(a)});`,
        `tl.to("#${p} svg", { y: 6, rotation: -5, duration: 0.3, ease: "power2.out" }, ${f(a + 0.4)});`,
        `tl.to(["#${p}-ong-trai", "#${p}-ong-phai"], { rotation: 0, duration: 0.3 }, ${f(a + 0.4)});`,
        `tl.to("#${p}-tay-phai", { rotation: -38, duration: 0.3, ease: "power2.out" }, ${f(a + 0.4)});`,
        `tl.to("#${p}-cang-phai", { rotation: 46, duration: 0.3 }, ${f(a + 0.4)});`,
        `tl.fromTo("#${p}-vat-dat_bay", { opacity: 1, x: 0, y: 0, scale: 0.8, transformOrigin: "50% 50%" }, { opacity: 0, x: 70, y: 150, scale: 1.1, duration: 0.5, ease: "power1.in", immediateRender: false }, ${f(a + 0.6)});`,
        `tl.to("#${p} svg", { y: 0, rotation: 0, duration: 0.3 }, ${f(a + 0.75)});`,
        `tl.to("#${p}-tay-phai", { rotation: 0, duration: 0.3 }, ${f(a + 0.75)});`,
        `tl.to("#${p}-cang-phai", { rotation: 0, duration: 0.3 }, ${f(a + 0.75)});`,
      )
    }
    if (giua) ra.push(
      `tl.to("#${p}-tay-trai", { rotation: 150, duration: 0.3 }, ${f(giua)});`,
      `tl.to("#${p}-cang-trai", { rotation: -105, duration: 0.3 }, ${f(giua)});`,
      `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.25 }, ${f(giua)});`,
      `tl.to("#${p}-tay-trai", { rotation: -12, duration: 0.3 }, ${f(giua + 0.6)});`,
      `tl.to("#${p}-cang-trai", { rotation: -40, duration: 0.3 }, ${f(giua + 0.6)});`,
    )
    ra.push(
      `tl.to("#${p}-tay-phai", { rotation: 12, duration: 0.35 }, ${f(ket)});`,
      `tl.to("#${p}-cang-phai", { rotation: 30, duration: 0.35 }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: -3, duration: 0.4 }, ${f(ket)});`,
      `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(ket)});`,
      `tl.to("#${p} svg", { scaleY: 1.035, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(ket + 0.1)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai", "#${p}-cang-trai", "#${p}-cang-phai", "#${p}-dau"], { rotation: 0, duration: 0.35 }, ${f(t + Math.max(1.6, dd) + 0.05)});`,
      `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(1.6, dd))});`,
    )
    return ra
  },
  // Cho chim bồ câu ăn: hai con bồ câu dưới đất trước mặt, khom người, tay trái cầm bó thóc bên hông, tay phải vốc hạt
  // rắc ra (hạt rơi xuống đất), chim mổ hạt; mắt nhìn chim, mỉm cười hiền; cuối đứng thẳng lại
  cho_chim_an: (p, t, dd) => {
    const ket = t + Math.max(1.4, dd - 0.6)
    const ra = [
      ...vatHien(p, 'chim_1', t, dd + 0.2), ...vatHien(p, 'chim_2', t + 0.25, dd), ...vatHien(p, 'tui_hat', t, dd),
      `tl.to("#${p} svg", { y: 14, duration: 0.4, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to(["#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => (i ? 12 : -12), duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 14, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: 14, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -30, duration: 0.4 }, ${f(t)});`,
      `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.4 }, ${f(t + 0.3)});`,
      `tl.fromTo(["#${p}-vat-chim_1", "#${p}-vat-chim_2"], { rotation: 0, transformOrigin: "30% 90%" }, { rotation: -22, duration: 0.18, yoyo: true, repeat: ${solan(Math.max(0.6, dd - 0.6), 0.18)}, stagger: 0.09, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.6)});`,
    ]
    ;(VAT_CAN[p] ??= new Set()).add('hat')
    for (let a = t + 0.45; a + 1 <= ket + 0.1; a += 1.15)
      ra.push(
        `tl.to("#${p}-tay-phai", { rotation: 12, duration: 0.2 }, ${f(a)});`,
        `tl.to("#${p}-cang-phai", { rotation: 70, duration: 0.2 }, ${f(a)});`,
        `tl.to("#${p}-tay-phai", { rotation: -34, duration: 0.25, ease: "power2.out" }, ${f(a + 0.3)});`,
        `tl.to("#${p}-cang-phai", { rotation: 8, duration: 0.25, ease: "power2.out" }, ${f(a + 0.3)});`,
        `tl.fromTo("#${p}-vat-hat", { opacity: 1, x: 0, y: 0 }, { opacity: 0, x: 30, y: 130, duration: 0.6, ease: "power1.in", immediateRender: false }, ${f(a + 0.42)});`,
      )
    ra.push(
      `tl.to(["#${p}-ong-trai", "#${p}-ong-phai", "#${p}-cang-trai", "#${p}-cang-phai", "#${p}-tay-phai", "#${p}-dau"], { rotation: 0, duration: 0.45 }, ${f(ket)});`,
      `tl.to("#${p} svg", { y: 0, duration: 0.45, ease: "sine.inOut" }, ${f(ket)});`,
    )
    return ra
  },
  // Xé tài liệu đầu tư: hai tay cầm hai mép tờ giấy trước ngực, người chồm tới, mắt trợn giận; giật mạnh hai tay ra hai
  // bên — tờ giấy rách đôi, mảnh vụn rơi lả tả; hất nửa bên phải xuống sàn, nửa trái rơi theo; cuối đứng thẳng, hai nắm
  // tay buông thõng, ngực phồng lên tức tối
  xe_tai_lieu: (p, t, dd) => {
    const xe = t + Math.min(0.8, Math.max(0.5, dd * 0.2))
    const ket = t + Math.max(1.9, dd - 0.8)
    ;(VAT_CAN[p] ??= new Set()).add('manh_giay')
    return [
      ...vatHien(p, 'giay_trai', t, Math.max(1.6, xe + 1.3 - t)), ...vatHien(p, 'giay_phai', t, Math.max(1.6, xe + 1.0 - t)),
      `tl.to("#${p}-tay-phai", { rotation: 34, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-cang-phai", { rotation: 66, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: -26, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -60, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p} svg", { y: 10, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 9, duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-gian", { opacity: 1, duration: 0.2 }, ${f(t + 0.2)});`,
      `tl.fromTo(["#${p}-vat-giay_trai", "#${p}-vat-giay_phai"], { x: 0 }, { x: (i) => (i ? 3 : -3), duration: 0.06, yoyo: true, repeat: 5, ease: "sine.inOut", immediateRender: false }, ${f(xe - 0.36)});`,
      // giật rách đôi
      `tl.to("#${p}-vat-giay_trai", { x: -78, rotation: -22, transformOrigin: "50% 50%", duration: 0.18, ease: "power3.out" }, ${f(xe)});`,
      `tl.to("#${p}-vat-giay_phai", { x: 78, rotation: 22, transformOrigin: "50% 50%", duration: 0.18, ease: "power3.out" }, ${f(xe)});`,
      `tl.to("#${p}-tay-phai", { rotation: -24, duration: 0.18, ease: "power3.out" }, ${f(xe)});`,
      `tl.to("#${p}-cang-phai", { rotation: 40, duration: 0.18 }, ${f(xe)});`,
      `tl.to("#${p}-tay-trai", { rotation: 24, duration: 0.18, ease: "power3.out" }, ${f(xe)});`,
      `tl.to("#${p}-cang-trai", { rotation: -40, duration: 0.18 }, ${f(xe)});`,
      `tl.fromTo("#${p}-vat-manh_giay", { opacity: 1, y: 0, rotation: 0, transformOrigin: "50% 50%" }, { opacity: 0, y: 190, rotation: 40, duration: 1.1, ease: "power1.in", immediateRender: false }, ${f(xe + 0.05)});`,
      // hất nửa phải xuống sàn, nửa trái rơi theo
      `tl.to("#${p}-tay-phai", { rotation: -70, duration: 0.15, ease: "power3.in" }, ${f(xe + 0.55)});`,
      `tl.to("#${p}-vat-giay_phai", { x: 150, y: 230, rotation: 110, duration: 0.45, ease: "power2.in" }, ${f(xe + 0.6)});`,
      `tl.to("#${p}-vat-giay_trai", { y: 220, x: -110, rotation: -80, duration: 0.6, ease: "power2.in" }, ${f(xe + 0.75)});`,
      // đứng thẳng, nắm tay buông thõng, ngực phồng
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 6 : -6), duration: 0.4 }, ${f(ket)});`,
      `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.4 }, ${f(ket)});`,
      `tl.to("#${p} svg", { y: 0, duration: 0.35 }, ${f(ket)});`,
      `tl.to("#${p}-dau", { rotation: -3, duration: 0.35 }, ${f(ket)});`,
      `tl.to("#${p} svg", { scaleY: 1.04, duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(ket + 0.1)});`,
      `tl.to("#${p}-gian", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(2, dd))});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-dau"], { rotation: 0, duration: 0.3 }, ${f(t + Math.max(2.1, dd) + 0.05)});`,
    ]
  },
  // Thắp nến tưởng nhớ: hàng nến dưới đất cạnh người, tay phải nâng đế nến trước ngực, tay trái khum che gió, quầng sáng
  // ấm lung linh; đầu cúi trang nghiêm, nhích từng bước nhỏ; giữa chừng ngọn lửa bập bùng (thổi nhẹ); cuối ngẩng nhìn thẳng,
  // nâng nến ngang ngực
  thap_nen: (p, t, dd) => {
    const giua = t + dd * 0.5
    const ket = t + Math.max(1.4, dd - 0.9)
    return [
      ...vatHien(p, 'nen_dat', t - 0.1, dd + 0.2), ...vatHien(p, 'nen', t, dd), ...vatHien(p, 'quang_nen', t + 0.15, dd - 0.15),
      `tl.to("#${p}-tay-phai", { rotation: 20, duration: 0.45, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p}-cang-phai", { rotation: 104, duration: 0.45, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p}-tay-trai", { rotation: -18, duration: 0.45 }, ${f(t)});`,
      `tl.to("#${p}-cang-trai", { rotation: -95, duration: 0.45 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 10, duration: 0.6, ease: "sine.inOut" }, ${f(t)});`,
      `tl.fromTo("#${p}-vat-quang_nen", { scale: 0.9, transformOrigin: "50% 50%" }, { scale: 1.08, duration: 0.32, yoyo: true, repeat: ${solan(Math.max(0.6, dd - 0.4), 0.32)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.45)});`,
      // nhích từng bước nhỏ, thân nhún nhẹ
      `tl.to("#${p} svg", { y: -5, duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t + 0.5)});`,
      `tl.fromTo(["#${p}-chan-trai", "#${p}-chan-phai"], { rotation: 0 }, { rotation: (i) => (i ? -5 : 5), duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.5)});`,
      // ngọn lửa bập bùng
      `tl.fromTo("#${p}-vat-nen", { scaleY: 1, transformOrigin: "50% 100%" }, { scaleY: 0.93, duration: 0.1, yoyo: true, repeat: 5, ease: "sine.inOut", immediateRender: false }, ${f(giua)});`,
      `tl.to("#${p}-dau", { rotation: 0, duration: 0.5, ease: "sine.inOut" }, ${f(ket)});`,
      `tl.to("#${p}-tay-phai", { rotation: 26, duration: 0.5, ease: "sine.inOut" }, ${f(ket)});`,
      `tl.to("#${p}-cang-phai", { rotation: 112, duration: 0.5, ease: "sine.inOut" }, ${f(ket)});`,
      `tl.to(["#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.4 }, ${f(t + Math.max(1.6, dd) + 0.05)});`,
    ]
  },
  choi_bai: (p, t, dd) => [
    ...vatHien(p, 'ban_bai', t, dd), ...vatHien(p, 'bai_tay', t, dd), ...vatHien(p, 'la_danh', t + Math.min(1.4, dd * 0.5), Math.max(0.6, dd - Math.min(1.4, dd * 0.5))),
    `tl.to("#${p}-tay-trai", { rotation: -30, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: 22, duration: 0.35 }, ${f(t)});`,
    `tl.to("#${p} svg", { y: 14, duration: 0.4, ease: "sine.inOut" }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: 12, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(t + 0.4)});`,
    `tl.to("#${p}-tay-phai", { rotation: 30, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t + 0.5)});`,
    // đánh lá bài xuống bàn
    `tl.to("#${p}-tay-phai", { rotation: 48, duration: 0.14, ease: "power3.in" }, ${f(t + Math.min(1.4, dd * 0.5))});`,
    `tl.fromTo("#${p}-vat-la_danh", { y: -70, x: 60, rotation: -25 }, { y: 0, x: 0, rotation: 12, duration: 0.22, ease: "power2.in", immediateRender: false }, ${f(t + Math.min(1.4, dd * 0.5))});`,
    `tl.to("#${p}-tay-phai", { rotation: 18, duration: 0.3 }, ${f(t + Math.min(1.4, dd * 0.5) + 0.2)});`,
    `tl.to("#${p}-dau", { rotation: 16, duration: 0.5, ease: "sine.inOut" }, ${f(t + Math.max(1.8, dd - 0.8))});`,
    `tl.to("#${p} svg", { scaleY: 0.97, duration: 0.4, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + Math.max(1.8, dd - 0.8))});`,
    `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(1, dd) - 0.3)});`,
    `tl.to("#${p} svg", { y: 0, duration: 0.4 }, ${f(t + Math.max(1.2, dd) + 0.05)});`,
  ],
  doi_dau: (p, t, dd) => [
    ...gangTay(p, t, dd), ...thuThe(p, t),
    ...chuoiDam(p, t + 0.35, Math.max(0.6, dd - 1.3)),
    `tl.to("#${p}-tay-trai", { rotation: 168, duration: 0.3, ease: "back.out(1.6)" }, ${f(t + Math.max(1, dd - 0.8))});`,
    `tl.to("#${p}-tay-phai", { rotation: -168, duration: 0.3, ease: "back.out(1.6)" }, ${f(t + Math.max(1, dd - 0.8))});`,
    `tl.to("#${p}-dau", { rotation: -6, duration: 0.3 }, ${f(t + Math.max(1, dd - 0.8))});`,
  ],
  dam_boc: (p, t, dd) => [...gangTay(p, t, dd), ...thuThe(p, t), ...chuoiDam(p, t + 0.35, Math.max(0.6, dd - 0.9)), `tl.to("#${p}-dau", { rotation: 5, duration: 0.2 }, ${f(t)});`, ...thaKhuyu(p, t + Math.max(0.95, dd - 0.4))],
  dam_moc: (p, t, dd) => [
    ...gangTay(p, t, dd), ...thuThe(p, t),
    // Móc hàm: tay phải vung theo cung từ thế thủ ra ngoài rồi lên, người xoay theo, đầu nghiêng theo hướng ra đòn
    `tl.fromTo("#${p}-tay-phai", { rotation: ${THU(p).phai} }, { rotation: -40, duration: 0.16, ease: "power3.out", immediateRender: false }, ${f(t + 0.45)});`,
    `tl.to("#${p}-tay-phai", { rotation: ${THU(p).phai}, duration: 0.3, ease: "power2.inOut" }, ${f(t + 0.75)});`,
    ...(coKhop(p) ? [`tl.to("#${p}-cang-phai", { rotation: 70, duration: 0.16, ease: "power3.out" }, ${f(t + 0.45)});`, `tl.to("#${p}-cang-phai", { rotation: 160, duration: 0.3 }, ${f(t + 0.75)});`] : []),
    ...thaKhuyu(p, t + Math.max(1.2, dd - 0.4)),
    `tl.fromTo("#${p} svg", { rotation: 0 }, { rotation: -5, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, ${f(t + 0.45)});`,
    `tl.to("#${p}-dau", { rotation: -9, duration: 0.16, yoyo: true, repeat: 1 }, ${f(t + 0.45)});`,
    ...vatHien(p, 'no', t + 0.58, 0.45),
  ],
  ha_guc: (p, t, dd) => [
    ...gangTay(p, t, dd), ...thuThe(p, t),
    // Cú đấm trái trời giáng: lấy đà, tay trái vụt thẳng ra, người lao theo, tia va chạm lớn, rồi đứng thẳng thở dốc
    `tl.to("#${p}-tay-trai", { rotation: -150, duration: 0.25, ease: "power2.in" }, ${f(t + 0.35)});`,
    `tl.to("#${p}-tay-trai", { rotation: 88, duration: 0.12, ease: "power4.out" }, ${f(t + 0.62)});`,
    `tl.fromTo("#${p} svg", { x: 0 }, { x: -36, duration: 0.12, yoyo: true, repeat: 1, ease: "power3.out", immediateRender: false }, ${f(t + 0.62)});`,
    ...vatHien(p, 'no_t', t + 0.72, 0.6),
    `tl.to("#${p}-tay-trai", { rotation: ${THU(p).trai}, duration: 0.3 }, ${f(t + 1.1)});`,
    ...(coKhop(p) ? [`tl.to("#${p}-cang-trai", { rotation: 0, duration: 0.12, ease: "power4.out" }, ${f(t + 0.62)});`, `tl.to("#${p}-cang-trai", { rotation: -160, duration: 0.3 }, ${f(t + 1.1)});`] : []),
    ...thaKhuyu(p, t + Math.max(1.6, dd - 0.6)),
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -10 : 10), duration: 0.45, ease: "sine.inOut" }, ${f(t + Math.max(1.6, dd - 0.6))});`,
    `tl.to("#${p} svg", { scaleY: 1.03, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t + Math.max(1.6, dd - 0.6))});`,
  ],
  // Đứng nghe tiếng đếm: găng buông hai bên, khom, thở dốc (ngực phập phồng), từ từ ngẩng lên, siết nắm, mồ hôi
  dung_cho_dem: (p, t, dd) => [
    ...gangTay(p, t, dd),
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -8 : 8), duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-dau", { rotation: 14, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p} svg", { scaleY: 1.035, duration: 0.32, yoyo: true, repeat: ${solan(dd - 0.3, 0.32)}, ease: "sine.inOut" }, ${f(t + 0.2)});`,
    `tl.to("#${p}-dau", { rotation: -3, duration: 0.8, ease: "sine.inOut" }, ${f(t + dd * 0.45)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -18 : 18), duration: 0.3 }, ${f(t + dd * 0.55)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(t)});`,
    `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(0.8, dd) - 0.3)});`,
  ],
  // Bước vào đài: dây đài trước người, hai tay đẩy dây lên, cúi đầu lách qua (đi từ trái vào giữa), đứng thẳng chống hông
  buoc_vao_dai: (p, t, dd) => [
    ...gangTay(p, t, dd), ...vatHien(p, 'day_dai', t, dd),
    `tl.fromTo("#${p} svg", { x: -130 }, { x: 0, duration: 0.9, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
    `tl.to("#${p} svg", { y: 24, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + 0.25)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -150 : 150), duration: 0.3 }, ${f(t + 0.1)});`,
    `tl.to("#${p}-dau", { rotation: 12, duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + 0.2)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -28 : 28), duration: 0.35 }, ${f(t + 1)});`,
  ],
  // Đấm bao cát: bao cát treo cạnh, đấm thẳng nhiều nhịp, bao lắc theo cú đấm
  dam_bao_cat: (p, t, dd) => [
    ...gangTay(p, t, dd), ...thuThe(p, t), ...vatHien(p, 'bao_cat', t, dd),
    ...chuoiDam(p, t + 0.35, Math.max(0.6, dd - 0.8), true),
    `tl.fromTo("#${p}-vat-bao_cat", { rotation: 0, transformOrigin: "50% 0%" }, { rotation: 9, duration: 0.24, yoyo: true, repeat: ${solan(dd - 0.8, 0.24)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.45)});`,
  ],
  // Cắn tai: lao tới, hai tay ôm siết, đầu lắc mạnh, giận dữ; rồi giật lùi, mắt mở lớn hoảng hốt
  can_tai: (p, t, dd) => [
    ...gangTay(p, t, dd), ...vatHien(p, 'tuc', t + 0.1, Math.min(dd, 1.6)),
    `tl.fromTo("#${p} svg", { x: 0 }, { x: 44, duration: 0.25, ease: "power3.out", immediateRender: false }, ${f(t)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -72 : 72), duration: 0.2 }, ${f(t)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -28 : 28), duration: 0.18, ease: "power3.in" }, ${f(t + 0.22)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -36 : 36), duration: 0.1, yoyo: true, repeat: 5 }, ${f(t + 0.45)});`,
    `tl.to("#${p}-dau", { rotation: 13, duration: 0.07, yoyo: true, repeat: 7, ease: "none" }, ${f(t + 0.3)});`,
    `tl.to("#${p}-gian", { opacity: 1, duration: 0.2 }, ${f(t)});`,
    `tl.to("#${p} svg", { x: -30, duration: 0.25, ease: "power3.out" }, ${f(t + Math.max(1, dd - 0.8))});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 60 : -60), duration: 0.25 }, ${f(t + Math.max(1, dd - 0.8))});`,
    `tl.to("#${p}-gian", { opacity: 0, duration: 0.2 }, ${f(t + Math.max(1, dd - 0.8))});`,
    `tl.to("#${p} svg", { x: 0, duration: 0.4 }, ${f(t + Math.max(1.4, dd))});`,
  ],
  // Gánh vác: ôm giỏ đồ nặng trước người, khom, bước chậm nặng nề, mồ hôi; cuối đặt giỏ xuống, lau mồ hôi trán
  ganh_vac: (p, t, dd) => {
    const di = Math.min(dd - 0.6, 2.4)
    return [
      ...vatHien(p, 'gio_do', t, dd),
      `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 22 : -22), duration: 0.3 }, ${f(t)});`,
      `tl.to("#${p}-dau", { rotation: 13, duration: 0.4 }, ${f(t)});`,
      `tl.fromTo("#${p} svg", { x: -60 }, { x: 70, duration: ${f(Math.max(0.6, di))}, ease: "none", immediateRender: false }, ${f(t)});`,
      `tl.to("#${p} svg", { y: 10, duration: 0.3, yoyo: true, repeat: ${solan(Math.max(0.6, di), 0.3)}, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to("#${p}-mo-hoi", { opacity: 1, duration: 0.3 }, ${f(t + 0.4)});`,
      `tl.to("#${p}-vat-gio_do", { y: 50, duration: 0.35 }, ${f(t + Math.max(0.7, dd - 0.9))});`,
      `tl.to("#${p}-tay-phai", { rotation: 150, duration: 0.35 }, ${f(t + Math.max(0.9, dd - 0.6))});`,
      `tl.to("#${p}-dau", { rotation: -3, duration: 0.3 }, ${f(t + Math.max(0.9, dd - 0.6))});`,
      `tl.to("#${p}-mo-hoi", { opacity: 0, duration: 0.3 }, ${f(t + Math.max(1, dd) - 0.2)});`,
      `tl.to("#${p} svg", { x: 0, duration: 0.5 }, ${f(t + Math.max(1.2, dd) + 0.05)});`,
    ]
  },
  // Còng tay (bắt giữ): hai tay cầm còng trước người, bước tới, đưa còng ra dứt khoát, siết; đứng thẳng nắm một đầu còng
  bat_giu: (p, t, dd) => [
    ...vatHien(p, 'cong', t, dd),
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 20 : -20), duration: 0.3 }, ${f(t)});`,
    `tl.fromTo("#${p} svg", { x: 0 }, { x: 34, duration: 0.3, ease: "power2.out", immediateRender: false }, ${f(t + 0.3)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 52 : -52), duration: 0.2, ease: "power3.out" }, ${f(t + 0.45)});`,
    `tl.to("#${p}-vat-cong", { y: -30, duration: 0.2, ease: "power3.out" }, ${f(t + 0.45)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 44 : -44), duration: 0.1, yoyo: true, repeat: 3 }, ${f(t + 0.75)});`,
    `tl.to("#${p}-dau", { rotation: 7, duration: 0.3 }, ${f(t + 0.3)});`,
    `tl.to("#${p} svg", { x: 0, duration: 0.45 }, ${f(t + Math.max(1.3, dd - 0.3))});`,
  ],
  // Cân sức khoẻ: cân trên sàn cạnh người, cúi nhìn vạch số, tay chỉ xuống, gật đầu ngạc nhiên, chống hông thán phục
  kham_suc_khoe: (p, t, dd) => [
    ...vatHien(p, 'can_sk', t, dd),
    `tl.to("#${p}-dau", { rotation: 15, duration: 0.4 }, ${f(t)});`,
    `tl.to("#${p}-tay-phai", { rotation: -40, duration: 0.35 }, ${f(t + 0.1)});`,
    `tl.to("#${p}-dau", { rotation: 8, duration: 0.16, yoyo: true, repeat: 3 }, ${f(t + 0.8)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? -26 : 26), duration: 0.35 }, ${f(t + Math.max(1.4, dd - 0.8))});`,
    `tl.to("#${p}-dau", { rotation: -5, duration: 0.35 }, ${f(t + Math.max(1.4, dd - 0.8))});`,
  ],
  // Nhận đai vô địch: hai tay đưa xuống eo, đai hiện quanh eo, cúi nhìn đai, siết đai, đứng thẳng nhìn xa xăm
  nhan_dai: (p, t, dd) => [
    ...vatHien(p, 'dai', t + 0.5, Math.max(0.6, dd - 0.5)),
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 26 : -26), duration: 0.4 }, ${f(t)});`,
    `tl.fromTo("#${p}-vat-dai", { scaleX: 0.2, transformOrigin: "50% 50%" }, { scaleX: 1, duration: 0.5, ease: "power2.out", immediateRender: false }, ${f(t + 0.5)});`,
    `tl.to("#${p}-dau", { rotation: 14, duration: 0.5 }, ${f(t + 0.3)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 18 : -18), duration: 0.12, yoyo: true, repeat: 1 }, ${f(t + 1.1)});`,
    `tl.to("#${p}-dau", { rotation: -4, duration: 0.6, ease: "sine.inOut" }, ${f(t + Math.max(1.5, dd - 1))});`,
  ],
  // Tiệc tùng: tay phải cầm ly đưa lên miệng uống, tay trái vẫy, người lắc lư theo nhạc, đèn tiệc trên cao, nốt nhạc
  tiec_tung: (p, t, dd) => [
    ...vatHien(p, 'ly', t, dd), ...vatHien(p, 'den_tiec', t, dd), ...vatHien(p, 'not_nhac', t + 0.3, Math.max(0.6, dd - 0.3)),
    `tl.fromTo("#${p}-tay-phai", { rotation: 40 }, { rotation: 118, duration: 0.5, yoyo: true, repeat: ${solan(dd - 0.4, 0.5)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
    `tl.fromTo("#${p}-tay-trai", { rotation: 120 }, { rotation: 155, duration: 0.25, yoyo: true, repeat: ${solan(dd - 0.4, 0.25)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
    `tl.fromTo("#${p} svg", { y: 0 }, { y: -12, duration: 0.25, yoyo: true, repeat: ${solan(dd - 0.4, 0.25)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.1)});`,
    `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.3 }, ${f(t)});`,
    `tl.fromTo("#${p}-vat-den_tiec", { rotation: -20, transformOrigin: "50% 0%" }, { rotation: 20, duration: 0.6, yoyo: true, repeat: ${solan(dd - 0.3, 0.6)}, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.2)});`,
  ],
  // Đi máy bay (bay sang Tokyo…): máy bay bay ngang trời phía sau; người xách vali bước đi
  di_may_bay: (p, t, dd) => [
    ...vatHien(p, 'may_bay', t, dd), ...TRUYEN.xach_vali(p, t + 0.2, Math.max(0.6, dd - 0.2)),
    `tl.fromTo("#${p}-vat-may_bay", { x: -280, y: 20 }, { x: 280, y: 0, duration: ${f(Math.max(1, dd))}, ease: "none", immediateRender: false }, ${f(t)});`,
  ],
  // Ngồi thiền: đệm thiền che chân (người hạ thấp như ngồi xếp bằng), hai tay đặt trên gối, mắt nhắm, thở chậm, hào quang
  ngoi_thien: (p, t, dd) => [
    ...vatHien(p, 'dem_thien', t, dd), ...vatHien(p, 'hao_quang', t + 0.4, Math.max(0.6, dd - 0.4)),
    `tl.to("#${p} svg", { y: ${coKhop(p) ? 62 : 110}, duration: 0.5, ease: "sine.inOut" }, ${f(t)});`,
    `tl.to(["#${p}-tay-trai", "#${p}-tay-phai"], { rotation: (i) => (i ? 28 : -28), duration: 0.5 }, ${f(t)});`,
    // Có khớp: ngồi xếp chân thật (đùi mở ra hai bên, ống chân gập vào trong), hai cẳng tay đặt lên gối
    ...(coKhop(p) ? [
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => [80, -80, -100, 100][i], duration: 0.5, ease: "sine.inOut" }, ${f(t)});`,
      `tl.to(["#${p}-cang-trai", "#${p}-cang-phai"], { rotation: (i) => (i ? 40 : -40), duration: 0.5 }, ${f(t)});`,
      `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai", "#${p}-cang-trai", "#${p}-cang-phai"], { rotation: 0, duration: 0.5, ease: "sine.inOut" }, ${f(t + Math.max(1, dd) + 0.05)});`,
    ] : []),
    `tl.to("#${p}-mat", { scaleY: 0.12, duration: 0.3 }, ${f(t + 0.4)});`,
    `tl.to("#${p}-mat", { scaleY: 1, duration: 0.3 }, ${f(t + Math.max(1, dd) - 0.3)});`,
    `tl.to("#${p} svg", { scaleY: 1.025, duration: 1, yoyo: true, repeat: ${solan(dd - 0.6, 1)}, ease: "sine.inOut" }, ${f(t + 0.5)});`,
    `tl.to("#${p} svg", { y: 0, duration: 0.5, ease: "sine.inOut" }, ${f(t + Math.max(1, dd) + 0.05)});`,
  ],
}
// Quyền anh: hai găng, thế thủ (hai găng sát cằm), chuỗi đấm thẳng xen kẽ hai tay (tay vụt ra ngoài rồi thu về, người
// lao theo), tia va chạm 💥 cạnh nắm đấm; vaoBao: đấm vào bao cát bên phải (chỉ tay phải ra đòn về phía bao)
// Nhân vật hình người (phu…) có khớp khuỷu / gối (nhanVatPhu.mjs); Mèo / Bit không
const coKhop = (p) => String(p).startsWith('phu')
// Bước chân có khớp (đi / chạy, chủ trang 16/10/2026): đùi đánh trước – sau quanh hông, ống chân gập khi chân đưa ra sau,
// hai cẳng tay hơi co. Trong hệ toạ độ hình (góc nghiêng gốc nhìn sang trái): xoay dương = đưa về phía trước
function buocChan(p, t, dd, nhip = 0.32, chay = false) {
  if (!coKhop(p) || dd < 0.2) return []
  const a = chay ? 34 : 20
  const g = chay ? 64 : 28
  const lap = solan(dd, nhip)
  const ket = t + (lap + 1) * nhip
  return [
    `tl.fromTo("#${p}-chan-trai", { rotation: ${a} }, { rotation: ${-a}, duration: ${f(nhip)}, yoyo: true, repeat: ${lap}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
    `tl.fromTo("#${p}-chan-phai", { rotation: ${-a} }, { rotation: ${a}, duration: ${f(nhip)}, yoyo: true, repeat: ${lap}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
    `tl.fromTo("#${p}-ong-trai", { rotation: 0 }, { rotation: ${-g}, duration: ${f(nhip)}, yoyo: true, repeat: ${lap}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
    `tl.fromTo("#${p}-ong-phai", { rotation: ${-g} }, { rotation: 0, duration: ${f(nhip)}, yoyo: true, repeat: ${lap}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`,
    `tl.to(["#${p}-cang-trai", "#${p}-cang-phai"], { rotation: ${chay ? 80 : 28}, duration: 0.15 }, ${f(t)});`,
    `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai", "#${p}-cang-trai", "#${p}-cang-phai"], { rotation: 0, duration: 0.15 }, ${f(ket)});`,
  ]
}
// Ngồi sau bàn làm việc (bộ 11): ghế bành phía sau, bàn gỗ trước người che chân, hạ người ngồi, hai tay đặt lên mặt bàn;
// cuối câu đứng lại như cũ
function ngoiBan(p, t, dd) {
  const het = t + Math.max(1.4, dd) + 0.05
  return [
    ...vatHien(p, 'ghe_go', t - 0.1, dd + 0.2), ...vatHien(p, 'ban_go', t - 0.1, dd + 0.2),
    `tl.to("#${p} svg", { y: 32, duration: 0.4, ease: "sine.inOut" }, ${f(t)});`,
    `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai"], { rotation: (i) => [40, -40, -40, 40][i], duration: 0.4 }, ${f(t)});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? -10 : 12), duration: 0.4 }, ${f(t)});`,
    `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -36 : 40), duration: 0.4 }, ${f(t)});`,
    `tl.to(["#${p}-chan-trai", "#${p}-chan-phai", "#${p}-ong-trai", "#${p}-ong-phai", "#${p}-tay-phai", "#${p}-tay-trai", "#${p}-cang-phai", "#${p}-cang-trai", "#${p}-dau"], { rotation: 0, duration: 0.4 }, ${f(het)});`,
    `tl.to("#${p} svg", { y: 0, duration: 0.4, ease: "sine.inOut" }, ${f(het)});`,
  ]
}
// Bóng đá (bộ 13): nhân vật nghiêng nhìn hướng chạy (máy dựng lo), bóng ⚽ trước mũi giày (toạ độ hình: phía trước = trái,
// xoay dương = đưa chân / tay về phía trước)
function reBong(p, a, b, nhip = 0.2) {
  if (b - a < 0.4) return []
  return [
    ...buocChan(p, a, b - a, nhip, true),
    `tl.fromTo("#${p}-vat-bong", { x: 0, rotation: 0, transformOrigin: "50% 50%" }, { x: -24, rotation: -300, duration: ${f(nhip * 2)}, yoyo: true, repeat: ${solan(b - a, nhip * 2)}, ease: "sine.inOut", immediateRender: false }, ${f(a)});`,
  ]
}
function sutBong(p, t, chan = 'phai', xa = 440) {
  return [
    `tl.to("#${p}-chan-${chan}", { rotation: -42, duration: 0.22, ease: "power2.in" }, ${f(t)});`,
    `tl.to("#${p}-ong-${chan}", { rotation: -70, duration: 0.22 }, ${f(t)});`,
    `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 45 : -45), duration: 0.2 }, ${f(t + 0.12)});`,
    `tl.to("#${p}-chan-${chan}", { rotation: 64, duration: 0.13, ease: "power3.out" }, ${f(t + 0.24)});`,
    `tl.to("#${p}-ong-${chan}", { rotation: 0, duration: 0.13 }, ${f(t + 0.24)});`,
    `tl.to("#${p} svg", { rotation: -4, transformOrigin: "50% 100%", duration: 0.13, yoyo: true, repeat: 1 }, ${f(t + 0.24)});`,
    `tl.fromTo("#${p}-vat-bong", { x: 0, y: 0, rotation: 0 }, { x: ${-xa}, y: -110, rotation: -720, duration: 0.55, ease: "power2.out", immediateRender: false }, ${f(t + 0.34)});`,
    `tl.to(["#${p}-chan-${chan}", "#${p}-tay-phai", "#${p}-tay-trai"], { rotation: 0, duration: 0.3 }, ${f(t + 0.62)});`,
  ]
}
// Ăn mừng: bật nhảy, hai tay giơ cao, má ửng
const anMung = (p, t) => [
  `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 160 : -160), duration: 0.25, ease: "back.out(1.6)" }, ${f(t)});`,
  `tl.fromTo("#${p} svg", { y: 0 }, { y: -36, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, ${f(t)});`,
  `tl.to("#${p}-ma-hong", { opacity: 1, duration: 0.25 }, ${f(t)});`,
  `tl.to("#${p}-dau", { rotation: -10, duration: 0.25 }, ${f(t)});`,
]
// Rung lưới khung thành khi bóng vào
const rungLuoi = (p, t) => [`tl.fromTo("#${p}-vat-khung_thanh .luoi", { scaleX: 1, transformOrigin: "50% 100%" }, { scaleX: 1.06, scaleY: 0.96, duration: 0.08, yoyo: true, repeat: 5, ease: "sine.inOut", immediateRender: false }, ${f(t)});`]
// Chống nạnh: khuỷu mở ra ngoài, bàn tay chống hông
const chongNanh = (p, t) => [
  `tl.to(["#${p}-tay-phai", "#${p}-tay-trai"], { rotation: (i) => (i ? 30 : -30), duration: 0.3 }, ${f(t)});`,
  `tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -42 : 42), duration: 0.3 }, ${f(t)});`,
]
// Thế thủ: người có khớp co khuỷu, hai nắm đấm sát cằm (cánh tay trên hơi mở ra ngoài); Mèo / Bit giơ cả cánh tay
const THU = (p) => (coKhop(p) ? { phai: -25, trai: 25 } : { phai: 120, trai: -120 })
function gangTay(p, t, dd) {
  return [...vatHien(p, 'gang_p', t, dd), ...vatHien(p, 'gang_t', t, dd)]
}
function thuThe(p, t) {
  return [
    `tl.to("#${p}-tay-phai", { rotation: ${THU(p).phai}, duration: 0.25, ease: "power2.out" }, ${f(t)});`,
    `tl.to("#${p}-tay-trai", { rotation: ${THU(p).trai}, duration: 0.25, ease: "power2.out" }, ${f(t)});`,
    ...(coKhop(p) ? [`tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: (i) => (i ? -160 : 160), duration: 0.25, ease: "power2.out" }, ${f(t)});`] : []),
  ]
}
// Hết đòn: duỗi khuỷu về thẳng
const thaKhuyu = (p, t) => (coKhop(p) ? [`tl.to(["#${p}-cang-phai", "#${p}-cang-trai"], { rotation: 0, duration: 0.35 }, ${f(t)});`] : [])
function chuoiDam(p, t, giay, vaoBao = false) {
  const ra = []
  const nhip = 0.42
  for (let k = 0; k * nhip < giay; k++) {
    const phai = vaoBao || k % 2 === 0
    const tay = phai ? 'phai' : 'trai'
    const t1 = t + k * nhip
    ra.push(`tl.to("#${p}-tay-${tay}", { rotation: ${phai ? -88 : 88}, duration: 0.09, ease: "power3.out" }, ${f(t1)});`)
    ra.push(`tl.to("#${p}-tay-${tay}", { rotation: ${THU(p)[tay]}, duration: 0.2, ease: "power2.inOut" }, ${f(t1 + 0.12)});`)
    // Có khuỷu: cẳng tay duỗi thẳng theo cú đấm rồi co về thế thủ
    if (coKhop(p)) {
      ra.push(`tl.to("#${p}-cang-${tay}", { rotation: 0, duration: 0.09, ease: "power3.out" }, ${f(t1)});`)
      ra.push(`tl.to("#${p}-cang-${tay}", { rotation: ${phai ? 160 : -160}, duration: 0.2, ease: "power2.inOut" }, ${f(t1 + 0.12)});`)
    }
    ra.push(`tl.fromTo("#${p} svg", { x: 0 }, { x: ${phai ? 18 : -18}, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, ${f(t1)});`)
    if (k % 2 === 0 || !phai) ra.push(...vatHien(p, phai ? 'no' : 'no_t', t1 + 0.08, 0.3))
  }
  return ra
}
// Từ trong lời kể → hành động kể chuyện (thứ tự = ưu tiên). Ẩn dụ ("bài kiểm tra sinh tồn") không tính
const TU_TRUYEN = [
  ['tiem_thuoc', /kim tiêm|tiêm thuốc|tự tiêm|hormone tăng trưởng/],
  ['cam_but_run', /khăn giấy|giấy ăn|run (nhẹ )?khi (đặt bút|ký)/],
  ['cam_hoa_don', /hoá đơn|hóa đơn|chi phí điều trị|không đủ tiền chữa/],
  ['lao_dong_vat_va', /công nhân nhà máy|dọn dẹp vệ sinh|làm lụng vất vả|lao động vất vả/],
  ['sut_bong', /sút luân lưu|loạt luân lưu|cú sút quyết định|sút tung lưới/],
  ['ghi_ban', /ghi bàn|ghi \d+ bàn|lập công|bàn thắng/],
  ['re_bong', /rê bóng|qua người|đi bóng|lừa bóng/],
  ['tap_luyen', /tập luyện|sân tập|khổ luyện/],
  ['mac_ao_dau', /khoác (lên mình )?(màu )?áo|màu áo mới|ra mắt (câu lạc bộ|CLB)/],
  ['dung_nghe', /la ó|huýt sáo|chỉ trích từ khán đài/],
  ['buoc_vao_phong', /phòng họp báo|họp báo/],
  ['buoc_ra_san', /bước ra sân|sân khấu cuối cùng|ánh đèn sân vận động/],
  ['choi_bong', /Inter Miami|chơi bóng (tại|ở) Mỹ/],
  ['da_bong', /đá bóng|trái bóng tròn|quả bóng/],
  ['gan_bien', /gắn (tấm )?bảng|treo (tấm )?bảng tên|đóng đinh|mang tên mới|mang tên (Ferrari|ông)/],
  ['chup_anh_vay_co', /vẫy cờ|phất cờ|về đích|chiến thắng (cuộc|giải) đua|giành chiến thắng/],
  ['ra_doi_xe', /chiếc xe đầu tiên|ra mắt chiếc xe|xe .* ra đời|ra đời chiếc xe/],
  ['chien_tranh_bung_no', /chiến tranh (bùng nổ|thế giới)|khói lửa chiến tranh|bom đạn/],
  ['giai_the', /giải thể|sáp nhập|xoá sổ|xóa sổ/],
  ['thanh_lap_cong_ty', /thành lập (công ty|hãng|đội)|sáng lập|lập (ra )?công ty/],
  ['to_chuc_giai_dua', /tổ chức (các )?(giải|cuộc) đua|tay lái nghiệp dư/],
  ['dai_dien', /đại diện (cho )?(hãng|đội)|đội đua chính thức/],
  ['ban_hang', /bán hàng|nhân viên bán|đại lý (xe|ô tô)/],
  ['che_giau', /che giấu|vỏ bọc|ngụy trang|nguỵ trang/],
  ['phan_doi', /phản đối|chúng tôi cần sự độc lập|không chấp nhận (sự )?kiểm soát/],
  ['hop_dong_tren_ban', /trên bàn là (một )?(bản |tờ )?hợp đồng/],
  ['ngoi_doi_dien', /ngồi đối diện/],
  ['lai_xe_may', /xe máy|xe gắn máy|mô tô|motor|động cơ .*gầm|tiếng gầm của (những )?động cơ/],
  ['nhuong_vi_tri', /từ chức|nhường (lại )?(ghế|vị trí|chức)|trao lại (ghế|quyền|vị trí)|rút lui khỏi (ghế|vị trí|chức)/],
  ['dong_dau', /con dấu|đóng dấu|dấu giả/],
  ['buoc_vao', /bước vào (cuộc đời|xưởng|công ty|phòng)/],
  ['chong_gay', /chống gậy|cây gậy|lê bước|chậm chạp bước|già yếu/],
  ['ngoi_lang_le', /ngồi lặng lẽ|ngồi một mình|cô độc trong (căn )?phòng|phòng khách sạn/],
  ['buoc_qua_suong', /quay về (nơi|ngày|thời)|ngược dòng thời gian|trở về quá khứ/],
  ['nam_tay', /nắm (lấy )?tay|bên giường bệnh|cơn bạo bệnh|thập tử nhất sinh/],
  ['nhin_bien', /cập bến|đặt chân (lên|tới|đến) (nước )?mỹ|vượt đại dương|trên (con )?tàu (thủy|thuỷ)/],
  ['vo_vai', /vỗ vai|giao (cho|bản vẽ)|thách thức .* thiết kế/],
  ['dan_lat', /đan len|đan lát|đan móc|kim đan|thêu thùa|may vá/],
  ['dao_dat', /đào mương|đào đất|đào rãnh|cầm xẻng|thợ đào|cuốc đất/],
  ['cho_chim_an', /chim bồ câu|bồ câu|cho chim ăn/],
  ['xe_tai_lieu', /xé (toạc |nát |bỏ |đôi )?(tờ |bản )?(hợp đồng|tài liệu|giấy tờ|séc|thỏa thuận|thoả thuận)/],
  ['thap_nen', /thắp nến|ngọn nến|tưởng niệm|tưởng nhớ|tri ân/],
  ['choi_bai', /cờ bạc|đánh bạc|sòng bạc|chơi bài|bài bạc|con bạc/],
  ['cat_bang', /cắt băng|khánh thành|khai trương nhà máy/],
  ['treo_bien', /treo biển|biển hiệu|mở (một )?(cửa hàng|tiệm)/],
  ['can_hang', /buôn bán|bán (gạo|cá|hàng)|cân (gạo|hàng)|hàng khô/],
  ['dap_xe', /xe đạp|đạp xe|dắt xe/],
  ['can_tai', /cắn (tai|đứt)/],
  ['dung_cho_dem', /tiếng đếm|trọng tài đếm|đếm (ngược|số) của trọng tài/],
  ['buoc_vao_dai', /bước (chân )?(vào|lên) võ đài|lên võ đài|bước qua dây đài/],
  ['dam_bao_cat', /bao cát|đấm bao/],
  ['di_may_bay', /máy bay|chuyến bay|bay (sang|tới|đến)|đáp xuống/],
  ['ha_guc', /hạ gục|knock ?out|đo ván|cú đấm trái/],
  ['dam_moc', /cú móc|móc hàm/],
  ['doi_dau', /đối đầu|chạm trán|so găng|thượng đài|trận (đấu|tái đấu|quyền anh)|đấu với/],
  ['dam_boc', /đấm bốc|quyền anh|tung (cú|những cú|đòn) đấm|cú đấm/],
  ['nhan_dai', /đai vô địch|chiếc đai|quấn quanh eo/],
  ['kham_suc_khoe', /cân nặng|bàn cân|chiều cao và cân|lên cân/],
  ['bat_giu', /bị bắt|bắt giữ|còng tay|cảnh sát (bắt|tóm)|bị (giam|còng)|vào tù|ngồi tù/],
  ['tiec_tung', /tiệc tùng|ăn chơi|say xỉn|rượu chè|hộp đêm|chè chén|sa đọa/],
  ['ngoi_thien', /thiền|tĩnh tâm/],
  ['ganh_vac', /gánh vác|oằn mình|khuân vác|mang vác|bê vác/],
  ['lat_dong_ho', /quay ngược (thời gian|đồng hồ)|ngược dòng thời gian|đồng hồ cát|tua (ngược|lại) thời gian/],
  ['om_ap', /ôm chầm|ôm lấy|ôm nhau|ôm chặt|ôm siết|vòng tay ôm/],
  ['bam_nut', /bấm nút|nhấn nút|ấn nút|đổi tên (tập đoàn|công ty)|công bố tên mới/],
  ['rung_chuong', /lắc chuông|rung chiếc chuông|chuông cầm tay/],
  ['nam_noi', /chào đời|sinh ngày|sinh năm|cất tiếng khóc|lọt lòng|nằm (trong )?nôi|em bé sơ sinh/],
  ['be_em_be', /bế (con|em bé|đứa)|đứa con đầu lòng|lên chức (bố|cha|mẹ)/],
  ['trao_nhan', /kết hôn|cầu hôn|đám cưới|nhẫn cưới|lễ cưới|thành vợ chồng/],
  ['gong_chuong', /rung chuông|gõ chuông|đánh chuông|niêm yết|lên sàn (chứng khoán|giao dịch)|\bipo\b/],
  ['deo_kinh', /kính thực tế ảo|thực tế ảo|metaverse|đeo kính/],
  ['dong_may_tinh', /gập (máy|laptop)|đóng (máy|laptop)|(trang web|website) bị (đóng|khóa|gỡ)|bị đóng cửa ngay|tắt máy tính/],
  ['lai_xe', /lái xe|chuyến xe|lên xe|đi xe|ô tô|xe hơi/],
  ['mo_cua', /mở (toang )?(cửa|cánh cửa|cánh cổng|cổng)|cánh cửa .{0,20}mở ra|cánh cổng .{0,20}(mở|rộng)/],
  ['nhin_bao_giong', /bão giông|giông bão|sóng gió|cơn bão|bão tố/],
  ['rua_bat', /rửa (bát|chén|đĩa)|chà (sàn|bát|nồi)|dọn (dẹp )?(nhà vệ sinh|toilet|phòng vệ sinh)|lau (sàn|bàn|nhà)|đĩa bẩn/],
  ['khoc', /khóc|nước mắt|nức nở|thút thít/],
  ['bi_xo', /bắt nạt|xô đẩy|đánh đập|bị đánh|ức hiếp|hành hạ|bị đẩy|đẩy thẳng|xô ngã|bị đuổi/],
  ['xach_vali', /rời (khỏi )?(quê|nhà|đất nước|tổ quốc)|di cư|xách vali|chuyển nhà|lên đường|bỏ xứ|nửa vòng trái đất|sang (mỹ|nước ngoài|pháp|anh|nhật) (sống|học|làm)/],
  ['chay', /bỏ chạy|chạy trốn|lao đi|chạy thục mạng|chạy thật nhanh|vội vã chạy/],
  ['go_may', /gõ (phím|máy|code)|lập trình|viết (code|phần mềm)|bàn phím|trước màn hình|máy tính cá nhân|thiết kế (chip|vi mạch)/],
  ['lap_rap', /lắp ráp|chế tạo|sửa chữa|ráp (máy|mạch)|hàn mạch|tự tay (làm|lắp|chế)|nguyên mẫu/],
  ['doc_sach', /đọc sách|học bài|ôn thi|miệt mài học|sách vở|cắm cúi học|tự học|thư viện/],
  ['phat_bieu', /phát biểu|thuyết trình|diễn thuyết|lên sân khấu|keynote|ra mắt|giới thiệu sản phẩm|trình bày trước/],
  ['bat_tay', /bắt tay|hợp tác|ký kết|liên doanh|bắt tay nhau|đối tác/],
  ['an_mung', /ăn mừng|reo hò|nhảy cẫng|vỡ òa|mở sâm panh|nâng ly/],
  ['kiet_suc', /kiệt sức|thức trắng|mất ngủ|làm việc (ngày đêm|suốt đêm|xuyên đêm)|rã rời|gục xuống/],
  ['an_com', /ăn (cơm|mì|tối|trưa|vội)|bữa (ăn|cơm)|bát mì|tô mì/],
  ['dem_tien', /đếm (tiền|từng đồng)|tiết kiệm từng|không một xu|cạn tiền|túng thiếu|tiền mặt/],
  ['di_bo', /bước (chân )?vào|bước qua|đi bộ|rảo bước|bước tới|đặt chân (vào|đến|tới)/],
  ['nhin_ra_ngoai', /nhìn ra (cửa sổ|ngoài)|ngắm (nhìn )?(lá|cảnh|mùa)|lá (vàng|phong) rơi|mùa thu/],
]
Object.assign(DONG_TAC, TRUYEN)
// Kịch bản cũ chưa có dong_tac (hoặc AI để "khong"): đoán từ chính lời thoại, để nói gì làm nấy
const TU_DONG_TAC = [
  ['dap_tay', /đập (bàn|tay|mạnh)|đấm|nện xuống|đập vỡ/],
  ['vo_tay', /vỗ tay|hoan hô/],
  ['chi_tay', /chỉ tay|chỉ thẳng|chỉ vào|buộc tội|chất vấn|tố cáo/],
  ['khoanh_tay', /khoanh tay/],
  ['om_dau', /ôm đầu|tuyệt vọng|suy sụp|hoảng loạn|phá sản/],
  ['cui_dau', /cúi đầu|gục đầu|cúi gằm|thất vọng|xin lỗi|bẽ bàng/],
  ['tay_len_nguc', /thề|tay lên ngực|tận đáy lòng|thật lòng|xúc động/],
  ['nhun_vai', /nhún vai|đành chịu|bất lực|không biết phải/],
  ['vay_tay', /vẫy tay|tạm biệt|xin chào|chào mọi người/],
  ['gio_tay', /giơ tay|giơ cao|giương cao|chiến thắng|vô địch/],
  ['viet', /viết|ghi chép|ký (tên|hợp đồng)|phác thảo|vẽ /],
  ['cam_vat', /cầm (lên|trên tay|chiếc|cuốn|bức|tờ)|nâng niu|đọc (thư|bức thư|lá thư)|xem (bản vẽ|bức)/],
  ['chong_cam', /suy nghĩ|trăn trở|tự hỏi|ngẫm nghĩ|băn khoăn/],
]
// Người làm động tác của câu: câu người kể → nhân vật đang được kể (trên sân khấu); câu thoại → chính người nói
const nguoiLamCau = (l, i) => (l.ai === 'nguoi_ke' || laPhu(l.ai) ? phuCuaCau[i] : l.ai === 'meo' ? 'meo' : 'robot')
// Hành động kể chuyện (TRUYEN) đi trước cử chỉ: lời kể nói nhân vật làm gì thì làm đúng việc đó; Mèo / Bit chỉ dùng cử chỉ
const dongTacCau = (l, i) => {
  const chu = String(l.chu ?? '').toLowerCase()
  // Chủ trang đã chốt ở bước chuẩn bị hành động (trang dự án) → dùng đúng hành động đó
  if (l.hanh_dong_chot && DONG_TAC[l.dong_tac] && (!TRUYEN[l.dong_tac] || String(nguoiLamCau(l, i) ?? '').startsWith('phu'))) return l.dong_tac
  if (String(nguoiLamCau(l, i) ?? '').startsWith('phu')) {
    const ten = TRUYEN[l.dong_tac] ? l.dong_tac : TU_TRUYEN.find(([, re]) => re.test(chu))?.[0]
    if (ten) return ten
  }
  return DONG_TAC[l.dong_tac] && !TRUYEN[l.dong_tac] ? l.dong_tac : TU_DONG_TAC.find(([, re]) => re.test(chu))?.[0] ?? null
}
const amDongTac = [] // [tệp, lúc, âm lượng, câu] tiếng đi kèm động tác (đập tay, vỗ tay, viết)
const LUC_DONG_TAC = {} // câu → [động tác, lúc bắt đầu] (nền rung theo cú đập…)
const X_BUOC = {} // câu → độ dịch ngang (px) của người diễn trên sân khấu lúc câu đó (lớp -buoc), máy quay bám theo
const diemChi = [] // lúc con số / minh hoạ / chữ lớn hiện ra → bàn tay găng trắng trượt vào chỉ (BAN_TAY)
// Về tư thế nghỉ (trước mỗi câu mới)
// bo: nhân vật đang GIỮ tư thế sang câu sau (giuTuThe) — không đưa họ về dáng nghỉ
const NGHI = (t0, phu, bo) => {
  const loc = (ds) => ds.filter((x) => !bo || !x.startsWith(`#${bo}-`)).map((x) => `"${x}"`).join(', ')
  const xoay = ['#meo-dau', '#meo-tay-trai', '#meo-tay-phai', '#meo-tai-trai', '#meo-tai-phai', '#robot-dau', '#robot-tay-trai', '#robot-tay-phai', ...(phu ? [`#${phu}-dau`, `#${phu}-tay-trai`, `#${phu}-tay-phai`] : [])]
  return [
    `tl.to([${loc(xoay)}], { rotation: 0, duration: 0.45, ease: "sine.inOut" }, ${f(t0)});`,
    `tl.to([${loc(['#meo-mat-trai', '#meo-mat-phai', '#robot-mat-trai', '#robot-mat-phai'])}], { scale: 1, duration: 0.4, ease: "sine.inOut" }, ${f(t0)});`,
    `tl.to([${loc(['#meo-con-ngoi-trai', '#meo-con-ngoi-phai'])}], { y: 0, duration: 0.4, ease: "sine.inOut" }, ${f(t0)});`,
  ].filter((x) => !x.startsWith('tl.to([]'))
}
// Giữ tư thế (liên tục giữa hai câu): cùng một người diễn cùng một cử chỉ ở hai câu liền nhau (không có động tác riêng,
// không có khoảng lặng chen giữa) → giữ nguyên dáng đang có sang câu sau, KHÔNG hạ tay về nghỉ rồi giơ lại (trước đây mỗi
// câu đều đặt lại mọi người về dáng nghỉ → tay hạ xuống giơ lên liên tục, trông như giật)
const DIEN_KE = { to_mo: 'suy_nghi', suy_nghi: 'suy_nghi', bat_ngo: 'bat_ngo', buon: 'buon', tuc_gian: 'tuc_gian', vui: 'vui', lo_lang: 'lo_lang', giai_thich: 'giai_thich', khang_dinh: 'khang_dinh' }
const tuThe = (i) => {
  const l = loi[i]
  if (!l || dongTacCau(l, i)) return null
  if (l.ai === 'nguoi_ke') return phuCuaCau[i] && DIEN_KE[l.cam_xuc] ? `${phuCuaCau[i]}|${DIEN_KE[l.cam_xuc]}` : null
  const ai = laPhu(l.ai) || l.ai === 'meo' ? l.ai : 'robot'
  const p = laPhu(ai) ? phuCuaCau[i] : ai
  const cam = biKich(i) && (p === 'meo' || p === 'robot') && ['vui', 'bat_ngo', 'to_mo'].includes(l.cam_xuc) ? 'buon' : l.cam_xuc
  return p && CU_CHI[cam] ? `${p}|${cam}` : null
}
const giuTuThe = loi.map((l, i) => (i && !l.lang && tuThe(i) && tuThe(i) === tuThe(i - 1) ? tuThe(i).split('|')[0] : null))

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
  const giu = giuTuThe[i]
  if (i) tw.push(...NGHI(t0 - 0.3, phuCuaCau[i - 1] && phuCuaCau[i - 1] === phuCuaCau[i] ? phuCuaCau[i] : null, giu))
  if (i && phuCuaCau[i - 1] && phuCuaCau[i - 1] !== giu) {
    const q = phuCuaCau[i - 1]
    tw.push(`tl.to(["#${q}-ma-hong", "#${q}-nuoc-mat", "#${q}-mo-hoi", "#${q}-gian"], { opacity: 0, duration: 0.3 }, ${f(t0 - 0.3)});`)
    tw.push(`tl.to(["#${q}-may-trai", "#${q}-may-phai"], { y: 0, rotation: 0, duration: 0.3 }, ${f(t0 - 0.3)});`)
  }
  // Động tác theo lời: người nói làm, câu người kể thì nhân vật đang được kể (đứng trên sân khấu) làm
  const dongTac = dongTacCau(l, i)
  const nguoiLam = dongTac ? (ke ? phuCuaCau[i] : p) : null
  // Có động tác thì cử chỉ cảm xúc của người làm chỉ giữ nét mặt / nhún nhảy, bỏ phần tay và đầu (động tác lo phần đó)
  const boTayDau = (ds, q) => (q && q === nguoiLam ? ds.filter((t) => !t.includes(`#${q}-tay-`) && !t.includes(`#${q}-dau"`)) : ds)
  // Câu bi kịch: Mèo / Bit không nhảy nhót vui vẻ (video Oppenheimer: Mèo giơ tay cười cạnh cảnh bom) → cúi đầu buồn
  const camNoi = biKich(i) && (p === 'meo' || p === 'robot') && ['vui', 'bat_ngo', 'to_mo'].includes(l.cam_xuc) ? 'buon' : l.cam_xuc
  // Đang giữ tư thế từ câu trước: không diễn lại cử chỉ từ đầu (miệng, mắt, thở vẫn chạy theo lời)
  if (!ke && giu !== p) tw.push(...boTayDau((CU_CHI[camNoi] ?? CU_CHI[ai === 'meo' ? 'to_mo' : 'giai_thich'])(p, t0), p))
  if (nguoiLam) {
    // Lời có nói tới hành động ("… đập bàn …") → động tác bắt đầu ngay trước lúc giọng đọc tới chữ đó; không thì đầu câu
    const khop = [...TU_TRUYEN, ...TU_DONG_TAC].find(([ten]) => ten === dongTac)?.[1].exec(String(l.chu ?? '').toLowerCase())
    const batDauDT = Math.min(Math.max(t0 + 0.15, khop ? lucTu(i, khop.index) - 0.25 : t0 + 0.3), Math.max(t0 + 0.15, t0 + d - 0.9))
    tw.push(...DONG_TAC[dongTac](nguoiLam, batDauDT, t0 + d - batDauDT))
    // Đang làm hành động kể chuyện: đồ nhân vật cầm sẵn (cặp, sách…) cất đi cho khỏi chồng lên đạo cụ của hành động
    if (TRUYEN[dongTac] && String(nguoiLam).startsWith('phu')) catDoSan(nguoiLam, batDauDT, t0 + d)
    LUC_DONG_TAC[i] = [dongTac, batDauDT]
    // Tiếng đi kèm tính từ lúc bắt đầu động tác (đập: lúc tay chạm xuống)
    const tiengDT = { gan_bien: ['sfx-bua', 0.5, 0.3], chup_anh_vay_co: ['sfx-chup-anh', Math.min(1.1, (t0 + d - batDauDT) * 0.3) + 0.35, 0.4], lai_xe_may: ['sfx-bo-xe', 0, 0.3], dong_dau: ['sfx-bop', 0.34, 0.3], dap_tay: ['sfx-bum', 0.5, 0.22], vo_tay: ['sfx-vo-tay', 0.05, 0.25], viet: ['sfx-but-viet', 0.05, 0.3], gong_chuong: ['sfx-ting', 0.49, 0.3], mo_cua: ['sfx-go-cua', 0.3, 0.12], cat_bang: ['sfx-vo-tay', 0.9, 0.3], treo_bien: ['sfx-bua', 1.15, 0.25], rung_chuong: ['sfx-ting', 0.35, 0.3], bam_nut: ['sfx-bop', 0.55, 0.35], doi_dau: ['sfx-bum', 0.4, 0.25], dam_boc: ['sfx-bum', 0.4, 0.25], dam_moc: ['sfx-bum', 0.55, 0.28], ha_guc: ['sfx-bum', 0.65, 0.35], dam_bao_cat: ['sfx-bop', 0.4, 0.35], bat_giu: ['sfx-kim-loai', 0.5, 0.3], di_may_bay: ['sfx-may-bay', 0, 0.3], tiec_tung: ['sfx-vui', 0, 0.18] }[dongTac]
    if (tiengDT) amDongTac.push([tiengDT[0], batDauDT + tiengDT[1], tiengDT[2], i])
    // Nhân vật phụ làm động tác mà câu sau không còn là lượt của họ: về dáng nghỉ cuối câu
    DONG_BO.push({ cau: i, bd: +t0.toFixed(2), kt: +(t0 + d).toFixed(2), chu: l.chu, nguoi_lam: nguoiLam, dong_tac: dongTac, luc: +batDauDT.toFixed(2), tu_loi: !!khop })
    if (nguoiLam.startsWith('phu') && nguoiLam !== phuCuaCau[i + 1]) tw.push(`tl.to(["#${nguoiLam}-dau", "#${nguoiLam}-tay-trai", "#${nguoiLam}-tay-phai"], { rotation: 0, duration: 0.3, ease: "sine.inOut" }, ${f(t0 + d - 0.2)});`)
  }
  // Đạo cụ phụ (chuẩn bị hành động trên trang: vat_them) — người diễn cầm thêm đồ vật lời kể nói tới (cái chổi, cây bút,
  // tờ hợp đồng…) ở chỗ hành động đang làm chưa dùng (tay phải → tay trái → trước người), từ lúc bắt đầu động tác tới hết câu
  {
    const q = nguoiLamCau(l, i)
    const them = Array.isArray(l.vat_them) ? l.vat_them.filter((x) => typeof x === 'string' && x.trim()).slice(0, 2) : []
    const linhVat = q === 'meo' || q === 'robot'
    if (them.length && (String(q ?? '').startsWith('phu') || linhVat)) {
      if (!TRUYEN[dongTac] && !linhVat) catDoSan(q, LUC_DONG_TAC[i]?.[1] ?? t0 + 0.3, t0 + d)
      // Tay đang làm cử chỉ (viết, chỉ, đập…) thì đạo cụ sang chỗ khác; bút / dụng cụ viết luôn ở tay phải (tay viết)
      const dung = new Set([...(VAT_DUNG_BOI[dongTac] ?? []).map((v) => VAT[v]?.[1]), ...(TAY_BAN[dongTac] ?? [])])
      const trong = ['phai', 'truoc', 'trai'].filter((c) => !dung.has(c))
      const VIET = /[🖊✒✏🖋🖌]/u
      them.sort((a, b) => Number(VIET.test(b)) - Number(VIET.test(a)))
      const bd = LUC_DONG_TAC[i]?.[1] ?? t0 + 0.3
      let so = 0
      them.forEach((bt) => {
        // Mèo / Bit chỉ cầm được ở tay phải (một món)
        const cho = linhVat ? (so++ ? null : q === 'meo' ? 'phai' : 'trai') : VIET.test(bt) && dongTac === 'viet' ? 'phai' : trong[so++]
        if (!cho) return
        const ten = `e${[...bt].map((c) => c.codePointAt(0).toString(16)).join('')}_${cho}`
        VAT[ten] = [veCo(bt) ?? bt, cho]
        tw.push(...vatHien(q, ten, bd, t0 + d - bd))
        // Mèo / Bit giơ cao món đồ (tay phía trong khung) và vẫy
        if (linhVat) {
          const huong = cho === 'phai' ? -1 : 1
          tw.push(`tl.to("#${q}-tay-${cho}", { rotation: ${huong * 150}, duration: 0.3, ease: "back.out(1.6)" }, ${f(bd)});`)
          tw.push(`tl.to("#${q}-tay-${cho}", { rotation: ${huong * 128}, duration: 0.22, yoyo: true, repeat: ${solan(Math.max(0.5, t0 + d - bd - 0.6), 0.22)}, ease: "sine.inOut" }, ${f(bd + 0.32)});`)
          tw.push(`tl.to("#${q}-tay-${cho}", { rotation: 0, duration: 0.3 }, ${f(t0 + d - 0.2)});`)
        }
      })
    }
  }
  // Người kể đang dẫn chuyện: nhân vật đứng trên sân khấu (nhân vật chính / người được nhắc tới) diễn theo sắc thái câu kể
  // thay vì đứng yên: câu hỏi / nghịch lý → nghiêng đầu chống cằm; bước ngoặt → nhướn mày, ngạc nhiên; buồn, giận, vui,
  // lo theo đúng cảm xúc; câu kể bình thường → giữ dáng nghỉ (thở, chớp mắt)
  if (ke && phuCuaCau[i]) {
    const dien = { to_mo: 'suy_nghi', suy_nghi: 'suy_nghi', bat_ngo: 'bat_ngo', buon: 'buon', tuc_gian: 'tuc_gian', vui: 'vui', lo_lang: 'lo_lang', giai_thich: 'giai_thich', khang_dinh: 'khang_dinh' }[l.cam_xuc]
    if (dien && giu !== phuCuaCau[i]) tw.push(...boTayDau(CU_CHI[dien](phuCuaCau[i], t0), phuCuaCau[i]))
  }
  // Người nghe phản ứng theo lời người nói, trễ nửa giây như phản xạ thật; người thứ hai (nếu có) phản ứng dịu hơn, trễ hơn.
  // Nhân vật phụ phản ứng xong thì về dáng nghỉ trước câu sau (Mèo / Bit đã có NGHI)
  if (!ke && d > 1.6 && PHAN_UNG[l.cam_xuc]) {
    nguoiPhanUng(i).slice(0, 2).forEach((q, j) => {
      const cx = biKich(i) ? 'buon' : j && ['lo_lang', 'bat_ngo'].includes(PHAN_UNG[l.cam_xuc]) ? 'suy_nghi' : PHAN_UNG[l.cam_xuc]
      tw.push(...CU_CHI[cx](q, t0 + 0.5 + j * 0.3))
      if (q.startsWith('phu') && q !== phuCuaCau[i + 1]) {
        const v = t0 + d - 0.2
        tw.push(`tl.to(["#${q}-dau", "#${q}-tay-trai", "#${q}-tay-phai"], { rotation: 0, duration: 0.3, ease: "sine.inOut" }, ${f(v)});`)
        tw.push(`tl.to(["#${q}-may-trai", "#${q}-may-phai"], { y: 0, rotation: 0, duration: 0.3 }, ${f(v)});`)
        tw.push(`tl.to(["#${q}-ma-hong", "#${q}-nuoc-mat", "#${q}-mo-hoi", "#${q}-gian"], { opacity: 0, duration: 0.3 }, ${f(v)});`)
      }
    })
  }
  // Ánh mắt có mục tiêu (Character Acting Engine): ai đang có mặt cũng nhìn về phía người nói. Sân khấu: Mèo bên trái,
  // Bit bên phải, nhân vật phụ ở giữa (viTriPhu). Người kể là giọng dẫn không đứng trên sân khấu → mọi người nhìn thẳng.
  const coMat = doanPhu.map((dp, k) => [dp, `phu${k}`]).filter(([dp]) => dp.tu <= i && i <= dp.het)
  const huong = (ben, q) => {
    if (ke || ben === p) return 0
    if (ben === 'meo') return 1
    if (ben === 'robot') return -1
    return p === 'meo' ? -1 : p === 'robot' ? 1 : Math.sign((viTriPhu[p] ?? 540) - (viTriPhu[q] ?? 540))
  }
  tw.push(`tl.to(["#meo-con-ngoi-trai", "#meo-con-ngoi-phai"], { x: ${14 * huong('meo')}, duration: 0.35, ease: "sine.inOut" }, ${f(t0)});`)
  tw.push(`tl.to(["#robot-mat-trai", "#robot-mat-phai"], { x: ${8 * huong('robot')}, duration: 0.35, ease: "sine.inOut" }, ${f(t0)});`)
  for (const [, q] of coMat) tw.push(`tl.to("#${q}-mat", { x: ${4 * huong(q, q)}, duration: 0.3, ease: "sine.inOut" }, ${f(t0)});`)
  if (laPhu(ai) || ke) tw.push(`tl.to(["#o-meo", "#o-robot"], { scale: 0.96, duration: 0.45, ease: "sine.inOut" }, ${f(t0)});`)
  else {
    tw.push(`tl.to("#o-${nghe}", { scale: 0.96, duration: 0.45, ease: "sine.inOut" }, ${f(t0)});`)
    tw.push(`tl.to("#o-${ai}", { scale: 1.04, duration: 0.45, ease: "sine.inOut" }, ${f(t0)});`)
  }
  // Nhép miệng mượt: độ to giọng mỗi 1/15 giây được làm mềm (mở nhanh, khép chậm dần); miệng chỉ đổi mở / khép khi
  // vượt ngưỡng có trễ (không nháy liên tục), còn độ há trượt êm từ khung này sang khung sau.
  const mocMieng = MIENG[i]
  if (mocMieng?.length) {
    // Theo âm: mỗi mốc Rhubarb bật đúng một hình miệng (A, X = miệng khép sẵn có), tắt hình trước
    const nhomMieng = (v) => (HINH_MIENG.includes(v) ? `#${p}-mieng-${v}` : `#${p}-mieng-dong`)
    tw.push(`tl.set("#${p}-mieng-mo", { opacity: 0 }, ${f(t0)});`)
    let truoc = `#${p}-mieng-dong`
    for (const [bd, v] of mocMieng) {
      if (bd >= d) break
      const nay = nhomMieng(v)
      if (nay === truoc) continue
      tw.push(`tl.set("${truoc}", { opacity: 0 }, ${f(t0 + bd)}); tl.set("${nay}", { opacity: 1 }, ${f(t0 + bd)});`)
      truoc = nay
    }
    if (truoc !== `#${p}-mieng-dong`) tw.push(`tl.set("${truoc}", { opacity: 0 }, ${f(t0 + d)});`)
  }
  // Phản ứng qua lại (cấp 4 – interaction): câu dài thì người nghe gật một nhịp giữa câu (nhân vật phụ đang có mặt gật
  // sớm hơn một chút cho khỏi đồng loạt)
  // Gật / nhấn đầu dùng y của nhóm đầu (giá trị tuyệt đối, về 0): xoay đầu đã do cử chỉ cảm xúc đảm nhận, hai lệnh cùng
  // ghi một thuộc tính sẽ giật hình khi dựng song song
  const gat = (sel, sau, luc, dur = 0.22) =>
    tw.push(`tl.fromTo("${sel}", { y: 0 }, { y: ${sau}, duration: ${dur}, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false }, ${f(luc)});`)
  if (!ke && d > 2.6) {
    gat(`#${laPhu(ai) ? 'meo' : nghe}-dau`, 9, t0 + d * 0.55)
    for (const [, q] of coMat) if (q !== p) gat(`#${q}-dau`, 7, t0 + d * 0.4)
  }
  // Người nói nhấn nhịp theo lời (cấp 2 – gesture): ở các âm mở to (Rhubarb C / D / E), cách nhau ít nhất 1,5 giây, đầu
  // hất nhẹ lên theo nhịp nói, có chủ đích, không vung ngẫu nhiên (cả người kể trong khung tròn)
  if (mocMieng?.length) {
    let cuoi = 0.4
    for (const [bd, v] of mocMieng) {
      if (bd < cuoi + 1.5 || bd > d - 0.7 || !'CDE'.includes(v)) continue
      cuoi = bd
      gat(`#${p}-dau`, -6, t0 + bd, 0.16)
    }
  }
  const am = mocMieng?.length ? [] : doTo(join(GOC, `hyperframes/assets/loi-${i}.wav`))
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

// Kiểm định đồng bộ: câu có động tác (AI chọn hoặc lời nói tới) mà không có ai trên sân khấu để diễn → ghi cảnh báo
loi.forEach((l, i) => {
  const dt = dongTacCau(l, i)
  if (dt && !DONG_BO.some((x) => x.cau === i)) DONG_BO.push({ cau: i, bd: +batDau[i].toFixed(2), kt: +(batDau[i] + doDai[i]).toFixed(2), chu: l.chu, dong_tac: dt, canh_bao: 'không có nhân vật trên sân khấu để diễn' })
})
writeFileSync(join(GOC, 'artifacts/dong_bo.json'), JSON.stringify(DONG_BO.sort((a, b) => a.cau - b.cau), null, 1))

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
// Bối cảnh tươi sáng: gặp câu bi kịch thì phải tối, mất màu (xem vòng nền theo câu)
const VUI_TUOI = new Set(['truong_quay', 'van_phong', 'cua_hang', 'phong_khach', 'truong_hoc', 'san_khau', 'bai_bien', 'san_van_dong', 'nha_hang', 'cho', 'pho_florida', 'phong_hop', 'san_chung_khoan', 'thanh_pho_dem'])
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
  // Tranh nền hoạt hình (video YouTube: tranh Pixabay máy nhà chọn theo từ khoá của cảnh, anh_nen_tep ở câu đầu cảnh):
  // phủ phần phía trên mặt sàn (y < 1180), mờ dần xuống sàn vẽ để nhân vật vẫn đứng trên sàn; hơi tối để nhân vật nổi lên,
  // từ từ phóng to suốt cảnh. Không có ảnh thì giữ nguyên cảnh vẽ.
  const tepAnh = loi[dc.tu].anh_nen_tep
  let anh = ''
  if (tepAnh && existsSync(join(GOC, 'hyperframes/assets', tepAnh))) {
    const [x, y, w, h] = NGANG ? [-560, 160, 2200, 1040] : [-60, -60, 1200, 1260]
    anh = `<img id="bc${k}-anh" class="anh-nen-canh${tepAnh.startsWith('nen-') ? ' tu-lam' : ''}" src="assets/${esc(tepAnh)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"/>`
    // ảnh nền đứng yên (không phóng to dần: chuyển động quá chậm thành nhích từng nấc)
  }
  // Nền chuyển động THEO TỪNG CÂU (lớp #bc<k>-dong, riêng với hiệu ứng đổi cảnh và phóng tranh): cả cảnh trôi MỘT chiều
  // đều đặn như máy quay thật (chủ trang 16/10/2026: "background đôi khi bị giật" — trước đây mỗi câu đổi chiều, tăng tốc
  // rồi dừng, nền lắc qua lắc lại), cảnh sau trôi chiều ngược lại; độ gần xa theo sắc thái câu — căng thẳng / lo dồn nền tới, bất ngờ / khoảnh khắc lặng
  // giật tới nhanh rồi đứng, buồn lùi ra cho không gian trống trải, vui nới rộng, suy nghĩ trôi chậm. Mỗi câu một lệnh
  // fromTo nối tiếp (đầu câu này = cuối câu trước), không chồng lệnh nên không giật khi dựng song song.
  const TIEN = { bat_ngo: 0.05, tuc_gian: 0.04, lo_lang: 0.035, to_mo: 0.02, suy_nghi: 0.012, giai_thich: 0.01, khang_dinh: 0.01, vui: -0.02, buon: -0.03 }
  let s0 = 1
  const bienX = NGANG ? 30 : 20
  const xLuc = (tt) => (k % 2 ? 1 : -1) * (-bienX + 2 * bienX * Math.min(1, Math.max(0, (tt - t0) / Math.max(1, het - t0))))
  let x0 = 0
  for (let i = dc.tu; i <= dc.het; i++) {
    const l = loi[i]
    const tu = i === dc.tu ? t0 : batDau[i] - 0.15
    const den = i === dc.het ? het : batDau[i + 1] - 0.15
    if (den - tu < 0.3) continue
    let s1 = s0 + (TIEN[l.cam_xuc] ?? 0.01) * (l.lang ? 1.4 : 1)
    if (s1 > 1.1 || s1 < 1) s1 = s0 - (s1 - s0) // chạm giới hạn thì đi ngược lại
    s1 = Math.min(1.1, Math.max(1, s1))
    void xLuc
    const nhanh = l.lang || l.cam_xuc === 'bat_ngo' || l.anh_sang === 'loe_sang'
    // Nền đứng yên (chuyển động quá chậm thành nhích từng nấc, xem ghi chú ở phần rung trôi); chỉ câu bất ngờ / khoảng lặng
    // / loé sáng dồn nền tới một nhịp nhanh rồi giữ nguyên độ gần đó
    if (!nhanh) s1 = s0
    const x1 = x0
    if (nhanh && s1 !== s0) tw.push(`tl.fromTo("#bc${k}-dong", { scale: ${f(s0)}, x: ${f(x0)} }, { scale: ${f(s1)}, x: ${f(x1)}, duration: ${f(Math.min(0.55, den - tu))}, ease: "power3.out", immediateRender: false }, ${f(tu)});`)
    // Câu bi kịch trên nền vui tươi (văn phòng, cửa hàng, phố nắng…: video Oppenheimer dùng văn phòng xanh có biểu đồ đi lên
    // cho Hiroshima) → nền tối, mất màu suốt câu; câu sau hết bi kịch thì trả màu
    const toi = biKich(i) && VUI_TUOI.has(dc.ten)
    const toiTruoc = i > dc.tu && biKich(i - 1)
    if (toi && !toiTruoc) tw.push(`tl.to("#bc${k}-dong", { filter: "saturate(0.2) brightness(0.5) contrast(1.15)", duration: 0.6, ease: "power1.inOut" }, ${f(tu)});`)
    if (!toi && toiTruoc && VUI_TUOI.has(dc.ten)) tw.push(`tl.to("#bc${k}-dong", { filter: "saturate(1) brightness(1) contrast(1)", duration: 0.6, ease: "power1.inOut" }, ${f(tu)});`)
    // Động tác mạnh trong câu (đập tay) → nền rung theo cú đập (trục y riêng, không đụng lệnh trôi ở trên)
    const dt = LUC_DONG_TAC[i]
    if (dt?.[0] === 'dap_tay') tw.push(`tl.fromTo("#bc${k}-dong", { y: 0 }, { y: 7, duration: 0.06, yoyo: true, repeat: 3, ease: "power1.inOut", immediateRender: false }, ${f(dt[1] + 0.5)});`)
    s0 = s1
    x0 = x1
  }
  return `<div id="bc${k}" class="lop-nen"${k ? ' style="opacity:0"' : ''}><div id="bc${k}-dong" class="nen-dong">${svg}${anh}</div></div>`
})

// ── Máy quay: cảnh rộng, cảnh vừa và cận mặt người nói; nền trôi chậm hơn nhân vật để có chiều sâu ─
// Điểm nhìn (toạ độ khung hình) của từng nhân vật khi cận cảnh
const TAM = { meo: { x: 290 - GIAN, y: 870 }, robot: { x: 790 + GIAN, y: 870 } }
const SAU_NEN = 0.55 // nền dịch chuyển bằng 55% nhân vật
// Khung ngang thấp: cận nhân vật phụ nhắm thấp hơn 100 để cả người lọt khung, thẻ tên không đè bảng tin
const HA_PHU = NGANG ? 100 - PHU_XUONG : 0
// Cắt thẳng đầu câu (đạo diễn 15/10/2026: 64% khung đứng yên, máy quay lia mượt giữa các câu nên ít "cú cắt"): trong vòng
// máy quay, CAT_DAU = lúc bắt đầu câu; lệnh lia đầu câu (ngắn ≤ 0,8 giây) mà khung mới khác khung đang có từ 12% trở lên
// → cắt trong 1 khung hình. Khung na ná nhau thì vẫn lia mượt (cắt giữa hai khung giống nhau trông như giật).
let CAT_DAU = null
let camScale = 1
let camCuoi = { scale: 1, x: 0, y: 0 }
const lia = (t, scale, ox, oy, giay, ease = 'power2.inOut', xoay = 0) => {
  // Chỉ cắt thẳng khi khung đổi hẳn (độ phóng lệch từ 0,3): cắt giữa hai khung chỉ chặt hơn 10–25% là "jump cut", nền và
  // người gần như đứng nguyên chỗ nên trông như giật (chủ trang 16/10/2026: "background đôi khi bị giật"). Khung lệch vừa
  // (0,12–0,3) → lia mượt nửa giây bắt đầu ngay trước câu mới
  const lech = Math.abs(scale - camScale)
  if (CAT_DAU !== null && t <= CAT_DAU + 0.01 && giay <= 0.8 && lech >= 0.3) {
    t = Math.max(0, CAT_DAU - 0.08)
    giay = 0.04
    ease = 'none'
  } else if (CAT_DAU !== null && t <= CAT_DAU + 0.01 && giay <= 0.8 && lech >= 0.12) {
    t = Math.max(0, CAT_DAU - 0.3)
    giay = Math.max(giay, 0.55)
    ease = 'sine.inOut'
  }
  // Nhích dần chậm (lâu hơn 1,2 giây mà chỉ đổi rất ít: phóng < 6%, dịch < 60 điểm ảnh) → bỏ, máy đứng yên giữ khung
  const xThu = scale === 1 ? 0 : -(ox - GIUA_X) * scale
  const yThu = scale === 1 ? 0 : -(oy - GIUA_Y) * scale
  if (giay >= 1.2 && Math.abs(scale - camCuoi.scale) < 0.06 && Math.hypot(xThu - camCuoi.x, yThu - camCuoi.y) < 60) return
  camCuoi = { scale, x: xThu, y: yThu }
  camScale = scale
  // đưa điểm (ox, oy) về giữa khung với độ phóng `scale` (gốc biến đổi ở điểm giữa khung GIUA_X, GIUA_Y), nghiêng `xoay` độ
  const x = scale === 1 ? 0 : -(ox - GIUA_X) * scale
  const y = scale === 1 ? 0 : -(oy - GIUA_Y) * scale
  MAY.nv.push({ t, giay, ease, v: { scale, x, y, rotation: xoay } })
  // Nền luôn phủ kín khung: phóng thêm cho mép mờ (blur) và góc nghiêng, rồi giới hạn độ dịch để mép nền không lộ thành sọc
  const xn = xoay * SAU_NEN
  const sn = Math.max(1, 1 + (scale - 1) * SAU_NEN) * (1.03 + Math.abs(xn) * 0.035)
  const kep = (v, du) => Math.max(-du, Math.min(du, v))
  const nx = kep(x * SAU_NEN, (RONG * sn - RONG) / 2 - 8)
  const ny = kep(y * SAU_NEN, (CAO * sn - CAO) / 2 - 8)
  MAY.nen.push({ t, giay, ease, v: { scale: sn, x: nx, y: ny, rotation: xn } })
}
tw.push(`gsap.set("#camera-nen", { scale: 1.03 });`)
// Máy quay KHÔNG BAO GIỜ có hai lệnh chạy chồng nhau (nguồn giật số 1): các lệnh lia gom vào MAY rồi mới xuất. Lệnh sau
// bắt đầu trước khi lệnh trước xong → lệnh trước dừng đúng lúc đó (tại vị trí nó đang đi tới), lệnh sau xuất phát từ
// chính vị trí ấy (fromTo, giá trị tính sẵn). Đoạn bị cắt giữ kiểu tăng giảm tốc cũ trên quãng ngắn hơn: dừng êm, không giật. Trước đây hai lệnh chồng nhau: GSAP lấy điểm xuất phát theo thứ tự tua, mà
// máy dựng tua từng khúc riêng → mỗi khúc một điểm xuất phát → khung hình nhảy cóc ở chỗ nối khúc.
const MAY = { nv: [], nen: [] }
const EASE = (ten) => {
  const [loai, kieu = 'out'] = String(ten).split('.')
  const mu = { power1: 2, power2: 3, power3: 4, power4: 5 }[loai]
  if (mu) return kieu === 'in' ? (p) => p ** mu : kieu === 'inOut' ? (p) => (p < 0.5 ? (2 * p) ** mu / 2 : 1 - (2 * (1 - p)) ** mu / 2) : (p) => 1 - (1 - p) ** mu
  if (loai === 'sine') return kieu === 'in' ? (p) => 1 - Math.cos((p * Math.PI) / 2) : kieu === 'inOut' ? (p) => -(Math.cos(Math.PI * p) - 1) / 2 : (p) => Math.sin((p * Math.PI) / 2)
  return (p) => p // none / linear
}
function xuatMayQuay(sel, ds, dau) {
  const lenh = ds.map((m, k) => ({ ...m, k })).sort((a, b) => a.t - b.t || a.k - b.k)
  let v = { ...dau }
  lenh.forEach((m, j) => {
    const sau = lenh[j + 1]
    const het = m.t + m.giay
    // Lệnh sau bắt đầu cùng lúc (hoặc gần như) → lệnh này không kịp chạy, bỏ
    if (sau && sau.t - m.t < 0.02) return
    const cat = sau && sau.t < het - 0.005 ? sau.t : het
    const tl = (cat - m.t) / m.giay
    const e = EASE(m.ease)(Math.max(0, Math.min(1, tl)))
    const den = Object.fromEntries(Object.keys(v).map((k) => [k, v[k] + (m.v[k] - v[k]) * e]))
    tw.push(`tl.fromTo("${sel}", { scale: ${f(v.scale)}, x: ${f(v.x)}, y: ${f(v.y)}, rotation: ${f(v.rotation)} }, { scale: ${f(den.scale)}, x: ${f(den.x)}, y: ${f(den.y)}, rotation: ${f(den.rotation)}, duration: ${f(cat - m.t)}, ease: "${m.ease}", immediateRender: false }, ${f(m.t)});`)
    v = den
  })
}
// ── Nhân vật phụ (AI chọn khi lời thoại nhắc tới): đứng phía sau giữa hai nhân vật chính, vẫy tay / gật đầu ─
const daGioiThieu = new Set()
const gioiThieu = new Set() // câu có nhân vật phụ lần đầu xuất hiện → máy quay quay sang giới thiệu
const sanKhau = [] // { vao, ra, lech } từng lượt nhân vật phụ đứng trên sân khấu
const datMoc = [] // { t, dat } lúc Mèo / Bit bắt đầu dạt tới độ dạt mới
// Điểm máy quay nhắm khi cận Mèo / Bit: theo chỗ họ đang đứng lúc đó (đã dạt ra hay chưa)
const tamLuc = (ai, t) => {
  if (!TAM[ai]) return null
  let dat = 0
  for (const m of datMoc) if (m.t <= t + 0.3) dat = m.dat
  return { ...TAM[ai], x: TAM[ai].x + (ai === 'meo' ? -dat : dat) }
}
// Ký hiệu hoạt hình bật cạnh đầu nhân vật (visual emote): "!" lúc bất ngờ / sửng sốt, "?" lúc hỏi / thắc mắc. Gắn trong
// khung của nhân vật nên đi theo nhân vật (bước, dạt, máy quay); nhân vật không có mặt thì ký hiệu cũng không hiện.
// Câu bi kịch không dùng (trò hoạt hình lạc tông); mỗi nhân vật cách lần trước ≥ 10 giây, cả phim cách nhau ≥ 4 giây.
const DAU_HIEU = {} // nhân vật (meo / robot / phu<k>) → html
{
  const cuoiNguoi = {}
  let cuoi = -99
  const them = (ai, kieu, t) => {
    if (!ai || t - (cuoiNguoi[ai] ?? -99) < 10 || t - cuoi < 4) return
    cuoiNguoi[ai] = cuoi = t
    const id = `dh${Object.values(DAU_HIEU).join('').split('class="dau-hieu').length - 1}-${ai}`
    const ben = kieu === '?' ? 1 : -1
    DAU_HIEU[ai] = (DAU_HIEU[ai] ?? '') + `<div id="${id}" class="dau-hieu ${ai.startsWith('phu') ? 'dh-phu' : `dh-${ai}`}">${kieu}</div>`
    tw.push(`tl.fromTo("#${id}", { opacity: 0, scale: 0.2, rotation: ${-25 * ben} }, { opacity: 1, scale: 1, rotation: ${12 * ben}, duration: 0.28, ease: "back.out(3)", immediateRender: false }, ${f(t)});`)
    tw.push(`tl.to("#${id}", { rotation: ${4 * ben}, duration: 0.16, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t + 0.3)});`)
    tw.push(`tl.to("#${id}", { opacity: 0, scale: 0.6, duration: 0.25, ease: "power2.in" }, ${f(t + 1.35)});`)
  }
  loi.forEach((l, i) => {
    if (biKich(i) || doDai[i] < 1.4 || coDoVatHanhDong(i)) return
    const t0 = batDau[i]
    // Câu hỏi: có dấu "?" hoặc kết bằng từ hỏi tiếng Việt (lời đọc thường bỏ dấu hỏi), có thể kèm tiếng gọi người nghe
    const hoi = /\?\s*["”'»]?\s*$/.test(String(l.chu ?? '')) ||
      /(^|\s)(không|chưa|gì|sao|nào|hả|nhỉ|chứ|thế|vậy)(\s+(bạn|Bit|Mèo|Robot Bit|Mèo Mun|nhỉ|nhé))?\s*[.!…]*\s*$/iu.test(String(l.chu ?? ''))
    if (l.ai === 'nguoi_ke') {
      // Câu kể: nhân vật đang được kể (trên sân khấu) phản ứng
      const q = phuCuaCau[i]
      if (l.cam_xuc === 'bat_ngo') them(q, '!', t0 + 0.15)
      else if (hoi) them(q, '?', t0 + 0.3)
      return
    }
    const noi = laPhu(l.ai) ? phuCuaCau[i] : l.ai === 'meo' ? 'meo' : 'robot'
    if (l.cam_xuc === 'bat_ngo') them(noi, '!', t0 + 0.1)
    else if (hoi && ['to_mo', 'suy_nghi', 'lo_lang', 'bat_ngo'].includes(l.cam_xuc)) them(noi, '?', t0 + 0.25)
    // Người nghe sửng sốt theo lời người nói
    if (PHAN_UNG[l.cam_xuc] === 'bat_ngo' && d0(i)) them(nguoiPhanUng(i)[0], '!', t0 + 0.55)
  })
  function d0(i) { return doDai[i] > 1.6 }
}
// Đồ của CẢNH (cửa, nôi + em bé, chuông, màn hình + nút, bảng chứng khoán, tia chớp trên trời) không dồn lên người
// nhân vật (chủ trang 15/10/2026: "cái gì cũng dồn lên nhân vật nhìn bị rối và chồng chéo") — đặt ở lớp cảnh PHÍA SAU
// nhân vật (#bo-canh, đầu #camera-nv nên đi theo máy quay), đứng trên mặt sàn, về phía tay phải nhân vật đang với tới
// (nhân vật lật hình thì sang trái). Đồ cầm tay (bút, nhẫn, micro, chổi…) vẫn nằm trong tay.
// cho → [lệch ngang so với tâm nhân vật, đáy cách mặt sàn, cỡ chữ emoji]
// Khung dọc hẹp (1080): đặt gần hơn, nhỏ hơn cho đồ không trôi ra ngoài khung
const CHO_CANH = NGANG
  ? { bay: [0, 470, 170], va_cham: [215, 360, 90], va_cham_t: [-215, 360, 90], canh: [330, 0, 330], canh_cao: [270, 300, 200], canh_xa: [370, 150, 290], noi: [300, 0, 300], be: [296, 120, 118], binh: [356, 150, 60], be_ngu: [372, 250, 64], ban: [168, 150, 70], troi: [250, 560, 170], ghe: [0, 0, 270], khung: [320, -10, 420], canh_truoc: [330, 0, 330], xe_canh: [290, -40, 520], lua_san: [0, 0, 560], giuong: [330, 0, 270], giuong_gan: [225, 0, 270], suong: [0, 0, 760], xa_bo: [0, 0, 1000], nguoi_ben: [300, 0, 460], tay_nhan: [190, 170, 80], canh_thap: [250, 0, 150], chim: [190, 0, 84], chim_xa: [300, 0, 70], nen_san: [270, 0, 170] }
  : { bay: [0, 430, 130], va_cham: [175, 330, 80], va_cham_t: [-175, 330, 80], canh: [250, 0, 250], canh_cao: [215, 290, 160], canh_xa: [265, 160, 200], noi: [235, 0, 220], be: [232, 95, 92], binh: [280, 115, 48], be_ngu: [296, 190, 52], ban: [150, 150, 60], troi: [190, 540, 140], ghe: [0, 0, 252], khung: [255, -8, 340], canh_truoc: [250, 0, 250], xe_canh: [235, -34, 430], lua_san: [0, 0, 460], giuong: [270, 0, 240], giuong_gan: [200, 0, 240], suong: [0, 0, 600], xa_bo: [0, 0, 900], nguoi_ben: [250, 0, 440], tay_nhan: [160, 165, 74], canh_thap: [210, 0, 120], chim: [160, 0, 70], chim_xa: [250, 0, 58], nen_san: [220, 0, 140] }
const boCanh = []
const ganVat = (svg, id, dp, toaDo) => {
  let ra = svg
  let tren = ''
  for (const ten of VAT_CAN[id] ?? []) {
    const [bt, cho] = VAT[ten]
    if (CHO_CANH[cho] && dp) {
      const [lech, cao, co] = CHO_CANH[cho]
      // Đồ đặt TRƯỚC MẶT cầu thủ (khung thành, tường tập, hình nộm): cầu thủ luôn chạy / sút sang phải → luôn bên phải
      const ben = ['khung', 'canh_truoc'].includes(cho) ? 1 : dp.lech < 0 ? -1 : 1
      const tam = 354 + dp.lech + 186
      const san = 440 + PHU_XUONG + 544
      const w = co * 1.3
      boCanh.push(`<div id="${id}-vat-${ten}" class="vat-canh" style="left:${f(tam + ben * lech - w / 2)}px;top:${f(san - cao - co * 1.1)}px;width:${f(w)}px;height:${f(co * 1.1)}px;font-size:${co}px">${bt.startsWith('<') ? bt.replace('<svg ', '<svg width="100%" height="100%" ') : bt}</div>`)
      continue
    }
    if (toaDo && !toaDo[cho]) continue
    const [x, y, co] = toaDo?.[cho] ?? { phai: [280, 496, 96], trai: [120, 496, 96], truoc: [200, 452, 128], dau: [300, 110, 70], nguc: [200, 372, 130], vai: [296, 318, 74], xe: [200, 470, 290], mat: [200, 192, 118], day: [200, 420, 380], eo: [200, 402, 150], dem: [200, 522, 300], ban_ngoi: [200, 470, 380], bai_nguc: [214, 386, 96], tren_ban: [150, 432, 64], long: [214, 470, 92], lan_can: [200, 500, 400], phai_gay: [292, 519, 150], xe_may: [147, 470, 380], giay_ban: [214, 432, 96], mat_trai: [146, 192, 88], bong_chan: [132, 560, 62], than_ao: [200, 300, 400], buc_truoc: [200, 470, 300], chop_mat: [118, 170, 110], khoi_xe: [300, 548, 80], ghe_day: [322, 478, 230], so_tay: [196, 446, 110], dau_so: [190, 438, 40], phai_xeng: [278, 452, 270], giay: [200, 388, 140], nen_tay: [210, 356, 92], nen_quang: [210, 330, 190] }[cho]
    // Đồ vẽ sẵn (VE_VAT, khung 100×100): nhóm ngoài đặt chỗ + cỡ, nhóm trong mang id để GSAP chạy (không đè transform)
    const el = bt.startsWith('<')
      ? `<g transform="translate(${bt.includes(CAN_CO) ? `${x - 10.5 * (co / 100)} ${y - 95 * (co / 100)}` : `${x - co / 2} ${y - co / 2}`}) scale(${co / 100})"><g id="${id}-vat-${ten}" opacity="0">${bt.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></g>`
      : `<text id="${id}-vat-${ten}" x="${x}" y="${y}" font-size="${co}" text-anchor="middle" dominant-baseline="middle" opacity="0" style="font-family: 'Emoji', sans-serif">${bt}</text>`
    // Người có khớp khuỷu: đồ cầm tay gắn vào cẳng tay (đi theo bàn tay khi gập khuỷu)
    // Chỗ phai_… / trai_…: vẫn cầm ở tay đó, chỉ khác toạ độ / cỡ (xẻng dài…)
    const tayCam = cho.startsWith('phai') ? 'phai' : cho.startsWith('trai') ? 'trai' : cho
    const vaoThan = cho.startsWith('than_') && ra.includes(`<g id="${id}-goc-than">`)
    const mo = vaoThan ? `<g id="${id}-goc-than">` : ra.includes(`<g id="${id}-cang-${tayCam}">`) ? `<g id="${id}-cang-${tayCam}">` : `<g id="${id}-tay-${tayCam}">`
    // Chèn ở CUỐI nhóm cánh tay (trước thẻ </g> khớp với nó) để đạo cụ vẽ đè lên đồ nhân vật đang cầm sẵn (cặp, sách…)
    const dau = ra.indexOf(mo)
    if ((vaoThan || tayCam === 'phai' || tayCam === 'trai') && dau >= 0) {
      let sau = 1
      let k = dau + mo.length
      while (sau > 0 && k < ra.length) {
        const mo2 = ra.indexOf('<g', k)
        const dong = ra.indexOf('</g>', k)
        if (dong < 0) break
        if (mo2 >= 0 && mo2 < dong) {
          sau++
          k = mo2 + 2
        } else {
          sau--
          k = dong + (sau ? 4 : 0)
        }
      }
      ra = sau === 0 ? ra.slice(0, k) + el + ra.slice(k) : ra.replace(mo, mo + el)
    }
    else tren += el
  }
  return ra + tren
}
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
  // Góc nhìn (chủ trang 16/10/2026: nhân vật nhìn từ nhiều góc): quay nghiêng theo hướng đi khi bước vào, đổi chỗ, đi bộ /
  // chạy, rời đi; quay ¾ khi buồn (ngoảnh đi) hay suy nghĩ (nhìn sang bên). Góc gốc của hình nhìn về bên trái svg; svg
  // người đứng bên trái đã lật sẵn → góc gốc nhìn sang phải màn hình. Nhìn ngược lại: lật lớp #<id>-quay qua 0 (thấy như
  // xoay người), không lật tức thì
  const svgPhu = NHAN_VAT_PHU[dp.ten].svg(id)
  const coGoc = svgPhu.includes(`${id}-goc-mat"`)
  const coMatXa = svgPhu.includes('goc-mat-xa')
  const huongGoc = dp.lech < 0 ? 1 : -1
  let latQuay = 1
  const quay = (goc, t, huong = huongGoc, dur = 0.22) => {
    if (!coGoc) return
    const lat = goc === 'thang' || goc === 'sau' ? latQuay : huong === huongGoc ? 1 : -1
    if (lat !== latQuay) {
      tw.push(dur ? `tl.fromTo("#${id}-quay", { scaleX: ${latQuay} }, { scaleX: ${lat}, duration: ${f(Math.max(0.12, dur * 0.7))}, ease: "sine.inOut", immediateRender: false }, ${f(t)});` : `tl.set("#${id}-quay", { scaleX: ${lat} }, ${f(t)});`)
      latQuay = lat
    }
    for (const [bp, v] of Object.entries(GOC_NHIN[goc])) {
      if (bp === 'goc-mat-xa' && !coMatXa) continue
      const gt = Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(', ')
      tw.push(dur ? `tl.to("${chonGoc(id, bp)}", { ${gt}, duration: ${f(dur)}, ease: "sine.inOut" }, ${f(t)});` : `tl.set("${chonGoc(id, bp)}", { ${gt} }, ${f(t)});`)
    }
  }
  // Quay về chính diện, rồi trả lớp lật về như cũ (đồ cầm tay về đúng tay)
  const veThang = (t, dur = 0.22) => {
    if (!coGoc) return
    quay('thang', t, huongGoc, dur)
    if (latQuay !== 1) {
      tw.push(`tl.fromTo("#${id}-quay", { scaleX: -1 }, { scaleX: 1, duration: 0.16, ease: "sine.inOut", immediateRender: false }, ${f(t + dur)});`)
      latQuay = 1
    }
  }
  if (coGoc) for (const [bp, tam] of Object.entries(TAM_GOC)) tw.push(`gsap.set("${chonGoc(id, bp)}", { svgOrigin: "${tam}" });`)
  tw.push(`gsap.set("#${id}-dau", { svgOrigin: "200 250" }); gsap.set("#${id}-tay-phai", { svgOrigin: "270 300" }); gsap.set("#${id}-tay-trai", { svgOrigin: "130 300" }); gsap.set("#${id}-mieng-mo", { svgOrigin: "200 226" });`)
  tw.push(`gsap.set("#${id}-cang-phai", { svgOrigin: "280 372" }); gsap.set("#${id}-cang-trai", { svgOrigin: "120 372" }); gsap.set("#${id}-chan-trai", { svgOrigin: "174 470" }); gsap.set("#${id}-chan-phai", { svgOrigin: "226 470" }); gsap.set("#${id}-ong-trai", { svgOrigin: "174 512" }); gsap.set("#${id}-ong-phai", { svgOrigin: "226 512" });`)
  // Đi bộ vào từ mép gần chỗ họ đứng (người bên trái vào từ trái), xong bước trước khi câu của họ bắt đầu; không sớm
  // hơn lúc câu trước dứt tiếng. Bước đi: nhún người + đánh hai tay, số bước lẻ để kết thúc đúng tư thế
  const ben = dp.lech < 0 || (dp.lech === 0 && k % 2) ? -1 : 1
  // Người vừa xong việc ở câu trước rời đi từ 0,3 giây cuối câu đó → người mới chỉ bước vào khi họ đã đi hẳn
  const raTruoc = Math.max(0, ...doanPhu.filter((x) => x !== dp && x.het === dp.tu - 1).map((x) => batDau[x.het] + doDai[x.het] + 0.05))
  const vao = Math.max(raTruoc, dp.tu ? batDau[dp.tu - 1] + doDai[dp.tu - 1] - 0.3 : 0, t0 - 0.85)
  const diVao = Math.max(0.4, Math.min(0.8, t0 + 0.3 - vao))
  if (LUC_DONG_TAC[dp.tu]?.[0] === 'lai_xe_may') tw.push(`tl.fromTo("#${id}", { opacity: 0, x: 0, y: 0, scale: 1 }, { opacity: 1, duration: 0.15 }, ${f(Math.max(vao, LUC_DONG_TAC[dp.tu][1] - 0.1))});`)
  else {
    tw.push(`tl.fromTo("#${id}", { opacity: 0, x: ${ben * 620}, y: 0, scale: 1 }, { opacity: 1, x: 0, duration: ${f(diVao)}, ease: "power1.out" }, ${f(vao)});`)
    quay('nghieng', vao, -ben, 0)
    veThang(vao + diVao - 0.12)
    tw.push(...buocChan(id, vao, diVao, Math.max(0.16, diVao / 3)))
    tw.push(`tl.fromTo("#${id} svg", { y: 0 }, { y: -14, duration: ${f(diVao / 6)}, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(vao)});`)
    tw.push(`tl.fromTo(["#${id}-tay-trai", "#${id}-tay-phai"], { rotation: (i) => (i ? -22 : 22) }, { rotation: (i) => (i ? 22 : -22), duration: ${f(diVao / 3)}, yoyo: true, repeat: 2, ease: "sine.inOut" }, ${f(vao)});`)
    tw.push(`tl.to(["#${id}-tay-trai", "#${id}-tay-phai"], { rotation: 0, duration: 0.2 }, ${f(vao + diVao - 0.05)});`)
  }
  // Vẫy chào khi mới xuất hiện — trừ khi câu đầu của họ đã có hành động (vẫy tay đè lên động tác đi bộ, mở cửa…)
  if (!LUC_DONG_TAC[dp.tu]) {
    tw.push(`tl.to("#${id}-tay-phai", { rotation: -140, duration: 0.3, ease: "back.out(2)" }, ${f(t0 + 0.5)});`)
    tw.push(`tl.to("#${id}-tay-phai", { rotation: -115, duration: 0.18, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t0 + 0.8)});`)
    tw.push(`tl.to("#${id}-tay-phai", { rotation: 0, duration: 0.3 }, ${f(t0 + 1.9)});`)
  }
  // Đứng trên sân khấu (Character Acting Engine, cấp 1 – idle): thở (thân phồng nhẹ), dồn trọng tâm trái – phải rất chậm,
  // chớp mắt ở mốc cố định. Không gật đầu liên tục cho có: gật / nhìn người nói làm theo từng câu (xem phần câu thoại)
  // ── Di chuyển trên sân khấu theo từng câu (chủ trang 15/10/2026: "hành động quá sơ sài, toàn đứng, không có chuyển
  // động nhiều phía"). Lớp #<id>-buoc: đi ngang giữa các vị trí trên sân khấu, tiến gần / lùi xa máy quay (to / nhỏ);
  // lớp #<id>-nhun: dáng bước (nhún + lắc theo nhịp chân), khom người làm việc sát sàn, nhảy. Tách khỏi svg (động tác
  // tay chân, đi lại của hành động kể chuyện) nên không giành nhau.
  //  · hành động có đồ của cảnh (cửa, nôi, chuông…): về đúng chỗ đứng cạnh đồ (vị trí 0)
  //  · hành động đi lại (xách vali, đi bộ, chạy, lái xe): đứng sẵn bên trái để đi sang phải không ra khỏi khung
  //  · câu khác đổi vị trí theo vòng phải → giữa → trái → giữa; khẳng định / tức giận bước lên gần máy quay; bất ngờ
  //    giật lùi; buồn lùi xa, chậm; vui nảy lên khi tới nơi
  {
    const BUOC = NGANG ? 180 : 140
    const CANH = new Set(['mo_cua', 'nam_noi', 'gong_chuong', 'rung_chuong', 'bam_nut', 'dam_bao_cat', 'kham_suc_khoe', 'ngoi_thien', 'buoc_vao_dai', 'doi_dau', 'dam_boc', 'dam_moc', 'ha_guc', 'can_tai', 'dung_cho_dem', 'nhan_dai', 'treo_bien', 'can_hang', 'cat_bang', 'choi_bai', 'dan_lat', 'dao_dat', 'cho_chim_an', 'thap_nen', 'ngoi_lang_le', 'nam_tay', 'nhin_bien', 'vo_vai', 'nhuong_vi_tri', 'noi_chuyen', 'ngoi_doi_dien', 'hop_dong_tren_ban', 'ban_hang', 'to_chuc_giai_dua', 'dai_dien', 'che_giau', 'chien_tranh_bung_no', 'ra_doi_xe', 'gan_bien', 'cam_but_run', 'cam_hoa_don', 'tiem_thuoc', 'dung_nghe'])
    const DI = new Set(['xach_vali', 'di_bo', 'chay', 'lai_xe', 'ganh_vac', 'di_may_bay', 'dap_xe', 'buoc_qua_suong', 'chong_gay', 'buoc_vao', 'lai_xe_may', 'da_bong', 'ghi_ban', 're_bong', 'tap_luyen', 'sut_bong', 'choi_bong', 'buoc_vao_phong', 'buoc_ra_san'])
    const SAN = new Set(['rua_bat', 'lap_rap', 'nam_noi', 'dong_may_tinh', 'an_com', 'dem_tien'])
    const VONG = [1, 0, -1, 0]
    let viTri = 0
    let gan = 1
    let vong = 0
    for (let i = dp.tu; i <= dp.het; i++) {
      if (phuCuaCau[i] !== id) continue
      const l = loi[i]
      const t = batDau[i] + 0.05
      const d = doDai[i]
      const dt = LUC_DONG_TAC[i]?.[0]
      let den = viTri
      let ganDen = 1
      if (CANH.has(dt)) den = 0
      else if (dt === 'lai_xe_may') den = 0
      else if (DI.has(dt)) den = -1
      else if (i > dp.tu) den = VONG[vong++ % VONG.length]
      if (['khang_dinh', 'tuc_gian'].includes(l.cam_xuc)) ganDen = 1.08
      else if (l.cam_xuc === 'buon') ganDen = 0.94
      const giatLui = l.cam_xuc === 'bat_ngo' && !dt
      if (giatLui) ganDen = 0.95
      if (den === viTri && Math.abs(ganDen - gan) < 0.01) {
        // Đứng yên câu này: dồn trọng tâm sang một bên rồi về (không đứng chết)
        if (d > 2.5) tw.push(`tl.to("#${id}-nhun", { rotation: ${i % 2 ? 2.2 : -2.2}, duration: 0.6, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(t + 0.4)});`)
      } else {
        const quang = Math.abs(den - viTri)
        const giay = giatLui ? 0.28 : Math.min(1.1, Math.max(0.55, 0.45 + quang * 0.3 + (l.cam_xuc === 'buon' ? 0.3 : 0)))
        tw.push(`tl.to("#${id}-buoc", { x: ${den < 0 && !NGANG ? Math.round(den * BUOC * 0.6) : den * BUOC}, scale: ${ganDen}, y: ${f((ganDen - 1) * 300)}, duration: ${f(giay)}, ease: "${giatLui ? 'power3.out' : 'sine.inOut'}" }, ${f(t)});`)
        if (quang > 0) {
          // Dáng bước: nhún theo nhịp chân, lắc người nghiêng về hướng đi
          const nhip = 0.16
          const lan = Math.max(1, Math.round(giay / nhip / 2)) * 2 - 1
          const huong = den > viTri ? 1 : -1
          if (!SAN.has(dt) && !DI.has(dt) && giay >= 0.5) {
            quay('nghieng', t, huong, 0.18)
            veThang(t + giay - 0.1, 0.2)
            tw.push(...buocChan(id, t, giay, 0.2))
          }
          tw.push(`tl.fromTo("#${id}-nhun", { y: 0 }, { y: -9, duration: ${nhip}, yoyo: true, repeat: ${lan}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`)
          tw.push(`tl.fromTo("#${id}-nhun", { rotation: ${-3 + huong * 2} }, { rotation: ${3 + huong * 2}, duration: ${nhip}, yoyo: true, repeat: ${lan}, ease: "sine.inOut", immediateRender: false }, ${f(t)});`)
          tw.push(`tl.to("#${id}-nhun", { rotation: 0, duration: 0.15 }, ${f(t + giay)});`)
        } else if (giatLui) tw.push(`tl.fromTo("#${id}-nhun", { y: 0 }, { y: -26, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, ${f(t)});`)
        if (l.cam_xuc === 'vui' && !dt) tw.push(`tl.fromTo("#${id}-nhun", { y: 0 }, { y: -30, duration: 0.18, yoyo: true, repeat: 1, ease: "sine.out", immediateRender: false }, ${f(t + giay + 0.05)});`)
        viTri = den
        gan = ganDen
      }
      if (['di_bo', 'chay', 'xach_vali', 'ganh_vac', 'dap_xe', 'buoc_qua_suong', 'chong_gay', 'buoc_vao', 'lai_xe_may', 'da_bong', 'ghi_ban', 're_bong', 'tap_luyen', 'sut_bong', 'choi_bong', 'buoc_vao_phong', 'buoc_ra_san'].includes(dt)) {
        const bd = Math.max(LUC_DONG_TAC[i][1], i === dp.tu && dt !== 'lai_xe_may' ? vao + diVao + 0.12 : 0)
        const BONG_DA = ['da_bong', 'ghi_ban', 're_bong', 'tap_luyen', 'sut_bong', 'choi_bong']
        const di = dt === 'lai_xe_may' ? Math.max(0.6, batDau[i] + d - bd) : dt === 'chong_gay' || BONG_DA.includes(dt) ? Math.max(0.6, batDau[i] + d - bd - 0.7) : Math.max(0.6, Math.min(dt === 'chay' ? 2 : 2.4, batDau[i] + d - bd))
        // xe máy chạy từ phải sang trái (nhìn sang trái); còn lại đi từ trái sang phải
        quay('nghieng', bd, dt === 'lai_xe_may' ? -1 : 1, dt === 'lai_xe_may' ? 0 : 0.18)
        veThang(bd + di, 0.2)
        if (dt !== 'chong_gay' && dt !== 'lai_xe_may' && !BONG_DA.includes(dt)) tw.push(...buocChan(id, bd, di, dt === 'chay' ? 0.2 : 0.32, dt === 'chay'))
      } else if (!dt && d > 2 && (l.cam_xuc === 'buon' || l.cam_xuc === 'suy_nghi')) {
        quay('ba_tu', t + 0.35, l.cam_xuc === 'buon' ? ben : -ben, 0.35)
        veThang(t + d - 0.5, 0.3)
      }
      X_BUOC[i] = viTri < 0 && !NGANG ? Math.round(viTri * BUOC * 0.6) : viTri * BUOC
      // Làm việc sát sàn: khom người trong lúc làm, đứng thẳng lại cuối câu
      if (SAN.has(dt)) {
        const bd = LUC_DONG_TAC[i][1]
        tw.push(`tl.to("#${id}-nhun", { scaleY: 0.94, y: 16, duration: 0.35, ease: "sine.inOut" }, ${f(bd)});`)
        tw.push(`tl.to("#${id}-nhun", { scaleY: 1, y: 0, duration: 0.35, ease: "sine.inOut" }, ${f(batDau[i] + d - 0.3)});`)
      }
    }
  }
  const dung = vao + diVao - 0.05, roi = het - 0.3 // nhịp thở bắt đầu trước hành động đầu tiên một chút (lệnh trùng giờ thì hành động bị bỏ)
  if (roi - dung > 1) {
    tw.push(`gsap.set("#${id} svg", { transformOrigin: "50% 100%" }); gsap.set("#${id}-mat", { svgOrigin: "200 188" });`)
    tw.push(`tl.fromTo("#${id} svg", { scaleY: 1 }, { scaleY: 1.014, duration: 1.6, yoyo: true, repeat: ${lap(roi - dung, 1.6) | 1}, ease: "sine.inOut", immediateRender: false }, ${f(dung)});`)
    tw.push(`tl.fromTo("#${id} svg", { rotation: ${k % 2 ? 0.9 : -0.9} }, { rotation: ${k % 2 ? -0.9 : 0.9}, duration: 2.6, yoyo: true, repeat: ${lap(roi - dung, 2.6) | 1}, ease: "sine.inOut", immediateRender: false }, ${f(dung)});`)
    for (let c = dung + 1.1 + (k % 3) * 0.6; c < roi - 0.3; c += 3.4) tw.push(`tl.to("#${id}-mat", { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1 }, ${f(c)});`)
  }
  // Rời sân khấu: quay lưng đi ra phía mép đã vào
  // Hết nhiệm vụ: rời nhanh (0,35 giây) ngay cuối câu cuối của mình, nhường chỗ cho người kế tiếp
  quay('nghieng', het - 0.32, ben, 0.12)
  tw.push(...buocChan(id, het - 0.3, 0.35, 0.17))
  tw.push(`tl.to("#${id}", { x: ${ben * 420}, opacity: 0, duration: 0.35, ease: "power2.in" }, ${f(het - 0.3)});`)
  tw.push(`tl.to("#${id} svg", { y: -12, duration: 0.1, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(het - 0.3)});`)
  // Không ghi tên trên đầu (trang phục tự nói lên họ là ai); hai nhân vật chính dạt sang hai bên chừa chỗ cho nhân vật phụ
  // Mèo / Bit dạt ra bao xa: tính chung cho mọi người trên sân khấu theo thời gian (sanKhau, xem dưới)
  sanKhau.push({ vao, ra: het - 0.3, lech: dp.lech })
  return `<div id="${id}" class="nv-phu" data-ten="${dp.ten}" style="left:${354 + dp.lech}px"><div id="${id}-buoc" class="nv-buoc"><div id="${id}-nhun" class="nv-buoc"><div id="${id}-quay" class="nv-buoc"><svg viewBox="${NHAN_VAT_PHU[dp.ten].viewBox ?? '0 0 400 600'}" width="372" height="558" class="nv">${ganVat(svgPhu, id, dp)}</svg></div></div></div>${DAU_HIEU[id] ?? ''}</div>`
})
// Mèo / Bit dạt sang hai bên chừa chỗ cho nhân vật phụ. Tính theo thời gian, mỗi lúc có người vào / ra: ai đang đứng trên
// sân khấu, đứng ở đâu → độ dạt cần thiết (có người đứng lệch trái / phải hoặc hai người cùng đứng: dạt xa 300; một người
// đứng giữa: 130; không còn ai: về chỗ cũ). Không để mỗi người tự kéo Mèo / Bit (người rời đi kéo về giữa trong khi người
// khác vẫn đứng lệch → đè nhau)
{
  const moc = [...new Set(sanKhau.flatMap((s) => [s.vao, s.ra]))].sort((a, b) => a - b)
  let datCu = 0
  for (const t of moc) {
    const co = sanKhau.filter((s) => s.vao <= t + 0.01 && t + 0.01 < s.ra)
    const dat = !co.length ? 0 : co.length >= 2 || co.some((s) => s.lech) ? 300 : 130
    if (dat === datCu) continue
    // Dạt ra: ngay lúc người mới bước vào; về giữa: chờ người cuối rời hẳn. Không trước lúc Mèo / Bit nhảy vào khung xong
    // (hiệu ứng nhảy vào đặt họ về chỗ cũ khi kết thúc, sẽ đè mất độ dạt nếu dạt sớm hơn)
    const luc = Math.max(dat > datCu ? t : t + 0.2, VAO_SAN + 0.35)
    tw.push(`tl.to("#o-meo", { x: ${-dat}, duration: 0.5, ease: "power2.inOut" }, ${f(luc)});`)
    tw.push(`tl.to("#o-robot", { x: ${dat}, duration: 0.5, ease: "power2.inOut" }, ${f(luc)});`)
    datMoc.push({ t: luc, dat })
    datCu = dat
  }
}

// ── Chỉ dẫn đạo diễn AI chọn cho từng câu (khi có): khung hình + chuyển động máy quay ─
// Độ phóng theo khung hình; góc thấp / góc cao giả lập bằng cách nhìn thấp xuống chân / cao trên đầu nhân vật
const KHUNG = { toan_canh: 1, trung_canh: 1.2, can_canh: 1.48, sieu_can: 1.85, goc_thap: 1.3, goc_cao: 1.16 }
// Rung tay (handheld): lắc nhẹ cả thế giới (nền + nhân vật), số lần lẻ để kết thúc đúng chỗ cũ
const rungTay = (t0, d) =>
  tw.push(`tl.fromTo(".the-gioi", { x: ${LECH_X}, y: ${LECH_Y}, rotation: 0 }, { x: ${LECH_X + 7}, y: ${LECH_Y - 5}, rotation: 0.25, duration: 0.19, yoyo: true, repeat: ${2 * Math.max(1, Math.floor(d / 0.38)) + 1}, ease: "sine.inOut" }, ${f(t0)});`)
function quayChiDan(l, i, t0, conLai, tamRieng = null) {
  const tam = tamRieng ?? tamLuc(l.ai, t0) ?? (l.ai === 'nguoi_ke' ? { x: GIUA_X, y: 900 } : tamLuc('robot', t0))
  const ben = tamLuc(l.ai === 'meo' ? 'robot' : 'meo', t0)
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
  CAT_DAU = i ? t0 : null
  const tam = tamLuc(l.ai, t0) ?? (l.ai === 'nguoi_ke' ? { x: GIUA_X, y: 900 } : tamLuc('robot', t0))
  const nghe = l.ai === 'meo' ? 'robot' : 'meo'
  const lui = truocDoiCanh.has(i) && d > 2.2 ? 0.7 : 0 // chừa cuối câu để lùi về cảnh rộng
  const conLai = Math.max(0.5, d - 0.5 - lui)
  const chuaDau = THE_TREN.has(i)
  const chiDan = !chuaDau && !laPhu(l.ai) && !gioiThieu.has(i) && KHUNG[l.khung_hinh] !== undefined
  let canCanhChiDan = false
  if (chuaDau) {
    // Thẻ trên cao: lùi nhẹ (0,92) và hạ khung ~170px để đầu mọi người nằm dưới thẻ; trôi rất chậm cho khỏi đứng hình
    // Câu có hành động (ngồi, khom…) hạ khung ít hơn, kẻo người hạ thấp chìm xuống dải phụ đề
    const ha = LUC_DONG_TAC[i] ? 20 : 185
    lia(Math.max(0, t0 - 0.25), 0.92, GIUA_X, GIUA_Y - ha, 0.55)
    lia(t0 + 0.35, 0.93, GIUA_X + (i % 2 ? 12 : -12), GIUA_Y - ha, conLai, 'sine.inOut')
  } else if (l.ai === 'nguoi_ke' && phuCuaCau[i]) {
    // Lời kể, có người đang diễn (chủ trang 16/10/2026: "máy quay đứng một cỡ cảnh"): máy bám theo chỗ người đó đứng;
    //  · câu mở một cảnh mới: toàn cảnh giới thiệu nơi chốn
    //  · câu có hành động: trung cảnh thấy trọn người + đạo cụ (không cận làm mất đạo cụ khỏi khung)
    //  · buồn / bất ngờ / lo lắng / tức giận (không hành động): cận mặt người diễn
    //  · còn lại: theo cỡ cảnh AI chọn, lệch về phía người diễn
    const ax = (viTriPhu[phuCuaCau[i]] ?? 540) + (X_BUOC[i] ?? 0)
    const mat = 740 - HA_PHU
    const moCanh = i === 0 || doanCanh.some((dc) => dc.tu === i) || (!!l.dia_diem && l.dia_diem !== loi[i - 1]?.dia_diem)
    const vao = Math.max(0, t0 - 0.2)
    if (moCanh) {
      lia(vao, 1, GIUA_X, GIUA_Y, 0.6)
      lia(t0 + 0.4, 1.05, (ax + GIUA_X) / 2, GIUA_Y - 10, conLai, 'sine.inOut')
    } else if (LUC_DONG_TAC[i]) {
      lia(vao, NGANG ? 1.1 : 1.2, (ax * 2 + GIUA_X) / 3, 880, 0.55)
      lia(t0 + 0.35, NGANG ? 1.14 : 1.24, (ax * 2 + GIUA_X) / 3, 870, conLai, 'sine.inOut')
    } else if (l.cam_xuc === 'bat_ngo') {
      lia(t0 - 0.1, 1.6, ax, mat - 40, 0.42, 'power2.out')
      lia(t0 + 0.35, 1.63, ax, mat - 40, conLai, 'sine.out')
    } else if (l.cam_xuc === 'buon' || l.cam_xuc === 'lo_lang') {
      lia(Math.max(0, t0 - 0.3), 1.32, ax, mat - 10, 0.8, 'sine.inOut')
      lia(t0 + 0.5, 1.5, ax, mat - 30, conLai, 'sine.inOut')
    } else if (l.cam_xuc === 'tuc_gian') {
      lia(t0 - 0.1, 1.5, ax, mat - 30, 0.35, 'power3.out')
      rungTay(t0 + 0.3, Math.min(1.6, conLai))
    } else if (KHUNG[l.khung_hinh] !== undefined) {
      quayChiDan(l, i, t0, conLai, { x: ax, y: mat + 40 })
    } else {
      const sc = i % 2 ? 1.2 : 1.14
      lia(vao, sc, (ax + GIUA_X) / 2, 960, 0.6)
      lia(t0 + 0.4, sc + 0.04, (ax + GIUA_X) / 2 + (i % 2 ? 18 : -18), 960, conLai, 'sine.inOut')
    }
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
  // Phim tiểu sử: cả câu nhân vật (chính / phụ) nói trong cảnh tái hiện, Mèo / Bit cũng lui ra (đánh giá phim Ferrari
  // 16/10/2026: robot to che 1/3 khung trong văn phòng Milan năm 1939 — khán giả bị kéo ra khỏi cảnh lịch sử)
  if (l.ai === 'nguoi_ke' || (nhan_vat_chinh && laPhu(l.ai))) {
    // B-roll: lời kể đi cùng cảnh minh hoạ, Mèo / Bit lui hẳn ra hai mép (quay lại khi tới lượt họ)
    tw.push(`tl.to("#o-meo", { xPercent: -150, duration: 0.6, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.35))});`)
    tw.push(`tl.to("#o-robot", { xPercent: 150, duration: 0.6, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.35))});`)
    // Sân khấu trống (không nhân vật phụ / nhân vật chính đứng): nền thành cảnh minh hoạ toàn màn hình — rõ nét, sáng hơn
    // (bình thường nền hơi nhoè để nhân vật nổi); câu sau không phải lời kể trống thì nhoè lại
    const trong = (j) => loi[j]?.ai === 'nguoi_ke' && !phuCuaCau[j]
    if (!phuCuaCau[i]) {
      if (!trong(i - 1)) tw.push(`tl.to("#camera-nen", { filter: "blur(0px) saturate(1.12) brightness(1.06)", duration: 0.6, ease: "power1.inOut" }, ${f(Math.max(0, t0 - 0.3))});`)
      if (!trong(i + 1)) tw.push(`tl.to("#camera-nen", { filter: "blur(1.6px) saturate(1.08) brightness(1)", duration: 0.6, ease: "power1.inOut" }, ${f(t0 + d - 0.2)});`)
    }
  } else {
    tw.push(`tl.to("#o-${nghe}", { xPercent: ${canCanh ? (nghe === 'robot' ? 45 : -45) : 0}, duration: 0.55, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.3))});`)
    tw.push(`tl.to("#o-${nghe === 'robot' ? 'meo' : 'robot'}", { xPercent: 0, duration: 0.55, ease: "power2.inOut" }, ${f(Math.max(0, t0 - 0.3))});`)
  }
  if (canCanh && lui) tw.push(`tl.to("#o-${nghe}", { xPercent: 0, duration: ${f(lui)}, ease: "power2.inOut" }, ${f(t0 + d - lui)});`)
  // Shot / reverse shot: lời mạnh (giận, bất ngờ, buồn, lo) trong câu đủ dài → cuối câu máy cắt qua mặt người phản ứng
  // Mỗi cảnh sau cú cắt giữ ít nhất 1,6 giây (phim Messi 16/10/2026: câu 3,5 giây cắt sang Bit 1 giây rồi câu sau cắt về
  // cảnh rộng — hai cú cắt trong 1 giây, khán giả thấy màn hình giật)
  // chính, giữ tới hết câu (câu sau máy quay tự về người nói mới). Không cắt khi đang cận một người (người nghe đã lùi ra
  // ngoài khung), khi có thẻ trên cao, hay khi sắp đổi cảnh (đã lùi về cảnh rộng)
  const pu = nguoiPhanUng(i)[0]
  const CAT_PU = 1.6
  if (pu && !canCanh && !chuaDau && !lui && d > 4.5 && PHAN_UNG_MANH.has(l.cam_xuc)) {
    const vt = pu.startsWith('phu') ? { x: viTriPhu[pu] ?? 540, y: 720 - HA_PHU } : tamLuc(pu, t0 + d - 1)
    // Cắt thẳng (1 khung hình) như cắt cảnh thật, không lia nhanh: lia 0,22 giây ở 24 hình/giây trông như hình giật
    // (video 14/10/2026). Sau đó giữ khung, đẩy rất chậm tới hết câu (lệnh này chạy tới cuối nên đè lệnh máy quay của câu)
    lia(t0 + d - CAT_PU, 1.45, vt.x, vt.y - 30, 0.04, 'none')
    lia(t0 + d - CAT_PU + 0.05, 1.48, vt.x, vt.y - 34, CAT_PU - 0.05, 'sine.inOut')
  }
  // Câu dài (trên 5 giây): giữa câu cắt thẳng sang cận mặt người đang diễn (người nói, hoặc nhân vật đang được kể), giữ
  // khung đẩy chậm tới hết câu / tới cú cắt phản ứng — người xem không phải nhìn một khung hơn 5 giây (góp ý 14/10/2026:
  // 15 giây mới cắt một lần). Không cắt khi đang cận sẵn, có thẻ trên cao, đang phủ ảnh tư liệu hay sắp đổi cảnh.
  const catPU = pu && !canCanh && !chuaDau && !lui && d > 4.5 && PHAN_UNG_MANH.has(l.cam_xuc)
  const dien = l.ai === 'nguoi_ke' || laPhu(l.ai) ? phuCuaCau[i] : l.ai === 'meo' ? 'meo' : 'robot'
  const phuAnh = doanAnh.some((c) => c.kieu === 'toan' && c.tu <= i && c.het >= i)
  if (d > 4 && dien && !canCanh && !chuaDau && !lui && !phuAnh && !LUC_DONG_TAC[i]) {
    const giua = t0 + d * 0.48
    const het = catPU ? t0 + d - CAT_PU : t0 + d + 0.05
    if (het - giua > 2 && giua - t0 > 2) {
      const vt = dien.startsWith('phu') ? { x: viTriPhu[dien] ?? 540, y: 760 - HA_PHU } : tamLuc(dien, giua)
      lia(giua, 1.5, vt.x, vt.y - 40, 0.04, 'none')
      lia(giua + 0.05, 1.55, vt.x + (i % 2 ? 12 : -12), vt.y - 48, het - giua - 0.05, 'sine.inOut')
    }
  }
})
CAT_DAU = null

// ── Đạo cụ: hiện bên cạnh người nói theo nội dung câu (AI chọn), bay nhẹ rồi biến mất ─
// Con số bật to (chọn ở SO_DONG): phóng từ nhỏ, giữ 1,6 giây, vụt mờ
const tiengSoDong = [] // tiếng "ting" lúc con số bật ra (phát sau khi có themAm)
const soDong = Object.entries(SO_DONG).map(([k, s]) => {
  const i = Number(k)
  const t = Math.max(batDau[i] + 0.1, lucTu(i, s.kyTu) - 0.15)
  const het = Math.min(t + 1.8, batDau[i] + doDai[i] + 0.2)
  tw.push(`tl.fromTo("#sd${i}", { opacity: 0, scale: 0.3, rotation: -6 }, { opacity: 1, scale: 1, rotation: -2, duration: 0.45, ease: "back.out(2.4)", immediateRender: false }, ${f(t)});`)
  tw.push(`tl.to("#sd${i}", { opacity: 0, scale: 1.25, duration: 0.3, ease: "power2.in" }, ${f(Math.max(t + 0.6, het - 0.3))});`)
  tiengSoDong.push(t)
  diemChi.push(t)
  return `<div id="sd${i}" class="so-dong">${esc(s.chu)}</div>`
})

const daoCu = []
const daoCuKhung = [] // khung ngang: đạo cụ ở góc trên bên phải của khung hình
const amDaoCu = [] // [tên đạo cụ, câu, lúc hiện] → tiếng đạo cụ (FOLEY_DAO_CU)
loi.forEach((l, i) => {
  const bt = DAO_CU[l.dao_cu]
  // Câu đang phủ ảnh tư liệu toàn khung thì bỏ đạo cụ
  if (!bt || (NGANG && doanAnh.some((c) => c.kieu === 'toan' && c.tu <= i && c.het >= i)) || coDoVatHanhDong(i)) return
  const t0 = batDau[i]
  const d = doDai[i]
  const id = `dc${i}`
  // Đạo cụ của nhân vật phụ nằm cùng chỗ với đạo cụ của người kể
  if (NGANG) daoCuKhung.push(`<div id="${id}" class="dao-cu-khung">${bt}</div>`)
  else daoCu.push(`<div id="${id}" class="dao-cu ${laPhu(l.ai) ? 'nguoi_ke' : l.ai}">${bt}</div>`)
  tw.push(`tl.fromTo("#${id}", { opacity: 0, scale: 0, rotation: -30 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2.2)" }, ${f(t0 + 0.25)});`)
  amDaoCu.push([l.dao_cu, i, t0 + 0.25])
  tw.push(`tl.to("#${id}", { y: -24, rotation: 6, duration: 0.6, yoyo: true, repeat: ${lap(d - 1.2, 0.6) | 1}, ease: "sine.inOut" }, ${f(t0 + 0.75)});`)
  tw.push(`tl.to("#${id}", { opacity: 0, scale: 0.3, duration: 0.3, ease: "power2.in" }, ${f(t0 + d - 0.2)});`)
})

// ── Huy hiệu thương hiệu (logoThuongHieu.mjs): lời thoại nhắc Facebook, Google, Nvidia… → huy hiệu bật lên ở góc trên đúng
// lúc giọng đọc tới tên, nằm cạnh chỗ đạo cụ minh hoạ (không chồng nhau), tắt cuối câu. Thương hiệu ngoài danh sách: bước
// chuẩn bị hành động ghi l.logo ([{ ten, mau, chu }]). Cùng thương hiệu ở câu ngay trước thì không bật lại (khỏi nhấp nháy);
// câu đang phủ ảnh tư liệu toàn khung thì bỏ.
const logoKhung = []
const amLogo = [] // lúc huy hiệu bật lên → tiếng "bóp" nhỏ (phát ở phần âm thanh)
{
  let truoc = new Set()
  loi.forEach((l, i) => {
    const tuDong = logoTrongCau(l.chu)
    const them = (Array.isArray(l.logo) ? l.logo : [])
      .filter((x) => x && x.ten && !tuDong.some((y) => y.ten.toLowerCase() === String(x.ten).toLowerCase()))
      .map((x) => ({ ma: String(x.ten).toLowerCase(), ten: String(x.ten), mau: /^#[0-9a-f]{3,8}$/i.test(x.mau ?? '') ? x.mau : '#334155', chu: String(x.chu || x.ten).slice(0, 5), mauChu: '#ffffff', viTri: String(l.chu ?? '').toLowerCase().indexOf(String(x.ten).toLowerCase()) }))
    const ds = [...tuDong, ...them].slice(0, 2)
    const nay = new Set(ds.map((x) => x.ma))
    if (NGANG && doanAnh.some((c) => c.kieu === 'toan' && c.tu <= i && c.het >= i)) {
      truoc = nay
      return
    }
    ds.forEach((x, j) => {
      if (truoc.has(x.ma)) return
      const id = `lg${i}-${j}`
      // Câu đầu có dòng chữ tít to: chờ tít chạy xong mới bật huy hiệu (khỏi đè chữ)
      const t = Math.max(batDau[i] + 0.1, i === 0 && moc?.chu ? Math.min(batDau[0] + 2.2, batDau[0] + doDai[0]) + 0.2 : 0, (x.viTri >= 0 ? lucTu(i, x.viTri) : batDau[i] + 0.3) - 0.1)
      const het = batDau[i] + doDai[i] - 0.15
      if (het - t < 0.8) return
      const co = x.chu.length <= 1 ? 96 : x.chu.length <= 2 ? 66 : x.chu.length <= 4 ? 44 : 34
      logoKhung.push(`<div id="${id}" class="logo-th" style="${NGANG ? `right:${290 + j * 170}px` : `right:${40 + j * 160}px`}"><div class="lg-o" style="background:${x.mau};color:${x.mauChu};font-size:${co}px">${esc(x.chu)}</div><div class="lg-ten">${esc(x.ten)}</div></div>`)
      tw.push(`tl.fromTo("#${id}", { opacity: 0, scale: 0.3, rotation: -12 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.2)", immediateRender: false }, ${f(t)});`)
      tw.push(`tl.to("#${id}", { opacity: 0, scale: 0.6, duration: 0.25, ease: "power2.in" }, ${f(het - 0.25)});`)
      amLogo.push(t)
    })
    truoc = nay
  })
}

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
    khungKeHtml = `<div id="khung-ke"><div class="ke-thu"><div class="ke-vong"></div><div class="ke-tron"><div class="ke-den"></div><svg viewBox="100 70 400 400" width="340" height="340">${nguoiKeSvg('nguoi_ke')}</svg></div><div class="ke-mic">🎙</div></div></div>`
    tw.push('gsap.set("#nguoi_ke-dau", { svgOrigin: "300 440" }); gsap.set("#nguoi_ke-mieng-mo", { svgOrigin: "300 340" }); gsap.set("#nguoi_ke-mat-trai", { svgOrigin: "238 268" }); gsap.set("#nguoi_ke-mat-phai", { svgOrigin: "362 268" });')
    // Chỉ hiện ở lượt kể đầu tiên của phần (giới thiệu giọng kể); các lượt sau chỉ còn giọng, màn hình gọn
    for (const c of dot.slice(0, 1)) {
      const vao = Math.max(0, batDau[c.tu] - 0.4)
      const ra = batDau[c.het] + doDai[c.het] - 0.1
      tw.push(`tl.fromTo("#khung-ke", { x: -400, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "back.out(1.4)", immediateRender: false }, ${f(vao)});`)
      // Không lắc đầu đều đều: người kể đổi biểu cảm theo từng câu (nghiêng đầu khi hỏi / nghịch lý, nhướn mày ở bước
      // ngoặt) và hất đầu theo nhịp lời — làm ở vòng câu thoại
      for (let i = c.tu; i <= c.het; i++) {
        const t0 = batDau[i], het = t0 + doDai[i] - 0.3
        if (['to_mo', 'suy_nghi'].includes(loi[i].cam_xuc)) {
          tw.push(`tl.fromTo("#nguoi_ke-dau", { rotation: 0 }, { rotation: -7, duration: 0.4, ease: "power2.out", immediateRender: false }, ${f(t0)});`)
          tw.push(`tl.to("#nguoi_ke-dau", { rotation: 0, duration: 0.35, ease: "sine.inOut" }, ${f(het)});`)
        }
        if (['bat_ngo', 'lo_lang'].includes(loi[i].cam_xuc) || loi[i].lang) {
          tw.push(`tl.fromTo("#nguoi_ke-may", { y: 0 }, { y: -12, duration: 0.25, ease: "back.out(2)", immediateRender: false }, ${f(t0)});`)
          tw.push(`tl.to("#nguoi_ke-may", { y: 0, duration: 0.3, ease: "sine.inOut" }, ${f(het)});`)
        }
      }
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
// A. Chữ khổng lồ (học từ kênh Bò và Gấu: "ADOLF HITLER 20/04/1889", "1907", "WW1" chiếm nửa khung): năm của các mốc lớn
// đập vào giữa khung đúng lúc giọng đọc tới năm đó, kèm tiếng bùm; nơi chốn chữ nhỏ hơn bên dưới. Mốc đầu tiên của phần
// và mốc cách năm trước từ 3 năm, cách lần chữ lớn trước ít nhất 18 giây (hiếm mới đắt). Thẻ nhỏ góc trái hiện sau đó.
const CHU_LON = {} // câu → { nam, noi, t }
{
  let namLon = null, lucLon = -99
  loi.forEach((l, i) => {
    // Không chồng lên câu giật tít mở đầu, thẻ minh hoạ hay con số bật to của câu đó (chữ đè chữ)
    // Chỉ video ngang (kiểu dáng chữ lớn / bàn tay / chuỗi hình nằm trong CSS_NGANG): video dọc thiếu kiểu dáng thì các
    // khối này hiện trơ trên màn hình từ đầu (TikTok 14–15/10/2026: bàn tay găng đứng sẵn góc trên)
    if (!NGANG || !l.the_moc || (i === 0 && moc?.chu) || (MINH_HOA[l.minh_hoa?.kieu] && !l.anh_wiki?.tep) || SO_DONG[i]) return
    // Câu đang phủ ảnh tư liệu toàn khung: chữ lớn che mặt người trong ảnh (Oppenheimer 3:20 "1942" đè mặt Groves) → để thẻ mốc nhỏ góc trái
    if (doanAnh.some((c) => c.kieu === 'toan' && c.tu <= i && c.het >= i)) return
    const [dau, ...con] = String(l.the_moc).split('·').map((x) => x.trim())
    const nam = dau.match(/\b(\d{3,4})\b/)?.[1]
    if (!nam) return
    const tNam = String(l.chu ?? '').indexOf(nam)
    const t = Math.max(batDau[i] + 0.1, tNam >= 0 ? lucTu(i, tNam) - 0.15 : batDau[i] + 0.1)
    if (t + 1.8 > batDau[i] + doDai[i] + 0.4) return
    if (namLon !== null && (Math.abs(+nam - namLon) < 3 || t - lucLon < 18)) return
    CHU_LON[i] = { nam, noi: con.join(' · '), t }
    namLon = +nam
    lucLon = t
  })
}
const chuLon = Object.entries(CHU_LON).map(([k, c]) => {
  const id = `cl${k}`
  tw.push(`tl.fromTo("#${id}", { opacity: 0, scale: 2.6, rotation: -9 }, { opacity: 1, scale: 1, rotation: -3, duration: 0.28, ease: "power4.in", immediateRender: false }, ${f(c.t)});`)
  tw.push(`tl.fromTo("#${id}", { y: 0 }, { y: 10, duration: 0.05, yoyo: true, repeat: 3, ease: "none", immediateRender: false }, ${f(c.t + 0.28)});`)
  tw.push(`tl.to("#${id}", { opacity: 0, scale: 1.12, duration: 0.3, ease: "power2.in" }, ${f(c.t + 1.55)});`)
  diemChi.push(c.t + 0.35)
  return `<div id="${id}" class="chu-lon"><div class="cl-nam">${esc(c.nam)}</div>${c.noi ? `<div class="cl-noi">${esc(c.noi)}</div>` : ''}</div>`
})
const theMoc = []
loi.forEach((l, i) => {
  if (!l.the_moc) return
  const t0 = CHU_LON[i] ? CHU_LON[i].t + 1.75 : batDau[i] + 0.15
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
    // x / scaleX (biến hình) thay cho left / width: left, width nhích từng điểm ảnh nguyên → chấm trượt giật
    tw.push(`tl.fromTo("#tm${i}-cham", { x: ${f(a * 3.4)} }, { x: ${f(b * 3.4)}, duration: 1.1, ease: "power2.inOut", immediateRender: false }, ${f(t0 + 0.35)});`)
    tw.push(`tl.fromTo("#tm${i}-da", { scaleX: ${f(a / 100)} }, { scaleX: ${f(b / 100)}, duration: 1.1, ease: "power2.inOut", immediateRender: false }, ${f(t0 + 0.35)});`)
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
    // Chỉ khi đổi cảnh (màn hình gọn: một điểm nhấn mỗi lúc), giữ ~5 giây rồi mờ đi
    if (l.bang?.chu && canhMoi) {
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
  // Từ khoá trong câu → đúng lúc giọng đọc tới từ đó trong bản thu (lucTu)
  const vt = m.tu_khoa ? l.chu.toLowerCase().indexOf(String(m.tu_khoa).toLowerCase()) : -1
  let bd = (vt >= 0 ? lucTu(i, vt) : t0 + d * 0.3) - 0.1
  bd = Math.max(bd, t0 + 0.2, i === 0 && moc?.chu ? gtMoc + 0.1 : 0)
  const kt = Math.min(bd + 2.3, t0 + d + 0.35)
  if (kt - bd < 1.3) return
  if (['so_lieu', 'trich_dan', 'dia_diem', 'bieu_tuong', 'dem_nguoc', 'bieu_do_giam', 'bieu_do_tang', 'thoa_thuan'].includes(m.kieu)) diemChi.push(bd + 0.2)
  const id = `mh${i}`
  const mh = ve(id, m)
  tw.push(...mh.tw(bd, kt - bd))
  const dau = laPhu(l.ai) ? { ...DAU_PHU, x: viTriPhu[phuCuaCau[i]] ?? DAU_PHU.x } : l.ai === 'nguoi_ke' ? DAU_PHU : DAU[l.ai === 'meo' ? 'meo' : 'robot']
  const trai = Math.min(Math.max(dau.x - 240, 10 - LECH_X), RONG - LECH_X - 490)
  // Khung ngang: đặt cố định ở giữa phía trên khung hình (chỗ bảng tin), không phóng theo máy quay nên không bị cắt mép
  if (NGANG) minhHoaKhung.push(`<div id="${id}" class="mh" style="left:${(RONG - 480) / 2}px;top:112px">${mh.html}</div>`)
  // Khung dọc cũng đặt ở lớp khung hình ngay dưới tên kênh, thu nhỏ một chút (thẻ trong lớp nhân vật bị máy quay đẩy
  // vào kéo lên đè tên kênh / đè đầu người đang bước lại gần)
  else minhHoaKhung.push(`<div id="${id}" class="mh" style="left:${(RONG - 480) / 2}px;top:128px"><div class="mh-thu">${mh.html}</div></div>`)
  void trai
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
const amAnh = [] // lúc từng ảnh tư liệu hiện ra (tiếng lật trang)
const anhThat = doanAnh.map((c, k) => {
  const id = `anh${k}`
  // Câu đầu phim: chờ dòng chữ mở đầu (móc câu) chạy xong rồi mới hiện ảnh
  const vao = Math.max(batDau[c.tu] + 0.15, c.tu === 0 && moc?.chu ? gtMoc + 0.1 : 0)
  const ra = batDau[c.het] + doDai[c.het] - 0.05
  // Hiện quá ngắn (dưới 1,6 giây) thì bỏ, tránh ảnh loé qua rồi tắt
  if (ra - vao < 1.6) return ''
  const huong = k % 2 ? 1 : -1
  if (c.kieu === 'toan') {
    // Toàn khung: hiện mờ dần + lùi nhẹ, Ken Burns rõ (phóng 1 → 1,18, lia ngang), tắt mờ dần; tiếng lật trang lúc hiện
    tw.push(`tl.fromTo("#${id}", { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out", immediateRender: false }, ${f(vao)});`)
    if (ra - vao > 4.5) {
      // Ảnh giữ lâu: nửa đầu Ken Burns toàn ảnh, giữa đoạn cắt thẳng vào chi tiết (phần trên ảnh: thường là khuôn mặt) — không khung nào đứng quá ~4 giây
      const giua = (vao + ra) / 2
      tw.push(`tl.fromTo("#${id}-anh", { scale: 1, xPercent: ${3 * huong}, yPercent: 0 }, { scale: 1.1, xPercent: 0, yPercent: 0, duration: ${f(giua - vao)}, ease: "none", immediateRender: false }, ${f(vao)});`)
      tw.push(`tl.fromTo("#${id}-anh", { scale: 1.55, xPercent: ${-5 * huong}, yPercent: 9 }, { scale: 1.68, xPercent: ${-2 * huong}, yPercent: 11, duration: ${f(ra - giua)}, ease: "none", immediateRender: false }, ${f(giua)});`)
    } else tw.push(`tl.fromTo("#${id}-anh", { scale: 1, xPercent: ${3 * huong} }, { scale: 1.18, xPercent: ${-3 * huong}, duration: ${f(ra - vao)}, ease: "none", immediateRender: false }, ${f(vao)});`)
    tw.push(`tl.to("#${id}", { opacity: 0, duration: 0.4, ease: "power2.in" }, ${f(ra - 0.35)});`)
  } else {
    tw.push(`tl.fromTo("#${id}", { opacity: 0, y: -40, rotation: ${-4 * huong}, scale: 0.9 }, { opacity: 1, y: 0, rotation: ${-1.2 * huong}, scale: 1, duration: 0.55, ease: "back.out(1.6)", immediateRender: false }, ${f(vao)});`)
    tw.push(`tl.fromTo("#${id}-anh", { scale: 1, xPercent: ${2 * huong} }, { scale: 1.12, xPercent: ${-2 * huong}, duration: ${f(ra - vao)}, ease: "none", immediateRender: false }, ${f(vao)});`)
    tw.push(`tl.to("#${id}", { opacity: 0, y: -24, duration: 0.35, ease: "power2.in" }, ${f(ra - 0.3)});`)
  }
  amAnh.push(vao)
  for (let i = c.tu; i <= c.het; i++) {
    if (bangCuaCau[i] === null || bangCuaCau[i] === undefined) continue
    tw.push(`tl.to("#bang${bangCuaCau[i]}", { opacity: 0, duration: 0.1 }, ${f(vao - 0.05)});`)
    tw.push(`tl.to("#bang${bangCuaCau[i]}", { opacity: 1, duration: 0.25 }, ${f(ra)});`)
  }
  const kieu = c.kieu
  const src = `assets/${esc(c.a.tep)}`
  return `<div id="${id}" class="anh-that ${kieu}"><div class="anh-khung"><img class="anh-nen" src="${src}"/><img id="${id}-anh" class="anh-chinh" src="${src}"/>${kieu === 'toan' ? '<div class="anh-toi"></div>' : ''}</div></div>`
})

// Bảng tin phía sau đổi theo lời thoại
// Thẻ chương đang phủ khung thì bảng tin chờ thẻ tắt rồi mới hiện (Oppenheimer 6:11: "Phiên điều trần năm 1954" nằm đè thẻ chương)
const HET_THE = the_chuong ? (I_CHUONG >= 0 ? batDau[I_CHUONG] + doDai[I_CHUONG] + 0.4 : MO_CHUONG) : -1
const bang = bangHien.map((i, j) => {
  const l = loi[i]
  const t0 = batDau[i] < HET_THE ? HET_THE : batDau[i]
  const het = Math.min(j === bangHien.length - 1 ? HET_NOI : batDau[bangHien[j + 1]], t0 + 5.2)
  if (het - t0 < 1.5) return `<div id="bang${i}" class="bang"></div>` // giữ id cho các lệnh ẩn / hiện theo ảnh tư liệu
  tw.push(`tl.from("#bang${i} .bang-noi", { scale: 0.6, opacity: 0, duration: 0.4, ease: "back.out(2)" }, ${f(t0 + 0.05)});`)
  tw.push(`tl.to("#bang${i} .bang-noi", { opacity: 0, y: -16, duration: 0.4, ease: "power1.in" }, ${f(het - 0.45)});`)
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
// Ánh sáng viền ôm nhân vật ăn theo tông màu của câu (ánh sáng môi trường hắt vào), nhân vật hoà vào cảnh thay vì nổi
// như hình dán
const VIEN = {
  binh_thuong: 'rgba(255, 255, 255, 0.4)', am_ap: 'rgba(255, 179, 92, 0.6)', lanh: 'rgba(127, 178, 255, 0.6)',
  cang_thang: 'rgba(165, 180, 252, 0.45)', tuoi_sang: 'rgba(255, 241, 166, 0.6)', mo_mong: 'rgba(227, 181, 255, 0.6)',
  bi_an: 'rgba(180, 124, 255, 0.55)', canh_bao: 'rgba(255, 107, 107, 0.6)', loe_sang: 'rgba(255, 255, 255, 0.55)',
}
tw.push(`gsap.set("#camera-nv", { "--vien": "${VIEN.binh_thuong}" });`)
// Máy cầm tay trôi vi mô suốt phim (không khung nào đứng chết): lớp .troi bọc nền + nhân vật, mỗi trục một nhịp sóng
// riêng (lệch pha nên không lặp đều); hạt phim đổi 8 lần / giây như phim nhựa
{
  const song = (thuoc, bien, chuKy) => {
    const lan = Math.max(1, Math.floor(TONG / chuKy))
    tw.push(`tl.fromTo(".troi", { ${thuoc}: ${-bien} }, { ${thuoc}: ${bien}, duration: ${f(chuKy)}, yoyo: true, repeat: ${lan - 1}, ease: "sine.inOut", immediateRender: true }, 0);`)
  }
  // (chủ trang 16/10/2026 "background bị giật giật"): đo trên video thật, mọi chuyển động nền RẤT CHẬM (dưới ~2 điểm ảnh mỗi
  // khung) bị máy chụp làm tròn về điểm ảnh nguyên → nền nhích từng nấc "đứng – nhích – đứng" (chỉ số giật 0,75; chụp 4K chỉ
  // đỡ còn 0,62 mà dựng chậm 5,5 lần). Nên nền ĐỨNG YÊN như phim hoạt hình chuyên nghiệp, chỉ di chuyển khi có chủ đích và đủ nhanh
  void song
  const buoc = Math.max(1, Math.round(TONG * 8))
  tw.push(`tl.fromTo("#hat-phim", { backgroundPosition: "0px 0px" }, { backgroundPosition: "${buoc * 73}px ${buoc * 47}px", duration: ${f(TONG)}, ease: "steps(${buoc})", immediateRender: true }, 0);`)
}
let anhTruoc = 'binh_thuong'
const ANH_MUOT = anhSangMuot(loi) // một tông chủ đạo mỗi cảnh, không nhảy sáng ↔ tối giữa cảnh (anhSang.mjs)
loi.forEach((l, i) => {
  const ten = ANH_SANG[ANH_MUOT[i]] ? ANH_MUOT[i] : 'binh_thuong'
  const t0 = batDau[i]
  const d = doDai[i]
  if (ten !== anhTruoc) {
    const [mau, op] = ANH_SANG[ten]
    tw.push(`tl.to("#den", { backgroundColor: "${mau}", opacity: ${op}, duration: 0.6, ease: "sine.inOut" }, ${f(Math.max(0, t0 - 0.3))});`)
    tw.push(`tl.to("#camera-nv", { "--vien": "${VIEN[ten]}", duration: 0.6, ease: "sine.inOut" }, ${f(Math.max(0, t0 - 0.3))});`)
  }
  if (ten === 'canh_bao') tw.push(`tl.to("#den", { opacity: 0.1, duration: 0.45, yoyo: true, repeat: ${2 * Math.max(1, Math.floor(d / 0.9)) - 1}, ease: "sine.inOut" }, ${f(t0 + 0.3)});`)
  if (ten === 'loe_sang') tw.push(`tl.fromTo("#chop", { opacity: 0.45 }, { opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, ${f(t0)});`)
  anhTruoc = ten
})

// B. Bàn tay găng trắng (học từ kênh Bò và Gấu): trượt vào từ mép phải, chỉ vào thứ vừa hiện giữa khung (con số, minh hoạ,
// ảnh tư liệu, chữ lớn), chọc nhẹ 2 nhịp rồi rút ra. Cách nhau ít nhất 7 giây cho khỏi thành trò lặp.
const tayGang = `<svg viewBox="0 0 320 200" width="360" height="225"><g stroke="#111827" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">
  <rect x="236" y="62" width="70" height="86" rx="14" fill="#e5e7eb"/><path d="M246 70 L246 140 M262 70 L262 140" stroke-width="5" fill="none"/>
  <path d="M238 70 Q170 52 150 70 L60 72 Q34 74 36 96 Q38 116 62 116 L132 116 Q120 136 140 150 Q150 166 176 162 Q214 166 238 146 Z" fill="#ffffff"/>
  <path d="M136 118 Q168 112 196 124 M150 140 Q176 136 200 146" fill="none" stroke-width="6"/></g></svg>`
const LUC_BAN_TAY = []
const banTay = []
{
  const chon = [...diemChi.map((t) => Math.max(0.5, t))].sort((a, b) => a - b).filter((t, k, ds) => !k || t - ds[k - 1] >= 0.01)
  let cuoi = -99
  for (const t of NGANG ? chon : []) {
    if (t - cuoi < 7 || t + 1.6 > TONG) continue
    cuoi = t
    const id = `bt${LUC_BAN_TAY.length}`
    LUC_BAN_TAY.push(t)
    tw.push(`tl.fromTo("#${id}", { opacity: 0, x: 420, rotation: 0 }, { opacity: 1, x: 0, rotation: -14, duration: 0.32, ease: "back.out(1.6)", immediateRender: false }, ${f(t)});`)
    tw.push(`tl.fromTo("#${id}-noi", { x: 0 }, { x: -26, duration: 0.13, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, ${f(t + 0.36)});`)
    tw.push(`tl.to("#${id}", { opacity: 0, x: 440, duration: 0.3, ease: "power2.in" }, ${f(t + 1.3)});`)
    banTay.push(`<div id="${id}" class="ban-tay"><div id="${id}-noi">${tayGang}</div></div>`)
  }
}
// C. Đoạn dồn dập ở cao trào (học từ kênh Bò và Gấu: chuỗi hình cắt ~0,15 giây): câu có cảnh hành động lớn hoặc loé sáng
// → 6 hình nháy liên tiếp 0,13 giây (ảnh tư liệu / tranh nền của phần này, thiếu thì biểu tượng to trên nền màu), tiếng vút
// rồi bùm. Cách nhau ít nhất 35 giây; không chen vào câu đang phủ ảnh tư liệu toàn khung.
const LUC_DON_DAP = []
const donDap = []
{
  // Chỉ ảnh tư liệu thật: tranh nền địa điểm (không người) nháy giữa chuỗi trông như hình bị lỗi (Oppenheimer 7:00)
  const anhPhan = [...new Set(loi.map((l) => l.anh_wiki?.tep).filter((t) => t && existsSync(join(GOC, 'hyperframes/assets', t))))]
  const bieuTuong = [...new Set(loi.map((l) => l.bang?.bieu_tuong).filter(Boolean))]
  const MAU = ['#b91c1c', '#111827', '#ca8a04', '#1e3a8a']
  let cuoi = -99
  loi.forEach((l, i) => {
    const cao = NGANG && ((l.hanh_dong && !['khong', 'lich_lat'].includes(l.hanh_dong)) || l.anh_sang === 'loe_sang')
    // Không chen vào câu đang phủ ảnh tư liệu toàn khung hay câu đã có chữ khổng lồ (hai cú đập chồng nhau)
    if (!cao || CHU_LON[i] || doanAnh.some((c) => c.kieu === 'toan' && c.tu <= i && c.het >= i)) return
    const t = batDau[i] + 0.15
    // Chỉ khi có đủ 3 ảnh tư liệu thật: chuỗi biểu tượng nháy trên nền màu (trái tim, ngọn lửa, mặt trăng…) trông như lỗi hình
    // Phim tiểu sử (đạo diễn duyệt phim Ferrari 16/10/2026, 7:05: chuỗi nháy 6 ảnh × 0,13 giây lấy ảnh cả chương — xe đua thập
    // niên 1970, siêu xe 2002 chen vào câu năm 1947, nháy như lỗi hình): chỉ ảnh của các câu GẦN ĐÓ (cùng giai đoạn đang kể),
    // 4 ảnh, mỗi ảnh 0,4 giây cho mắt kịp nhìn
    const anhGan = nhan_vat_chinh ? [...new Set(loi.slice(Math.max(0, i - 6), i + 7).map((x) => x.anh_wiki?.tep).filter((x) => x && anhPhan.includes(x)))] : anhPhan
    if (t - cuoi < 35 || doDai[i] < 1.6 || anhGan.length < 3) return
    cuoi = t
    const id = `dd${LUC_DON_DAP.length}`
    LUC_DON_DAP.push(t)
    const soHinh = nhan_vat_chinh ? 4 : 6
    const nhip = nhan_vat_chinh ? 0.4 : 0.13
    const hinh = Array.from({ length: soHinh }, (_, j) => {
      const k = i + j
      if (anhGan.length >= 3) return `<div id="${id}-${j}" class="dd-hinh"><img src="assets/${esc(anhGan[k % anhGan.length])}" style="transform:scale(${1.05 + (j % 3) * 0.08}) rotate(${(j % 2 ? 1 : -1) * 2}deg)"/></div>`
      return `<div id="${id}-${j}" class="dd-hinh" style="background:${MAU[j % MAU.length]}"><span>${bieuTuong[k % bieuTuong.length]}</span></div>`
    })
    hinh.forEach((_, j) => {
      tw.push(`tl.set("#${id}-${j}", { opacity: 1 }, ${f(t + j * nhip)});`)
      tw.push(`tl.set("#${id}-${j}", { opacity: 0 }, ${f(t + (j + 1) * nhip)});`)
    })
    donDap.push(`<div id="${id}" class="don-dap">${hinh.join('')}</div>`)
  })
}

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
  thao_nguyen: 'gio', chien_truong: 'reo_ho', thanh_co: 'gio', sa_mac: 'gio', bien_ca: 'nuoc', ga_ra: 'bua', phim_truong: 'chup_anh', do_nat: 'gio',
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
  do_nat: ['nen-thien-nhien', 0.12],
}
const amPhu = []
const themAm = (ten, luc, amLuong, toiDa = Infinity) => {
  const dai = Math.min(doDaiTep(ten), toiDa, TONG - luc)
  if (dai <= 0.05) return
  amPhu.push(`<audio id="ap-${amPhu.length}" src="assets/${ten}.wav" data-start="${f(luc)}" data-duration="${f(dai)}" data-track-index="${3000 + amPhu.length}" data-volume="${amLuong}"></audio>`)
}
for (const t of tiengSoDong) themAm('sfx-ting', t, 0.3)
for (const c of Object.values(CHU_LON)) themAm('sfx-bum', c.t + 0.22, 0.45)
loi.forEach((l, i) => {
  if (l.lang && i && biKich(i - 1) && !SFX[l.am_thanh]) themAm('sfx-bum', Math.max(0, batDau[i - 1] + doDai[i - 1] - 0.25), 0.3, 1.4)
})
for (const t of LUC_BAN_TAY) themAm('sfx-bop', t + 0.3, 0.25)
for (const t of LUC_DON_DAP) {
  themAm('sfx-vut', t, 0.35)
  themAm('sfx-bum', t + (nhan_vat_chinh ? 1.55 : 0.75), 0.4) // phim tiểu sử: chuỗi 4 ảnh × 0,4 giây
}
// Tiếng đạo cụ (prop foley): đạo cụ hiện ra kèm đúng tiếng của nó (bút sột soạt, giấy lật, kim loại, lửa…), xác nhận
// điều khán giả đang thấy. Chỉ những đạo cụ có tiếng đặc trưng; câu AI đã chọn hiệu ứng riêng thì thôi (không chồng tiếng)
const FOLEY_DAO_CU = {
  but_chi: ['sfx-but-viet', 0.35], but_bi: ['sfx-but-viet', 0.35], so_tay: ['sfx-but-viet', 0.3], ke_hoach: ['sfx-but-viet', 0.3],
  sach: ['sfx-lat-trang', 0.4], tai_lieu: ['sfx-lat-trang', 0.4], thu: ['sfx-lat-trang', 0.35], ban_do: ['sfx-lat-trang', 0.4],
  lich: ['sfx-lat-trang', 0.35], tin_nong: ['sfx-lat-trang', 0.4],
  bua: ['sfx-kim-loai', 0.3], co_le: ['sfx-kim-loai', 0.3], tua_vit: ['sfx-kim-loai', 0.28], banh_rang: ['sfx-kim-loai', 0.3],
  hop_do_nghe: ['sfx-kim-loai', 0.3], chia_khoa: ['sfx-kim-loai', 0.25], o_khoa: ['sfx-kim-loai', 0.25], xich: ['sfx-kim-loai', 0.35],
  cai_keo: ['sfx-kim-loai', 0.22], den_cay: ['sfx-lua', 0.7], ngon_lua: ['sfx-lua', 0.75],
  tien: ['sfx-tien', 0.3], dong_xu: ['sfx-tien', 0.3], tien_giay: ['sfx-tien', 0.28], dong_ho: ['sfx-tich-tac', 0.35], dong_ho_cat: ['sfx-tich-tac', 0.3],
  may_anh: ['sfx-chup-anh', 0.4], chuong: ['sfx-ting', 0.3], cup: ['sfx-ting', 0.25], huy_chuong: ['sfx-ting', 0.25],
}
for (const [ten, t, a, i] of amDongTac) if (!SFX[loi[i].am_thanh]) themAm(ten, t, a, 1.2)
for (const t of amLogo) themAm('sfx-bop', t, 0.22)
for (const [ten, i, t] of amDaoCu) {
  const fo = FOLEY_DAO_CU[ten]
  if (fo && !SFX[loi[i].am_thanh]) themAm(fo[0], t, fo[1], 1.6)
}
// Ảnh tư liệu hiện ra: tiếng lật trang giấy nhẹ (âm thanh đi kèm hình, bù cho phần nhân vật đứng yên)
for (const t of amAnh) themAm('sfx-lat-trang', Math.max(0, t - 0.05), 0.4)
for (const [ten, t, a] of amHanhDong) themAm(ten, t, a)
for (const c of doanThoiTiet) {
  if (c.tt === 'suong') continue
  for (let i = c.tu; i <= c.het; i++) themAm(c.tt === 'mua' ? 'sfx-mua' : 'sfx-gio', batDau[i], c.tt === 'mua' ? 0.3 : 0.2, doDai[i] + 0.3)
}
// Tiếng hiệu ứng theo câu chỉ để nhấn điểm mấu chốt (người xem khó tính 15/10/2026: phim Jensen Huang 79/133 câu có
// tiếng, nghe như rải liên tục): hai tiếng cách nhau ít nhất 12 giây; riêng tiếng "bùm" ở câu sốc / bất ngờ luôn giữ
{
  let cuoi = -99
  loi.forEach((l, i) => {
    const sfx = SFX[l.am_thanh]
    if (!sfx) return
    const nhan = l.am_thanh === 'bum' && ['bat_ngo', 'tuc_gian', 'lo_lang'].includes(l.cam_xuc)
    if (!nhan && batDau[i] - cuoi < 12) return
    cuoi = batDau[i]
    themAm(sfx[0], batDau[i] + (l.am_thanh === 'bum' ? 0 : 0.05), sfx[1])
  })
}
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
// Âm nền phục vụ cảm xúc: khoảnh khắc phát hiện / khoảng lặng có chủ đích (lang, loé sáng) và lúc buồn → không gian
// lắng xuống (âm nền còn 35%), để lời, hơi thở và nhạc nổi lên; hết khoảnh khắc thì âm nền về như cũ
// Khoảng lặng có chủ đích: IM THẬT (âm nền tắt hẳn từ lúc câu trước dứt tới khi câu này cất lời) — chuyên gia âm thanh
// 14/10/2026: cả phim không có lấy một khoảng lặng thật nên khoảnh khắc lớn mất sức nặng
const LANG_NEN = [] // [từ, đến, hệ số âm lượng]
loi.forEach((l, i) => {
  if (l.lang && i) LANG_NEN.push([batDau[i - 1] + doDai[i - 1] - 0.1, batDau[i] + 0.15, 0])
  if (l.lang || l.anh_sang === 'loe_sang' || l.cam_xuc === 'buon') LANG_NEN.push([batDau[i] + (l.lang ? 0.15 : -0.2), batDau[i] + doDai[i], 0.35])
})
doanCanh.forEach((dc, k) => {
  const nen = AM_NEN[dc.ten]
  if (!nen) return
  const tu = k ? batDau[dc.tu] - 0.35 : 0
  const den = dc.het === loi.length - 1 ? TONG : batDau[dc.het + 1] - 0.35
  const doan = doDaiTep(nen[0])
  if (!doan) return
  // Cắt đoạn bối cảnh ở mép các khoảnh khắc lắng, mỗi khúc một mức âm lượng
  const moc = [...new Set([tu, den, ...LANG_NEN.flatMap(([x, y]) => [x, y]).filter((x) => x > tu && x < den)])].sort((a, b) => a - b)
  for (let j = 0; j < moc.length - 1; j++) {
    const a = moc[j], b = moc[j + 1]
    if (b - a < 0.05) continue
    const heSo = Math.min(1, ...LANG_NEN.filter(([x, y]) => x <= a + 0.01 && b <= y + 0.01).map(([, , h]) => h))
    if (heSo <= 0) continue // im thật
    for (let luc = a; luc < b - 0.05; luc += doan) themAm(nen[0], luc, f(nen[1] * heSo), b - luc)
  }
})

// ── Thẻ chương đầu phần: tên kênh, "CHƯƠNG n", tên chương, vạch sáng chạy; mờ dần lúc câu đầu bắt đầu ─
let theChuongHtml = ''
if (the_chuong) {
  const ten = esc(the_chuong.ten ?? '')
  // Ảnh nền thẻ chương: ảnh nền địa điểm / ảnh tư liệu đầu tiên của phần này (đạo diễn 15/10/2026: thẻ chương chỉ là màn tối)
  const anhTc = [...loi.map((l) => l.anh_nen_tep), ...loi.map((l) => l.anh_wiki?.tep)].find((t) => t && existsSync(join(GOC, 'hyperframes/assets', t)))
  theChuongHtml = `<div id="the-chuong">${anhTc ? `<img id="tc-anh" class="tc-anh" src="assets/${esc(anhTc)}"/><div class="tc-phu"></div>` : ''}<div class="tc-kenh">${esc(kenh)}</div><div class="tc-so">${esc(the_chuong.nhan ?? 'CHƯƠNG')} ${esc(the_chuong.so ?? '')}</div><div class="tc-ten">${ten}</div><div class="tc-vach"></div></div>`
  const tc0 = I_CHUONG >= 0 ? Math.max(0.05, batDau[I_CHUONG] - 0.35) : 0.05
  const tc1 = I_CHUONG >= 0 ? batDau[I_CHUONG] + doDai[I_CHUONG] - 0.05 : MO_CHUONG - 0.25
  // Câu tên chương nằm ngay đầu phần: thẻ phủ kín từ khung đầu tiên (cắt thẳng từ phần trước sang thẻ), khỏi lộ cảnh dở dang
  if (tc0 < 1) tw.push(`tl.set("#the-chuong", { opacity: 1, scale: 1 }, 0);`)
  else tw.push(`tl.fromTo("#the-chuong", { opacity: 0, scale: 1 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power1.out", immediateRender: false }, ${f(tc0)});`)
  tw.push(`tl.fromTo("#the-chuong .tc-so", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, ${f(tc0 + 0.2)});`)
  tw.push(`tl.fromTo("#the-chuong .tc-ten", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" }, ${f(tc0 + 0.4)});`)
  tw.push(`tl.fromTo("#the-chuong .tc-vach", { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.inOut" }, ${f(tc0 + 0.45)});`)
  tw.push(`tl.to("#the-chuong", { opacity: 0, scale: 1.05, duration: 0.45, ease: "power2.in" }, ${f(tc1)});`)
  themAm('sfx-vut', tc0 + 0.35, 0.3)
  themAm('sfx-bum', tc0 + 0.42, 0.3)
  if (anhTc) tw.push(`tl.fromTo("#tc-anh", { scale: 1.12 }, { scale: 1, duration: ${f(Math.max(1, tc1 - tc0 + 0.4))}, ease: "power1.out", immediateRender: false }, ${f(tc0)});`)
}
// ── Màn kết: cảm ơn + nút ĐĂNG KÝ có con trỏ bấm + chuông; Mèo / Bit quay lại vẫy tay ─
let manKetHtml = ''
if (MAN_KET) {
  const t1 = HET_NOI
  // Khung ngang: 2 ô trống trái / phải đúng chỗ YouTube đặt video đề xuất (gắn trong YouTube Studio → Màn hình kết thúc)
  const oXem = NGANG ? [0, 1].map((k) => `<div class="mk-o mk-o${k}"><span>▶ Xem tiếp</span></div>`).join('') : ''
  manKetHtml = `${oXem}<div id="man-ket"><div class="mk-cam-on">Cảm ơn bạn đã xem!</div><div class="mk-nut"><span class="mk-chua"><span class="mk-play">▶</span> ĐĂNG KÝ</span><span class="mk-da">✓ ĐÃ ĐĂNG KÝ</span></div><div class="mk-chuong">🔔</div><div class="mk-tro">👆</div><div class="mk-phu">${esc(kenh)} · video mới mỗi tuần</div></div>`
  tw.push(`tl.to(["#o-meo", "#o-robot"], { xPercent: 0, duration: 0.5, ease: "power2.out" }, ${f(t1)});`)
  if (KET_GIAY) {
    // Lời mời đăng ký: Mèo Mun đọc, nhép miệng theo độ to giọng (như các câu thoại)
    const t0 = t1 + 0.5
    let em = 0, dangMo = false
    doTo(KET_WAV).forEach((v, k) => {
      em = Math.max(v, em * 0.62)
      const mo = dangMo ? em > 0.08 : em > 0.16
      if (mo !== dangMo) {
        dangMo = mo
        tw.push(`tl.set("#meo-mieng-mo", { opacity: ${mo ? 1 : 0} }, ${f(t0 + k / 15)});`)
        tw.push(`tl.set("#meo-mieng-dong", { opacity: ${mo ? 0 : 1} }, ${f(t0 + k / 15)});`)
      }
    })
    tw.push(`tl.set("#meo-mieng-mo", { opacity: 0 }, ${f(t0 + KET_GIAY)});`)
    tw.push(`tl.set("#meo-mieng-dong", { opacity: 1 }, ${f(t0 + KET_GIAY)});`)
    amThanh.push(`<audio id="am-ket" src="assets/ket.wav" data-start="${f(t0)}" data-duration="${f(KET_GIAY)}" data-track-index="2990" data-volume="1"></audio>`)
  }
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
      .chude { display: none; }
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
      .chu-lon { position: absolute; left: 0; right: 0; top: ${NGANG ? 250 : 520}px; text-align: center; opacity: 0; pointer-events: none; }
      .cl-nam { font-size: ${NGANG ? 300 : 260}px; font-weight: 700; line-height: 1; color: #fde047; -webkit-text-stroke: 16px #111827; paint-order: stroke fill; text-shadow: 0 16px 0 #111827, 0 30px 60px #000c; letter-spacing: 4px; }
      .cl-noi { display: inline-block; margin-top: 18px; padding: 10px 34px; font-size: ${NGANG ? 64 : 58}px; font-weight: 700; color: #fff; background: #b91c1c; border: 6px solid #111827; border-radius: 14px; transform: rotate(2deg); box-shadow: 0 12px 0 #111827; }
      .ban-tay { position: absolute; right: -30px; top: ${NGANG ? 430 : 980}px; opacity: 0; filter: drop-shadow(0 10px 18px #0007); }
      .don-dap { position: absolute; inset: 0; pointer-events: none; }
      .dd-hinh { position: absolute; inset: 0; opacity: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000; }
      .dd-hinh img { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.25) saturate(1.2); }
      .dd-hinh span { font-size: ${NGANG ? 420 : 380}px; line-height: 1; filter: drop-shadow(0 20px 30px #000a); }
      .so-dong { position: absolute; left: 0; right: 0; top: 118px; text-align: center; font-size: 104px; font-weight: 700; line-height: 1.1; color: #fde047; -webkit-text-stroke: 10px #111827; paint-order: stroke fill; text-shadow: 0 10px 0 #111827, 0 18px 40px #000a; opacity: 0; }
      .dao-cu-khung { position: absolute; right: 80px; top: 140px; width: 170px; height: 170px; display: flex; align-items: center; justify-content: center; font-size: 128px; line-height: 1; font-family: "Emoji", sans-serif; filter: drop-shadow(0 14px 20px #0008); opacity: 0; }
      .moc { top: 70px; height: auto; }
      .moc-chu { font-size: 70px; max-width: 1500px; padding: 14px 40px 22px; border-radius: 28px; background: #0f172ad9; box-shadow: 0 16px 40px #0009; }
      .moc-chu.dai { font-size: 54px; }
      .phu-de { height: 250px; padding: 0 200px 40px; background: linear-gradient(transparent, #00000066 50%, #00000088); }
      .pd-dong { font-size: 42px; }
      #the-chuong { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: radial-gradient(ellipse at center, #1e1b4bf2, #020617fa); opacity: 0; }
      .tc-kenh { font-size: 30px; font-weight: 700; letter-spacing: 8px; color: #38bdf8; }
      .tc-so { position: relative; font-size: 64px; font-weight: 700; letter-spacing: 16px; color: #fbbf24; text-shadow: 0 4px 24px #000; }
      .tc-anh { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: saturate(0.85) brightness(0.55); }
      .tc-phu { position: absolute; inset: 0; background: radial-gradient(ellipse at center, #02061766, #020617ee); }
      .tc-kenh, .tc-ten, .tc-vach { position: relative; }
      .tc-ten { max-width: 1400px; text-wrap: balance; font-size: 76px; font-weight: 700; line-height: 1.15; text-align: center; color: #fff; text-shadow: 0 6px 30px #000; }
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
      .mk-phu { margin-top: 44px; font-size: 32px; font-weight: 500; color: #e2e8f0; text-shadow: 0 0 8px #000; }`

xuatMayQuay('#camera-nv', MAY.nv, { scale: 1, x: 0, y: 0, rotation: 0 })
xuatMayQuay('#camera-nen', MAY.nen, { scale: 1.03, x: 0, y: 0, rotation: 0 })

// Gỡ chồng lệnh cho mọi bộ phận còn lại (tay, mày, tim, khung nhân vật…): hai lệnh cùng chỉnh một thuộc tính của cùng một
// phần tử mà chạy chồng nhau thì lệnh sau xong trước → lệnh trước giành lại → bộ phận giật về chỗ cũ; điểm xuất phát
// của lệnh sau còn tuỳ thứ tự tua (mỗi khúc dựng một kiểu). Lệnh trước được rút ngắn cho xong đúng lúc lệnh sau bắt đầu
// (lệnh rung / lặp thì bớt số lần lặp, giữ số lẻ để về đúng chỗ). Hai lệnh cùng bắt đầu một lúc trên đúng các thuộc tính
// ấy thì lệnh trước bị lệnh sau che hết → bỏ.
{
  const META = new Set(['duration', 'ease', 'yoyo', 'repeat', 'immediateRender', 'delay', 'stagger', 'overwrite', 'repeatDelay'])
  const ds = []
  tw.forEach((chu, k) => {
    const m = /^tl\.(to|fromTo)\((\[[^\]]*\]|"[^"]*"), ([\s\S]*), ([\d.]+)\);$/.exec(chu)
    if (!m) return
    const ids = m[2].replace(/[[\]"]/g, '').split(',').map((x) => x.trim()).filter(Boolean)
    const obj = m[1] === 'fromTo' ? m[3].slice(m[3].lastIndexOf('}, {') + 3) : m[3]
    const tt = new Set([...obj.matchAll(/(?:^|[{,]\s*)"?([a-zA-Z-]+)"?\s*:/g)].map((x) => x[1]).filter((x) => !META.has(x)))
    const giay = Number(/duration: ([\d.]+)/.exec(obj)?.[1] ?? 0.5)
    const lap = Number(/repeat: (-?\d+)/.exec(obj)?.[1] ?? 0)
    if (lap < 0) return
    ds.push({ k, t: Number(m[4]), giay, lap, yoyo: /yoyo: true/.test(obj), ids, tt, het: Number(m[4]) + giay * (lap + 1) })
  })
  ds.sort((x, y) => x.t - y.t || x.k - y.k)
  const dang = new Map() // "id|thuộc tính" → lệnh gần nhất
  for (const c of ds) {
    for (const id of c.ids) for (const t of c.tt) {
      const q = dang.get(`${id}|${t}`)
      if (q && q !== c && !q.bo && q.het > c.t + 0.005) {
        if (c.t - q.t < 0.005) {
          // cùng lúc bắt đầu: lệnh trước bị che hết (mọi thuộc tính của nó đều có trong lệnh sau) thì bỏ
          if ([...q.tt].every((x) => c.tt.has(x)) && q.ids.every((x) => c.ids.includes(x)) && q.het <= c.het + 0.005) {
            q.bo = true
            tw[q.k] = ''
          }
        } else {
          const con = c.t - q.t
          let chu = tw[q.k]
          if (q.lap > 0) {
            let lan = Math.floor(con / q.giay) - 1
            if (q.yoyo && lan % 2 === 0) lan -= 1
            if (lan >= 1) chu = chu.replace(/repeat: \d+/, `repeat: ${lan}`)
            else chu = chu.replace(/repeat: \d+/, 'repeat: 1').replace(/duration: [\d.]+/, `duration: ${f(Math.max(0.01, con / 2))}`)
            q.het = q.t + (lan >= 1 ? q.giay * (lan + 1) : con)
          } else {
            chu = chu.replace(/duration: [\d.]+/, `duration: ${f(Math.max(0.01, con))}`)
            q.het = c.t
          }
          tw[q.k] = chu
        }
      }
      dang.set(`${id}|${t}`, c)
    }
  }
}

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
      #camera-nen { filter: blur(1.6px) saturate(1.08) brightness(1); }
      #toi-chuyen { position: absolute; inset: 0; background: #000; opacity: 0; }
      #den { position: absolute; inset: 0; background: #000; opacity: 0; mix-blend-mode: soft-light; }
      #chop { position: absolute; inset: 0; background: #fff; opacity: 0; }
      .nv { filter: drop-shadow(0 0 10px var(--vien, rgba(255, 255, 255, 0.4))) drop-shadow(0 24px 30px #0000008c); }
      .troi { position: absolute; inset: 0; }
      .troi-nen { transform: scale(1.015); }
      #hat-phim { position: absolute; inset: 0; opacity: 0.09; mix-blend-mode: overlay; background-size: 220px 220px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 1.6 -0.3'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E"); }
      .lop-nen { position: absolute; inset: 0; }
      .nen-dong { position: absolute; inset: 0; transform-origin: 50% 62%; }
      .nen-svg { display: block; }
      .anh-nen-canh.tu-lam { filter: brightness(0.94) !important; }
      .logo-th { position: absolute; top: ${NGANG ? 140 : 250}px; width: 150px; display: flex; flex-direction: column; align-items: center; gap: 8px; opacity: 0; pointer-events: none; filter: drop-shadow(0 12px 18px #0007); }
      .lg-o { width: 128px; height: 128px; border-radius: 30px; display: flex; align-items: center; justify-content: center; font-weight: 800; line-height: 1; letter-spacing: -1px; border: 5px solid #ffffffdd; font-family: "BVP", "Emoji", sans-serif; }
      .lg-ten { padding: 3px 12px; border-radius: 10px; background: #0f172acc; color: #fff; font-size: 22px; font-weight: 700; white-space: nowrap; }
      .nv-buoc { position: relative; transform-origin: 50% 100%; }
      #bo-canh { position: absolute; inset: 0; pointer-events: none; }
      .vat-canh { position: absolute; display: flex; align-items: flex-end; justify-content: center; line-height: 1; opacity: 0; font-family: "Emoji", sans-serif; filter: drop-shadow(0 16px 12px #0006); }
      .dau-hieu { position: absolute; top: 30px; font-size: 130px; font-weight: 700; line-height: 1; color: #fde047; -webkit-text-stroke: 12px #111827; paint-order: stroke fill; opacity: 0; pointer-events: none; filter: drop-shadow(0 8px 10px #0007); }
      .dh-meo { left: 450px; }
      .dh-robot { left: 70px; }
      .dh-phu { left: 270px; top: -20px; font-size: 104px; -webkit-text-stroke: 10px #111827; }
      .anh-nen-canh { position: absolute; object-fit: cover; transform-origin: 50% 70%; filter: blur(1.2px) brightness(0.86) saturate(0.88);
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
      .tg-da { position: absolute; left: 0; top: 0; width: 100%; height: 100%; transform-origin: 0 50%; border-radius: 4px; background: linear-gradient(90deg, #f59e0b, #fbbf24); }
      .tg-cham { position: absolute; left: 0; top: 50%; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: #fde68a; border: 4px solid #f59e0b; box-shadow: 0 0 12px #fbbf24; }
      .the-moc { position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 24px 12px 18px; border-radius: 14px; background: #0f172ae6; border-left: 8px solid #fbbf24; font-size: ${NGANG ? 34 : 38}px; font-weight: 700; color: #fff; box-shadow: 0 16px 36px #0008; }
      .dao-cu.nguoi_ke { left: ${NGANG ? 1220 : 445}px; top: ${NGANG ? 560 : 380}px; }
      .pd-dong { font-size: 48px; font-weight: 700; line-height: 1.2; white-space: nowrap; text-shadow: 0 0 5px #000, 0 3px 0 #000, 2.5px 2.5px 0 #000, -2.5px 2.5px 0 #000, 2.5px -2.5px 0 #000, -2.5px -2.5px 0 #000; }
      .pd-tu { display: inline-block; color: #fff; }
      /* Khung người kể nhỏ lại, nép sát mép trái (chủ trang 16/10/2026: khung che tay, đạo cụ của nhân vật trên sân khấu) */
      #khung-ke { position: absolute; left: 14px; top: ${CAO - (NGANG ? 500 : 880)}px; width: 280px; height: 280px; opacity: 0; filter: drop-shadow(0 22px 40px #000b); }
      .ke-thu { position: absolute; left: 0; top: 0; width: 360px; height: 360px; transform: scale(0.78); transform-origin: 0 0; }
      .mh-thu { transform: scale(0.86); transform-origin: 50% 0; }
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
      .anh-that.toan { left: 0; top: 0; width: ${RONG}px; height: ${CAO}px; filter: none; }
      .anh-that.toan .anh-khung { width: 100%; height: 100%; aspect-ratio: auto; border: 0; border-radius: 0; }
      .anh-that.toan .anh-nen { filter: blur(28px) brightness(0.42); }
      .anh-toi { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 55%, #000a 100%), linear-gradient(transparent 70%, #0009); }
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
        <div class="troi troi-nen"><div class="the-gioi"><div id="camera-nen" class="camera">${nenCanh.join('')}${hat.join('')}</div></div></div>
        <div id="toi-chuyen"></div>
        <div id="vet-quet"></div>
        ${hanhDongNen.join('')}
        ${thoiTiet.join('')}
      </div>
      <div id="dau-trang" class="dau-trang clip" data-start="0" data-duration="${f(TONG)}" data-track-index="6">
        <div class="kenh"><span class="vach"></span>${esc(kenh)}</div><div class="chude">${esc(chu_de)}</div>
      </div>${NGANG ? '' : bang.join('')}
      <div id="sau-khau" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="4">
        <div class="troi"><div class="the-gioi"><div id="camera-nv" class="camera">
          <div id="bo-canh">${boCanh.join('')}</div>
          ${nvPhu.join('')}
          <div id="o-meo" class="o-nv">${ganVat(meoSvg, 'meo', null, { phai: [410, 618, 120], trai: [190, 618, 120] })}${DAU_HIEU.meo ?? ''}</div>
          <div id="o-robot" class="o-nv">${ganVat(robotSvg, 'robot', null, { phai: [454, 628, 120], trai: [146, 628, 120] })}${DAU_HIEU.robot ?? ''}</div>
          ${daoCu.join('')}
          ${minhHoa.join('')}
        </div></div></div>
        ${tienCanh.join('')}
      </div>
${NGANG ? bang.join('') : ''}
      <div id="vien-toi" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="5"><div id="den"></div><div id="hat-phim"></div><div id="chop"></div></div>
      <div id="lop-minh-hoa" class="clip" data-start="0" data-duration="${f(TONG)}" data-track-index="7">${anhThat.join('')}${giatTit.html}${theMoc.join('')}${minhHoaKhung.join('')}${daoCuKhung.join('')}${logoKhung.join('')}${soDong.join('')}${chuLon.join('')}${hanhDongKhung.join('')}${banTay.join('')}${khungKeHtml}${donDap.join('')}${manKetHtml}${theChuongHtml}</div>${phuDe.join('')}
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
