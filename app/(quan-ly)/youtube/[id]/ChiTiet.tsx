'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DuAnYT, TrangThaiDuAn, TrangThaiPhan } from '@/lib/youtube'
import type { LoiThoai } from '@/lib/ai'
import { thongBao } from '@/app/ThongBao'
import { IconChep, IconMo, IconXong, IconYouTube, Xoay } from '@/app/BieuTuong'
import { dungVideoYouTube, layTrangThaiYouTube, luuThongTinYouTube, vietPhanYouTube, xoaVideoYouTube } from '../actions'

const NGUOI: Record<string, string> = {
  meo: '🐱 Mèo Mun',
  robot: '🤖 Robot Bit',
  nguoi_phu_nu: '👩 Người phụ nữ',
  canh_sat: '👮 Cảnh sát',
  hacker: '🕵️ Hacker',
  doanh_nhan: '👔 Doanh nhân',
  nha_khoa_hoc: '🔬 Nhà khoa học',
  nguoi_dung: '🙂 Người dùng',
}

// Ước lượng độ dài theo số chữ (~14 ký tự mỗi giây + nghỉ giữa câu), giống lib/youtube.ts
const uocGiay = (loi: LoiThoai | null) => (loi ? loi.reduce((t, l) => t + l.chu.length / 14 + 0.25, 0) : 0)
const phutGiay = (giay: number) => `${Math.floor(giay / 60)}:${String(Math.round(giay % 60)).padStart(2, '0')}`

const NHAN: Record<TrangThaiPhan['loai'], [string, string]> = {
  chua_viet: ['Chưa viết', 'bg-slate-100 text-slate-500'],
  chua_dung: ['Chưa dựng', 'bg-slate-100 text-slate-600'],
  cho: ['Chờ máy nhà', 'bg-amber-100 text-amber-800'],
  dang_lam: ['Đang dựng', 'bg-violet-100 text-violet-700'],
  xong: ['Đã dựng', 'bg-emerald-100 text-emerald-700'],
  loi: ['Lỗi', 'bg-red-100 text-red-700'],
}

function NutChep({ chu, ten = 'Chép' }: { chu: string; ten?: string }) {
  const [da, setDa] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(chu).then(() => {
          setDa(true)
          setTimeout(() => setDa(false), 1500)
        })
      }
      className="btn btn-sm btn-nhat"
    >
      {da ? <IconXong className="h-3.5 w-3.5 text-emerald-600" /> : <IconChep className="h-3.5 w-3.5" />}
      {da ? 'Đã chép' : ten}
    </button>
  )
}

export default function ChiTiet({ dau, ttDau }: { dau: DuAnYT; ttDau: TrangThaiDuAn }) {
  const router = useRouter()
  const [d, setD] = useState(dau)
  const [tt, setTt] = useState(ttDau)
  const [dangViet, setDangViet] = useState<number | null>(null) // phần AI đang viết
  const [loiViet, setLoiViet] = useState('')
  const [dangLam, startTransition] = useTransition()
  const [tieuDe, setTieuDe] = useState(dau.tieu_de)
  const [moTa, setMoTa] = useState(dau.mo_ta)
  const [the, setThe] = useState(dau.the.join(', '))
  const daChay = useRef(false)

  const capNhatTt = async () => {
    const kq = await layTrangThaiYouTube(d.id)
    if (kq.ok) setTt(kq.tt)
  }

  // AI viết lần lượt các phần chưa có lời thoại (mỗi phần một lượt gọi để không quá thời gian của máy chủ)
  const vietCacPhan = async (chiPhan?: number) => {
    setLoiViet('')
    let moi = d
    for (let k = 1; k <= moi.phan.length; k++) {
      if (chiPhan ? k !== chiPhan : moi.phan[k - 1].loi) continue
      setDangViet(k)
      const kq = await vietPhanYouTube(moi.id, k)
      if (!kq.ok) {
        setLoiViet(kq.loi)
        break
      }
      moi = kq.duAn
      setD(moi)
    }
    setDangViet(null)
    await capNhatTt()
  }

  useEffect(() => {
    if (daChay.current) return
    daChay.current = true
    // Gọi sau lượt vẽ đầu (không đặt state ngay trong effect)
    if (dau.phan.some((p) => !p.loi)) setTimeout(() => void vietCacPhan(), 0)
    // Chỉ chạy một lần khi mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đang chờ / đang dựng / đã dựng đủ mà chưa ghép xong: hỏi lại trạng thái mỗi 8 giây
  const dangCho = tt.phan.some((p) => p.loai === 'cho' || p.loai === 'dang_lam') || (!tt.xong && tt.phan.length > 0 && tt.phan.every((p) => p.loai === 'xong'))
  useEffect(() => {
    if (!dangCho) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void capNhatTt()
    }, 8000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangCho])

  const daVietDu = d.phan.every((p) => p.loi)
  const soXong = tt.phan.filter((p) => p.loai === 'xong').length
  const tongGiay = d.phan.reduce((t, p) => t + uocGiay(p.loi), 0)
  const coViecDung = tt.phan.some((p) => p.loai === 'chua_dung' || p.loai === 'loi')
  // Mọi phần đã dựng mà chưa có video ghép (vd lần ghép trước lỗi): bấm Dựng để máy nhà ghép lại
  const choGhep = !tt.xong && tt.phan.length > 0 && tt.phan.every((p) => p.loai === 'xong')

  const dung = (chiPhan?: number) =>
    startTransition(async () => {
      const kq = await dungVideoYouTube(d.id, chiPhan)
      if (!kq.ok) return thongBao('loi', kq.loi)
      thongBao('ok', kq.so ? `Đã gửi ${kq.so} phần cho máy nhà dựng` : 'Không có phần nào cần dựng')
      await capNhatTt()
    })

  const luuThongTin = () =>
    startTransition(async () => {
      const ds = the.split(',').map((x) => x.trim()).filter(Boolean)
      const kq = await luuThongTinYouTube(d.id, { tieu_de: tieuDe, mo_ta: moTa, the: ds })
      if (!kq.ok) return thongBao('loi', kq.loi)
      setD({ ...d, tieu_de: tieuDe, mo_ta: moTa, the: ds })
      thongBao('ok', 'Đã lưu tiêu đề, mô tả, thẻ')
    })

  const xoa = () => {
    if (!confirm('Xoá video này khỏi trang? Video đã dựng trên máy nhà vẫn giữ nguyên.')) return
    startTransition(async () => {
      const kq = await xoaVideoYouTube(d.id)
      if (!kq.ok) return thongBao('loi', kq.loi)
      router.push('/youtube')
    })
  }

  const doiThongTin = tieuDe !== d.tieu_de || moTa !== d.mo_ta || the !== d.the.join(', ')

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/youtube" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            ← Video YouTube
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold leading-snug tracking-tight">{d.tieu_de}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {d.phan.length} phần · {daVietDu ? `dài khoảng ${phutGiay(tongGiay)} phút` : `dự kiến ${d.phut} phút`} · khung ngang 16:9
          </p>
        </div>
        <button type="button" onClick={xoa} disabled={dangLam} className="btn btn-sm btn-nhat text-red-600">
          Xoá video
        </button>
      </div>

      {tt.mayNha && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">⚠ {tt.mayNha}. Mở máy nhà và chạy chay-vieneu.bat thì mới dựng được video.</p>}

      {/* Dựng video + tiến độ chung */}
      <section className="the grid gap-3 p-5">
        {tt.xong ? (
          <div className="grid gap-2">
            <p className="flex items-center gap-2 text-base font-bold text-emerald-700">
              <IconXong className="h-5 w-5" /> Video đã dựng xong
            </p>
            <p className="text-sm text-slate-600">Video nằm trên máy nhà, tại:</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 break-all rounded-lg bg-slate-100 px-3 py-2 text-sm">{tt.xong.tep}</code>
              <NutChep chu={tt.xong.tep} ten="Chép đường dẫn" />
            </div>
            <p className="text-xs text-slate-500">Mở thư mục Desktop → Video-YouTube trên máy nhà để thấy video. Sửa lời thoại một phần thì chỉ phần đó dựng lại.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">Dựng video</p>
                <p className="text-sm text-slate-500">
                  {!daVietDu ? 'Chờ AI viết xong lời thoại các phần' : soXong ? `Đã dựng ${soXong}/${d.phan.length} phần` : 'Máy nhà đọc giọng và dựng hình lần lượt từng phần, rồi ghép thành một video'}
                </p>
              </div>
              <button type="button" onClick={() => dung()} disabled={dangLam || !daVietDu || !!dangViet || !(coViecDung || choGhep)} className="btn bg-red-600 px-5 py-2.5 text-white hover:bg-red-700">
                {dangLam ? <Xoay /> : <IconYouTube className="h-4 w-4" />}
                {!coViecDung && !choGhep && tt.phan.some((p) => p.loai === 'cho' || p.loai === 'dang_lam') ? 'Đang dựng…' : soXong || tt.phan.some((p) => p.loai === 'cho' || p.loai === 'dang_lam') ? 'Dựng các phần còn lại' : 'Dựng video'}
              </button>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-700"
                style={{
                  width: `${Math.round(
                    ((soXong + tt.phan.reduce((t, p) => t + (p.loai === 'dang_lam' ? p.phanTram / 100 : 0), 0)) / Math.max(1, d.phan.length)) * 100,
                  )}%`,
                }}
              />
            </div>
            {soXong === d.phan.length && !tt.xong && (
              <p className="flex items-center gap-2 text-sm text-violet-700">
                <Xoay /> Đang ghép các phần thành một video…
              </p>
            )}
            <p className="text-xs text-slate-400">
              Mỗi phần khoảng {Math.round(d.phut / d.phan.length)} phút video có thể mất 20–60 phút dựng tuỳ máy. Có thể đóng trang, máy nhà vẫn làm tiếp; video TikTok vẫn được ưu tiên làm trước.
            </p>
          </>
        )}
      </section>

      {/* Tiêu đề, mô tả, thẻ để đăng YouTube */}
      <section className="the grid gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Thông tin đăng YouTube</h2>
          <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="btn btn-sm bg-red-600 text-white hover:bg-red-700">
            <IconMo className="h-3.5 w-3.5" /> Mở YouTube Studio
          </a>
        </div>
        <label className="grid">
          <span className="label">
            Tiêu đề ({tieuDe.length}/100) <NutChep chu={tieuDe} />
          </span>
          <input value={tieuDe} maxLength={100} onChange={(e) => setTieuDe(e.target.value)} className="input" />
        </label>
        <label className="grid">
          <span className="label">
            Mô tả <NutChep chu={moTa} />
          </span>
          <textarea value={moTa} rows={4} maxLength={5000} onChange={(e) => setMoTa(e.target.value)} className="input" />
        </label>
        <label className="grid">
          <span className="label">
            Thẻ (cách nhau dấu phẩy) <NutChep chu={the} />
          </span>
          <input value={the} onChange={(e) => setThe(e.target.value)} className="input" />
        </label>
        {doiThongTin && (
          <button type="button" onClick={luuThongTin} disabled={dangLam} className="btn btn-phu justify-self-start">
            Lưu thay đổi
          </button>
        )}
        <p className="text-xs text-slate-400">
          Trong YouTube Studio bấm Tạo → Tải video lên, chọn video trong thư mục Video-YouTube, dán tiêu đề, mô tả, thẻ (mục Hiện thêm), chọn &quot;Không, nội dung này không dành cho trẻ em&quot; rồi Xuất bản.
        </p>
      </section>

      {/* Các phần */}
      <section className="grid gap-3">
        <h2 className="font-bold">Kịch bản</h2>
        {dangViet && (
          <p className="flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-700 ring-1 ring-violet-200">
            <Xoay /> AI đang viết lời thoại phần {dangViet}/{d.phan.length}… (mỗi phần khoảng 1 phút, giữ trang này mở)
          </p>
        )}
        {loiViet && (
          <p className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {loiViet}
            <button type="button" onClick={() => vietCacPhan()} className="btn btn-sm btn-phu">
              Viết tiếp
            </button>
          </p>
        )}
        {d.phan.map((p, i) => {
          const k = i + 1
          const tp = tt.phan[i] ?? { loai: 'chua_viet' }
          const [nhan, mau] = NHAN[tp.loai]
          const khoa = !!dangViet || dangLam
          return (
            <article key={k} className="the grid gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-red-600">Phần {k}</span>
                <h3 className="min-w-0 flex-1 font-bold">{p.tieu_de}</h3>
                <span className={`chip ${mau}`}>
                  {tp.loai === 'dang_lam' ? `${nhan} ${tp.phanTram}%` : dangViet === k ? 'AI đang viết…' : nhan}
                </span>
              </div>
              <p className="text-sm text-slate-600">{p.noi_dung}</p>
              {tp.loai === 'dang_lam' && <p className="text-xs text-violet-700">{tp.buoc}</p>}
              {tp.loai === 'loi' && <p className="text-xs text-red-600">Lỗi: {tp.loi}</p>}
              {p.loi && (
                <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-600">
                    Xem lời thoại ({p.loi.length} câu, ~{phutGiay(uocGiay(p.loi))} phút)
                  </summary>
                  <ol className="mt-2 grid gap-1.5 text-sm">
                    {p.loi.map((l, j) => (
                      <li key={j} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2">
                        <span className="truncate text-xs font-semibold leading-5 text-slate-500">{NGUOI[l.ai] ?? l.ai}</span>
                        <span>{l.chu}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <div className="flex flex-wrap gap-2">
                {p.loi && (
                  <button
                    type="button"
                    disabled={khoa || tp.loai === 'cho' || tp.loai === 'dang_lam'}
                    onClick={() => confirm(`AI viết lại lời thoại phần ${k}? Phần này sẽ phải dựng lại.`) && vietCacPhan(k)}
                    className="btn btn-sm btn-phu"
                  >
                    AI viết lại phần này
                  </button>
                )}
                {tp.loai === 'loi' && (
                  <button type="button" disabled={khoa} onClick={() => dung(k)} className="btn btn-sm btn-phu">
                    Dựng lại phần này
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
