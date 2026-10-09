// Vòng biên tập cả phim (như biên tập viên đọc trọn kịch bản): AI máy nhà đọc mọi chương một lượt rồi đề xuất sửa —
// viết lại câu lặp ý / câu hỏi rập khuôn của Mèo Mun / câu nhạt, bỏ câu thừa — KHÔNG thêm sự kiện mới. Chạy bằng AI
// máy nhà (may-nha/ai_may_nha.py) nên không tốn lượt Gemini. File này chỉ dựng đề bài và áp kết quả (không đọc kho).

type Cau = { ai: string; chu: string }
export type SuaBienTap = { chuong: number; cau: number; cu?: string; kieu: 'sua' | 'xoa'; chu: string; ly_do: string }
export type KetQuaBienTap = { nhan_xet: string; sua: SuaBienTap[] }
export type DaBienTap = {
  luc: string
  nguon?: 'gemini' | 'may_nha' // AI nào biên tập
  nhan_xet: string
  chi_tiet: { chuong: number; cau: number; kieu: 'sua' | 'xoa'; truoc: string; sau: string; ly_do: string }[]
}

const TOI_DA_SUA = 30

export function deBaiBienTap(o: { ten: string; loai?: 'thuong' | 'tieu_su'; phan: { tieu_de: string; loi: Cau[] }[] }) {
  const system = `Bạn là biên tập viên kịch bản phim tài liệu hoạt hình của kênh YouTube "Công Nghệ 24H" (tiếng Việt). Người kể (nguoi_ke) dẫn chuyện; Mèo Mun (meo) tò mò, cảm xúc; Robot Bit (robot) giải thích ngắn; nhan_vat_chinh là chính người được kể; còn lại là nhân vật phụ.
Nhiệm vụ: đọc TRỌN kịch bản dưới đây (nhiều chương của MỘT phim xem liền) rồi đề xuất tối đa ${TOI_DA_SUA} chỗ sửa quan trọng nhất để phim hay và liền mạch hơn:
- kieu "sua": viết lại một câu — câu lặp ý / lặp từ với câu khác, câu hỏi của Mèo Mun rập khuôn ("…thế thì làm sao…hả?") đổi thành phản ứng đa dạng (ngạc nhiên, đùa nhẹ, so sánh với đời thường, đoán sai), câu nhạt thiếu hình ảnh, câu nối chương bị gượng. Giữ đúng người nói, đúng ý và đúng sự thật; dài tương đương hoặc ngắn hơn (tối đa 30 từ).
- kieu "xoa": bỏ một câu thừa (nhắc lại điều đã kể, hoặc lời chào / hẹn chương sau giữa phim).
Tuyệt đối KHÔNG thêm sự kiện, con số, tên người, lời trích mới; không đổi tên riêng; không sửa câu đọc tên chương. Viết tiếng Việt có dấu đầy đủ, tự nhiên như văn nói.
chuong và cau là số thứ tự ghi trong ngoặc [chương.câu]; cu là NGUYÊN VĂN câu đang sửa / bỏ, chép y hệt từ kịch bản (để đối chiếu, sai một chữ thì chỗ sửa bị bỏ qua); chu là câu mới (kieu xoa thì để trống). Câu mới phải KHÁC câu cũ và hợp với đúng người nói của câu đó. nhan_xet: 2-3 câu nhận xét chung về kịch bản (tiếng Việt).`
  const noiDung = `Phim: ${o.ten}\n\n${o.phan
    .map((p, k) => `## Chương ${k + 1}: ${p.tieu_de}\n${p.loi.map((l, i) => `[${k + 1}.${i + 1}] ${l.ai}: ${l.chu}`).join('\n')}`)
    .join('\n\n')}`
  const schema = {
    type: 'object',
    properties: {
      nhan_xet: { type: 'string' },
      sua: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            chuong: { type: 'integer' },
            cau: { type: 'integer' },
            cu: { type: 'string' },
            kieu: { type: 'string', enum: ['sua', 'xoa'] },
            chu: { type: 'string' },
            ly_do: { type: 'string' },
          },
          required: ['chuong', 'cau', 'cu', 'kieu', 'chu', 'ly_do'],
        },
      },
    },
    required: ['nhan_xet', 'sua'],
  }
  return { system, noiDung, schema }
}

const CO_DAU = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/giu
const coDau = (s: string) => (s.match(CO_DAU)?.length ?? 0) / Math.max(1, s.replace(/\s/g, '').length) > 0.08
// Số trong câu (năm, số liệu): câu sửa không được thêm số mới
const cacSo = (s: string) => new Set(s.match(/\d+/g) ?? [])

// Áp kết quả: chỉ nhận chỗ sửa hợp lệ (đúng chỉ số, tiếng Việt có dấu, không dài quá, không thêm con số mới), xoá thì
// làm từ cuối lên để chỉ số không lệch. Trả các chương mới + nhật ký những gì đã đổi.
export function apBienTap<T extends Cau>(phan: T[][], kq: KetQuaBienTap): { phan: T[][]; chi_tiet: DaBienTap['chi_tiet'] } {
  const moi = phan.map((loi) => loi.map((l) => ({ ...l })))
  const chiTiet: DaBienTap['chi_tiet'] = []
  const xoa: { k: number; i: number }[] = []
  const daDung = new Set<string>()
  for (const s of kq.sua.slice(0, TOI_DA_SUA)) {
    const k = s.chuong - 1
    // Đối chiếu nguyên văn câu cũ: AI nhỏ hay đánh lệch số thứ tự câu — tìm đúng câu có nội dung đó trong chương
    // (gần chỉ số AI ghi nhất); không thấy thì bỏ qua chỗ sửa này
    const chuan = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    const cu = chuan(s.cu ?? '')
    const khop = (moi[k] ?? []).map((x, j) => ({ j, ok: !!cu && (chuan(x.chu) === cu || (cu.length > 30 && chuan(x.chu).startsWith(cu.slice(0, 30)))) })).filter((x) => x.ok)
    if (!khop.length) continue
    const i = khop.sort((a, b) => Math.abs(a.j - (s.cau - 1)) - Math.abs(b.j - (s.cau - 1)))[0].j
    const l = moi[k]?.[i]
    const khoa = `${k}.${i}`
    if (!l || daDung.has(khoa) || (l as T & { la_chuong?: boolean }).la_chuong) continue
    daDung.add(khoa)
    if (s.kieu === 'xoa') {
      if (moi[k].length - xoa.filter((x) => x.k === k).length <= 6) continue // chương quá ngắn thì thôi không xoá
      if (k === moi.length - 1 && i >= moi[k].length - 3) continue // giữ phần kết phim (câu chào kết, kêu gọi đăng ký)
      xoa.push({ k, i })
      chiTiet.push({ chuong: k + 1, cau: i + 1, kieu: 'xoa', truoc: l.chu, sau: '', ly_do: s.ly_do })
      continue
    }
    const chu = s.chu.trim()
    const soCu = cacSo(l.chu)
    if (!chu || chu === l.chu || chu.length > 220 || !coDau(chu) || [...cacSo(chu)].some((x) => !soCu.has(x))) continue
    chiTiet.push({ chuong: k + 1, cau: i + 1, kieu: 'sua', truoc: l.chu, sau: chu, ly_do: s.ly_do })
    l.chu = chu
  }
  for (const { k, i } of xoa.sort((a, b) => b.k - a.k || b.i - a.i)) moi[k].splice(i, 1)
  return { phan: moi, chi_tiet: chiTiet.sort((a, b) => a.chuong - b.chuong || a.cau - b.cau) }
}
