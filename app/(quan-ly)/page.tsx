import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { BaiViet } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import { coFacebook } from '@/lib/facebook'
import { coTikTok, daKetNoiTikTok } from '@/lib/tiktok'
import { gioVang } from '@/lib/henGio'
import { DS_TAB, taoBoLoc, tuLuc, type Tab } from '@/lib/locBai'
import { CanhBao, ThanhLoc, TieuDeTrang, Trong } from '@/app/DauTrang'
import { IconAn, IconBoQua, IconCanhBao, IconDongHo, IconHop, IconLop, IconXongTron } from '@/app/BieuTuong'
import TheBai from '@/app/TheBai'
import ChonKhoang from '@/app/ChonKhoang'

// Nút "Tổng hợp ngay" chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

// Mỗi lần hiện 12 bài, bấm "Xem thêm" hiện thêm 12: trang nhẹ, mở nhanh
const SO_MOI_LAN = 12

const ICON: Record<Tab, typeof IconHop> = {
  nhap: IconHop,
  hen_gio: IconDongHo,
  da_dang: IconXongTron,
  bo_qua: IconBoQua,
  loi: IconCanhBao,
  an: IconAn,
}

const TRONG: Record<Tab, { bieuTuong: string; tieuDe: string; goiY: string }> = {
  hen_gio: { bieuTuong: '⏰', tieuDe: 'Chưa hẹn giờ bài nào', goiY: 'Ở bài chờ duyệt, bấm "Hẹn giờ đăng" để chọn giờ đăng Facebook, TikTok hoặc cả hai.' },
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
  const dangXem: Tab = DS_TAB.some((t) => t.ma === tt) ? (tt as Tab) : 'nhap'
  const tuKhoa = typeof q.q === 'string' ? q.q.trim() : ''
  const khoang = typeof q.ngay === 'string' ? q.ngay : ''

  const soHien = Math.min(200, Math.max(SO_MOI_LAN, Number(q.n) || SO_MOI_LAN))
  const [{ loc, henTikTok, luc }, vang, tiktok] = await Promise.all([
    taoBoLoc({ q: tuKhoa, tu: tuLuc(khoang) }),
    gioVang(),
    // Đã kết nối TikTok thì hiện nút đăng cả 2 nền tảng và hẹn giờ TikTok
    coTikTok() ? daKetNoiTikTok() : false,
  ])
  const thuTu =
    dangXem === 'hen_gio'
      ? { cot: 'dang_luc', tang: true }
      : dangXem === 'da_dang' || dangXem === 'an'
        ? { cot: 'dang_luc', tang: false }
        : { cot: 'tao_luc', tang: false }

  const [{ data, error }, ...dem] = await Promise.all([
    loc(dangXem).order(thuTu.cot, { ascending: thuTu.tang, nullsFirst: false }).limit(soHien),
    ...DS_TAB.map((t) => loc(t.ma, true)),
  ])
  const dsBai = (data ?? []) as unknown as BaiViet[]
  const tong = dem[DS_TAB.findIndex((t) => t.ma === dangXem)]?.count ?? 0

  // Link trong trang: giữ thẻ đang xem, từ khóa, khoảng thời gian (trừ khi ghi đè)
  const link = (them: { tt?: Tab; q?: string; n?: number }) => {
    const p = new URLSearchParams()
    const the = them.tt ?? dangXem
    if (the !== 'nhap') p.set('tt', the)
    const tk = them.q ?? tuKhoa
    if (tk) p.set('q', tk)
    if (khoang) p.set('ngay', khoang)
    if (them.n) p.set('n', String(them.n))
    return p.size ? `/?${p}` : '/'
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <TieuDeTrang
        ten="Duyệt bài công nghệ"
        moTa="Kiểm tra, chỉnh sửa và duyệt bài AI soạn trước khi đăng. Ctrl + S để lưu nhanh."
        Icon={IconLop}
        phai={<ChonKhoang khoang={khoang} />}
      />

      {!coFacebook() && (
        <CanhBao>
          Chưa cấu hình Facebook (FB_PAGE_ID, FB_PAGE_TOKEN): vẫn soạn và tải ảnh được, nhưng chưa đăng thẳng lên Fanpage được.
        </CanhBao>
      )}
      {error && <CanhBao loai="do">Lỗi đọc dữ liệu: {error.message}. Đã chạy file supabase/schema.sql chưa?</CanhBao>}

      <ThanhLoc
        dangXem={dangXem}
        mauBat="bg-blue-600 text-white shadow-blue-600/30"
        ds={DS_TAB.map((t, i) => ({ ...t, Icon: ICON[t.ma], href: link({ tt: t.ma }), so: dem[i].count ?? 0 }))}
      />

      {tuKhoa && (
        <p className="mb-4 text-sm text-slate-500">
          Kết quả tìm &quot;<b className="text-slate-800">{tuKhoa}</b>&quot;: {tong} bài ở thẻ này.{' '}
          <Link href={link({ q: '' })} className="font-semibold text-blue-600 hover:underline">
            Bỏ tìm kiếm
          </Link>
        </p>
      )}

      {dsBai.length === 0 ? (
        tuKhoa ? (
          <Trong bieuTuong="🔍" tieuDe="Không tìm thấy bài nào" goiY="Thử từ khóa khác, hoặc xem ở thẻ khác." />
        ) : (
          <Trong {...TRONG[dangXem]} />
        )
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
            <Link href={link({ n: soHien + SO_MOI_LAN })} scroll={false} className="btn btn-phu w-full py-3">
              Xem thêm ({tong - dsBai.length} bài nữa)
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
