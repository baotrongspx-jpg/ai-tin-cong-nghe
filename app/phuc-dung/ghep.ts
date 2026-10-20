// Kiểu dữ liệu và cách ghép câu lệnh Veo 3 cho trang /phuc-dung (dùng chung cho trình duyệt và máy chủ).
// Mô tả nhân vật / đồ vật / bối cảnh viết MỘT lần trong "bộ nhận dạng", rồi được chép NGUYÊN VĂN
// vào câu lệnh của mọi cảnh → các đoạn 8 giây không bị lệch nhân vật, bối cảnh.

export type Muc = { ma: string; ten: string; mo_ta: string; anh_mau: string }
export type NhanDang = { phong_cach: string; am_thanh: string; nhan_vat: Muc[]; boi_canh: Muc[]; do_vat: Muc[] }
export type Canh = {
  ten: string
  doan_goc: number[]
  boi_canh: string
  nhan_vat: string[]
  do_vat: string[]
  hanh_dong: string
  khung_dau?: string // AI tả đúng ảnh đầu
  khung_cuoi?: string // AI tả đúng ảnh cuối
  co_cat_canh?: boolean // đoạn gốc có cắt cảnh: ảnh đầu và ảnh cuối khác góc máy
  trang_thai?: TrangThai // CONTINUITY STATE lúc cuối đoạn → điểm xuất phát của cảnh sau
  dien_bien?: MocDienBien[] // diễn biến từng 2 giây giữa ảnh đầu và ảnh cuối
  am_thanh_canh?: string // AI nghe âm thanh của đoạn: tiếng động, lời nói nghe rõ
  may_quay: string
  noi_tiep: boolean
}
export type DuAn = { nhan_dang: NhanDang; canh: Canh[] }
export const KHOA_TRANG_THAI = ['character', 'scene', 'props', 'action', 'camera', 'lighting'] as const
export type TrangThai = Partial<Record<(typeof KHOA_TRANG_THAI)[number], string>>
export type MocDienBien = { tu: number; den: number; mo_ta: string }

export const DU_AN_TRONG: DuAn = {
  nhan_dang: { phong_cach: '', am_thanh: '', nhan_vat: [], boi_canh: [], do_vat: [] },
  canh: [],
}

export type CauLenh = { so: number; canh: Canh; vanBan: string; anhMau: { ma: string; ten: string; anh: string }[]; loi: string[] }

function khoi(ds: Muc[], ma: string[], loi: string[], loai: string) {
  return ma
    .map((m) => {
      const muc = ds.find((x) => x.ma === m)
      if (!muc) loi.push(`Cảnh dùng mã ${m} nhưng bộ nhận dạng chưa có ${loai} này`)
      return muc ? `- ${muc.ma}: ${muc.mo_ta.trim()}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

export function ghepCauLenh({ nhan_dang: nd, canh }: DuAn): CauLenh[] {
  return canh.map((c, i) => {
    const loi: string[] = []
    const boiCanh = c.boi_canh ? [c.boi_canh] : []
    // Mỗi luật chỉ nói MỘT lần, đặt ngay trong khối nó thuộc về (không còn khối LOCK RULES lặp lại)
    const phan = [`STYLE (keep the same visual style, colour grading, light and time of day throughout): ${nd.phong_cach.trim()}`]
    // 1–2. CHARACTER LOCK / PROP LOCK / SCENE LOCK: chép nguyên văn từ bộ nhận dạng
    if (c.nhan_vat.length)
      phan.push(
        'CHARACTER LOCK (one single identical character throughout: same face, skin, proportions, height, build, hair, ' +
          'clothing, colours, footwear, accessories and age; no face morphing; no extra people):\n' +
          khoi(nd.nhan_vat, c.nhan_vat, loi, 'nhân vật'),
      )
    if (c.do_vat.length)
      phan.push('PROP LOCK (identical in every shot; never add, remove or swap props):\n' + khoi(nd.do_vat, c.do_vat, loi, 'đồ vật'))
    if (boiCanh.length)
      phan.push(
        'SCENE LOCK (a fixed space that is never rebuilt: same layout, architecture, fixed objects and their positions, ' +
          'textures, colours, light, time of day and weather; add or remove nothing):\n' +
          khoi(nd.boi_canh, boiCanh, loi, 'bối cảnh'),
      )
    // 4. CONTINUITY STATE: trạng thái cuối của cảnh trước. Nhân vật / hành động / bối cảnh lúc đó chính là START của
    // cảnh này (tả từ ảnh đầu) nên chỉ giữ phần START không nói: đạo cụ, máy quay, ánh sáng
    const tt = i > 0 && c.noi_tiep ? canh[i - 1].trang_thai : undefined
    const khoaTt = c.khung_dau?.trim() ? (['props', 'camera', 'lighting'] as const) : KHOA_TRANG_THAI
    const dongTt = khoaTt.filter((k) => tt?.[k]?.trim()).map((k) => `- ${k.toUpperCase()}_STATE: ${tt![k]!.trim()}`)
    if (dongTt.length) phan.push('CONTINUITY STATE (end of the previous shot; this shot starts from it):\n' + dongTt.join('\n'))
    // 3. ACTION LOCK: đầu → diễn biến → cuối. Cảnh tạo sẵn chưa có chữ → tả chung theo 2 ảnh
    const moc = (c.dien_bien ?? []).filter((m) => m.mo_ta.trim())
    const hanhDong = [
      c.khung_dau?.trim() && `- START (first frame, 0 s): ${c.khung_dau.trim()}`,
      // Có diễn biến từng 2 giây thì ghi theo mốc giây; chưa có thì một câu tóm tắt
      ...(moc.length
        ? moc.map((m) => `- ${m.tu}–${m.den} s: ${m.mo_ta.trim()}`)
        : [`- ACTION: ${c.hanh_dong.trim() || 'Recreate exactly what happens between the provided first frame and last frame, with natural, continuous motion.'}`]),
      c.khung_cuoi?.trim() && `- END (last frame, 8 s): ${c.khung_cuoi.trim()}`,
    ].filter(Boolean)
    phan.push('ACTION LOCK (8 seconds, in this exact order):\n' + hanhDong.join('\n'))
    // Mỗi cảnh làm bằng Frames to Video (ảnh đầu + ảnh cuối của đoạn gốc). Nguyên tắc A → B theo yêu cầu chủ trang:
    // 2 ảnh là trạng thái bắt buộc, có chuyển động trung gian, chia thời gian 20/70/90/100%, khóa máy quay, vật lý.
    if (c.co_cat_canh)
      // Đoạn gốc có cắt cảnh: không bắt biến dần ảnh đầu thành ảnh cuối (sẽ bị méo), mà cho cắt cảnh thẳng
      phan.push(
        'FRAME A → FRAME B (mandatory): FRAME A = the provided first frame, FRAME B = the provided last frame. They are two ' +
          'DIFFERENT camera shots of the same moment and place: start exactly on FRAME A, play shot 1 with natural continuous ' +
          'motion, then make one clean hard cut (no morphing, no blending, no camera fly-through) to shot 2, whose action ' +
          'leads continuously into FRAME B and ends exactly on it (same pose, position, hands, props, gaze, composition, camera).',
      )
    else
      phan.push(
        'FRAME A → FRAME B (mandatory): one continuous shot. FRAME A = the provided first frame, FRAME B = the provided last ' +
          'frame; both states must be respected exactly. Find the most physically plausible chain of actions that turns A ' +
          'into B and never jump directly: A → start moving → main action → interaction with props / environment → action ' +
          'completed → B, with continuous position, direction, speed, weight, inertia, posture, contact, light, shadows and ' +
          '3D space. Example: a hand that must reach an object first lifts, the elbow bends, the arm moves forward, the hand ' +
          'approaches, the fingers touch, then it settles into the exact final pose.',
        'TIMING: 0–1.6 s start exactly as FRAME A and begin to move; 1.6–5.6 s the main action, continuous and clear; ' +
          '5.6–7.2 s complete the action and approach FRAME B; 7.2–8 s settle and match FRAME B exactly (pose, position, ' +
          'hands, feet, props, gaze, composition, camera). Do not end before reaching FRAME B; FRAME B must look like the ' +
          'direct result of the action, not an image pasted on at the end.',
        // Góc máy của cảnh và khóa máy quay chung một khối
        `CAMERA: ${c.may_quay.trim() ? `${c.may_quay.trim().replace(/\.$/, '')}. ` : ''}Keep the same lens, focal length, angle ` +
          'and camera position as the two frames; no arbitrary zoom, no rotation, no switch to another shot, unless that ' +
          'camera move is clearly visible between the two frames or written here.',
      )
    if (c.co_cat_canh && c.may_quay.trim()) phan.push(`CAMERA: ${c.may_quay.trim()}`)
    phan.push(
      'PHYSICS: real gravity, inertia, collisions and weight shifts; clothing and hair react to movement; correct shadows; ' +
        'props react when touched; no clipping, hands never pass through objects, feet never slide, bodies never deform.',
    )
    const amRieng = c.am_thanh_canh?.trim()
    if (nd.am_thanh.trim() || amRieng)
      phan.push(`AUDIO: ${[nd.am_thanh.trim(), amRieng && `In this shot: ${amRieng}`].filter(Boolean).join(' ')}`)
    // Chưa có trạng thái của cảnh trước thì nhắc nối tiếp ngắn gọn (các khóa phía trên đã giữ nhân vật / bối cảnh)
    if (c.noi_tiep && i > 0 && !dongTt.length) phan.push('CONTINUITY: this shot continues directly from the previous shot.')
    phan.push(
      'DO NOT invent a different scene or change the action above. If the exact action is unclear, keep character and ' +
        'setting unchanged and use minimal but plausible motion instead of inventing a big action.',
    )
    phan.push('No text, no subtitles, no logos, no brand names, no watermarks on screen.')

    const anhMau = [
      ...c.nhan_vat.map((m) => nd.nhan_vat.find((x) => x.ma === m)),
      ...c.do_vat.map((m) => nd.do_vat.find((x) => x.ma === m)),
      ...boiCanh.map((m) => nd.boi_canh.find((x) => x.ma === m)),
    ]
      .filter((m): m is Muc => !!m?.anh_mau)
      .map((m) => ({ ma: m.ma, ten: m.ten, anh: m.anh_mau }))

    return { so: i + 1, canh: c, vanBan: phan.join('\n\n'), anhMau, loi }
  })
}

// Lấy khung hình xong → mỗi đoạn chưa có cảnh được tạo sẵn 1 cảnh (đủ ảnh đầu/cuối để dùng ngay), AI điền chữ sau
export function themCanhTrong(d: DuAn, doan: number[]): DuAn {
  const co = new Set(d.canh.flatMap((c) => c.doan_goc))
  const moi: Canh[] = [...new Set(doan)]
    .filter((n) => !co.has(n))
    .map((n) => ({ ten: `Đoạn ${n}`, doan_goc: [n], boi_canh: '', nhan_vat: [], do_vat: [], hanh_dong: '', may_quay: '', noi_tiep: true }))
  if (!moi.length) return d
  return { ...d, canh: [...d.canh, ...moi].sort((a, b) => (a.doan_goc[0] ?? 0) - (b.doan_goc[0] ?? 0)) }
}

// Làm tiếp đợt sau: bộ nhận dạng cũ giữ NGUYÊN (mã nào đã có thì giữ mô tả cũ), chỉ thêm mục mới;
// cảnh mới nối vào sau, cảnh trùng đoạn gốc thì thay bằng bản mới, xếp theo thứ tự đoạn gốc.
export function noiDot(cu: DuAn, moi: DuAn): DuAn {
  const gop = (a: Muc[], b: Muc[]) => [...a, ...b.filter((m) => !a.some((x) => x.ma === m.ma))]
  const doanMoi = new Set(moi.canh.flatMap((c) => c.doan_goc))
  const canh = [...cu.canh.filter((c) => !c.doan_goc.some((d) => doanMoi.has(d))), ...moi.canh].sort(
    (a, b) => (a.doan_goc[0] ?? 0) - (b.doan_goc[0] ?? 0),
  )
  return {
    nhan_dang: {
      phong_cach: cu.nhan_dang.phong_cach || moi.nhan_dang.phong_cach,
      am_thanh: cu.nhan_dang.am_thanh || moi.nhan_dang.am_thanh,
      nhan_vat: gop(cu.nhan_dang.nhan_vat, moi.nhan_dang.nhan_vat),
      boi_canh: gop(cu.nhan_dang.boi_canh, moi.nhan_dang.boi_canh),
      do_vat: gop(cu.nhan_dang.do_vat, moi.nhan_dang.do_vat),
    },
    canh,
  }
}

// Dữ liệu dán vào / AI trả về có thể thiếu trường → điền mặc định cho đủ
export function chuanHoa(x: unknown): DuAn {
  const o = (x ?? {}) as Record<string, unknown>
  const nd = (o.nhan_dang ?? {}) as Record<string, unknown>
  const chuoi = (v: unknown) => (typeof v === 'string' ? v : '')
  const muc = (v: unknown): Muc[] =>
    Array.isArray(v)
      ? v.map((m: Record<string, unknown>) => ({ ma: chuoi(m?.ma), ten: chuoi(m?.ten), mo_ta: chuoi(m?.mo_ta), anh_mau: chuoi(m?.anh_mau) }))
      : []
  const ds = (v: unknown) => (Array.isArray(v) ? v.map(chuoi).filter(Boolean) : [])
  return {
    nhan_dang: {
      phong_cach: chuoi(nd.phong_cach),
      am_thanh: chuoi(nd.am_thanh),
      nhan_vat: muc(nd.nhan_vat),
      boi_canh: muc(nd.boi_canh),
      do_vat: muc(nd.do_vat),
    },
    canh: Array.isArray(o.canh)
      ? o.canh.map((c: Record<string, unknown>) => ({
          ten: chuoi(c?.ten),
          doan_goc: Array.isArray(c?.doan_goc) ? c.doan_goc.map(Number).filter((n: number) => n > 0) : [],
          boi_canh: chuoi(c?.boi_canh),
          nhan_vat: ds(c?.nhan_vat),
          do_vat: ds(c?.do_vat),
          hanh_dong: chuoi(c?.hanh_dong),
          khung_dau: chuoi(c?.khung_dau),
          khung_cuoi: chuoi(c?.khung_cuoi),
          co_cat_canh: c?.co_cat_canh === true,
          am_thanh_canh: chuoi(c?.am_thanh_canh),
          dien_bien: Array.isArray(c?.dien_bien)
            ? c.dien_bien
                .map((m: Record<string, unknown>) => ({ tu: Number(m?.tu) || 0, den: Number(m?.den) || 0, mo_ta: chuoi(m?.mo_ta) }))
                .filter((m: MocDienBien) => m.mo_ta)
            : [],
          trang_thai: Object.fromEntries(
            KHOA_TRANG_THAI.map((k) => [k, chuoi((c?.trang_thai as Record<string, unknown> | undefined)?.[k])]).filter(([, v]) => v),
          ) as TrangThai,
          may_quay: chuoi(c?.may_quay),
          noi_tiep: c?.noi_tiep !== false,
        }))
      : [],
  }
}
