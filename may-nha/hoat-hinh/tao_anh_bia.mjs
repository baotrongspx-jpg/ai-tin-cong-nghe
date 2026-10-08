// Ảnh bìa (thumbnail) YouTube 1280x720: bối cảnh chính của video làm nền (mờ, tối), Mèo Mun ngạc nhiên bên trái,
// Robot Bit bên phải, chữ to 3-6 từ viền đen ở giữa, nhãn chủ đề + tên kênh. Chụp bằng Edge chạy ẩn.
// Chạy: node tao_anh_bia.mjs <vao.json> <ra.png>
//   vao.json: { "chu": "chữ to trên ảnh", "chu_de": "AI", "kenh": "Công Nghệ 24H", "boi_canh": "thanh_pho_dem", "nguoi_ke": false }
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { BOI_CANH } from './boiCanh.mjs'
import { meoSvg, robotSvg } from './nhanVatChinh.mjs'
import { nguoiKeSvg, nhanVatChinhSvg } from './nhanVatPhu.mjs'

const [vao, ra] = process.argv.slice(2).map((x) => resolve(x))
// nhan_vat_chinh: hình nhân vật chính phim tiểu sử (nhanVatChinhSvg) — đứng giữa, to, có vầng sáng
const { chu = '', chu_de = '', kenh = 'Công Nghệ 24H', boi_canh = 'truong_quay', nguoi_ke = false, nhan_vat_chinh = null } = JSON.parse(readFileSync(vao, 'utf8'))
const chinh = nhan_vat_chinh ? nhanVatChinhSvg(nhan_vat_chinh) : null
const GOC = dirname(fileURLToPath(import.meta.url))
const FONT = pathToFileURL(join(GOC, '..', '..', 'assets', 'fonts', 'BeVietnamPro-Bold.ttf')).href
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Chữ to: tối đa 8 từ, chia 2 dòng cân nhau, cỡ chữ theo dòng dài nhất; từ cuối tô vàng cho nổi
const tu = chu.trim().split(/\s+/).filter(Boolean).slice(0, 8)
const giua = Math.ceil(tu.length / 2)
const dong = tu.length > 3 ? [tu.slice(0, giua), tu.slice(giua)] : [tu]
const coChu = Math.round(Math.min(118, 1250 / Math.max(6, ...dong.map((d) => d.join(' ').length))))
const chuHtml = dong
  .map((d, k) => `<div>${d.map((w, j) => `<span class="${k === dong.length - 1 && j === d.length - 1 ? 'vang' : ''}">${esc(w)}</span>`).join(' ')}</div>`)
  .join('')

const bc = (BOI_CANH[boi_canh] ?? BOI_CANH.truong_quay)('bia')
// Mun ngạc nhiên (miệng mở), Bit cười
const mat = (svg, id) => svg.replace(`id="${id}-mieng-dong"`, `id="${id}-mieng-dong" opacity="0"`).replace(`id="${id}-mieng-mo"`, `id="${id}-mieng-mo" opacity="1"`)

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: B; src: url("${FONT}"); }
* { margin: 0; box-sizing: border-box; }
body { width: 1280px; height: 720px; overflow: hidden; font-family: B, sans-serif; background: #0f172a; }
.nen { position: absolute; inset: -40px; filter: blur(5px) saturate(1.3); }
.nen svg { width: 100%; height: 100%; }
.toi { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, #0000 20%, #000b 85%), linear-gradient(90deg, #0008, #0000 30%, #0000 70%, #0008); }
.tia { position: absolute; left: 640px; top: 330px; width: 1600px; height: 1600px; margin: -800px; background: repeating-conic-gradient(#fde68a22 0 6deg, #0000 6deg 18deg); border-radius: 50%; mask: radial-gradient(#000 10%, #0000 60%); }
.nv { position: absolute; bottom: -70px; filter: drop-shadow(0 0 14px #fff8) drop-shadow(0 20px 26px #000c); }
.meo { left: -50px; width: 470px; transform: rotate(-6deg); }
.robot { right: -50px; width: 470px; transform: rotate(5deg) scaleX(-1); }
.ke { left: 50%; margin-left: -150px; bottom: -40px; width: 300px; }
.chinh { left: 50%; margin-left: -250px; bottom: -250px; width: 500px; }
.chu { position: absolute; left: 80px; right: 80px; top: 120px; text-align: center; font-size: ${coChu}px; line-height: 1.08; color: #fff; text-transform: uppercase;
  -webkit-text-stroke: 14px #111; paint-order: stroke fill; text-shadow: 0 10px 0 #111, 0 18px 30px #000c; letter-spacing: -1px; }
.chu div { white-space: nowrap; } .vang { color: #facc15; }
.nhan { position: absolute; left: 50%; transform: translateX(-50%) rotate(-3deg); top: 42px; background: #dc2626; color: #fff; font-size: 34px; padding: 6px 26px; border-radius: 12px; border: 5px solid #fff; box-shadow: 0 8px 18px #0009; text-transform: uppercase; }
.kenh { position: absolute; right: 26px; top: 22px; color: #fff; font-size: 24px; background: #000a; padding: 6px 16px; border-radius: 10px; border-left: 6px solid #38bdf8; }
</style></head><body>
<div class="nen"><svg viewBox="0 380 1080 760" preserveAspectRatio="xMidYMid slice">${bc.svg}</svg></div>
<div class="toi"></div><div class="tia"></div>
<div class="nv meo">${mat(meoSvg, 'meo').replace(/width="\d+" height="\d+"/, 'width="100%"')}</div>
<div class="nv robot">${mat(robotSvg, 'robot').replace(/width="\d+" height="\d+"/, 'width="100%"')}</div>
${chinh ? `<div class="nv chinh"><svg viewBox="${chinh.viewBox}" width="100%">${chinh.svg('bia-chinh')}</svg></div>` : ''}
${nguoi_ke ? `<div class="nv ke"><svg viewBox="80 40 440 660" width="100%">${nguoiKeSvg('ke')}</svg></div>` : ''}
${chu_de ? `<div class="nhan">${esc(chu_de)}</div>` : ''}
<div class="kenh">${esc(kenh)}</div>
<div class="chu">${chuHtml}</div>
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
