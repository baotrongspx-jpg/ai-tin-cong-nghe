import { redirect } from 'next/navigation'
import { daDangNhap } from '@/lib/xacThuc'
import { xepHang, type BaiXepHang } from '@/lib/soLieu'
import { gio, truoc } from '@/lib/thoiGian'
import { urlAnh } from '@/lib/chuThich'
import DauTrang, { CanhBao, ThanhLoc, TieuDeTrang, Trong } from '../DauTrang'
import { IconFacebook, IconMo, IconTikTok } from '../BieuTuong'
import NutCapNhat from './NutCapNhat'

// Nút "Tổng hợp ngay" ở đầu trang chạy AI trong Server Action, cần thời gian dài
export const maxDuration = 300

const KY = [
  { ma: '1', ten: '24 giờ', ngay: 1 },
  { ma: '7', ten: '7 ngày', ngay: 7 },
  { ma: '30', ten: '30 ngày', ngay: 30 },
  { ma: 'all', ten: 'Tất cả', ngay: null },
] as const

const so = (n: number | null) => (n === null ? '—' : n.toLocaleString('vi-VN'))

export default async function TrangThongKe({ searchParams }: PageProps<'/thong-ke'>) {
  if (!(await daDangNhap())) redirect('/dang-nhap')

  const kyChon = (await searchParams).ky
  const ky = KY.find((k) => k.ma === kyChon) ?? KY[1]
  const { ds, soBoQua, luc, tong, thieuQuyenCamXuc, thieuLuotXem } = await xepHang(ky.ngay)
  const diemCao = Math.max(1, ...ds.map((x) => x.diem))
  const soDangLen = ds.filter((x) => x.dangLen).length

  return (
    <>
      <DauTrang dangO="thong_ke" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <TieuDeTrang
          ten="Thống kê tương tác"
          moTa={
            luc
              ? `Bài Facebook xếp từ nhiều tương tác nhất xuống. Số liệu lấy lúc ${gio(luc)}, tự cập nhật sau mỗi lần lịch chạy.`
              : 'Bài Facebook xếp từ nhiều tương tác nhất xuống. Chưa có số liệu, bấm "Cập nhật số liệu".'
          }
          phai={<NutCapNhat />}
        />

        {thieuQuyenCamXuc && (
          <CanhBao>
            <b>Mới đọc được lượt chia sẻ.</b> Muốn xếp hạng theo cả cảm xúc, bình luận{thieuLuotXem ? ' và lượt xem' : ''}, tạo lại
            token Facebook có thêm quyền <code>pages_read_user_content</code>
            {thieuLuotXem && (
              <>
                {' '}
                và <code>read_insights</code>
              </>
            )}{' '}
            (Graph API Explorer → thêm quyền → Generate Access Token → <code>npm run token-fb</code>), rồi thay{' '}
            <code>FB_PAGE_TOKEN</code> trên Vercel và Redeploy.
          </CanhBao>
        )}

        {soBoQua > 0 && (
          <p className="mb-4 text-xs text-slate-500">
            Không tính {soBoQua} bài đăng qua app Facebook cũ (chưa xuất bản, người theo dõi không thấy).
          </p>
        )}

        <ThanhLoc
          dangXem={ky.ma}
          mauBat="bg-emerald-600 text-white"
          ds={KY.map((k) => ({ ma: k.ma, ten: k.ten, href: k.ma === '7' ? '/thong-ke' : `/thong-ke?ky=${k.ma}` }))}
        />

        {/* Ô tổng */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <O ten="Bài đã đăng" giaTri={so(tong.soBai)} phu={soDangLen ? `🔥 ${soDangLen} bài đang lên` : undefined} />
          <O ten="Cảm xúc" giaTri={so(tong.camXuc)} bieuTuong="❤️" />
          <O ten="Bình luận" giaTri={so(tong.binhLuan)} bieuTuong="💬" />
          <O ten="Chia sẻ" giaTri={so(tong.chiaSe)} bieuTuong="↗️" phu={tong.luotXem !== null ? `👁 ${so(tong.luotXem)} lượt xem` : undefined} />
        </div>

        {ds.length === 0 ? (
          <Trong bieuTuong="📊" tieuDe="Chưa có bài nào trong khoảng này" goiY="Chọn khoảng thời gian dài hơn, hoặc đăng thêm bài lên Facebook." />
        ) : (
          <ol className="space-y-2.5">
            {ds.map((x, i) => (
              <Dong key={x.bai.id} x={x} hang={i + 1} diemCao={diemCao} />
            ))}
          </ol>
        )}

        <p className="the mt-6 flex items-start gap-3 p-4 text-sm text-slate-500">
          <IconTikTok className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" />
          <span>
            <b className="text-slate-700">Số liệu TikTok chưa có:</b> TikTok chỉ cho đọc lượt xem, lượt thích của bài công khai,
            và cần thêm quyền <code>video.list</code>. Sẽ bổ sung khi app được TikTok duyệt và bài đăng công khai.
          </span>
        </p>
      </main>
    </>
  )
}

function O({ ten, giaTri, bieuTuong, phu }: { ten: string; giaTri: string; bieuTuong?: string; phu?: string }) {
  return (
    <div className="the p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        {bieuTuong} {ten}
      </div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{giaTri}</div>
      {phu && <div className="mt-0.5 text-xs font-medium text-slate-500">{phu}</div>}
    </div>
  )
}

const HUY_CHUONG = ['🥇', '🥈', '🥉']

function Dong({ x, hang, diemCao }: { x: BaiXepHang; hang: number; diemCao: number }) {
  const { bai, soLieu } = x
  return (
    <li className={`the flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:flex-nowrap ${x.dangLen ? 'ring-2 ring-orange-300' : ''}`}>
      <div className="w-8 shrink-0 text-center text-lg font-extrabold text-slate-400">
        {hang <= 3 && x.diem > 0 ? <span className="text-2xl">{HUY_CHUONG[hang - 1]}</span> : `#${hang}`}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urlAnh(bai, 160)} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-lg bg-slate-200 object-cover" loading="lazy" decoding="async" />

      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-center gap-1.5">
          {x.dangLen && <span className="chip bg-orange-100 text-orange-700">🔥 Đang lên</span>}
          <span className="line-clamp-2 text-sm font-bold leading-snug">{bai.tieu_de_anh}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span>{bai.nguon_ten}</span>
          <span suppressHydrationWarning title={bai.dang_luc ? gio(bai.dang_luc) : undefined}>
            · đăng {bai.dang_luc ? truoc(bai.dang_luc) : '?'}
          </span>
          {bai.tiktok_publish_id && (
            <span title="Cũng đã lên TikTok" className="flex items-center gap-0.5">
              · <IconTikTok className="h-3 w-3" /> TikTok
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full items-center gap-4 sm:w-auto">
        <div className="grid flex-1 grid-cols-4 gap-3 text-center text-sm sm:flex-none">
          <ChiSo ten="Cảm xúc" bieuTuong="❤️" giaTri={soLieu ? so(soLieu.camXuc) : '…'} />
          <ChiSo ten="Bình luận" bieuTuong="💬" giaTri={soLieu ? so(soLieu.binhLuan) : '…'} />
          <ChiSo ten="Chia sẻ" bieuTuong="↗️" giaTri={soLieu ? so(soLieu.chiaSe) : '…'} />
          <ChiSo ten="Lượt xem" bieuTuong="👁" giaTri={soLieu ? so(soLieu.luotXem) : '…'} />
        </div>

        <div className="w-24 shrink-0" title="Điểm = cảm xúc + 2 × bình luận + 3 × chia sẻ">
          <div className="text-right text-sm font-extrabold">{x.diem.toLocaleString('vi-VN')} điểm</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${x.dangLen ? 'bg-orange-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.round((x.diem / diemCao) * 100)}%` }}
            />
          </div>
        </div>

        {bai.fb_post_id && (
          <a
            href={`https://www.facebook.com/${bai.fb_post_id}`}
            target="_blank"
            rel="noreferrer"
            title="Xem trên Facebook"
            className="btn btn-nhat shrink-0 px-2 text-blue-600"
          >
            <IconFacebook /> <IconMo className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </li>
  )
}

function ChiSo({ ten, bieuTuong, giaTri }: { ten: string; bieuTuong: string; giaTri: string }) {
  return (
    <div title={ten} className="min-w-10">
      <div className="text-xs">{bieuTuong}</div>
      <div className="font-bold tabular-nums">{giaTri}</div>
    </div>
  )
}
