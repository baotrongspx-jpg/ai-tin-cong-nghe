import 'server-only'
import { db, type TrangThai } from './db'
import { dsHenTikTok } from './henGio'
import { dsBoQua } from './soLieu'
import { bayGio } from './thoiGian'

// "Hẹn giờ" không phải trạng thái trong bảng: bài Facebook có giờ đăng ở tương lai, hoặc bài có lịch TikTok.
// "Không hiển thị": bài đã đăng nhưng người theo dõi không thấy (qua app Facebook cũ) hoặc đã xóa trên Facebook.
export type Tab = TrangThai | 'hen_gio' | 'an'

export const DS_TAB: { ma: Tab; ten: string }[] = [
  { ma: 'nhap', ten: 'Chờ duyệt' },
  { ma: 'hen_gio', ten: 'Hẹn giờ' },
  { ma: 'da_dang', ten: 'Đã đăng' },
  { ma: 'bo_qua', ten: 'Bỏ qua' },
  { ma: 'loi', ten: 'Lỗi' },
  { ma: 'an', ten: 'Không hiển thị' },
]

// Mốc bắt đầu của khoảng thời gian lọc theo ngày soạn bài (giờ Việt Nam). Danh sách khoảng ở app/ChonKhoang.tsx
export function tuLuc(khoang: string | undefined): string | null {
  if (khoang === 'hom_nay') {
    const ngay = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    return new Date(`${ngay}T00:00:00+07:00`).toISOString()
  }
  const so = Number(khoang)
  return so > 0 ? new Date(Date.now() - so * 86400_000).toISOString() : null
}

// Bỏ ký tự đặc biệt của bộ lọc PostgREST (dấu phẩy, ngoặc, %...) khỏi từ khóa tìm kiếm
const sachTuKhoa = (s: string) => s.replace(/[,()%*\\:"']/g, ' ').trim().slice(0, 80)

// Trả về hàm tạo truy vấn cho từng thẻ, có thể kèm tìm kiếm (`q`) và mốc thời gian (`tu`). `head`: chỉ đếm.
export async function taoBoLoc(tuyChon: { q?: string; tu?: string | null } = {}) {
  const [henTikTok, boQua] = await Promise.all([dsHenTikTok(), dsBoQua()])
  const idHen = Object.keys(henTikTok)
  const idAn = [...boQua]
  const luc = bayGio()
  const bay = `"${new Date(luc).toISOString()}"`
  const tuKhoa = sachTuKhoa(tuyChon.q ?? '')

  const loc = (ma: Tab, head = false) => {
    let q = db().from('bai_viet').select(head ? 'id' : '*', { count: 'exact', head })
    if (tuKhoa) q = q.or(`tieu_de_anh.ilike.*${tuKhoa}*,tieu_de_goc.ilike.*${tuKhoa}*,nguon_ten.ilike.*${tuKhoa}*,noi_dung.ilike.*${tuKhoa}*`)
    if (tuyChon.tu) q = q.gte('tao_luc', tuyChon.tu)
    if (ma === 'hen_gio') return q.or(`dang_luc.gt.${bay}${idHen.length ? `,id.in.(${idHen.join(',')})` : ''}`)
    if (ma === 'an') return q.in('id', idAn.length ? idAn : ['00000000-0000-0000-0000-000000000000'])
    if (ma === 'da_dang') {
      const r = q.eq('trang_thai', 'da_dang').or(`dang_luc.is.null,dang_luc.lte.${bay}`)
      return idAn.length ? r.not('id', 'in', `(${idAn.join(',')})`) : r
    }
    if (ma === 'nhap' && idHen.length) return q.eq('trang_thai', 'nhap').not('id', 'in', `(${idHen.join(',')})`)
    return q.eq('trang_thai', ma)
  }
  return { loc, henTikTok, luc }
}

// Số bài từng thẻ (cho thanh bên và thanh lọc)
export async function demTheoTab(tuyChon: { q?: string; tu?: string | null } = {}) {
  const { loc } = await taoBoLoc(tuyChon)
  const dem = await Promise.all(DS_TAB.map((t) => loc(t.ma, true)))
  return Object.fromEntries(DS_TAB.map((t, i) => [t.ma, dem[i].count ?? 0])) as Record<Tab, number>
}

// Số bài chưa lên TikTok (bài chờ duyệt hoặc đã lên Facebook)
export async function demChuaTikTok() {
  const { count } = await db()
    .from('bai_viet')
    .select('id', { count: 'exact', head: true })
    .is('tiktok_publish_id', null)
    .in('trang_thai', ['nhap', 'da_dang'])
  return count ?? 0
}
