// Biên tập viên kiểm định kịch bản (học từ ViMax / OpenMontage: bước "critic" + chấm rủi ro "trình chiếu nhàm"),
// chạy bằng luật, không tốn lượt AI. Sau khi AI viết một phần:
// 1. TỰ SỬA những lỗi hình ảnh an toàn (không đổi chữ nào): đạo cụ / âm thanh lặp liền nhau, cùng khung hình hay
//    cùng kiểu máy quay 3 câu liền, loé sáng / khoảng lặng dày quá; câu quá dài thì tách đôi ở dấu câu cho dễ nghe.
// 2. CHẤM ĐIỂM 0-100 và ghi chú những điều nên xem lại (độc thoại dài, cảnh đứng yên lâu, ít nhân vật, cảm xúc
//    đơn điệu, thiếu dấu…), hiện ở trang chi tiết video.
// Dùng được ở cả máy chủ lẫn trình duyệt (không gọi AI, không đọc kho).

type Cau = {
  ai: string
  chu: string
  cam_xuc?: string
  boi_canh?: string
  dao_cu?: string
  khung_hinh?: string
  may_quay?: string
  anh_sang?: string
  am_thanh?: string
  lang?: boolean
  the_moc?: string
  dong_tac?: string
  nhan_vat_phu?: string
}
export type GhiChuKiemDinh = { muc: 'loi' | 'nhac'; chu: string }
export type KetQuaKiemDinh = { diem: number; ghi_chu: GhiChuKiemDinh[]; da_sua: string[] }

const CO_DAU = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/giu
const CHINH = new Set(['meo', 'robot', 'nguoi_ke'])
const DAI_TOI_DA = 180 // ký tự (~9-10 giây đọc): dài hơn thì tách đôi
const DOI_KHUNG = ['trung_canh', 'can_canh', 'toan_canh', 'goc_thap']
const TU_BI_KICH = /chết|tử vong|thiệt mạng|qua đời|hy sinh|giết|thảm sát|thảm họa|thảm hoạ|bom|tàn phá|xóa sổ|xoá sổ|đổ nát|chiến tranh|ung thư|tro bụi|bức xạ|nạn nhân/
const TIENG_LONG = /bay màu|toang|chịu luôn|lật mặt|trù dập|xịn sò|đỉnh của chóp|hết nước chấm|ảo thật|căng đét|bá đạo|hết chỗ nói|đen đủi/
// Lời nói tới hành động → động tác (giống TU_DONG_TAC trong may-nha/hoat-hinh/tao_video.mjs; sửa một chỗ thì sửa cả hai)
const TU_DONG_TAC: [string, RegExp][] = [
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

// Tách câu dài ở chỗ hết câu (". ", "! ", "? ", "… ") gần giữa nhất, để hai vế đều đứng được một mình;
// không có chỗ hết câu ở khoảng giữa thì giữ nguyên
function tachDoi(chu: string): [string, string] | null {
  const giua = chu.length / 2
  let tot = -1
  for (const m of chu.matchAll(/[.!?…]\s/g)) {
    const vt = m.index! + 1
    if (vt > chu.length * 0.3 && vt < chu.length * 0.75 && (tot < 0 || Math.abs(vt - giua) < Math.abs(tot - giua))) tot = vt
  }
  return tot > 0 ? [chu.slice(0, tot).trim(), chu.slice(tot).trim()] : null
}

// Câu chào / hẹn chương sau / kêu gọi đăng ký. Video là MỘT phim xem liền từ đầu đến cuối: giữa phim không được chào
// tạm biệt hay "đón xem chương tiếp theo"; chương cuối giữ tối đa 2 câu chào kết.
const LOI_CHAO =
  /(hẹn gặp lại|tạm biệt|(đón|chờ) (xem |đón )?(chương|phần|tập)|(chương|phần|tập) (tiếp theo|sau|cuối|cuối cùng) (để|nhé|sẽ|của)|bấm đăng ký|nhấn đăng ký|đăng ký kênh|đăng ký ngay|nhấn chuông|bấm chuông|bấm like|nhấn like|theo dõi kênh|subscribe|đồng hành cùng (chúng tôi|kênh|công nghệ 24h))/i
export function locLoiChao<T extends { chu: string }>(loi: T[], laCuoi: boolean, giu = 2): { loi: T[]; bo: number[] } {
  const khop = loi.map((l, i) => (LOI_CHAO.test(l.chu) ? i : -1)).filter((i) => i >= 0)
  const bo = laCuoi ? khop.slice(0, -giu) : khop
  return { loi: loi.filter((_, i) => !bo.includes(i)), bo }
}

// Nhân vật phụ hiện đại: không được xuất hiện trong chuyện xưa (phóng viên phỏng vấn vua chúa…)
const HIEN_DAI = new Set(['phong_vien', 'bac_si', 'chinh_khach', 'bo_doi', 'nguoi_dung', 'hacker', 'canh_sat', 'doanh_nhan', 'nu_doanh_nhan', 'cong_nhan', 'ky_su', 'nghe_si', 'van_dong_vien', 'dau_bep', 'giao_vien', 'hoc_sinh'])

export function kiemDinh<T extends Cau>(goc: T[], o: { loai?: 'thuong' | 'tieu_su'; laCuoi?: boolean; coDai?: boolean } = {}): KetQuaKiemDinh & { loi: T[] } {
  const tieuSu = o.loai === 'tieu_su'
  const daSua: string[] = []
  const dem = (ten: string) => {
    const cu = daSua.find((x) => x.startsWith(ten))
    if (cu) daSua[daSua.indexOf(cu)] = `${ten} (${Number(cu.match(/\((\d+)\)$/)?.[1] ?? 1) + 1})`
    else daSua.push(`${ten} (1)`)
  }

  // ── 0. Bỏ câu chào / hẹn chương sau giữa phim (phim xem liền một mạch) ──
  // Phim tiểu sử chỉ giữ 1 câu chào kết (video Oppenheimer: "bấm đăng ký" rồi lại "hẹn gặp lại")
  const sach = locLoiChao(goc, !!o.laCuoi, tieuSu ? 1 : 2)
  for (let k = 0; k < sach.bo.length; k++) dem(o.laCuoi ? `Bớt câu chào kết thừa (giữ ${tieuSu ? 1 : 2} câu)` : 'Bỏ câu chào / hẹn chương sau giữa phim cho mạch phim liền')

  // ── 1. Tách câu quá dài ──
  const loi: T[] = []
  for (const l of sach.loi) {
    const tach = l.chu.length > DAI_TOI_DA ? tachDoi(l.chu) : null
    if (!tach) {
      loi.push({ ...l })
      continue
    }
    loi.push({ ...l, chu: tach[0] })
    loi.push({ ...l, chu: tach[1], dao_cu: 'khong', am_thanh: 'khong', lang: false, the_moc: undefined, khung_hinh: l.khung_hinh === 'can_canh' ? 'trung_canh' : 'can_canh' })
    dem('Tách câu dài thành hai câu cho dễ nghe')
  }

  // ── 2. Sửa nhịp hình ảnh ──
  let loeGanNhat = -99
  let langGanNhat = -99
  let soLanDoiKhung = 0
  loi.forEach((l, i) => {
    const t = loi[i - 1]
    const t2 = loi[i - 2]
    if (t && l.dao_cu && l.dao_cu !== 'khong' && l.dao_cu === t.dao_cu) {
      l.dao_cu = 'khong'
      dem('Bỏ đạo cụ lặp lại ở câu liền sau')
    }
    if (t && l.am_thanh && l.am_thanh !== 'khong' && l.am_thanh === t.am_thanh) {
      l.am_thanh = 'khong'
      dem('Bỏ hiệu ứng âm thanh lặp liền nhau')
    }
    if (t && t2 && l.khung_hinh && l.khung_hinh === t.khung_hinh && l.khung_hinh === t2.khung_hinh) {
      const chon = DOI_KHUNG.filter((k) => k !== l.khung_hinh)
      l.khung_hinh = chon[soLanDoiKhung++ % chon.length]
      dem('Đổi khung hình khi 3 câu liền cùng một cỡ cảnh')
    }
    if (t && t2 && l.may_quay && l.may_quay !== 'dung_yen' && l.may_quay === t.may_quay && l.may_quay === t2.may_quay) {
      l.may_quay = 'dung_yen'
      dem('Cho máy quay nghỉ khi 3 câu liền cùng một kiểu chuyển động')
    }
    if (l.anh_sang === 'loe_sang') {
      if (i - loeGanNhat < 8) {
        l.anh_sang = 'binh_thuong'
        dem('Bớt loé sáng dày quá (tối đa 1 lần mỗi 8 câu)')
      } else loeGanNhat = i
    }
    // Lời nói rõ một hành động mà AI chưa cho nhân vật diễn → điền động tác đúng lời (nói gì làm nấy)
    if (!l.dong_tac || l.dong_tac === 'khong') {
      const dt = TU_DONG_TAC.find(([, re]) => re.test(l.chu.toLowerCase()))?.[0]
      if (dt) {
        l.dong_tac = dt
        dem('Thêm động tác đúng với hành động lời thoại nói tới')
      }
    }
    if (l.lang) {
      if (i === 0 || i - langGanNhat < 5) {
        l.lang = false
        dem('Bớt khoảng lặng dày quá (tối đa 1 lần mỗi 5 câu)')
      } else langGanNhat = i
    }
  })

  // ── 2b. Giọng điệu đoạn bi kịch + khoảng lặng (bài học video Oppenheimer 15/10/2026) ──
  const biKich = (l?: T) => !!l && (l.cam_xuc === 'buon' || TU_BI_KICH.test(l.chu.toLowerCase()))
  const ganBiKich = (i: number) => biKich(loi[i]) || biKich(loi[i - 1]) || biKich(loi[i - 2])
  const dua: string[] = []
  loi.forEach((l, i) => {
    if (l.ai !== 'meo' && l.ai !== 'robot') return
    // Linh vật vui vẻ ngay giữa đoạn bi kịch → buồn (sửa an toàn, không đổi chữ)
    if (ganBiKich(i) && (l.cam_xuc === 'vui' || l.cam_xuc === 'bat_ngo')) {
      l.cam_xuc = 'buon'
      dem('Linh vật không vui vẻ giữa đoạn bi kịch')
    }
    // Tiếng lóng / câu đùa giữa đoạn bi kịch → lỗi, AI phải viết lại
    if (ganBiKich(i) && TIENG_LONG.test(l.chu.toLowerCase())) dua.push(l.chu.slice(0, 60))
  })
  // Phim tiểu sử: chương chưa có khoảng lặng nào → đặt một khoảng lặng ngay sau câu nặng nhất (câu bi kịch / câu trích dẫn
  // của nhân vật chính lúc buồn hay bất ngờ), để khoảnh khắc lớn có chỗ thở
  if (tieuSu && loi.length > 6 && !loi.some((l) => l.lang)) {
    const nang = loi.findIndex((l, i) => i >= 1 && i < loi.length - 1 && (biKich(l) || (l.ai === 'nhan_vat_chinh' && (l.cam_xuc === 'buon' || l.cam_xuc === 'bat_ngo'))))
    if (nang >= 0) {
      loi[nang + 1].lang = true
      dem('Thêm khoảng lặng sau câu nặng nhất chương')
    }
  }

  // ── 3. Chấm điểm + ghi chú ──
  const ghiChu: GhiChuKiemDinh[] = []
  if (dua.length) ghiChu.push({ muc: 'loi', chu: `Linh vật đùa / dùng tiếng lóng giữa đoạn bi kịch (chết chóc, chiến tranh, thảm hoạ): "${dua.slice(0, 2).join('", "')}" — viết lại nghiêm túc hoặc bỏ` })
  // Câu liệt kê dài như đọc lý lịch (nhiều tên riêng nối bằng dấu phẩy)
  const lyLich = loi.filter((l) => (l.chu.match(/(?:^|,\s*)(?:[A-ZĐ][\p{L}]+(?:\s+[A-ZĐ][\p{L}]+)*)/gu) ?? []).length >= 4 && (l.chu.match(/,/g) ?? []).length >= 3)
  if (lyLich.length) ghiChu.push({ muc: 'nhac', chu: `Câu liệt kê dài như đọc lý lịch: "${lyLich[0].chu.slice(0, 70)}…" — gộp lại, kể một chi tiết đắt thay vì kể tên` })
  // Câu người kể có hành động nhưng không ai đứng trên sân khấu để diễn (hình sẽ không theo lời)
  const khongAiDien = loi.filter((l) => l.ai === 'nguoi_ke' && l.dong_tac && l.dong_tac !== 'khong' && (!l.nhan_vat_phu || l.nhan_vat_phu === 'khong')).length
  if (khongAiDien) ghiChu.push({ muc: 'nhac', chu: `${khongAiDien} câu kể có hành động nhưng không có nhân vật trên sân khấu để diễn (thiếu nhân vật phụ cho câu đó)` })
  const n = loi.length || 1
  const chu = loi.map((l) => l.chu).join(' ')
  if ((chu.match(CO_DAU)?.length ?? 0) / Math.max(1, chu.replace(/\s/g, '').length) <= 0.08)
    ghiChu.push({ muc: 'loi', chu: 'Lời thoại thiếu dấu tiếng Việt, giọng đọc sẽ sai: bấm AI viết lại phần này' })

  // Độc thoại: một người nói liền nhiều câu
  let chuoi = 1
  let daiNhat = { ai: '', so: 0 }
  loi.forEach((l, i) => {
    chuoi = i && l.ai === loi[i - 1].ai ? chuoi + 1 : 1
    if (chuoi > daiNhat.so) daiNhat = { ai: l.ai, so: chuoi }
  })
  if (daiNhat.so > (tieuSu && daiNhat.ai === 'nguoi_ke' ? 5 : 4))
    ghiChu.push({ muc: 'nhac', chu: `Một nhân vật nói liền ${daiNhat.so} câu, người xem dễ chán: nên xen câu hỏi / phản ứng của nhân vật khác` })

  // Cảnh đứng yên lâu: cùng một bối cảnh quá 12 câu (~1 phút)
  let cungCanh = 1
  let canhLau = 1
  loi.forEach((l, i) => {
    cungCanh = i && l.boi_canh === loi[i - 1].boi_canh ? cungCanh + 1 : 1
    canhLau = Math.max(canhLau, cungCanh)
  })
  if (canhLau > 12) ghiChu.push({ muc: 'nhac', chu: `Một bối cảnh giữ suốt ${canhLau} câu (khoảng ${Math.round(canhLau * 4.5)} giây): hình dễ thành "trình chiếu", nên đổi cảnh giữa chừng` })

  // Tỉ lệ người nói
  const ty = (f: (l: Cau) => boolean) => loi.filter(f).length / n
  const ke = ty((l) => l.ai === 'nguoi_ke')
  const chinh = ty((l) => l.ai === 'meo' || l.ai === 'robot')
  if (tieuSu) {
    // Mèo / Bit trong phim tiểu sử: 5–8% mỗi bên (≤ 16% cả hai). Phim Michael Jackson 16/10/2026: 22%, hai linh vật xen ngay
    // sau tai nạn và vụ báo lá cải, kéo người xem ra khỏi câu chuyện
    if (chinh > 0.2) ghiChu.push({ muc: 'loi', chu: `Mun và Bit nói ${Math.round(chinh * 100)}% số câu (phim tiểu sử nên khoảng 10–16%): bớt lời hai linh vật, để người kể và nhân vật dẫn chuyện` })
    else if (chinh > 0.16) ghiChu.push({ muc: 'nhac', chu: `Mun và Bit nói ${Math.round(chinh * 100)}% số câu, hơi nhiều cho phim tiểu sử (nên khoảng 10–16%)` })
    if (ke > 0.6) ghiChu.push({ muc: 'nhac', chu: `Người kể nói ${Math.round(ke * 100)}% số câu, hơi giống đọc sách: nên cho nhân vật tái hiện và Mun / Bit xen vào nhiều hơn` })
    if (ke < 0.25) ghiChu.push({ muc: 'nhac', chu: `Người kể chỉ nói ${Math.round(ke * 100)}% số câu, mạch phim có thể rời rạc` })
  } else if (chinh < 0.3) ghiChu.push({ muc: 'nhac', chu: `Mun và Bit chỉ nói ${Math.round(chinh * 100)}% số câu, nên để hai nhân vật chính dẫn dắt nhiều hơn` })
  const phu = new Set(loi.filter((l) => !CHINH.has(l.ai)).map((l) => l.ai))
  if (n >= 12 && phu.size < 2) ghiChu.push({ muc: 'nhac', chu: `Chỉ có ${phu.size} nhân vật phụ lên tiếng, nên thêm góc nhìn khác (người trong cuộc, chuyên gia, người dân…)` })

  // Đa dạng cảm xúc / hình ảnh
  const camXuc = new Set(loi.map((l) => l.cam_xuc).filter(Boolean))
  if (n >= 10 && camXuc.size < 3) ghiChu.push({ muc: 'nhac', chu: 'Cảm xúc đơn điệu (dưới 3 kiểu), nhân vật diễn sẽ đều đều' })
  const khung = new Set(loi.map((l) => l.khung_hinh).filter(Boolean))
  if (n >= 10 && khung.size < 3) ghiChu.push({ muc: 'nhac', chu: 'Ít cỡ cảnh (dưới 3 kiểu), máy quay ít thay đổi' })
  const dc = ty((l) => !!l.dao_cu && l.dao_cu !== 'khong')
  if (n >= 8 && dc < 0.3) ghiChu.push({ muc: 'nhac', chu: `Chỉ ${Math.round(dc * 100)}% số câu có đạo cụ minh hoạ, hình hơi trống` })
  if (n >= 8 && dc > 0.9) ghiChu.push({ muc: 'nhac', chu: 'Gần như câu nào cũng có đạo cụ, dễ rối mắt' })

  // Phim cổ trang mà có nhân vật hiện đại
  if (o.coDai) {
    const sai = loi.filter((l) => HIEN_DAI.has(l.ai) || HIEN_DAI.has((l as Cau & { nhan_vat_phu?: string }).nhan_vat_phu ?? ''))
    if (sai.length) ghiChu.push({ muc: 'loi', chu: `${sai.length} câu dùng nhân vật hiện đại (phóng viên, bác sĩ, chính khách…) trong chuyện xưa: bấm AI viết lại phần này để dùng vai cổ trang` })
  }
  // Câu mở đầu: móc câu nên ngắn, gọn
  if (loi[0] && loi[0].chu.length > 140) ghiChu.push({ muc: 'nhac', chu: 'Câu mở đầu dài, khó giữ chân người xem trong 5 giây đầu: nên mở bằng một câu ngắn gây tò mò' })

  const diem = Math.max(0, 100 - ghiChu.filter((g) => g.muc === 'loi').length * 25 - ghiChu.filter((g) => g.muc === 'nhac').length * 7)
  return { loi, diem, ghi_chu: ghiChu, da_sua: daSua }
}
