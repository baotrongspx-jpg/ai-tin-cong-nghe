// Câu lệnh tạo ảnh bìa bằng ChatGPT / Gemini (chủ trang 16/10/2026: "chỗ vẽ ảnh bìa thay vì máy vẽ thì đưa ra câu lệnh để
// tôi chép đi tạo ở ChatGPT hoặc Gemini"). Soạn từ dữ liệu sẵn có của phim: ý ảnh bìa của bước đóng gói (phim tiểu sử: chủ
// thể, nét mặt, bố cục, nền, ánh sáng, màu, chữ, điểm tò mò) hoặc gợi ý ở bước dàn ý (video thường), ngoại hình nhân vật
// chính (bước thiết kế nhân vật). Dùng được ở trình duyệt.
import type { DuAnYT } from './youtube'

const NHAN_VAT: Record<string, string> = {
  doanh_nhan: 'một doanh nhân mặc vest, thắt cà vạt',
  nu_doanh_nhan: 'một nữ doanh nhân mặc vest sang trọng',
  nha_khoa_hoc: 'một nhà khoa học mặc áo blouse trắng, đeo kính',
  ky_su: 'một kỹ sư đội mũ bảo hộ',
  hacker: 'một hacker đội mũ trùm đầu, mặt khuất trong bóng tối',
  canh_sat: 'một cảnh sát mặc đồng phục',
  chinh_khach: 'một chính khách mặc vest đứng trước bục phát biểu',
  nguoi_phu_nu: 'một người phụ nữ',
  ong_lao: 'một ông lão tóc bạc',
  ba_lao: 'một bà cụ tóc bạc',
  hoc_sinh: 'một cậu học sinh đeo ba lô',
  van_dong_vien: 'một vận động viên mặc áo thi đấu',
  nghe_si: 'một nghệ sĩ trên sân khấu',
  vua: 'một vị vua đội vương miện',
  tuong_quan: 'một vị tướng mặc giáp',
}

export type LenhAnhBia = { ten: string; chu: string; lenh: string }

const inHoa = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi-VN')
// Ghép vào giữa câu: bỏ dấu chấm cuối, chữ đầu viết thường; đầu câu thì viết hoa chữ đầu
const gon = (s?: string) => {
  const t = (s ?? '').trim().replace(/[.。…]+$/, '')
  return t ? t[0].toLocaleLowerCase('vi-VN') + t.slice(1) : ''
}
const hoaDau = (s: string) => (s ? s[0].toLocaleUpperCase('vi-VN') + s.slice(1) : s)

export function lenhAnhBia(d: DuAnYT, chuDat: string): LenhAnhBia[] {
  const th = d.phim?.tao_hinh
  const gd = th?.giai_doan?.length ? [...th.giai_doan].sort((a, b) => a.tu_chuong - b.tu_chuong).at(-1) : undefined
  const tenNguoi = d.phim?.ten
  const ngoaiHinh = (ma?: string) =>
    tenNguoi
      ? `${hoaDau(tenNguoi)}${gd?.mo_ta ? ` — ${gon(gd.mo_ta)}` : ''}`
      : NHAN_VAT[ma ?? ''] ?? 'nhân vật chính của câu chuyện'
  // Các ý ảnh bìa: phim tiểu sử lấy ý của bước đóng gói (đầy đủ), video thường lấy gợi ý ở bước dàn ý
  const y = (d.phim?.dong_goi?.thumbnail ?? []).map((t) => ({
    chu: t.chu, bieuCam: gon(t.bieu_cam), chuThe: gon(t.chu_the), boCuc: gon(t.bo_cuc), nen: gon(t.nen), anhSang: gon(t.anh_sang), mau: gon(t.mau),
    viTriChu: gon(t.vi_tri_chu), toMo: gon(t.diem_to_mo), nhanVat: '',
  }))
  for (const g of d.anh_bia_goi_y ?? [])
    y.push({ chu: g.chu, bieuCam: '', chuThe: '', boCuc: '', nen: '', anhSang: '', mau: '', viTriChu: '', toMo: g.bieu_tuong ? `biểu tượng ${g.bieu_tuong} thật to, nổi bật` : '', nhanVat: g.nhan_vat })
  if (!y.length) y.push({ chu: '', bieuCam: '', chuThe: '', boCuc: '', nen: '', anhSang: '', mau: '', viTriChu: '', toMo: '', nhanVat: '' })
  return y.slice(0, 3).map((x, k) => {
    // Kiểu 1 dùng chữ chủ trang đang đặt ở ô chữ; các kiểu sau dùng chữ của chính ý đó (để thử nghiệm và so sánh)
    const chu = inHoa((k === 0 ? chuDat : x.chu) || chuDat || x.chu || d.tieu_de.split(/[:?!|–—-]/)[0].split(' ').slice(0, 4).join(' '))
    const trai = k % 2 === 0
    const dong = [
      `Tạo ảnh bìa (thumbnail) YouTube tỉ lệ 16:9, kích thước 1280x720, cho video có tiêu đề: "${d.tieu_de}".`,
      `Phong cách: hoạt hình 2D nét viền đậm, màu tươi, tương phản mạnh, rõ ràng khi thu nhỏ trên điện thoại.`,
      `Nhân vật chính: ${ngoaiHinh(x.nhanVat)}. Gương mặt to chiếm khoảng 40–45% khung hình, đặt ở bên ${trai ? 'trái' : 'phải'}, biểu cảm ${x.bieuCam || 'sửng sốt, mắt mở to'}, nhìn về phía chữ.`,
      x.chuThe ? `Chủ thể: ${hoaDau(x.chuThe)}.` : '',
      `Điểm gây tò mò: ${x.toMo || 'MỘT đồ vật hoặc tình huống bất ngờ liên quan tới câu chuyện, đặt cạnh nhân vật'}.`,
      x.boCuc ? `Bố cục: ${hoaDau(x.boCuc)}.` : '',
      `Nền: ${hoaDau(x.nen) || 'bối cảnh của câu chuyện'}, làm mờ và tối hơn nhân vật để nhân vật nổi bật.`,
      `Ánh sáng: ${hoaDau(x.anhSang) || 'ánh sáng viền rực quanh nhân vật'}. Màu chủ đạo: ${x.mau || 'vàng và đỏ trên nền xanh đậm'}.`,
      `Chữ trên ảnh (tiếng Việt, viết ĐÚNG từng dấu): "${chu}" — chữ rất to, in đậm, viền đen dày, đặt ở ${x.viTriChu || `nửa bên ${trai ? 'phải' : 'trái'}`}, tô vàng từ quan trọng nhất.`,
      `Không thêm bất kỳ chữ nào khác, không logo, không hình mờ (watermark), không viền khung.`,
      `Nếu không viết được đúng dấu tiếng Việt thì để trống vùng chữ (tôi sẽ tự thêm chữ sau).`,
    ]
    return { ten: `Kiểu ${k + 1}`, chu, lenh: dong.filter(Boolean).join('\n') }
  })
}
