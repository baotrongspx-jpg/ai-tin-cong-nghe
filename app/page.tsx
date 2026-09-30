import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db, type BaiViet, type TrangThai } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import { coFacebook } from '@/lib/facebook'
import { coTikTok, daKetNoiTikTok } from '@/lib/tiktok'
import { dsHenTikTok, gioVang } from '@/lib/henGio'
import { dsBoQua } from '@/lib/soLieu'
import { bayGio } from '@/lib/thoiGian'
import DauTrang, { CanhBao, ThanhLoc, TieuDeTrang, Trong } from './DauTrang'
import TheBai from './TheBai'

// Nút "Tổng hợp ngay" chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

// "Hẹn giờ" không phải trạng thái trong bảng: bài Facebook có giờ đăng ở tương lai, hoặc bài có lịch TikTok.
// "Không hiển thị": bài đã đăng nhưng người theo dõi không thấy (qua app Facebook cũ) hoặc đã xóa trên Facebook.
type Tab = TrangThai | 'hen_gio' | 'an'

// Mỗi lần hiện 12 bài, bấm "Xem thêm" hiện thêm 12: trang nhẹ, mở nhanh
const SO_MOI_LAN = 12

const THE: { ma: Tab; ten: string }[] = [
  { ma: 'nhap', ten: 'Chờ duyệt' },
  { ma: 'hen_gio', ten: '⏰ Hẹn giờ' },
  { ma: 'da_dang', ten: 'Đã đăng' },
  { ma: 'bo_qua', ten: 'Bỏ qua' },
  { ma: 'loi', ten: 'Lỗi' },
  { ma: 'an', ten: '🙈 Không hiển thị' },
]

const TRONG: Record<Tab, { bieuTuong: string; tieuDe: string; goiY: string }> = {
  hen_gio: { bieuTuong: '⏰', tieuDe: 'Chưa hẹn giờ bài nào', goiY: 'Ở bài chờ duyệt, bấm "Hẹn giờ" để chọn giờ đăng Facebook, TikTok hoặc cả hai.' },
  nhap: { bieuTuong: '🎉', tieuDe: 'Đã duyệt hết bài', goiY: 'Bấm "Tổng hợp ngay" trên thanh đầu trang để AI đọc tin mới và soạn thêm bài.' },
  da_dang: { bieuTuong: '📭', tieuDe: 'Chưa đăng bài nào', goiY: 'Bài đăng lên Facebook sẽ hiện ở đây.' },
  bo_qua: { bieuTuong: '🗂️', tieuDe: 'Không có bài bị bỏ qua', goiY: 'Bài bạn bấm "Bỏ qua" sẽ nằm ở đây, đưa về chờ duyệt lúc nào cũng được.' },
  loi: { bieuTuong: '✅', tieuDe: 'Không có bài lỗi', goiY: 'Bài AI không viết được sẽ hiện ở đây.' },
  an: { bieuTuong: '👀', tieuDe: 'Bài nào cũng hiển thị bình thường', goiY: 'Bài đăng qua app Facebook cũ hoặc đã xóa trên Facebook sẽ nằm ở đây.' },
}

export default async function TrangChu({ searchParams }: PageProps<'/'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')

  const q = await searchParams
  const tt = q.tt
  const dangXem: Tab = THE.some((t) => t.ma === tt) ? (tt as Tab) : 'nhap'

  const soHien = Math.min(200, Math.max(SO_MOI_LAN, Number(q.n) || SO_MOI_LAN))
  const [henTikTok, vang, tiktok, boQua] = await Promise.all([
    dsHenTikTok(),
    gioVang(),
    // Đã kết nối TikTok thì hiện nút đăng cả 2 nền tảng và hẹn giờ TikTok
    coTikTok() ? daKetNoiTikTok() : false,
    dsBoQua(),
  ])
  const idHen = Object.keys(henTikTok)
  const idAn = [...boQua]
  const luc = bayGio()
  const bay = `"${new Date(luc).toISOString()}"`
  // Điều kiện lọc từng thẻ; `head`: chỉ đếm
  const loc = (ma: Tab, head = false) => {
    const q = db().from('bai_viet').select(head ? 'id' : '*', { count: 'exact', head })
    if (ma === 'hen_gio') return q.or(`dang_luc.gt.${bay}${idHen.length ? `,id.in.(${idHen.join(',')})` : ''}`)
    if (ma === 'an') return q.in('id', idAn.length ? idAn : ['00000000-0000-0000-0000-000000000000'])
    if (ma === 'da_dang') {
      const r = q.eq('trang_thai', 'da_dang').or(`dang_luc.is.null,dang_luc.lte.${bay}`)
      return idAn.length ? r.not('id', 'in', `(${idAn.join(',')})`) : r
    }
    if (ma === 'nhap' && idHen.length) return q.eq('trang_thai', 'nhap').not('id', 'in', `(${idHen.join(',')})`)
    return q.eq('trang_thai', ma)
  }
  const thuTu =
    dangXem === 'hen_gio'
      ? { cot: 'dang_luc', tang: true }
      : dangXem === 'da_dang' || dangXem === 'an'
        ? { cot: 'dang_luc', tang: false }
        : { cot: 'tao_luc', tang: false }

  const [{ data, error }, ...dem] = await Promise.all([
    loc(dangXem).order(thuTu.cot, { ascending: thuTu.tang, nullsFirst: false }).limit(soHien),
    ...THE.map((t) => loc(t.ma, true)),
  ])
  const dsBai = (data ?? []) as unknown as BaiViet[]
  const tong = dem[THE.findIndex((t) => t.ma === dangXem)]?.count ?? 0

  return (
    <>
      <DauTrang dangO="facebook" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <TieuDeTrang
          ten="Đăng Facebook"
          moTa="AI tự tổng hợp 3 lần mỗi ngày. Sửa nếu cần rồi đăng, Ctrl + S để lưu nhanh."
        />

        {!coFacebook() && (
          <CanhBao>
            Chưa cấu hình Facebook (FB_PAGE_ID, FB_PAGE_TOKEN): vẫn soạn và tải ảnh được, nhưng chưa đăng thẳng lên Fanpage được.
          </CanhBao>
        )}
        {error && <CanhBao loai="do">Lỗi đọc dữ liệu: {error.message}. Đã chạy file supabase/schema.sql chưa?</CanhBao>}

        <ThanhLoc
          dangXem={dangXem}
          mauBat="bg-blue-600 text-white"
          ds={THE.map((t, i) => ({ ...t, href: t.ma === 'nhap' ? '/' : `/?tt=${t.ma}`, so: dem[i].count ?? 0 }))}
        />

        {dsBai.length === 0 ? (
          <Trong {...TRONG[dangXem]} />
        ) : (
          <div className="space-y-5">
            {dsBai.map((b) => (
              <TheBai
                key={`${b.id}-${b.trang_thai}-${b.dang_luc}-${henTikTok[b.id]}`}
                bai={b}
                tiktok={tiktok}
                // Facebook đã nhận bài nhưng giờ đăng ở tương lai: đang chờ Facebook tự đăng
                henFb={b.fb_post_id && b.dang_luc && new Date(b.dang_luc).getTime() > luc ? b.dang_luc : null}
                henTikTok={henTikTok[b.id] ?? null}
                gioVang={vang}
              />
            ))}
            {tong > dsBai.length && (
              <Link
                href={`/?${new URLSearchParams({ ...(dangXem !== 'nhap' && { tt: dangXem }), n: String(soHien + SO_MOI_LAN) })}`}
                scroll={false}
                className="btn btn-phu w-full py-3"
              >
                Xem thêm ({tong - dsBai.length} bài nữa)
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  )
}
