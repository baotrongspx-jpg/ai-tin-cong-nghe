import 'server-only'
import { db } from './db'
import { BOI_CANH } from './ai'

// Ảnh nền tự làm cho video YouTube: chủ trang tải lên mỗi bối cảnh một ảnh (kho video-tiktok/nen-tu-lam/<boi_canh>.<đuôi>).
// Máy nhà (may-nha/tho_doc.py: tai_anh_nen) dùng ảnh này làm nền cho mọi cảnh có bối cảnh đó, thay tranh Pixabay / cảnh vẽ.
const KHO = 'video-tiktok'
const THU_MUC = 'nen-tu-lam'
const DUOI = /\.(jpe?g|png|webp)$/i
export type BoiCanh = (typeof BOI_CANH)[number]

// Tên tiếng Việt + gợi ý nội dung ảnh cho từng bối cảnh (hiện trên trang)
export const MO_TA_BOI_CANH: Record<BoiCanh, [string, string]> = {
  truong_quay: ['Trường quay', 'Phòng thu bản tin công nghệ: bàn dẫn, màn hình lớn phía sau, đèn neon'],
  pho_florida: ['Phố ban ngày', 'Đường phố đô thị nắng, cửa hàng, cây xanh, vỉa hè'],
  may_chu: ['Phòng máy chủ', 'Dãy tủ máy chủ đèn nhấp nháy, sàn kỹ thuật, ánh xanh'],
  don_canh_sat: ['Đồn cảnh sát', 'Văn phòng cảnh sát: bàn làm việc, bảng thông báo, cờ'],
  phong_khach: ['Phòng khách', 'Phòng khách gia đình: sofa, TV, cửa sổ, đèn ấm'],
  van_phong: ['Văn phòng', 'Văn phòng công ty công nghệ: bàn máy tính, kính, cây xanh'],
  vu_tru: ['Vũ trụ', 'Không gian: Trái Đất, sao, tàu vũ trụ xa xa'],
  cua_hang: ['Cửa hàng', 'Cửa hàng điện tử: kệ điện thoại, laptop, quầy thanh toán'],
  thanh_pho_dem: ['Thành phố đêm', 'Đường chân trời nhà cao tầng lúc đêm, đèn sáng'],
  nong_thon: ['Nông thôn', 'Đồng lúa, núi xa, đường làng, trời xanh'],
  truong_hoc: ['Trường học', 'Lớp học: bảng đen, bàn ghế, cửa sổ'],
  benh_vien: ['Bệnh viện', 'Phòng bệnh hoặc hành lang bệnh viện sạch sẽ'],
  nha_may: ['Nhà máy', 'Dây chuyền sản xuất, cánh tay robot, đèn công nghiệp'],
  cong_truong: ['Công trường', 'Cần cẩu, giàn giáo, tòa nhà đang xây'],
  san_bay: ['Sân bay', 'Sảnh chờ nhà ga, cửa kính lớn nhìn ra đường băng có máy bay'],
  bai_bien: ['Bãi biển', 'Bờ cát, biển xanh, hàng dừa'],
  nui_rung: ['Núi rừng', 'Rừng cây, núi, thác nước'],
  cho: ['Chợ', 'Chợ châu Á: sạp hàng, đèn lồng, mái bạt'],
  nha_hang: ['Nhà hàng', 'Bàn ăn, quầy bếp, đèn treo'],
  san_van_dong: ['Sân vận động', 'Sân bóng, khán đài đông người, đèn pha'],
  phong_hop: ['Phòng họp', 'Bàn họp dài, ghế, màn chiếu'],
  phong_thi_nghiem: ['Phòng thí nghiệm', 'Bàn thí nghiệm, ống nghiệm, thiết bị khoa học'],
  hoi_truong: ['Hội trường', 'Sân khấu hội nghị có bục phát biểu, hàng ghế'],
  cang_bien: ['Cảng biển', 'Tàu container, cần cẩu cảng, mặt nước'],
  nha_ngheo: ['Nhà nghèo', 'Căn nhà gỗ cũ trong làng, đồ đạc đơn sơ'],
  san_khau: ['Sân khấu', 'Sân khấu biểu diễn, đèn spotlight, màn hình lớn'],
  thanh_pho_tuyet: ['Thành phố tuyết', 'Phố châu Âu mùa đông, tuyết phủ'],
  thu_vien: ['Thư viện', 'Kệ sách cao, bàn đọc, đèn bàn'],
  san_chung_khoan: ['Sàn chứng khoán', 'Bảng điện tử giá cổ phiếu, màn hình, bàn giao dịch'],
  thao_nguyen: ['Thảo nguyên', 'Đồng cỏ rộng, lều du mục, trời cao'],
  cung_dien: ['Cung điện', 'Sân cung điện cổ phương Đông, mái ngói, cột đỏ'],
  chien_truong: ['Chiến trường', 'Chiến trường xưa: khói, cờ, đồi trống'],
  thanh_co: ['Lâu đài', 'Lâu đài đá trung cổ, tháp canh'],
  lang_xua: ['Làng xưa', 'Làng Việt xưa: cây đa, giếng, mái tranh'],
  sa_mac: ['Sa mạc', 'Đồi cát, hoàng hôn'],
  bien_ca: ['Biển cả', 'Thuyền buồm giữa đại dương'],
  den_chua: ['Đền chùa', 'Chùa, đền trên núi, mái cong'],
  ga_ra: ['Gara', 'Gara / xưởng nhỏ: dụng cụ treo tường, bàn làm việc, bóng đèn'],
  be_phong: ['Bệ phóng', 'Bệ phóng tên lửa lúc bình minh'],
  phong_thu: ['Phòng thu âm', 'Phòng thu: micro, bàn mixer, tấm cách âm'],
  phim_truong: ['Phim trường', 'Trường quay phim: máy quay, đèn, phông nền'],
}

const kho = () => db().storage.from(KHO)

export type NenTuLam = { boiCanh: BoiCanh; ten: string; tep: string | null; goiY: string; xem: string | null }
export async function dsNenTuLam(): Promise<NenTuLam[]> {
  const { data } = await kho().list(THU_MUC, { limit: 200 })
  const tep = new Map((data ?? []).filter((f) => DUOI.test(f.name)).map((f) => [f.name.replace(DUOI, ''), f]))
  const ds = BOI_CANH.map((b) => ({ b, f: tep.get(b) }))
  const co = ds.filter((x) => x.f)
  const { data: link } = co.length ? await kho().createSignedUrls(co.map((x) => `${THU_MUC}/${x.f!.name}`), 3600) : { data: [] }
  const xem = new Map(co.map((x, i) => [x.b, link?.[i]?.signedUrl ?? null]))
  return ds.map(({ b, f }) => ({
    boiCanh: b,
    ten: MO_TA_BOI_CANH[b][0],
    goiY: MO_TA_BOI_CANH[b][1],
    tep: f ? `${f.name}?v=${encodeURIComponent(String(f.updated_at ?? ''))}` : null,
    xem: xem.get(b) ?? null,
  }))
}

const kiemBoiCanh = (b: string): BoiCanh => {
  if (!(BOI_CANH as readonly string[]).includes(b)) throw new Error('Bối cảnh không hợp lệ')
  return b as BoiCanh
}

// Mỗi bối cảnh một ảnh: tải ảnh mới thì xoá ảnh cũ (có thể khác đuôi), rồi trả link để trình duyệt tải thẳng lên kho
export async function linkTaiNen(boiCanh: string, tenGoc: string) {
  const b = kiemBoiCanh(boiCanh)
  const duoi = tenGoc.match(DUOI)?.[0].toLowerCase().replace('.jpeg', '.jpg')
  if (!duoi) throw new Error('Chỉ nhận ảnh .jpg, .png, .webp')
  await xoaNen(b)
  const { data, error } = await kho().createSignedUploadUrl(`${THU_MUC}/${b}${duoi}`, { upsert: true })
  if (error || !data) throw new Error(`Không tạo được link tải lên: ${error?.message ?? 'lỗi'}`)
  return data.signedUrl
}

export async function xoaNen(boiCanh: string) {
  const b = kiemBoiCanh(boiCanh)
  const { error } = await kho().remove(['.jpg', '.png', '.webp'].map((d) => `${THU_MUC}/${b}${d}`))
  if (error) throw new Error(error.message)
}
