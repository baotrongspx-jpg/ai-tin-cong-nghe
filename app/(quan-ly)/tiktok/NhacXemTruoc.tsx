'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { chonNhacBai, xinLinkNgheNhac, xoaNhacNen } from '@/app/actions'
import { thongBao } from '@/app/ThongBao'
import { IconXoa } from '@/app/BieuTuong'

// Chỉnh nhạc nền nghe ngay: video trong kho không có nhạc, trình duyệt phát bản nhạc song song khớp thời gian với video
// đang xem trước. Đổi bản nhạc / kéo âm lượng là nghe ngay, không dựng lại video; bấm Lưu thì lúc đăng sẽ trộn đúng như vậy.
export default function NhacXemTruoc({
  baiId,
  ds,
  chonDau,
  amLuongDau,
  tuChon,
  videoEl,
}: {
  baiId: string
  ds: string[] // các bản nhạc trong kho
  chonDau: string // lựa chọn đã lưu: 'tu_dong' | 'khong' | tên bản
  amLuongDau: number // % so với giọng đọc
  tuChon: { ten: string; url: string } | null // bản máy chủ đang dùng cho bài (trả kèm lúc Xem trước)
  videoEl: HTMLVideoElement | null // video xem trước đang hiện
}) {
  // Bản đã lưu mà bị xóa khỏi kho thì coi như Tự chọn (máy chủ cũng làm vậy)
  const dauHopLe = ds.includes(chonDau) || chonDau === 'khong' ? chonDau : 'tu_dong'
  const [chon, setChon] = useState(dauHopLe)
  const [amLuong, setAmLuong] = useState(amLuongDau)
  const [daLuu, setDaLuu] = useState({ chon: dauHopLe, amLuong: amLuongDau })
  const [dsLink, setDsLink] = useState<Record<string, string | null>>({})
  const [dangLuu, startLuu] = useTransition()
  const nhacRef = useRef<HTMLAudioElement>(null)

  // Bản cần phát: 'khong' → không; 'tu_dong' → bản máy chủ tự chọn (chỉ biết khi lựa chọn đã lưu cũng là tự chọn); tên → bản đó
  const tenPhat = chon === 'khong' ? null : chon === 'tu_dong' ? (daLuu.chon === 'tu_dong' ? (tuChon?.ten ?? null) : null) : chon
  // Link nghe các bản đã xin (tên → link tạm), bản máy chủ trả kèm thì dùng luôn
  const urlNhac = !tenPhat ? null : tuChon?.ten === tenPhat ? tuChon.url : (dsLink[tenPhat] ?? null)
  const canXin = tenPhat && !urlNhac && !(tenPhat in dsLink) ? tenPhat : null
  useEffect(() => {
    if (!canXin) return
    xinLinkNgheNhac(canXin).then((kq) => setDsLink((d) => ({ ...d, [canXin]: kq.url ?? null })))
  }, [canXin])

  // Phát / dừng / tua nhạc theo video (nhạc lặp lại nếu ngắn hơn video)
  useEffect(() => {
    const v = videoEl
    const a = nhacRef.current
    if (!v || !a) return
    const dongBo = () => {
      if (a.duration) a.currentTime = v.currentTime % a.duration
    }
    const phat = () => {
      dongBo()
      if (urlNhac) a.play().catch(() => {})
    }
    const dung = () => a.pause()
    v.addEventListener('play', phat)
    v.addEventListener('pause', dung)
    v.addEventListener('seeked', dongBo)
    v.addEventListener('ended', dung)
    if (!v.paused) phat()
    return () => {
      v.removeEventListener('play', phat)
      v.removeEventListener('pause', dung)
      v.removeEventListener('seeked', dongBo)
      v.removeEventListener('ended', dung)
      a.pause()
    }
  }, [videoEl, urlNhac])

  useEffect(() => {
    if (nhacRef.current) nhacRef.current.volume = Math.min(1, amLuong / 100)
  }, [amLuong, urlNhac])

  const thayDoi = chon !== daLuu.chon || amLuong !== daLuu.amLuong
  const luu = () =>
    startLuu(async () => {
      const kq = await chonNhacBai(baiId, chon, amLuong)
      if (kq.ok) {
        setDaLuu({ chon, amLuong })
        thongBao('ok', 'Đã lưu nhạc nền cho bài này, lúc đăng sẽ trộn đúng như vậy')
      } else thongBao('loi', kq.loi ?? 'Không lưu được nhạc')
    })

  const [dangXoa, startXoa] = useTransition()
  const xoa = () => {
    if (!confirm(`Xóa hẳn bản nhạc "${chon}" khỏi kho? Các bài đang dùng bản này sẽ chuyển về Tự chọn.`)) return
    const ten = chon
    startXoa(async () => {
      const kq = await xoaNhacNen(ten)
      if (kq.ok) {
        setChon('tu_dong')
        setDaLuu((d) => ({ ...d, chon: 'tu_dong' })) // bản đã xóa thì máy chủ cũng tự chọn bản khác
        thongBao('ok', `Đã xóa nhạc ${ten}`)
      } else thongBao('loi', kq.loi ?? 'Không xóa được nhạc')
    })
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-1.5 rounded-xl bg-violet-50 p-2.5 ring-1 ring-violet-200">
      <div className="flex items-center justify-between text-xs font-semibold text-violet-800">
        <label htmlFor={`nhac-${baiId}`}>🎵 Nhạc nền</label>
        {thayDoi && <span className="text-amber-600">chưa lưu</span>}
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <select
          id={`nhac-${baiId}`}
          value={chon}
          onChange={(e) => setChon(e.target.value)}
          className="w-full min-w-0 flex-1 truncate rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm text-slate-800"
        >
          <option value="tu_dong">🎵 Tự chọn</option>
          {ds.map((ten) => (
            <option key={ten} value={ten}>
              {ten.replace(/\.[^.]+$/, '')}
            </option>
          ))}
          <option value="khong">🔇 Không nhạc</option>
        </select>
        {/* Xóa hẳn bản nhạc đang chọn khỏi kho (mọi bài đang dùng bản này sẽ chuyển về Tự chọn) */}
        <button
          type="button"
          disabled={!ds.includes(chon) || dangXoa}
          onClick={xoa}
          title="Xóa bản nhạc này khỏi kho"
          aria-label="Xóa bản nhạc này khỏi kho"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-30"
        >
          <IconXoa className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">🔊</span>
        <input
          type="range"
          min={0}
          max={40}
          step={1}
          value={amLuong}
          disabled={chon === 'khong'}
          onChange={(e) => setAmLuong(Number(e.target.value))}
          aria-label="Âm lượng nhạc nền"
          className="min-w-0 flex-1 accent-violet-600"
        />
        <span className="w-12 text-right text-xs font-semibold text-violet-800">{amLuong}%</span>
      </div>
      <button type="button" disabled={!thayDoi || dangLuu} onClick={luu} className="btn btn-phu w-full text-xs">
        💾 Lưu nhạc cho bài này
      </button>
      <p className="text-xs text-violet-700">
        {videoEl
          ? chon === 'tu_dong' && daLuu.chon !== 'tu_dong'
            ? 'Bấm Lưu để nghe bản tự chọn cùng video.'
            : 'Đang phát cùng video: chỉnh là nghe ngay.'
          : 'Bấm Xem trước video để nghe nhạc cùng video.'}
      </p>
      <audio ref={nhacRef} src={urlNhac ?? undefined} loop preload="auto" />
    </div>
  )
}
