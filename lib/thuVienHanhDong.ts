// Thư viện hành động nhân vật mà máy dựng đang diễn được (may-nha/hoat-hinh/tao_video.mjs: DONG_TAC = cử chỉ, TRUYEN =
// hành động kể chuyện có đồ vật). Thêm hành động mới ở máy dựng thì thêm cả ở đây và ở DONG_TAC trong lib/ai.ts.
// Dùng được cả ở trình duyệt (trang dự án) lẫn máy chủ (AI chuẩn bị hành động).

export type LoaiHanhDong = 'cu_chi' | 'ke_chuyen'
// do_vat: đạo cụ hành động đã có sẵn (emoji + tên). Câu cần thêm đạo cụ khác thì gắn vat_them (nhân vật cầm thêm ở tay còn trống)
export const THU_VIEN_HANH_DONG: Record<string, { ten: string; loai: LoaiHanhDong; mo_ta: string; do_vat?: string[] }> = {
  chi_tay: { ten: 'Chỉ tay', loai: 'cu_chi', mo_ta: 'chỉ tay: buộc tội, đòi hỏi, chỉ đường' },
  khoanh_tay: { ten: 'Khoanh tay', loai: 'cu_chi', mo_ta: 'khoanh tay: tự tin, thách thức, từ chối' },
  cui_dau: { ten: 'Cúi đầu', loai: 'cu_chi', mo_ta: 'cúi đầu: thất vọng, xấu hổ, thua cuộc, xin lỗi' },
  dap_tay: { ten: 'Đập tay', loai: 'cu_chi', mo_ta: 'đập nắm tay xuống: tức giận, quyết định dứt khoát' },
  vo_tay: { ten: 'Vỗ tay', loai: 'cu_chi', mo_ta: 'vỗ tay: khen ngợi, chúc mừng' },
  tay_len_nguc: { ten: 'Tay lên ngực', loai: 'cu_chi', mo_ta: 'đặt tay lên ngực: lời hứa, chân thành, xúc động' },
  nhun_vai: { ten: 'Nhún vai', loai: 'cu_chi', mo_ta: 'nhún vai, xoè tay: không biết, bất lực' },
  gio_tay: { ten: 'Giơ tay', loai: 'cu_chi', mo_ta: 'giơ tay / nắm đấm: xung phong, chiến thắng, thề' },
  vay_tay: { ten: 'Vẫy tay', loai: 'cu_chi', mo_ta: 'vẫy tay: chào, tạm biệt, gọi ai đó' },
  cam_vat: { ten: 'Cầm vật lên xem', loai: 'cu_chi', mo_ta: 'nâng một vật lên xem: đọc thư, xem bản vẽ, xem sản phẩm' },
  viet: { ten: 'Viết', loai: 'cu_chi', mo_ta: 'viết / vẽ: ký tên, phác thảo, ghi chép' },
  om_dau: { ten: 'Ôm đầu', loai: 'cu_chi', mo_ta: 'hai tay ôm đầu: tuyệt vọng, hoảng loạn, thảm hoạ' },
  chong_cam: { ten: 'Chống cằm', loai: 'cu_chi', mo_ta: 'tay chống cằm: suy nghĩ, nghi ngờ, đặt câu hỏi' },
  xoe_tay: { ten: 'Xoè tay', loai: 'cu_chi', mo_ta: 'xoè hai bàn tay ra trước: giải thích, trình bày ý tưởng' },
  rua_bat: { ten: 'Rửa bát', loai: 'ke_chuyen', mo_ta: 'rửa bát, chà rửa, dọn nhà vệ sinh (đĩa 🍽️ trước người, miếng rửa 🧽 trong tay)', do_vat: ['🍽️ đĩa', '🧽 miếng rửa'] },
  xach_vali: { ten: 'Xách vali ra đi', loai: 'ke_chuyen', mo_ta: 'rời quê, di cư, chuyển nhà (xách vali 🧳, bước đi)', do_vat: ['🧳 vali'] },
  khoc: { ten: 'Khóc', loai: 'ke_chuyen', mo_ta: 'khóc: hai tay che mặt, nước mắt, vai run' },
  go_may: { ten: 'Gõ máy tính', loai: 'ke_chuyen', mo_ta: 'gõ phím, lập trình, làm việc với máy tính, thiết kế chip (laptop 💻 trước người)', do_vat: ['💻 máy tính xách tay'] },
  doc_sach: { ten: 'Đọc sách', loai: 'ke_chuyen', mo_ta: 'học bài, đọc sách, ôn thi (sách 📖 trước người, lật trang)', do_vat: ['📖 sách'] },
  bi_xo: { ten: 'Bị xô đẩy', loai: 'ke_chuyen', mo_ta: 'bị bắt nạt, xô đẩy, đánh: bật lùi lại, giơ tay đỡ, 💢', do_vat: ['💢 dấu tức giận'] },
  an_mung: { ten: 'Ăn mừng', loai: 'ke_chuyen', mo_ta: 'ăn mừng: nhảy lên, hai tay giơ cao', do_vat: ['💖 trái tim'] },
  phat_bieu: { ten: 'Phát biểu', loai: 'ke_chuyen', mo_ta: 'phát biểu, thuyết trình, ra mắt sản phẩm trên sân khấu (micro 🎤 lên miệng)', do_vat: ['🎤 micro'] },
  bat_tay: { ten: 'Bắt tay', loai: 'ke_chuyen', mo_ta: 'bắt tay: thoả thuận, hợp tác' },
  kiet_suc: { ten: 'Kiệt sức', loai: 'ke_chuyen', mo_ta: 'kiệt sức, thức trắng: gục đầu, 💤 bay lên', do_vat: ['💤 dấu ngủ'] },
  an_com: { ten: 'Ăn', loai: 'ke_chuyen', mo_ta: 'ăn cơm / mì (bát 🍜 trước người, đũa 🥢 đưa lên miệng)', do_vat: ['🍜 bát mì', '🥢 đũa'] },
  dem_tien: { ten: 'Đếm tiền', loai: 'ke_chuyen', mo_ta: 'đếm tiền, túng thiếu, tiết kiệm từng đồng (tiền 💵 trong tay)', do_vat: ['💵 tiền'] },
  lap_rap: { ten: 'Lắp ráp', loai: 'ke_chuyen', mo_ta: 'lắp ráp, sửa chữa, chế tạo nguyên mẫu (cờ lê 🔧, linh kiện 🔌)', do_vat: ['🔧 cờ lê', '🔌 linh kiện'] },
  chay: { ten: 'Chạy', loai: 'ke_chuyen', mo_ta: 'chạy, bỏ chạy, vội vã lao đi' },
}

// Kết quả AI chuẩn bị hành động cho cả phim (lưu trong dự án, không đụng tới lời thoại nên không làm phần đã dựng phải dựng lại)
export type CauHanhDong = {
  i: number // số thứ tự câu trong chương
  chu: string // đầu câu (để biết kịch bản đã đổi sau lần chuẩn bị)
  nguoi: string // ai làm
  can: boolean // câu có nói tới một việc nhìn thấy được, cần diễn (không chỉ đứng nói)
  hanh_dong: string // mã trong THU_VIEN_HANH_DONG | 'moi' (máy chưa có) | 'khong'
  viec: string // nhân vật làm gì trên hình
  ten_moi: string // mã đặt cho hành động mới (khi hanh_dong = 'moi')
  do_vat: string // (bản cũ) đồ vật cần (emoji)
  do_vat_can?: string[] // đạo cụ câu này cần ("🧹 cái chổi")
  do_vat_thieu?: string[] // trong đó: hành động đã chọn chưa có sẵn → gắn thêm (có emoji) hoặc phải vẽ (không có emoji)
}
export type PhanTichHanhDong = { luc: string; chuong: { k: number; cau: CauHanhDong[] }[] }

// Kịch bản đã đổi sau lần chuẩn bị (số câu / đầu câu khác) → phải chuẩn bị lại
export function hanhDongCu(d: { phan: { loi: { chu: string }[] | null }[] }, pt: PhanTichHanhDong | undefined) {
  if (!pt) return true
  return d.phan.some((p, j) => {
    const c = pt.chuong.find((x) => x.k === j + 1)
    const loi = p.loi ?? []
    return !c || c.cau.length !== loi.length || c.cau.some((x, i) => x.chu !== loi[i]?.chu.slice(0, 60))
  })
}

// Các hành động máy dựng còn thiếu, gom theo mã mới
export function hanhDongThieu(pt: PhanTichHanhDong) {
  const nhom = new Map<string, { ten: string; viec: string; do_vat: Set<string>; vi_du: { k: number; i: number; chu: string; viec: string }[] }>()
  for (const c of pt.chuong)
    for (const x of c.cau) {
      if (x.hanh_dong !== 'moi') continue
      const ma = x.ten_moi || 'hanh_dong_moi'
      const g = nhom.get(ma) ?? { ten: ma, viec: x.viec, do_vat: new Set<string>(), vi_du: [] }
      for (const v of x.do_vat_can ?? Array.from(x.do_vat).filter((y) => /\p{Extended_Pictographic}/u.test(y))) g.do_vat.add(v)
      g.vi_du.push({ k: c.k, i: x.i, chu: x.chu, viec: x.viec })
      nhom.set(ma, g)
    }
  return [...nhom.values()].sort((a, b) => b.vi_du.length - a.vi_du.length)
}

// Đạo cụ còn thiếu, gom theo đạo cụ: có emoji thì gắn được ngay (nhân vật cầm thêm), không có thì phải vẽ
export const coEmoji = (x: string) => /\p{Extended_Pictographic}/u.test(x)
export function doVatThieu(pt: PhanTichHanhDong) {
  const nhom = new Map<string, { vat: string; vi_du: { k: number; i: number; chu: string; viec: string }[] }>()
  for (const c of pt.chuong)
    for (const x of c.cau)
      for (const v of x.do_vat_thieu ?? []) {
        const g = nhom.get(v) ?? { vat: v, vi_du: [] }
        g.vi_du.push({ k: c.k, i: x.i, chu: x.chu, viec: x.viec })
        nhom.set(v, g)
      }
  return [...nhom.values()].sort((a, b) => b.vi_du.length - a.vi_du.length)
}
// Emoji đầu tiên trong chuỗi đạo cụ ("🧹 cái chổi" → "🧹")
export const emojiCua = (x: string) => x.match(/\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*/u)?.[0] ?? ''
// Emoji bỏ dấu biến thể (🖊️ và 🖊 là một) để so đạo cụ có sẵn / còn thiếu
export const emojiGoc = (x: string) => emojiCua(x).replace(/️/g, '')

// Lời nhắn chép vào Claude Code để xây các hành động còn thiếu
export function yeuCauClaudeCode(tieuDe: string, pt: PhanTichHanhDong) {
  const thieu = hanhDongThieu(pt)
  const veThem = doVatThieu(pt).filter((g) => !coEmoji(g.vat))
  return [
    `Xây thêm hành động nhân vật cho máy dựng phim (dự án C:\\Users\\Admin\\OneDrive\\Desktop\\ai-tin-cong-nghe), để phim "${tieuDe}" nhân vật diễn đúng từng lời thoại.`,
    '',
    'Chỗ cần sửa:',
    '- may-nha/hoat-hinh/tao_video.mjs: thêm vào TRUYEN (cách diễn bằng GSAP: tay, đầu, thân, bước đi), VAT (đồ vật emoji + chỗ cầm: phai / trai / truoc / dau) và TU_TRUYEN (từ trong lời kể để tự nhận ra).',
    '- lib/ai.ts: thêm mã vào DONG_TAC và mô tả trong luật chọn dong_tac.',
    '- lib/thuVienHanhDong.ts: thêm vào THU_VIEN_HANH_DONG (kèm do_vat: các đạo cụ hành động đó có sẵn).',
    'Mỗi hành động phải có ĐỦ ĐẠO CỤ phối hợp với người diễn (rửa chén có chén, quét nhà có chổi, ký hợp đồng có bút và tờ hợp đồng…), đặt đúng chỗ (trong tay / trước người) và chuyển động theo tay.',
    'Quy ước tay: tay phải xoay dương / tay trái xoay âm = đưa vào trước người; ngược lại = dang ra / giơ lên. Chỉ nhân vật người (phu<k>) dùng hành động kể chuyện, Mèo Mun / Robot Bit dùng cử chỉ.',
    'Dựng thử bằng hyperframes snapshot, xem ảnh chụp thấy đúng tư thế rồi mới lưu và đẩy lên. Không dựng lại phim đã xong.',
    '',
    `Các hành động còn thiếu (${thieu.length}):`,
    ...thieu.flatMap((g, n) => [
      `${n + 1}. ${g.ten} — ${g.viec}${g.do_vat.size ? ` — đạo cụ đi kèm: ${[...g.do_vat].join(', ')}` : ''} — ${g.vi_du.length} câu`,
      ...g.vi_du.slice(0, 3).map((v) => `   • Chương ${v.k}, câu ${v.i + 1}: "${v.chu}…" → ${v.viec}`),
    ]),
    ...(veThem.length
      ? [
          '',
          `Đạo cụ còn thiếu, không có emoji nên phải vẽ (SVG) rồi cho vào VAT / ganVat (${veThem.length}):`,
          ...veThem.flatMap((g, n) => [
            `${n + 1}. ${g.vat} — ${g.vi_du.length} câu`,
            ...g.vi_du.slice(0, 2).map((v) => `   • Chương ${v.k}, câu ${v.i + 1}: "${v.chu}…" → ${v.viec}`),
          ]),
        ]
      : []),
  ].join('\n')
}
