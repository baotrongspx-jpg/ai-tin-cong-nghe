import 'server-only'
import { db, type BaiViet } from './db'
import { coFacebook, laySoLieuBai, type SoLieuFb } from './facebook'
import { coTelegram, guiTelegram, thoat } from './telegram'

// Số liệu tương tác lưu thành một bản ghi trong bảng cai_dat (không cần thêm cột):
// { [id bài]: số liệu }. Mỗi lần cập nhật chỉ ghi đè những bài vừa lấy lại.
const KHOA = 'so_lieu_fb'

type SoLieuLuu = SoLieuFb & { luc: string }
type BanGhi = { bai: Record<string, SoLieuLuu>; luc: string | null }

async function docBanGhi(): Promise<BanGhi> {
  const { data } = await db().from('cai_dat').select('gia_tri').eq('khoa', KHOA).maybeSingle()
  return (data?.gia_tri as BanGhi | undefined) ?? { bai: {}, luc: null }
}

// Bài bỏ khỏi thống kê:
// - bai_an_thong_ke: đăng qua app Facebook cũ chưa xuất bản, người theo dõi không thấy (số liệu gần như 0, làm lệch xếp hạng)
// - bai_da_xoa_fb: đã bị xóa trên Facebook (tự phát hiện khi lấy số liệu)
const KHOA_XOA = 'bai_da_xoa_fb'

async function dsBoQua(): Promise<Set<string>> {
  const { data } = await db().from('cai_dat').select('khoa, gia_tri').in('khoa', ['bai_an_thong_ke', KHOA_XOA])
  return new Set((data ?? []).flatMap((r) => (r.gia_tri as string[] | null) ?? []))
}

// Facebook báo bài không còn (đã xóa) bằng mã lỗi 10 giống lỗi thiếu quyền, chỉ khác câu chữ
export const laBaiDaXoa = (loi: string) => /object does not exist/i.test(loi)

// Lấy lại số liệu Facebook cho các bài đăng trong `ngay` ngày gần đây (gọi 4 bài một lúc)
export async function capNhatSoLieu(ngay = 7) {
  if (!coFacebook()) return { soBai: 0, loi: 'Chưa cấu hình Facebook' }
  const { data } = await db()
    .from('bai_viet')
    .select('id, fb_post_id')
    .not('fb_post_id', 'is', null)
    .gte('dang_luc', new Date(Date.now() - ngay * 86400_000).toISOString())
    .lte('dang_luc', new Date().toISOString())
    .limit(200)
  const boQua = await dsBoQua()
  const ds = ((data ?? []) as Pick<BaiViet, 'id' | 'fb_post_id'>[]).filter((b) => !boQua.has(b.id))

  const luc = new Date().toISOString()
  const moi: Record<string, SoLieuLuu> = {}
  const daXoa: string[] = []
  let loi: string | null = null
  for (let i = 0; i < ds.length; i += 4) {
    await Promise.all(
      ds.slice(i, i + 4).map(async (b) => {
        try {
          moi[b.id] = { ...(await laySoLieuBai(b.fb_post_id!)), luc }
        } catch (e) {
          const tb = e instanceof Error ? e.message : String(e)
          if (laBaiDaXoa(tb)) daXoa.push(b.id)
          else loi ??= tb
        }
      }),
    )
  }

  // Chỉ tin là bài đã bị xóa khi các bài khác vẫn đọc được (token còn tốt), tránh bỏ nhầm cả loạt
  if (daXoa.length && Object.keys(moi).length) {
    const { data: r } = await db().from('cai_dat').select('gia_tri').eq('khoa', KHOA_XOA).maybeSingle()
    const cuXoa = (r?.gia_tri as string[] | undefined) ?? []
    await db()
      .from('cai_dat')
      .upsert({ khoa: KHOA_XOA, gia_tri: [...new Set([...cuXoa, ...daXoa])], cap_nhat_luc: luc })
  }

  const cu = await docBanGhi()
  await db()
    .from('cai_dat')
    .upsert({ khoa: KHOA, gia_tri: { bai: { ...cu.bai, ...moi }, luc } satisfies BanGhi, cap_nhat_luc: luc })
  return { soBai: Object.keys(moi).length, daXoa: daXoa.length, loi }
}

// Điểm tương tác: bình luận và chia sẻ khó có hơn cảm xúc nên nặng điểm hơn.
// Chưa có quyền đọc cảm xúc / bình luận thì chỉ tính lượt chia sẻ.
export const diem = (s: SoLieuFb) => (s.camXuc ?? 0) + 2 * (s.binhLuan ?? 0) + 3 * s.chiaSe

// Bài "đang lên": đăng trong 48 giờ, có ít nhất 5 điểm và tốc độ từ 1 điểm/giờ
const GIO_DANG_LEN = 48
const DIEM_TOI_THIEU = 5
const TOC_DO_TOI_THIEU = 1

export type BaiXepHang = {
  bai: BaiViet
  soLieu: SoLieuLuu | null
  diem: number
  tocDo: number // điểm mỗi giờ kể từ lúc đăng
  dangLen: boolean
}

// Bài đã đăng Facebook trong khoảng `ngay` ngày, xếp từ nhiều tương tác nhất xuống.
// Bài đang lên xếp theo điểm như mọi bài, chỉ được gắn nhãn.
export async function xepHang(ngay: number | null) {
  let q = db().from('bai_viet').select('*').not('fb_post_id', 'is', null).lte('dang_luc', new Date().toISOString())
  if (ngay) q = q.gte('dang_luc', new Date(Date.now() - ngay * 86400_000).toISOString())
  const [{ data }, banGhi, boQua] = await Promise.all([
    q.order('dang_luc', { ascending: false }).limit(300),
    docBanGhi(),
    dsBoQua(),
  ])
  const tatCa = (data ?? []) as BaiViet[]

  const bay = Date.now()
  const ds: BaiXepHang[] = tatCa.filter((b) => !boQua.has(b.id)).map((bai) => {
    const soLieu = banGhi.bai[bai.id] ?? null
    const d = soLieu ? diem(soLieu) : 0
    const gio = Math.max(1, (bay - new Date(bai.dang_luc ?? bai.tao_luc).getTime()) / 3600_000)
    const tocDo = d / gio
    return { bai, soLieu, diem: d, tocDo, dangLen: gio <= GIO_DANG_LEN && d >= DIEM_TOI_THIEU && tocDo >= TOC_DO_TOI_THIEU }
  })
  ds.sort((a, b) => b.diem - a.diem || b.tocDo - a.tocDo)

  const coSo = ds.filter((x) => x.soLieu)
  const tong = (f: (s: SoLieuFb) => number | null) => {
    const v = coSo.map((x) => f(x.soLieu!)).filter((n): n is number => n !== null)
    return v.length ? v.reduce((a, b) => a + b, 0) : null
  }
  return {
    ds,
    soBoQua: tatCa.length - ds.length,
    luc: banGhi.luc,
    tong: {
      soBai: ds.length,
      camXuc: tong((s) => s.camXuc),
      binhLuan: tong((s) => s.binhLuan),
      chiaSe: tong((s) => s.chiaSe) ?? 0,
      luotXem: tong((s) => s.luotXem),
    },
    // Chưa có bài nào đọc được cảm xúc / lượt xem → gần như chắc do token thiếu quyền
    thieuQuyenCamXuc: coSo.length > 0 && coSo.every((x) => x.soLieu!.camXuc === null),
    thieuLuotXem: coSo.length > 0 && coSo.every((x) => x.soLieu!.luotXem === null),
  }
}

// Nhắn Telegram khi có bài mới "đang lên". Mỗi bài chỉ báo một lần (ghi nhớ trong cai_dat).
export async function baoBaiHot() {
  if (!coTelegram()) return 0
  const { ds } = await xepHang(2)
  const { data } = await db().from('cai_dat').select('gia_tri').eq('khoa', 'da_bao_hot').maybeSingle()
  const daBao = new Set((data?.gia_tri as string[] | undefined) ?? [])
  const moi = ds.filter((x) => x.dangLen && !daBao.has(x.bai.id))
  if (!moi.length) return 0

  await guiTelegram(
    `🔥 <b>${moi.length} bài đang lên</b>\n` +
      moi
        .map(
          (x) =>
            `• <a href="https://www.facebook.com/${x.bai.fb_post_id}">${thoat(x.bai.tieu_de_anh)}</a>: ${x.diem} điểm, ` +
            `${x.tocDo.toFixed(1)} điểm/giờ`,
        )
        .join('\n'),
  )
  // Chỉ giữ 200 id gần nhất cho bản ghi khỏi phình
  const giu = [...daBao, ...moi.map((x) => x.bai.id)].slice(-200)
  await db().from('cai_dat').upsert({ khoa: 'da_bao_hot', gia_tri: giu, cap_nhat_luc: new Date().toISOString() })
  return moi.length
}
