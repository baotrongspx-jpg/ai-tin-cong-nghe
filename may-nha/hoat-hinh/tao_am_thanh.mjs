// Tạo bộ hiệu ứng âm thanh tổng hợp bằng ffmpeg (không dùng tệp có bản quyền). Chạy một lần khi cần tạo lại:
//   node may-nha/hoat-hinh/tao_am_thanh.mjs
// Kết quả ở may-nha/hoat-hinh/am-thanh (thợ máy nhà chép vào assets khi dựng; tao_video.mjs dùng theo tên tệp).
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const GOC = dirname(fileURLToPath(import.meta.url))
const FFMPEG = join(GOC, '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
const RA = join(GOC, 'am-thanh')

// tao(tên, giây, biểu thức aevalsrc hoặc nguồn lavfi đầy đủ, bộ lọc thêm)
function tao(ten, giay, nguon, loc = '') {
  const vao = nguon.includes('=') && !nguon.startsWith("'") && /^[a-z]+=/.test(nguon) ? nguon : `aevalsrc=${nguon}:d=${giay}:s=44100`
  const af = [loc, `afade=t=out:st=${Math.max(0, giay - 0.15)}:d=0.15`, 'alimiter=limit=0.89'].filter(Boolean).join(',')
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', vao, '-t', String(giay), '-af', af, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', join(RA, `sfx-${ten}.wav`)])
  console.log('đã tạo', ten)
}

// Gió thổi: tiếng ồn hồng lọc dải, to dần rồi nhỏ dần, rít nhẹ
tao('gio', 2.6, `anoisesrc=color=pink:d=2.6:a=0.9`, "bandpass=f=550:width_type=o:w=1.4,volume='1.8*pow(sin(PI*t/2.6),2)*(0.8+0.2*sin(2*PI*1.3*t))':eval=frame")
// Bước chân: 4 bước, tiếng thịch trầm + tiếng sột soạt đế giày
tao('buoc-chan', 2.0, "'0.9*sin(2*PI*85*t)*exp(-38*mod(t\\,0.48))+0.35*(random(0)*2-1)*exp(-90*mod(t\\,0.48))'", 'lowpass=f=1600')
// Vỗ tay: nhiều nhịp vỗ lệch nhau tạo tiếng đám đông vỗ tay
tao(
  'vo-tay',
  3.0,
  "'(random(0)*2-1)*(exp(-70*mod(t\\,0.13))+exp(-70*mod(t+0.05\\,0.17))+exp(-70*mod(t+0.09\\,0.11))+exp(-70*mod(t+0.02\\,0.19))+exp(-70*mod(t+0.07\\,0.23))+exp(-70*mod(t+0.03\\,0.29)))*0.28*min(1\\,t*3)'",
  'bandpass=f=1800:width_type=o:w=2.2',
)
// Xe chạy ngang qua: tiếng gió lốp + máy, to nhất ở giữa
tao('xe-chay', 2.6, `anoisesrc=color=brown:d=2.6:a=0.9`, "lowpass=f=900,volume='2.2*exp(-pow(t-1.3\\,2)/0.22)':eval=frame")
// Bô xe máy: tiếng nổ máy rồ ga (răng cưa tần số thấp tăng dần), có méo nhẹ
tao('bo-xe', 2.2, "'0.55*(2*mod(40*t+45*(t*t-t*t*t/3.3)\\,1)-1)+0.12*(random(0)*2-1)'", 'lowpass=f=1100,acrusher=bits=8:mix=0.25')
// Còi ô tô: hai nốt vuông 420 / 520 Hz, bóp hai lần
tao('coi-xe', 1.0, "'0.28*(gt(sin(2*PI*420*t)\\,0)*2-1+gt(sin(2*PI*520*t)\\,0)*2-1)*(lt(t\\,0.32)+gt(t\\,0.45)*lt(t\\,0.95))'", 'lowpass=f=2600')
// Mưa rơi: tiếng ồn trắng lọc cao + hạt mưa lốp đốp
tao('mua', 3.0, "'0.18*(random(0)*2-1)+0.5*(random(1)*2-1)*gt(random(2)\\,0.996)'", "highpass=f=1500,lowpass=f=9000,volume='min(1\\,t*2)':eval=frame")
// Sấm: tiếng nổ giòn rồi ầm ì trầm dần
tao('sam', 3.2, "'(random(0)*2-1)*(0.9*exp(-14*t)+0.6*exp(-1.1*t)*(0.7+0.3*sin(2*PI*3*t)))'", 'lowpass=f=420')
// Chuông điện thoại: hai hồi reng
tao('chuong-dt', 2.2, "'0.3*(sin(2*PI*440*t)+sin(2*PI*480*t))*lt(mod(t\\,1.1)\\,0.7)*(0.6+0.4*sin(2*PI*20*t))'")
// Chuông trường: búa gõ chuông kim loại nhanh
tao('chuong-truong', 2.0, "'(0.32*sin(2*PI*1180*t)+0.12*sin(2*PI*2690*t))*(0.55+0.45*gt(sin(2*PI*17*t)\\,0))*min(1\\,(2-t)*2)'")
// Tiền "keng": tiếng cạch máy tính tiền + hai nốt chuông
tao('tien', 1.2, "'0.6*(random(0)*2-1)*exp(-60*t)+0.35*sin(2*PI*2093*t)*exp(-4*t)*gt(t\\,0.08)+0.3*sin(2*PI*2637*t)*exp(-4*(t-0.18))*gt(t\\,0.18)'")
// Gõ cửa: ba tiếng cốc cốc
tao('go-cua', 1.0, "'(0.9*sin(2*PI*150*t)+0.4*(random(0)*2-1))*exp(-55*mod(t\\,0.24))*lt(t\\,0.72)'", 'lowpass=f=2400')
// Chụp ảnh: hai tiếng tách của màn trập
tao('chup-anh', 0.45, "'(random(0)*2-1)*(exp(-160*t)+0.8*exp(-160*abs(t-0.12))*gt(t\\,0.12))'", 'highpass=f=1200')
// Đám đông reo hò: tiếng ồn có âm sắc giọng người, to dần, kèm tiếng huýt sáo
tao(
  'reo-ho',
  3.2,
  "'(random(0)*2-1)*0.5*min(1\\,t*1.5)*(0.75+0.25*sin(2*PI*2.3*t))+0.12*sin(2*PI*(2300+500*sin(2*PI*0.8*t))*t)*gt(t\\,0.8)*lt(t\\,2)'",
  'bandpass=f=1000:width_type=o:w=2.5',
)
// Búa gõ: ba nhát kim loại
tao('bua', 1.4, "'(0.5*(random(0)*2-1)*exp(-120*mod(t\\,0.42))+0.4*sin(2*PI*880*t)*exp(-18*mod(t\\,0.42))+0.25*sin(2*PI*2310*t)*exp(-25*mod(t\\,0.42)))*lt(t\\,1.26)'")
// Pháo hoa: tiếng rít bay lên rồi nổ đùng, lách tách
tao(
  'phao-hoa',
  2.6,
  "'0.22*sin(2*PI*(700*t+600*t*t))*lt(t\\,0.9)+(random(0)*2-1)*(0.9*exp(-6*(t-0.9))*gt(t\\,0.9))*(0.6+0.4*gt(random(1)\\,0.7))'",
  'lowpass=f=5000',
)
// Máy bay bay qua: tiếng gầm trầm + rít động cơ, to dần rồi xa dần
tao('may-bay', 3.0, "'(0.6*(random(0)*2-1)+0.15*sin(2*PI*(1900-300*t)*t))*exp(-pow(t-1.4\\,2)/0.6)'", 'lowpass=f=3000')
// Nước bắn / té nước
tao('nuoc', 1.0, "'(random(0)*2-1)*exp(-9*t)*0.8+0.2*sin(2*PI*(600+900*mod(t*7\\,1))*t)*exp(-5*t)'", 'bandpass=f=1300:width_type=o:w=2')
