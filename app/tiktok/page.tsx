import { redirect } from 'next/navigation'
import { db, type BaiViet } from '@/lib/db'
import { daDangNhap } from '@/lib/xacThuc'
import { coTikTok, daKetNoiTikTok, layTaiKhoanTikTok, type TaiKhoanTikTok } from '@/lib/tiktok'
import { layHashtagXuHuong } from '@/lib/xuHuong'
import { SO_TAG_XU_HUONG } from '@/lib/chuThich'
import DauTrang, { CanhBao, ThanhLoc, TieuDeTrang, Trong } from '../DauTrang'
import { IconTikTok } from '../BieuTuong'
import XuHuong from './XuHuong'
import TheTikTok from './TheTikTok'

// Nút "Tổng hợp ngay" ở đầu trang chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

// Bài chưa lên TikTok: bài chờ duyệt hoặc đã lên Facebook (bỏ qua bài bị bỏ và bài lỗi)
const locChua = () =>
  db().from('bai_viet').select('*', { count: 'exact' }).is('tiktok_publish_id', null).in('trang_thai', ['nhap', 'da_dang'])
const locDa = () => db().from('bai_viet').select('*', { count: 'exact' }).not('tiktok_publish_id', 'is', null)

export default async function TrangTikTok({ searchParams }: PageProps<'/tiktok'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')

  const dangXem = (await searchParams).tt === 'da' ? 'da' : 'chua'
  const cauHinh = coTikTok()
  const ketNoi = cauHinh && (await daKetNoiTikTok())

  let taiKhoan: TaiKhoanTikTok | null = null
  let loiTaiKhoan: string | null = null
  if (ketNoi) {
    try {
      taiKhoan = await layTaiKhoanTikTok()
    } catch (e) {
      loiTaiKhoan = e instanceof Error ? e.message : String(e)
    }
  }

  const [ds, demChua, demDa, xuHuong] = await Promise.all([
    (dangXem === 'da'
      ? locDa().order('tiktok_dang_luc', { ascending: false })
      : locChua().order('tao_luc', { ascending: false })
    ).limit(50),
    locChua().limit(0),
    locDa().limit(0),
    layHashtagXuHuong(),
  ])
  const dsBai = (ds.data ?? []) as BaiViet[]

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
      <DauTrang dangO="tiktok" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <TieuDeTrang
          ten="Đăng TikTok"
          moTa="Đăng ảnh bài viết thành bài ảnh TikTok, TikTok tự thêm nhạc. Tối đa khoảng 6 bài mỗi phút, 15 bài mỗi ngày."
          phai={oTaiKhoan}
        />

        {!cauHinh && <CanhBao>Chưa cấu hình TikTok (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET trên Vercel).</CanhBao>}
        {loiTaiKhoan && <CanhBao loai="do">{loiTaiKhoan}. Thử bấm &quot;Kết nối lại&quot;.</CanhBao>}

        <ThanhLoc
          dangXem={dangXem}
          mauBat="bg-slate-900 text-white"
          ds={[
            { ma: 'chua', ten: 'Chưa đăng', href: '/tiktok', so: demChua.count ?? 0 },
            { ma: 'da', ten: 'Đã đăng', href: '/tiktok?tt=da', so: demDa.count ?? 0 },
          ]}
        />

        {dsBai.length === 0 ? (
          dangXem === 'chua' ? (
            <Trong bieuTuong="🎉" tieuDe="Bài nào cũng đã lên TikTok" goiY="Bài mới AI soạn sẽ hiện ở đây để đăng." />
          ) : (
            <Trong bieuTuong="🎬" tieuDe="Chưa đăng bài nào lên TikTok" goiY="Bài đã đăng sẽ hiện ở đây." />
          )
        ) : (
          <div className="space-y-5">
            {dsBai.map((b) => (
              <TheTikTok
                key={`${b.id}-${b.tiktok_publish_id}`}
                bai={b}
                xuHuong={xuHuong.ds}
                taiKhoan={taiKhoan && { khoaBinhLuan: taiKhoan.comment_disabled }}
              />
            ))}
          </div>
        )}

        <div className="mt-8">
          <XuHuong ds={xuHuong.ds} luc={xuHuong.luc} soThem={SO_TAG_XU_HUONG} />
        </div>
      </main>
    </>
  )
}
