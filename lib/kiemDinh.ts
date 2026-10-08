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
}
export type GhiChuKiemDinh = { muc: 'loi' | 'nhac'; chu: string }
export type KetQuaKiemDinh = { diem: number; ghi_chu: GhiChuKiemDinh[]; da_sua: string[] }

const CO_DAU = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/giu
const CHINH = new Set(['meo', 'robot', 'nguoi_ke'])
const DAI_TOI_DA = 180 // ký tự (~9-10 giây đọc): dài hơn thì tách đôi
const DOI_KHUNG = ['trung_canh', 'can_canh', 'toan_canh', 'goc_thap']

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

export function kiemDinh<T extends Cau>(goc: T[], o: { loai?: 'thuong' | 'tieu_su' } = {}): KetQuaKiemDinh & { loi: T[] } {
  const tieuSu = o.loai === 'tieu_su'
  const daSua: string[] = []
  const dem = (ten: string) => {
    const cu = daSua.find((x) => x.startsWith(ten))
    if (cu) daSua[daSua.indexOf(cu)] = `${ten} (${Number(cu.match(/\((\d+)\)$/)?.[1] ?? 1) + 1})`
    else daSua.push(`${ten} (1)`)
  }

  // ── 1. Tách câu quá dài ──
  const loi: T[] = []
  for (const l of goc) {
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
    if (l.lang) {
      if (i === 0 || i - langGanNhat < 5) {
        l.lang = false
        dem('Bớt khoảng lặng dày quá (tối đa 1 lần mỗi 5 câu)')
      } else langGanNhat = i
    }
  })

  // ── 3. Chấm điểm + ghi chú ──
  const ghiChu: GhiChuKiemDinh[] = []
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

  // Câu mở đầu: móc câu nên ngắn, gọn
  if (loi[0] && loi[0].chu.length > 140) ghiChu.push({ muc: 'nhac', chu: 'Câu mở đầu dài, khó giữ chân người xem trong 5 giây đầu: nên mở bằng một câu ngắn gây tò mò' })

  const diem = Math.max(0, 100 - ghiChu.filter((g) => g.muc === 'loi').length * 25 - ghiChu.filter((g) => g.muc === 'nhac').length * 7)
  return { loi, diem, ghi_chu: ghiChu, da_sua: daSua }
}
