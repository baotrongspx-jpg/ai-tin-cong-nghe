// Bảng bóc tách từng câu thoại (chủ trang 15/10/2026: "bóc tách từng câu thoại để biết cần làm gì và cần chuẩn bị gì"):
// gom mọi chỉ dẫn của một câu về một dòng — ai nói, trên hình ai làm gì, di chuyển, đạo cụ, hình cần có, bối cảnh, ánh
// sáng, máy quay, nét mặt, âm thanh, kịch bản diễn — và câu đó đã đủ để dựng chưa, còn thiếu gì. Dùng được ở trình duyệt.
import type { DuAnYT } from './youtube'
import { THU_VIEN_HANH_DONG, TEN_LOAI_HINH, coEmoji, type CauHanhDong, type PhanTichHanhDong } from './thuVienHanhDong'

export const TEN_KHUNG: Record<string, string> = { toan_canh: 'toàn cảnh', trung_canh: 'trung cảnh', can_canh: 'cận cảnh', sieu_can: 'đặc tả', goc_thap: 'góc thấp', goc_cao: 'góc cao' }
export const TEN_MAY: Record<string, string> = { dung_yen: 'đứng yên', day_vao: 'đẩy vào', keo_ra: 'kéo ra', lia_sang: 'lia sang', truot_ngang: 'trượt ngang', nang_len: 'nâng lên', rung_tay: 'rung tay' }
export const TEN_DEN: Record<string, string> = { binh_thuong: 'bình thường', am_ap: 'ấm', lanh: 'lạnh', cang_thang: 'căng thẳng', tuoi_sang: 'tươi sáng', mo_mong: 'mơ mộng', bi_an: 'bí ẩn', canh_bao: 'cảnh báo đỏ', loe_sang: 'loé sáng' }
export const TEN_CAM_XUC: Record<string, string> = { to_mo: 'tò mò', giai_thich: 'giải thích', khang_dinh: 'khẳng định', vui: 'vui', buon: 'buồn', bat_ngo: 'bất ngờ', lo_lang: 'lo lắng', tuc_gian: 'tức giận', suy_nghi: 'suy nghĩ' }
export const TEN_AM: Record<string, string> = { vut: 'vút', bum: 'bùm', ting: 'ting', bop: 'bốp', coi_bao: 'còi báo', go_phim: 'gõ phím', tim_dap: 'tim đập', tich_tac: 'tích tắc', vui: 'nhạc vui', hut_hang: 'hụt hẫng', gio: 'gió', buoc_chan: 'bước chân', vo_tay: 'vỗ tay', xe_chay: 'xe chạy', bo_xe: 'bô xe', coi_xe: 'còi xe', mua: 'mưa', sam: 'sấm', chuong_dt: 'chuông điện thoại', chuong_truong: 'chuông trường', tien: 'tiền keng', go_cua: 'gõ cửa', chup_anh: 'chụp ảnh', reo_ho: 'reo hò', bua: 'búa', phao_hoa: 'pháo hoa', may_bay: 'máy bay', nuoc: 'nước' }
const TEN_THOI_TIET: Record<string, string> = { mua: 'mưa', tuyet: 'tuyết rơi', suong: 'sương mù' }
const TEN_NGUOI: Record<string, string> = { nguoi_ke: 'Người kể', meo: 'Mèo Mun', robot: 'Robot Bit', nhan_vat_chinh: 'Nhân vật chính' }

// Di chuyển trên sân khấu — cùng luật với máy dựng (may-nha/hoat-hinh/tao_video.mjs, lớp -buoc / -nhun)
const CANH = new Set(['mo_cua', 'nam_noi', 'gong_chuong', 'rung_chuong', 'bam_nut', 'dam_bao_cat', 'kham_suc_khoe', 'ngoi_thien', 'buoc_vao_dai', 'doi_dau', 'dam_boc', 'dam_moc', 'ha_guc', 'can_tai', 'dung_cho_dem', 'nhan_dai', 'treo_bien', 'can_hang', 'cat_bang', 'choi_bai', 'dan_lat', 'dao_dat', 'cho_chim_an', 'thap_nen', 'ngoi_lang_le', 'nam_tay', 'nhin_bien', 'vo_vai'])
const DI = new Set(['xach_vali', 'di_bo', 'chay', 'lai_xe', 'ganh_vac', 'di_may_bay', 'dap_xe', 'buoc_qua_suong'])
const SAN = new Set(['rua_bat', 'lap_rap', 'nam_noi', 'dong_may_tinh', 'an_com', 'dem_tien'])
function diChuyen(hanhDong: string, camXuc: string) {
  const ds: string[] = []
  if (CANH.has(hanhDong)) ds.push('về đứng cạnh đồ của cảnh')
  else if (DI.has(hanhDong)) ds.push('đi từ trái sang phải')
  else ds.push('đổi chỗ đứng trên sân khấu')
  if (['khang_dinh', 'tuc_gian'].includes(camXuc)) ds.push('bước lên gần máy quay')
  if (camXuc === 'buon') ds.push('lùi xa, đi chậm')
  if (camXuc === 'bat_ngo') ds.push('giật lùi')
  if (camXuc === 'vui') ds.push('nảy lên khi tới chỗ')
  if (SAN.has(hanhDong)) ds.push('khom người khi làm')
  return ds.join(', ')
}

const TEN_CHUYEN: Record<string, string> = { truot: 'trượt ngang', quet: 'lia nhanh', phong: 'phóng vào chi tiết', mo: 'mờ qua đen (thời gian trôi)', xuyen: 'xuyên vào thế giới mới', tu_dong: 'máy tự chọn' }

export type DongBocTach = {
  k: number
  i: number
  id_cau: string // C01-05: chương 1, câu 5
  id_canh: string // C01-S02: cảnh thứ 2 của chương 1 (đổi cảnh khi đổi địa điểm / bối cảnh)
  y_nghia: string
  thoi_luong: number // giây, ước tính theo độ dài câu (máy dựng theo giọng đọc thật)
  dau_canh: string
  cuoi_canh: string
  chuyen_tiep: string
  tieu_chi: string[]
  san_xuat: string
  kiem_duyet: { kq: 'dat' | 'loi' | 'chua'; ghi_chu: string }
  ai: string
  chu: string
  tren_hinh: string
  hanh_dong: string
  di_chuyen: string
  dao_cu: { ten: string; co: boolean; gan_duoc: boolean }[]
  hinh: { ten: string; co: boolean; ghi_chu: string }[]
  boi_canh: string
  nen_co: boolean
  anh_sang: string
  may_quay: string
  cam_xuc: string
  am_thanh: string
  chi_tiet: string
  can_chuan_bi: string[]
}

export function bocTach(d: DuAnYT, pt: PhanTichHanhDong): DongBocTach[] {
  const diaDiem = new Map((d.phim?.ho_so?.dia_diem ?? []).map((x) => [x.ma, x.ten]))
  return pt.chuong.flatMap((c) => {
    const loi = d.phan[c.k - 1]?.loi ?? []
    const hai = (n: number) => String(n).padStart(2, '0')
    // Cảnh = chuỗi câu liền nhau cùng nơi (phim tiểu sử: mã địa điểm; video thường: bối cảnh)
    const noiCua = (j: number) => (d.loai === 'tieu_su' ? (loi[j]?.dia_diem ?? '') : (loi[j]?.boi_canh ?? ''))
    let soCanh = 0
    const canhCua = loi.map((_, j) => (j === 0 || noiCua(j) !== noiCua(j - 1) ? ++soCanh : soCanh))
    return c.cau.map((x: CauHanhDong) => {
      const l = loi[x.i]
      const tv = THU_VIEN_HANH_DONG[x.hanh_dong]
      const thieuVat = new Set(x.do_vat_thieu ?? [])
      const dao_cu = (x.do_vat_can ?? []).map((v) => ({ ten: v, co: !thieuVat.has(v), gan_duoc: thieuVat.has(v) && coEmoji(v) }))
      const hinh = (x.hinh_can ?? []).map((h) => ({ ten: `${TEN_LOAI_HINH[h.loai]}: ${h.ten}`, co: h.co, ghi_chu: h.ghi_chu }))
      const ma = l?.dia_diem ?? ''
      const nen_co = d.loai !== 'tieu_su' || !ma || !!d.phim?.nen?.[ma]
      const can_chuan_bi = [
        ...(x.hanh_dong === 'moi' ? [`Hành động mới: ${x.ten_moi} (${x.viec})`] : []),
        ...dao_cu.filter((v) => !v.co).map((v) => `Đạo cụ: ${v.ten}${v.gan_duoc ? ' (gắn được ngay)' : ' (phải vẽ)'}`),
        ...hinh.filter((h) => !h.co).map((h) => `${h.ten} — ${h.ghi_chu}`),
        ...(!nen_co ? [`Ảnh nền địa điểm: ${diaDiem.get(ma) ?? ma}`] : []),
      ]
      const ai = l ? (TEN_NGUOI[l.ai] ?? l.ai) : ''
      const truoc = c.cau[x.i - 1]
      const sau = c.cau[x.i + 1]
      const cungCanhTruoc = !!truoc && canhCua[x.i - 1] === canhCua[x.i]
      const cungCanhSau = !!sau && canhCua[x.i + 1] === canhCua[x.i]
      const tenNoi = (j: number) => (d.loai === 'tieu_su' ? (diaDiem.get(noiCua(j)) ?? noiCua(j)) : noiCua(j)) || 'nền chung'
      const vat = (x.do_vat_can ?? []).join(', ')
      const dau_canh = DI.has(x.hanh_dong)
        ? 'đứng mép trái khung hình, sẵn sàng đi'
        : cungCanhTruoc && truoc.nguoi && truoc.nguoi === x.nguoi
          ? `cùng người, nối tiếp ngay sau câu trước (vừa xong: ${truoc.viec || 'đứng nói'})`
          : cungCanhTruoc
            ? 'đứng giữa sân khấu, tư thế nghỉ, nhìn về phía máy quay'
            : `vừa vào cảnh mới (${tenNoi(x.i)}), đứng giữa sân khấu`
      const cuoi_canh = [
        DI.has(x.hanh_dong) ? 'đã đi tới bên phải khung hình' : SAN.has(x.hanh_dong) ? 'đứng thẳng lại sau khi khom' : x.can ? 'xong việc, về tư thế đứng' : 'dứt cử chỉ, về tư thế nghỉ',
        vat ? `đạo cụ (${vat}) cất đi khi hết câu` : '',
      ].filter(Boolean).join('; ')
      const chuyen_tiep = !sau
        ? 'hết chương — sang thẻ chương sau'
        : !cungCanhSau
          ? `chuyển cảnh sang ${tenNoi(x.i + 1)} — ${TEN_CHUYEN[loi[x.i + 1]?.chuyen_canh ?? ''] ?? 'máy tự chọn'}`
          : sau.nguoi && x.nguoi && sau.nguoi !== x.nguoi
            ? `giữ cảnh, đổi người diễn: ${sau.nguoi}`
            : 'giữ cảnh, nối tiếp liền mạch'
      const tieu_chi = [
        x.can ? `Thấy rõ: ${x.viec}` : `Cử chỉ khớp lời: ${x.viec || 'đứng nói'}`,
        x.nguoi ? `Đúng người diễn: ${x.nguoi}` : '',
        ...(x.do_vat_can ?? []).map((v) => `Đạo cụ hiện, cầm đúng tay: ${v}`),
        ...(x.hinh_can ?? []).filter((h) => h.loai !== 'nhan_vat' && h.loai !== 'dia_diem').map((h) => `Có trên hình: ${h.ten}`),
        `Đúng bối cảnh: ${tenNoi(x.i)}`,
        'Không chồng chéo chữ / đạo cụ, không giật',
        'Hết câu thì dừng hành động, không kéo sang câu sau',
      ].filter(Boolean)
      const thieuGi = can_chuan_bi.length
      return {
        k: c.k,
        i: x.i,
        id_cau: `C${hai(c.k)}-${hai(x.i + 1)}`,
        id_canh: `C${hai(c.k)}-S${hai(canhCua[x.i] ?? 1)}`,
        y_nghia: x.y_nghia ?? '',
        thoi_luong: Math.max(2, Math.round(((l?.chu ?? x.chu).length / 14) * 10) / 10),
        dau_canh,
        cuoi_canh,
        chuyen_tiep,
        tieu_chi,
        san_xuat: thieuGi ? `Cần chuẩn bị ${thieuGi} mục` : 'Sẵn sàng dựng',
        kiem_duyet: { kq: x.duyet?.kq ?? 'chua', ghi_chu: x.duyet?.ghi_chu ?? '' },
        ai: l?.ai === 'nguoi_ke' && l.nhan_vat_phu && l.nhan_vat_phu !== 'khong' ? `${ai} (trên hình: ${x.nguoi || l.nhan_vat_phu})` : ai,
        chu: l?.chu ?? x.chu,
        tren_hinh: `${x.nguoi ? `${x.nguoi}: ` : ''}${x.viec}`,
        hanh_dong: x.hanh_dong === 'moi' ? `THIẾU — ${x.ten_moi}` : tv ? `${tv.ten}${tv.loai === 'cu_chi' ? ' (cử chỉ)' : ''}` : 'đứng nói',
        di_chuyen: diChuyen(x.hanh_dong, l?.cam_xuc ?? ''),
        dao_cu,
        hinh,
        boi_canh: [ma ? (diaDiem.get(ma) ?? ma) : '', l?.boi_canh ?? ''].filter(Boolean).join(' — '),
        nen_co,
        anh_sang: [TEN_DEN[l?.anh_sang ?? ''] ?? '', TEN_THOI_TIET[(l as { thoi_tiet?: string } | undefined)?.thoi_tiet ?? ''] ?? ''].filter(Boolean).join(', '),
        may_quay: [TEN_KHUNG[l?.khung_hinh ?? ''] ?? l?.khung_hinh ?? '', TEN_MAY[l?.may_quay ?? ''] ?? l?.may_quay ?? ''].filter(Boolean).join(', '),
        cam_xuc: TEN_CAM_XUC[l?.cam_xuc ?? ''] ?? l?.cam_xuc ?? '',
        am_thanh: TEN_AM[l?.am_thanh ?? ''] ?? '',
        chi_tiet: x.chi_tiet ?? '',
        can_chuan_bi,
      }
    })
  })
}

// Bảng tính (CSV, mở bằng Excel): có BOM để Excel đọc đúng tiếng Việt
export function bocTachCsv(ds: DongBocTach[]) {
  const o = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const dau = ['ID câu', 'ID cảnh', 'Ai nói', 'Lời kể nguyên văn', 'Ý nghĩa / khán giả cần thấy', 'Thời lượng (giây, ước tính)', 'Trên hình', 'Hành động', 'Di chuyển', 'Trạng thái đầu', 'Trạng thái cuối', 'Chuyển tiếp', 'Đạo cụ', 'Hình cần có', 'Bối cảnh', 'Ảnh nền', 'Ánh sáng', 'Máy quay', 'Nét mặt', 'Âm thanh', 'Cần chuẩn bị', 'Kịch bản diễn', 'Tiêu chí kiểm tra', 'Sản xuất', 'Kiểm duyệt']
  const kd = (x: DongBocTach) => (x.kiem_duyet.kq === 'dat' ? 'Đạt' : x.kiem_duyet.kq === 'loi' ? `Lỗi: ${x.kiem_duyet.ghi_chu}` : 'Chưa xác minh')
  const dong = ds.map((x) =>
    [
      x.id_cau, x.id_canh, x.ai, x.chu, x.y_nghia, String(x.thoi_luong), x.tren_hinh, x.hanh_dong, x.di_chuyen, x.dau_canh, x.cuoi_canh, x.chuyen_tiep,
      x.dao_cu.map((v) => `${v.ten}${v.co ? '' : ' (thiếu)'}`).join('; '),
      x.hinh.map((h) => `${h.ten}${h.co ? '' : ' (thiếu)'}`).join('; '),
      x.boi_canh, x.nen_co ? 'có' : 'THIẾU', x.anh_sang, x.may_quay, x.cam_xuc, x.am_thanh,
      x.can_chuan_bi.join('; ') || 'đủ', x.chi_tiet, x.tieu_chi.join('; '), x.san_xuat, kd(x),
    ].map(o).join(','),
  )
  return '﻿' + [dau.map(o).join(','), ...dong].join('\r\n')
}
