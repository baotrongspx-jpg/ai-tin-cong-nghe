import { redirect } from 'next/navigation'
import { db, type BaiViet } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import Link from 'next/link'
import { coTikTok, daKetNoiTikTok, layTaiKhoanTikTokNhanh, type TaiKhoanTikTok } from '@/lib/tiktok'
import { docHashtagXuHuong } from '@/lib/xuHuong'
import { dsHenTikTok, gioVang } from '@/lib/henGio'
import { SO_TAG_XU_HUONG } from '@/lib/chuThich'
import { CanhBao, ThanhLoc, TieuDeTrang, Trong } from '@/app/DauTrang'
import { IconTikTok, IconXongTron, IconHop } from '@/app/BieuTuong'
import XuHuong from './XuHuong'
import TheTikTok from './TheTikTok'
import DungSan from './DungSan'

// Nút "Tổng hợp ngay" ở đầu trang chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

// Mỗi lần hiện 12 bài, bấm "Xem thêm" hiện thêm 12
const SO_MOI_LAN = 12

// Tìm theo tiêu đề / nội dung / nguồn (bỏ ký tự đặc biệt của bộ lọc PostgREST)
const timKiem = (tuKhoa: string) => {
  const q = db().from('bai_viet').select('*', { count: 'exact' })
  const tk = tuKhoa.replace(/[,()%*\\:"']/g, ' ').trim().slice(0, 80)
  return tk ? q.or(`tieu_de_anh.ilike.*${tk}*,tieu_de_goc.ilike.*${tk}*,nguon_ten.ilike.*${tk}*,noi_dung.ilike.*${tk}*`) : q
}
// Bài chưa lên TikTok: bài chờ duyệt hoặc đã lên Facebook (bỏ qua bài bị bỏ và bài lỗi)
const locChua = (tk: string) => timKiem(tk).is('tiktok_publish_id', null).in('trang_thai', ['nhap', 'da_dang'])
const locDa = (tk: string) => timKiem(tk).not('tiktok_publish_id', 'is', null)

export default async function TrangTikTok({ searchParams }: PageProps<'/tiktok'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')

  const q = await searchParams
  const dangXem = q.tt === 'da' ? 'da' : 'chua'
  const tuKhoa = typeof q.q === 'string' ? q.q.trim() : ''
  const soHien = Math.min(200, Math.max(SO_MOI_LAN, Number(q.n) || SO_MOI_LAN))
  const cauHinh = coTikTok()

  // Tài khoản TikTok (gọi API TikTok, nhớ 5 phút) chạy song song với các truy vấn khác
  const docTaiKhoan = async (): Promise<{ ketNoi: boolean; taiKhoan: TaiKhoanTikTok | null; loi: string | null }> => {
    if (!cauHinh || !(await daKetNoiTikTok())) return { ketNoi: false, taiKhoan: null, loi: null }
    try {
      return { ketNoi: true, taiKhoan: await layTaiKhoanTikTokNhanh(), loi: null }
    } catch (e) {
      return { ketNoi: true, taiKhoan: null, loi: e instanceof Error ? e.message : String(e) }
    }
  }

  const [ds, demChua, demDa, xuHuong, hen, vang, tk] = await Promise.all([
    (dangXem === 'da'
      ? locDa(tuKhoa).order('tiktok_dang_luc', { ascending: false })
      : locChua(tuKhoa).order('tao_luc', { ascending: false })
    ).limit(soHien),
    locChua(tuKhoa).limit(0),
    locDa(tuKhoa).limit(0),
    docHashtagXuHuong(),
    dsHenTikTok(),
    gioVang(),
    docTaiKhoan(),
  ])
  const { ketNoi, taiKhoan, loi: loiTaiKhoan } = tk
  const dsBai = (ds.data ?? []) as BaiViet[]
  const tong = (dangXem === 'da' ? demDa.count : demChua.count) ?? 0

  const oTaiKhoan = !cauHinh ? null : (
    <div className="the flex items-center gap-3 p-2 pr-2.5">
      {taiKhoan ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={taiKhoan.creator_avatar_url} alt="" className="h-10 w-10 rounded-full bg-slate-200 ring-2 ring-white" />
          <div className="text-sm leading-tight">
            <div className="flex items-center gap-1.5 font-bold">
              {taiKhoan.creator_nickname}
              <span className="h-2 w-2 rounded-full bg-emerald-500" title="Đã kết nối" />
            </div>
            <div className="text-slate-500">@{taiKhoan.creator_username}</div>
          </div>
        </>
      ) : (
        <span className="flex items-center gap-2 px-2 text-sm text-slate-500">
          <IconTikTok className="h-5 w-5" />
          {ketNoi ? 'Không đọc được tài khoản' : 'Chưa kết nối tài khoản'}
        </span>
      )}
      <a href="/api/tiktok/ket-noi" className={`btn btn-sm ${ketNoi ? 'btn-phu' : 'btn-tt'}`}>
        {ketNoi ? 'Kết nối lại' : 'Kết nối TikTok'}
      </a>
    </div>
  )

  return (
    <>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <TieuDeTrang
          ten="Đăng TikTok"
          moTa="Đăng bài thành video lồng tiếng AI (hoặc bài ảnh). TikTok giới hạn khoảng 15 bài mỗi ngày."
          Icon={IconTikTok}
          mauIcon="from-slate-700 to-slate-950 shadow-slate-900/30"
          phai={oTaiKhoan}
        />

        {!cauHinh && <CanhBao>Chưa cấu hình TikTok (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET trên Vercel).</CanhBao>}
        {loiTaiKhoan && <CanhBao loai="do">{loiTaiKhoan}. Thử bấm &quot;Kết nối lại&quot;.</CanhBao>}

        <ThanhLoc
          dangXem={dangXem}
          mauBat="bg-slate-900 text-white"
          ds={[
            { ma: 'chua', ten: 'Chưa đăng', Icon: IconHop, href: tuKhoa ? `/tiktok?${new URLSearchParams({ q: tuKhoa })}` : '/tiktok', so: demChua.count ?? 0 },
            { ma: 'da', ten: 'Đã đăng', Icon: IconXongTron, href: `/tiktok?${new URLSearchParams({ tt: 'da', ...(tuKhoa && { q: tuKhoa }) })}`, so: demDa.count ?? 0 },
          ]}
        />

        {tuKhoa && (
          <p className="mb-4 text-sm text-slate-500">
            Kết quả tìm &quot;<b className="text-slate-800">{tuKhoa}</b>&quot;: {tong} bài ở thẻ này.{' '}
            <Link href={dangXem === 'da' ? '/tiktok?tt=da' : '/tiktok'} className="font-semibold text-blue-600 hover:underline">
              Bỏ tìm kiếm
            </Link>
          </p>
        )}

        {dsBai.length === 0 ? (
          tuKhoa ? (
            <Trong bieuTuong="🔍" tieuDe="Không tìm thấy bài nào" goiY="Thử từ khóa khác, hoặc xem ở thẻ khác." />
          ) : dangXem === 'chua' ? (
            <Trong bieuTuong="🎉" tieuDe="Bài nào cũng đã lên TikTok" goiY="Bài mới AI soạn sẽ hiện ở đây để đăng." />
          ) : (
            <Trong bieuTuong="🎬" tieuDe="Chưa đăng bài nào lên TikTok" goiY="Bài đã đăng sẽ hiện ở đây." />
          )
        ) : (
          <div className="space-y-5">
            {/* Dựng sẵn video cho 6 bài chưa đăng đầu tiên (chỉ khi có máy đọc giọng VieNeu) */}
            {dangXem === 'chua' && process.env.VIENEU_URL && <DungSan ds={dsBai.slice(0, 6).map((b) => b.id)} />}
            {dsBai.map((b) => (
              <TheTikTok
                key={`${b.id}-${b.tiktok_publish_id}-${hen[b.id]}`}
                bai={b}
                xuHuong={xuHuong.ds}
                hen={hen[b.id] ?? null}
                gioVang={vang}
                taiKhoan={taiKhoan && { khoaBinhLuan: taiKhoan.comment_disabled }}
              />
            ))}
            {tong > dsBai.length && (
              <Link
                href={`/tiktok?${new URLSearchParams({ ...(dangXem === 'da' && { tt: 'da' }), ...(tuKhoa && { q: tuKhoa }), n: String(soHien + SO_MOI_LAN) })}`}
                scroll={false}
                className="btn btn-phu w-full py-3"
              >
                Xem thêm ({tong - dsBai.length} bài nữa)
              </Link>
            )}
          </div>
        )}

        <div className="mt-8">
          <XuHuong ds={xuHuong.ds} luc={xuHuong.luc} soThem={SO_TAG_XU_HUONG} />
        </div>
      </main>
    </>
  )
}
