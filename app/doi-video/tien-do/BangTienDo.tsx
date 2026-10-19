'use client'

import { useEffect, useRef, useState } from 'react'
import { NHAN_TRANG_THAI, NHAN_VAI, VONG_TO, type DongNhatKy, type TongHop, type ViecTomTat } from './kieu'

const DUONG_DOC = '/doi-video/tien-do/su-kien'
const CHU_KY_MS = 5000

const LENH_MAU =
  'node cong-cu/bao-tien-do.mjs --du-an ten-du-an --viec "Việc 1 · Tên việc" --to lap-trinh-web --nguoi lap-trinh-web --trang-thai dang-lam'

export default function BangTienDo({ dauVao, loiBanDau, lopTieuDe }: { dauVao: TongHop; loiBanDau: boolean; lopTieuDe: string }) {
  const [duLieu, setDuLieu] = useState(dauVao)
  const [matKetNoi, setMatKetNoi] = useState(loiBanDau)
  // Dự án người xem chọn; null = để máy chủ chọn dự án có sự kiện mới nhất
  const [chon, setChon] = useState<string | null>(dauVao.duAn)
  // Bản JSON lần trước: chỉ đổi state khi dữ liệu thật sự khác, để aria-live không đọc lại mỗi 5 giây
  const lanTruoc = useRef(JSON.stringify(dauVao))
  const lanDau = useRef(true)

  useEffect(() => {
    let hen: number | undefined
    let dieuKhien: AbortController | null = null

    const tai = async () => {
      dieuKhien?.abort()
      const dk = new AbortController()
      dieuKhien = dk
      try {
        const dia = chon ? `${DUONG_DOC}?duAn=${encodeURIComponent(chon)}` : DUONG_DOC
        const res = await fetch(dia, { cache: 'no-store', signal: dk.signal })
        if (!res.ok) throw new Error(String(res.status))
        const chu = await res.text()
        setMatKetNoi(false)
        if (chu !== lanTruoc.current) {
          lanTruoc.current = chu
          setDuLieu(JSON.parse(chu) as TongHop)
        }
      } catch {
        if (!dk.signal.aborted) setMatKetNoi(true) // giữ dữ liệu cũ
      }
    }
    const batDau = () => {
      if (hen === undefined) hen = window.setInterval(tai, CHU_KY_MS)
    }
    const dung = () => {
      window.clearInterval(hen)
      hen = undefined
      dieuKhien?.abort()
    }
    const doiTab = () => {
      if (document.visibilityState === 'visible') {
        void tai()
        batDau()
      } else dung()
    }

    // Lần đầu đã có dữ liệu từ máy chủ; đổi dự án thì tải ngay
    if (lanDau.current) lanDau.current = false
    else if (document.visibilityState === 'visible') void tai()
    if (document.visibilityState === 'visible') batDau()
    document.addEventListener('visibilitychange', doiTab)
    return () => {
      dung()
      document.removeEventListener('visibilitychange', doiTab)
    }
  }, [chon])

  const doiDuAn = (ma: string) => {
    setChon(ma)
    const dia = new URL(window.location.href)
    dia.searchParams.set('duAn', ma)
    window.history.replaceState(null, '', dia)
  }

  const dongMatKetNoi = (
    <p className="dv-td-mat" role="status">
      {matKetNoi ? 'Mất kết nối, đang thử lại…' : ''}
    </p>
  )

  if (!duLieu.duAnDaCo.length) {
    return (
      <>
        {dongMatKetNoi}
        {matKetNoi ? null : (
          <section className="dv-td-rong" aria-labelledby="chua-co">
            <h2 id="chua-co" className={`dv-muc ${lopTieuDe}`}>Chưa có việc nào được báo tiến độ</h2>
            <p>
              Để bắt đầu, mở thư mục đội (<code translate="no">doi-video-quang-cao</code>) và chạy lệnh mẫu dưới đây. Đổi tên dự án, việc, tổ
              và người cho đúng. Trang sẽ tự hiện việc trong khoảng 5 giây.
            </p>
            <pre className="dv-td-lenh" translate="no">
              <code>{LENH_MAU}</code>
            </pre>
            <p className="dv-giai">
              Xem đủ tham số bằng <code translate="no">node cong-cu/bao-tien-do.mjs --giup</code>.
            </p>
          </section>
        )}
      </>
    )
  }

  const giaTriChon = chon && duLieu.duAnDaCo.includes(chon) ? chon : (duLieu.duAn ?? '')
  const dangChay = duLieu.viec.filter((v) => v.trangThai !== 'xong')
  const daXong = duLieu.viec.filter((v) => v.trangThai === 'xong')

  return (
    <>
      <div className="dv-td-thanh-tren">
        <div className="dv-td-chon">
          <label htmlFor="chon-du-an">Dự án</label>
          <select id="chon-du-an" name="duAn" value={giaTriChon} onChange={(e) => doiDuAn(e.target.value)} translate="no">
            {duLieu.duAnDaCo.map((ma) => (
              <option key={ma} value={ma}>
                {ma}
              </option>
            ))}
          </select>
        </div>
        {dongMatKetNoi}
      </div>

      <section aria-labelledby="tong-tien-do">
        <h2 id="tong-tien-do" className={`dv-muc ${lopTieuDe}`}>Tiến độ dự án</h2>
        <div aria-live="polite">
          <p className="dv-td-so">
            <b>{duLieu.phanTram}%</b> · {duLieu.viec.length} việc, {daXong.length} đã xong
          </p>
          <div
            className="dv-td-thanh"
            role="progressbar"
            aria-label={`Tiến độ dự án ${duLieu.duAn ?? ''}`}
            aria-valuenow={duLieu.phanTram}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${duLieu.phanTram}%`}
          >
            <span style={{ width: `${duLieu.phanTram}%` }} />
          </div>
        </div>
      </section>

      <section aria-labelledby="dang-chay">
        <h2 id="dang-chay" className={`dv-muc ${lopTieuDe}`}>Các việc đang chạy</h2>
        {dangChay.length ? (
          <ul className="dv-td-ds" aria-live="polite">
            {dangChay.map((v) => (
              <TheViec key={v.viec} v={v} />
            ))}
          </ul>
        ) : (
          <p className="dv-giai">Không còn việc nào đang chạy.</p>
        )}
      </section>

      {daXong.length ? (
        <section aria-labelledby="da-xong">
          <h2 id="da-xong" className={`dv-muc ${lopTieuDe}`}>Đã xong</h2>
          <ul className="dv-td-ds" aria-live="polite">
            {daXong.map((v) => (
              <TheViec key={v.viec} v={v} />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="nhat-ky">
        <h2 id="nhat-ky" className={`dv-muc ${lopTieuDe}`}>Nhật ký</h2>
        <ol className="dv-td-nhat-ky" aria-live="polite">
          {duLieu.nhatKy.map((d, i) => (
            <DongKy key={`${d.luc}-${d.nguoi}-${i}`} d={d} />
          ))}
        </ol>
      </section>
    </>
  )
}

function TheViec({ v }: { v: ViecTomTat }) {
  const ket = v.trangThai === 'ket'
  return (
    <li className={ket ? 'dv-td-viec dv-td-ket' : 'dv-td-viec'}>
      <div className="dv-the-dau">
        <h3>{v.viec}</h3>
        <span className={`dv-chip dv-td-tt-${v.trangThai}`}>
          {ket ? <span aria-hidden>⚠ </span> : null}
          {NHAN_TRANG_THAI[v.trangThai]}
        </span>
      </div>
      <p className="dv-to">
        Tổ: <span translate="no">{v.to}</span> · Người báo: <span translate="no">{v.nguoi}</span>
        {v.phanTram !== null ? <> · {v.phanTram}%</> : null}
      </p>
      <ol className="dv-td-vong" aria-label="Vòng tổ">
        {VONG_TO.map((vai) => {
          const hienTai = vai === v.vai
          return (
            <li key={vai} className={hienTai ? 'dv-td-buoc dv-td-hien-tai' : 'dv-td-buoc'} aria-current={hienTai ? 'step' : undefined}>
              {hienTai ? <span aria-hidden>▶ </span> : null}
              {NHAN_VAI[vai]}
              {hienTai ? <em> · đang ở đây</em> : null}
            </li>
          )
        })}
      </ol>
      {v.ghiChu ? <p className="dv-td-ghi-chu">{v.ghiChu}</p> : null}
      <p className="dv-td-gio">
        Cập nhật <time dateTime={v.luc}>{v.gio}</time>
      </p>
    </li>
  )
}

function DongKy({ d }: { d: DongNhatKy }) {
  return (
    <li className={d.trangThai === 'ket' ? 'dv-td-dong dv-td-ket' : 'dv-td-dong'}>
      <time dateTime={d.luc} className="dv-td-gio">
        {d.gio}
      </time>
      <span className="dv-td-nguoi" translate="no">
        {d.nguoi}
      </span>
      <span className="dv-td-ten-viec">{d.viec}</span>
      <span className={`dv-td-nhan dv-td-tt-${d.trangThai}`}>
        {NHAN_TRANG_THAI[d.trangThai]}
        {d.phanTram !== null ? ` · ${d.phanTram}%` : ''}
      </span>
      {d.ghiChu ? <span className="dv-td-ghi-chu">{d.ghiChu}</span> : null}
    </li>
  )
}
