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
  may_quay: string
  noi_tiep: boolean
}
export type DuAn = { nhan_dang: NhanDang; canh: Canh[] }

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
    const phan = [`STYLE: ${nd.phong_cach.trim()}`]
    if (c.nhan_vat.length)
      phan.push(
        'CHARACTERS (keep exactly identical in every shot: same face, hair, body, clothing, colours):\n' +
          khoi(nd.nhan_vat, c.nhan_vat, loi, 'nhân vật'),
      )
    if (c.do_vat.length) phan.push('KEY OBJECTS (keep exactly identical in every shot):\n' + khoi(nd.do_vat, c.do_vat, loi, 'đồ vật'))
    if (boiCanh.length)
      phan.push('SETTING (same location, weather and light as the other shots):\n' + khoi(nd.boi_canh, boiCanh, loi, 'bối cảnh'))
    phan.push(`SHOT (8 seconds): ${c.hanh_dong.trim()}`)
    // Mỗi cảnh làm bằng Frames to Video (ảnh đầu + ảnh cuối của đoạn gốc) → buộc khớp đúng 2 ảnh để các cảnh nối liền
    phan.push(
      'START AND END FRAMES (mandatory): the video must begin exactly on the provided first frame and end exactly on the ' +
        'provided last frame. At 0 seconds every person, object and the camera are in exactly the pose, position, framing ' +
        'and lighting of the first frame; at 8 seconds they are in exactly the pose, position, framing and lighting of the ' +
        'last frame. The action moves smoothly and naturally from one to the other, without cuts, morphing or teleporting, ' +
        'so this shot joins seamlessly with the previous and next shots.',
    )
    if (c.may_quay.trim()) phan.push(`CAMERA: ${c.may_quay.trim()}`)
    if (nd.am_thanh.trim()) phan.push(`AUDIO: ${nd.am_thanh.trim()}`)
    if (c.noi_tiep && i > 0)
      phan.push(
        'CONTINUITY: this shot continues directly from the previous shot - same characters, same clothing, ' +
          'same objects, same weather, same time of day, same colour grading.',
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
          may_quay: chuoi(c?.may_quay),
          noi_tiep: c?.noi_tiep !== false,
        }))
      : [],
  }
}
