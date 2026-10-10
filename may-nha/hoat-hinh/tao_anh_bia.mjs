// Ảnh bìa (thumbnail) YouTube 1280x720, dễ nhìn trên điện thoại: MỘT tình huống gây tò mò, MỘT nhân vật thật to rõ mặt,
// chữ ngắn (tối đa 5 từ) cỡ lớn viền đen, một biểu tượng (emoji) to cho tình huống, nền bối cảnh tối + mờ để tương phản
// rõ; không nhồi thêm nhãn / chữ nhỏ (chỉ góc tên kênh). Chụp bằng Edge chạy ẩn.
// Chạy: node tao_anh_bia.mjs <vao.json> <ra.png> [kiểu 1-5]
//   1 = Mèo Mun ngạc nhiên to bên phải, chữ trái; 2 = Robot Bit bên phải, chữ trái; 3 = nhân vật của câu chuyện (nhân vật
//   chính phim tiểu sử / nhân vật phụ AI chọn) to bên trái, chữ phải; 4 = biểu tượng khổng lồ giữa-phải + dấu hỏi, Mèo
//   ló ở góc, chữ trên; 5 = ảnh thật (anh_that: tệp trên máy) bên phải, Mèo ló, chữ trái (không có ảnh thì như kiểu 1)
//   vao.json: { "chu": "chữ to", "bieu_tuong": "🚪", "nhan_vat": "doanh_nhan", "kenh": "Công Nghệ 24H", "boi_canh": "van_phong",
//               "nhan_vat_chinh": {…bản thiết kế, phim tiểu sử} | null, "anh_that": "đường dẫn ảnh" | null }
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { BOI_CANH } from './boiCanh.mjs'
import { meoSvg, robotSvg } from './nhanVatChinh.mjs'
import { NHAN_VAT_PHU, nhanVatChinhSvg } from './nhanVatPhu.mjs'

const [vao, ra] = process.argv.slice(2, 4).map((x) => resolve(x))
const KIEU = Number(process.argv[4] ?? 1)
const { chu = '', bieu_tuong = '', nhan_vat = null, kenh = 'Công Nghệ 24H', boi_canh = 'truong_quay', nhan_vat_chinh = null, anh_that = null } = JSON.parse(readFileSync(vao, 'utf8'))
const GOC = dirname(fileURLToPath(import.meta.url))
const FONT = pathToFileURL(join(GOC, '..', '..', 'assets', 'fonts', 'BeVietnamPro-Bold.ttf')).href
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Chữ: tối đa 5 từ, chia 1-3 dòng sao cho cỡ chữ lớn nhất (vừa bề ngang vùng chữ và chiều cao `cao`); dòng cuối tô vàng
function chuTo(rong, toiDaDong = 3, cao = 560) {
  const tu = chu.trim().split(/\s+/).filter(Boolean).slice(0, 5)
  const coChu = (dong) => Math.min(168, rong / (Math.max(3, ...dong.map((d) => d.join(' ').length)) * 0.66), cao / dong.length / 1.18)
  let tot = [tu]
  const thu = (dong) => {
    if (dong.every((d) => d.length) && coChu(dong) > coChu(tot)) tot = dong
  }
  for (let a = 1; a < tu.length; a++) {
    thu([tu.slice(0, a), tu.slice(a)])
    if (toiDaDong >= 3) for (let b = a + 1; b < tu.length; b++) thu([tu.slice(0, a), tu.slice(a, b), tu.slice(b)])
  }
  const html = tot.map((d, k) => `<div class="${tot.length > 1 && k === tot.length - 1 ? 'vang' : ''}">${esc(d.join(' '))}</div>`).join('')
  return { co: Math.round(coChu(tot)), html }
}

// Nhân vật cận (đầu + vai) với miệng mở (ngạc nhiên / đang nói)
const moMieng = (svg, id) => svg.replace(`id="${id}-mieng-dong"`, `id="${id}-mieng-dong" opacity="0"`).replace(`id="${id}-mieng-mo" opacity="0"`, `id="${id}-mieng-mo"`).replace(`id="${id}-mieng-mo"`, `id="${id}-mieng-mo" opacity="1"`)
const linhVat = (svg, id, lat = false) =>
  moMieng(svg, id).replace(/viewBox="0 0 600 700" width="\d+" height="\d+"/, `viewBox="40 70 520 560" width="100%" height="100%"${lat ? ' style="transform:scaleX(-1)"' : ''}`)
function nhanVatTruyen() {
  if (nhan_vat_chinh) {
    const v = nhanVatChinhSvg(nhan_vat_chinh)
    return `<svg viewBox="${v.viewBox === '0 0 400 600' ? '50 40 300 330' : '30 -20 340 380'}" width="100%" height="100%">${moMieng(v.svg('bia'), 'bia')}</svg>`
  }
  const p = NHAN_VAT_PHU[nhan_vat]
  if (p) return `<svg viewBox="${p.viewBox && p.viewBox !== '0 0 400 600' ? '30 -20 340 380' : '50 40 300 330'}" width="100%" height="100%">${moMieng(p.svg('bia'), 'bia')}</svg>`
  return null
}

const bc = (BOI_CANH[boi_canh] ?? BOI_CANH.truong_quay)('bia')
const nen = `<div class="nen"><svg viewBox="0 380 1080 760" preserveAspectRatio="xMidYMid slice">${bc.svg}</svg></div><div class="toi"></div>`
const bt = bieu_tuong ? `<div class="bt">${esc(bieu_tuong)}</div>` : ''

function than() {
  const coAnh = KIEU === 5 && anh_that && existsSync(anh_that)
  if (KIEU === 3) {
    const nv = nhanVatTruyen()
    const c = chuTo(600)
    return `${nen}<div class="lua" style="left:330px"></div><div class="nv-to trai">${nv ?? linhVat(meoSvg, 'meo', true)}</div>
<div class="chu" style="left:640px;right:30px;font-size:${c.co}px">${c.html}</div>`
  }
  if (KIEU === 4) {
    const c = chuTo(1120, 2)
    return `${nen}<div class="lua" style="left:820px;top:430px"></div><div class="bt-khung"><div class="bt-to">${esc(bieu_tuong || '❓')}</div><div class="hoi">?</div></div>
<div class="nv-lo">${linhVat(meoSvg, 'meo')}</div><div class="chu tren" style="font-size:${Math.min(c.co, 130)}px">${c.html}</div>`
  }
  const c = chuTo(540)
  const chuTrai = `<div class="chu" style="left:40px;right:700px;font-size:${c.co}px">${c.html}</div>`
  if (coAnh) {
    // Ba vùng không chồng nhau: chữ nửa trên bên trái (cao tối đa ~420), Mèo Mun góc dưới trái nhìn sang ảnh, biểu tượng
    // cạnh Mun (không đè mặt Mun), ảnh thật bên phải
    const c5 = chuTo(540, 3, 400)
    const bt5 = bieu_tuong ? `<div class="bt" style="left:330px;top:525px;font-size:135px">${esc(bieu_tuong)}</div>` : ''
    return `${nen}<img class="anh" src="${pathToFileURL(anh_that).href}"/><div class="anh-mo"></div><div class="chu" style="left:40px;right:700px;top:36px;transform:rotate(-2deg);font-size:${c5.co}px">${c5.html}</div><div class="nv-lo" style="left:-10px;bottom:-110px;width:310px;height:340px;transform:rotate(6deg)">${linhVat(meoSvg, 'meo')}</div>${bt5}`
  }
  const robot = KIEU === 2
  return `${nen}<div class="lua"></div><div class="nv-to phai">${robot ? linhVat(robotSvg, 'robot', true) : linhVat(meoSvg, 'meo', true)}</div>${chuTrai}${bt}`
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: B; src: url("${FONT}"); }
* { margin: 0; box-sizing: border-box; }
body { width: 1280px; height: 720px; overflow: hidden; font-family: B, "Segoe UI Emoji", sans-serif; background: #0b1020; position: relative; }
.nen { position: absolute; inset: -40px; filter: blur(8px) saturate(1.15) brightness(0.5); }
.nen svg { width: 100%; height: 100%; }
.toi { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 80% at 50% 50%, #0000 30%, #000c 100%); }
/* Vầng sáng sau nhân vật: tách nhân vật khỏi nền */
.lua { position: absolute; left: 930px; top: 420px; width: 900px; height: 900px; margin: -450px; border-radius: 50%;
  background: radial-gradient(circle, #fde047 0, #f97316aa 28%, #dc262655 45%, #0000 65%); }
.nv-to { position: absolute; bottom: -40px; width: 620px; height: 680px; filter: drop-shadow(0 0 6px #fff) drop-shadow(0 0 22px #fffa) drop-shadow(0 28px 34px #000d); }
.nv-to.phai { right: -40px; } .nv-to.trai { left: 0; width: 640px; }
.nv-lo { position: absolute; left: -40px; bottom: -120px; width: 380px; height: 420px; transform: rotate(10deg); filter: drop-shadow(0 0 6px #fff) drop-shadow(0 20px 26px #000c); }
.nv-lo.phai { left: auto; right: 520px; transform: rotate(-8deg); }
.chu { position: absolute; top: 50%; transform: translateY(-50%) rotate(-2deg); line-height: 1.16; color: #fff; text-transform: uppercase;
  -webkit-text-stroke: 16px #000; paint-order: stroke fill; text-shadow: 0 10px 0 #000, 0 16px 30px #000; letter-spacing: -1px; }
.chu.tren { top: 40px; left: 40px; right: 40px; transform: rotate(-2deg); }
.chu div { white-space: nowrap; position: relative; } .chu div:nth-child(1) { z-index: 3; } .chu div:nth-child(2) { z-index: 2; } .vang { color: #facc15; }
.bt { position: absolute; left: 520px; top: 500px; font-size: 170px; line-height: 1; font-family: "Segoe UI Emoji", sans-serif; transform: rotate(-10deg);
  filter: drop-shadow(0 0 4px #fff) drop-shadow(0 14px 18px #000c); }
.bt-khung { position: absolute; left: 600px; top: 230px; width: 460px; height: 460px; }
.bt-to { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 330px; line-height: 1;
  font-family: "Segoe UI Emoji", sans-serif; filter: drop-shadow(0 0 6px #fff) drop-shadow(0 24px 30px #000d); }
.hoi { position: absolute; right: -60px; top: -30px; font-size: 230px; color: #facc15; -webkit-text-stroke: 14px #000; paint-order: stroke fill; transform: rotate(14deg); }
.anh { position: absolute; right: 0; top: 0; width: 700px; height: 720px; object-fit: cover; }
.anh-mo { position: absolute; inset: 0; background: linear-gradient(90deg, #0b1020 42%, #0b1020cc 52%, #0b102000 72%); }
.kenh { position: absolute; right: 24px; top: 20px; color: #fff; font-size: 26px; background: #000b; padding: 6px 16px; border-radius: 10px; border-left: 6px solid #ef4444; }
</style></head><body>
${than()}
<div class="kenh">${esc(kenh)}</div>
</body></html>`

const tam = mkdtempSync(join(tmpdir(), 'anh-bia-'))
try {
  const trang = join(tam, 'bia.html')
  writeFileSync(trang, html)
  if (process.env.CHI_HTML) {
    writeFileSync(ra.replace(/\.png$/, '.html'), html)
  } else {
    const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync)
    if (!edge) throw new Error('Không thấy Microsoft Edge để chụp ảnh bìa')
    const kq = spawnSync(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${join(tam, 'edge')}`, '--window-size=1280,720',
      `--screenshot=${ra}`, '--virtual-time-budget=3000', pathToFileURL(trang).href], { timeout: 90_000 })
    if (!existsSync(ra)) throw new Error('Edge không chụp được ảnh bìa: ' + String(kq.stderr ?? '').slice(-300))
  }
  console.log('Đã tạo ảnh bìa', ra)
} finally {
  rmSync(tam, { recursive: true, force: true })
}
