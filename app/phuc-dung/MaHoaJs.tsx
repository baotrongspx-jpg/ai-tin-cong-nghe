'use client'

import { useRef, useState } from 'react'
import { coQuyen } from './ThuVien'

// Chuyển video thành code JS ngay trên trình duyệt, cùng định dạng với VIDEO_JS_TOOL trên máy:
// mỗi 8 giây = doan_XXX.js gọi VIDEO_CODE.add({ fps, audio: WAV base64, frames: [JPG base64] }),
// danh_sach.js = VIDEO_CODE.setInfo({...}), index.html = trình phát đọc các tệp .js.
// Tệp ghi thẳng vào thư mục người dùng chọn (File System Access API, có trên Chrome / Edge máy tính).

declare global {
  interface Window {
    showDirectoryPicker?: (o?: { mode?: 'read' | 'readwrite'; id?: string }) => Promise<FileSystemDirectoryHandle>
  }
}

const DO_DAI = 8

type TuyChon = { rong: number; chatLuong: number }
type KhungTho = { t: number; b64: Promise<string> }

function slug(ten: string) {
  return (
    ten
      .replace(/\.[^.]+$/, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50)
      .replace(/_+$/, '') || 'video'
  )
}

function blobSangB64(b: Blob): Promise<string> {
  return new Promise((ok, loi) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result).split(',')[1] ?? '')
    r.onerror = () => loi(r.error)
    r.readAsDataURL(b)
  })
}

function anhB64(c: HTMLCanvasElement, chatLuong: number): Promise<string> {
  // toBlob chụp lại canvas ngay lúc gọi → vẽ khung kế tiếp lên cùng canvas vẫn an toàn
  return new Promise((ok, loi) =>
    c.toBlob((b) => (b ? blobSangB64(b).then(ok, loi) : loi(new Error('Không nén được ảnh'))), 'image/jpeg', chatLuong),
  )
}

// Cắt [bd, kt) giây của âm thanh thành tệp WAV 16-bit, trả về base64
function wavB64(am: AudioBuffer, bd: number, kt: number) {
  const rate = am.sampleRate
  const tu = Math.min(Math.round(bd * rate), am.length)
  const den = Math.min(Math.round(kt * rate), am.length)
  const kenh = Math.min(2, am.numberOfChannels)
  const n = den - tu
  const buf = new ArrayBuffer(44 + n * kenh * 2)
  const dv = new DataView(buf)
  const ghi = (o: number, s: string) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)))
  ghi(0, 'RIFF'); dv.setUint32(4, 36 + n * kenh * 2, true); ghi(8, 'WAVE'); ghi(12, 'fmt ')
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, kenh, true); dv.setUint32(24, rate, true)
  dv.setUint32(28, rate * kenh * 2, true); dv.setUint16(32, kenh * 2, true); dv.setUint16(34, 16, true)
  ghi(36, 'data'); dv.setUint32(40, n * kenh * 2, true)
  const kenhDL = Array.from({ length: kenh }, (_, k) => am.getChannelData(k))
  let o = 44
  for (let i = tu; i < den; i++)
    for (let k = 0; k < kenh; k++) {
      const s = Math.max(-1, Math.min(1, kenhDL[k][i]))
      dv.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      o += 2
    }
  const bytes = new Uint8Array(buf)
  let nhiPhan = ''
  for (let i = 0; i < bytes.length; i += 0x8000) nhiPhan += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(nhiPhan)
}

async function ghiTep(thuMuc: FileSystemDirectoryHandle, ten: string, phan: string[]) {
  const w = await (await thuMuc.getFileHandle(ten, { create: true })).createWritable()
  for (const p of phan) await w.write(p)
  await w.close()
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function MaHoaJs({ thuMuc, onDoiThuMuc, onDaGhi, onXong }: {
  thuMuc: FileSystemDirectoryHandle | null
  onDoiThuMuc: (h: FileSystemDirectoryHandle) => void
  onDaGhi?: () => void
  onXong?: (thuMuc: FileSystemDirectoryHandle) => void
}) {
  const [ketQua, setKetQua] = useState<FileSystemDirectoryHandle | null>(null)
  const [tep, setTep] = useState<File | null>(null)
  const [tuyChon, setTuyChon] = useState<TuyChon>({ rong: 0, chatLuong: 0.85 })
  const [chay, setChay] = useState(false)
  const [tienDo, setTienDo] = useState('')
  const [nhatKy, setNhatKy] = useState<string[]>([])
  const [loi, setLoi] = useState('')
  const xem = useRef<HTMLDivElement>(null)
  const dung = useRef(false)
  const coHoTro = typeof window !== 'undefined' && !!window.showDirectoryPicker && 'requestVideoFrameCallback' in HTMLVideoElement.prototype

  const ghiNhatKy = (s: string) => setNhatKy((ds) => [...ds.slice(-200), s])

  async function batDau() {
    if (!tep || !window.showDirectoryPicker) return
    setLoi('')
    setNhatKy([])
    setKetQua(null)
    // Đã có thư mục lưu thì ghi luôn vào đó, chưa có (hoặc chưa được phép) thì hỏi
    let goc = thuMuc && (await coQuyen(thuMuc, true).catch(() => false)) ? thuMuc : null
    if (!goc) {
      try {
        goc = await window.showDirectoryPicker({ mode: 'readwrite', id: 'video-js' })
      } catch {
        return // người dùng bấm hủy
      }
      onDoiThuMuc(goc)
    }
    setChay(true)
    dung.current = false
    const v = document.createElement('video')
    try {
      await chayMaHoa(goc, v)
    } catch (e) {
      setLoi((e as Error).message)
    }
    v.pause()
    URL.revokeObjectURL(v.src)
    v.remove()
    setChay(false)
  }

  async function chayMaHoa(goc: FileSystemDirectoryHandle, v: HTMLVideoElement) {
    const f = tep!
    const ten = slug(f.name)
    // Thư mục lưu đang là chính thư mục của video này (chọn nhầm vào trong) → ghi thẳng vào đó, không lồng thêm cấp
    const thuMuc = goc.name === ten ? goc : await goc.getDirectoryHandle(ten, { create: true })
    // Kiểu TypeScript chưa có keys() của thư mục
    const tenCu: string[] = []
    for await (const t of (thuMuc as unknown as { keys(): AsyncIterable<string> }).keys()) tenCu.push(t)
    const soCu = tenCu.filter((t) => /^doan_\d+\.js$/.test(t)).map((t) => Number(t.slice(5, 8))).sort((a, b) => a - b)
    // Lần trước dừng giữa chừng (chưa có danh_sach.js, hoặc có nhưng ghi "chua_xong") → hỏi làm tiếp
    let xongCu = false
    if (tenCu.includes('danh_sach.js')) {
      const t = await (await (await thuMuc.getFileHandle('danh_sach.js')).getFile()).text()
      xongCu = !t.includes('"chua_xong":true')
    }
    let soDaCo = 0
    while (soDaCo < soCu.length && soCu[soDaCo] === soDaCo + 1) soDaCo++ // các đoạn liền nhau từ 1
    const lamTiep =
      soDaCo > 0 &&
      !xongCu &&
      confirm(`Thư mục "${ten}" đã có ${soDaCo} đoạn từ lần trước (dừng giữa chừng).\n\nOK = làm tiếp từ đoạn ${soDaCo + 1}\nHủy = làm lại từ đầu`)
    const batDauDoan = lamTiep ? soDaCo : 0
    for (const t of tenCu) if (/^doan_\d+\.js$/.test(t) && Number(t.slice(5, 8)) > batDauDoan) await thuMuc.removeEntry(t)

    setTienDo('Đang tách âm thanh (video dài sẽ mất chút thời gian)…')
    let am: AudioBuffer | null = null
    try {
      const ctx = new AudioContext({ sampleRate: 44100 })
      am = await ctx.decodeAudioData(await f.arrayBuffer())
      await ctx.close()
    } catch {
      ghiNhatKy('Không tách được âm thanh (video không có tiếng hoặc quá lớn) → mã hóa chỉ phần hình.')
    }

    v.muted = true
    v.playsInline = true
    v.className = 'w-full max-w-md rounded-lg'
    v.src = URL.createObjectURL(f)
    xem.current?.replaceChildren(v)
    await new Promise<void>((ok, loi) => {
      v.onloadeddata = () => ok()
      v.onerror = () => loi(new Error('Trình duyệt không đọc được video này (thử tệp .mp4).'))
    })

    const rong = tuyChon.rong ? Math.min(tuyChon.rong, v.videoWidth) : v.videoWidth
    const cao = Math.round((v.videoHeight * rong) / v.videoWidth / 2) * 2
    const canvas = document.createElement('canvas')
    canvas.width = rong
    canvas.height = cao
    const g = canvas.getContext('2d')!
    const tong = Math.ceil(v.duration / DO_DAI)

    const cho: KhungTho[] = []
    const moc: number[] = []
    let fps = 0
    let doan = batDauDoan
    let khungDau = -1 // tính khi đã biết fps (làm tiếp thì cộng cả các đoạn cũ)
    let tongMB = 0
    const daGhi: { file: string; segment: number; start_sec: number; end_sec: number; frame_count: number; size_mb: number }[] = []
    let hangGhi = Promise.resolve()
    let loiGhi: Error | null = null
    let xongPhat = () => {}

    // Tính số khung/giây từ thời điểm thật của các khung đầu tiên
    const doFps = () => {
      const d = moc.slice(1).map((t, i) => t - moc[i]).filter((x) => x > 0).sort((a, b) => a - b)
      const giua = d[Math.floor(d.length / 2)] || 1 / 30
      return Math.round(1000 / giua) / 1000
    }

    const ghiDoan = (so: number, ds: KhungTho[]) => {
      const bd = (so - 1) * DO_DAI
      const kt = Math.min(so * DO_DAI, v.duration)
      const soKhung = Math.max(1, Math.round((kt - bd) * fps))
      hangGhi = hangGhi.then(async () => {
        if (loiGhi) return
        if (khungDau < 0) khungDau = batDauDoan * Math.round(DO_DAI * fps)
        // Khung bị trình duyệt bỏ qua → lấy khung gần nhất trước đó để giữ đúng nhịp thời gian
        const anh = await Promise.all(ds.map((k) => k.b64))
        const viTri = ds.map((k) => Math.round((k.t - bd) * fps))
        const frames: string[] = []
        let j = 0
        for (let i = 0; i < soKhung; i++) {
          while (j + 1 < viTri.length && viTri[j + 1] <= i) j++
          frames.push(anh[j] ?? anh[0] ?? '')
        }
        const ten = `doan_${String(so).padStart(3, '0')}.js`
        const dau = JSON.stringify({ segment: so, start_sec: +bd.toFixed(4), end_sec: +kt.toFixed(4), first_frame: khungDau, fps, audio: am ? wavB64(am, bd, kt) : null })
        const phan = [`VIDEO_CODE.add(${dau.slice(0, -1)}, "frames": [`]
        frames.forEach((b, i) => phan.push(`${i ? ', ' : ''}"${b}"`))
        phan.push(']});\n')
        await ghiTep(thuMuc, ten, phan)
        const mb = phan.reduce((s, p) => s + p.length, 0) / 1_048_576
        tongMB += mb
        daGhi.push({ file: ten, segment: so, start_sec: +bd.toFixed(4), end_sec: +kt.toFixed(4), frame_count: frames.length, size_mb: +mb.toFixed(2) })
        khungDau += frames.length
        ghiNhatKy(`${ten}  ${mmss(bd)} → ${mmss(kt)}  ${frames.length} khung hình  ${mb.toFixed(1)} MB  (${so}/${tong})`)
      }).catch((e) => {
        // Ghi lỗi (đầy ổ, mất quyền…) → dừng ngay và báo, không chạy tiếp vô ích
        loiGhi = new Error(`Không ghi được đoạn ${so}: ${(e as Error).message}`)
        dung.current = true
        v.pause()
        xongPhat()
      })
    }

    setTienDo('Đang mã hóa… giữ tab này mở (chuyển tab khác video sẽ tạm dừng).')
    // Tab bị ẩn / cửa sổ bị thu nhỏ hoặc che kín → trình duyệt ngừng đưa khung hình, nên tạm dừng và báo rõ
    const anTab = () => {
      if (document.hidden) {
        v.pause()
        setTienDo(`⏸ Tạm dừng ở ${mmss(v.currentTime)} vì cửa sổ trình duyệt bị ẩn / thu nhỏ / bị che. Mở lại cửa sổ này là chạy tiếp.`)
        ghiNhatKy(`⏸ Tạm dừng ở ${mmss(v.currentTime)} (cửa sổ bị ẩn)`)
      } else if (!dung.current) v.play()
    }
    document.addEventListener('visibilitychange', anTab)

    // Canh chừng: tab đang hiện mà quá 6 giây không có khung mới → đẩy video chạy tiếp; quá 60 giây → báo lỗi
    let lanCuoi = Date.now()
    let daDay = 0
    const canh = setInterval(() => {
      if (document.hidden || dung.current || v.ended) return void (lanCuoi = Date.now())
      const im = Date.now() - lanCuoi
      if (im > 60_000) {
        loiGhi = new Error(`Video bị đứng ở ${mmss(v.currentTime)} hơn 1 phút (có thể tệp video lỗi ở đoạn này). Bấm Bắt đầu để làm tiếp.`)
        dung.current = true
        xongPhat()
      } else if (im > 6000 && Date.now() - daDay > 6000) {
        daDay = Date.now()
        ghiNhatKy(`Video đứng ở ${mmss(v.currentTime)}, đang đẩy chạy tiếp…`)
        v.currentTime = v.currentTime + 0.05
        v.play().catch(() => {})
      }
    }, 2000)

    await new Promise<void>((ok, loi) => {
      xongPhat = ok
      const moi = (_: number, meta: VideoFrameCallbackMetadata) => {
        lanCuoi = Date.now()
        g.drawImage(v, 0, 0, rong, cao)
        const t = meta.mediaTime
        if (moc.length < 30) moc.push(t)
        cho.push({ t, b64: anhB64(canvas, tuyChon.chatLuong) })
        const so = Math.floor(t / DO_DAI) + 1
        if (so > doan + 1 && fps) {
          // Khung đã sang đoạn mới → ghi đoạn cũ
          const cu = doan + 1
          const ds = cho.filter((k) => Math.floor(k.t / DO_DAI) + 1 === cu)
          cho.splice(0, cho.length, ...cho.filter((k) => Math.floor(k.t / DO_DAI) + 1 > cu))
          ghiDoan(cu, ds)
          doan = cu
        }
        if (!fps && moc.length >= 30) fps = doFps()
        setTienDo(`Đang mã hóa ${mmss(t)} / ${mmss(v.duration)}… giữ tab này mở.`)
        if (dung.current) return ok()
        if (!v.ended) v.requestVideoFrameCallback(moi)
      }
      v.onended = () => setTimeout(ok, 300)
      v.onerror = () => loi(new Error('Video bị lỗi khi đang phát.'))
      v.requestVideoFrameCallback(moi)
      v.play().catch(loi)
    })
    document.removeEventListener('visibilitychange', anTab)
    clearInterval(canh)
    v.pause()

    if (!fps) fps = doFps()
    // Các đoạn còn lại (cuối video)
    const conLai = [...new Set(cho.map((k) => Math.floor(k.t / DO_DAI) + 1))].sort((a, b) => a - b)
    for (const so of conLai) if (so > batDauDoan) ghiDoan(so, cho.filter((k) => Math.floor(k.t / DO_DAI) + 1 === so))
    await hangGhi

    // Các đoạn đã có từ lần trước: điền vào mục lục (số khung tính theo fps như lúc ghi)
    for (let so = 1; so <= batDauDoan; so++) {
      const bd = (so - 1) * DO_DAI
      const kt = Math.min(so * DO_DAI, v.duration)
      const tepCu = await (await thuMuc.getFileHandle(`doan_${String(so).padStart(3, '0')}.js`)).getFile()
      const mb = tepCu.size / 1_048_576
      tongMB += mb
      daGhi.push({ file: tepCu.name, segment: so, start_sec: +bd.toFixed(4), end_sec: +kt.toFixed(4), frame_count: Math.round((kt - bd) * fps), size_mb: +mb.toFixed(2) })
    }
    if (khungDau < 0) khungDau = daGhi.reduce((s, d) => s + d.frame_count, 0)
    const chuaXong = dung.current || !!loiGhi

    daGhi.sort((a, b) => a.segment - b.segment)
    const info = {
      video: f.name, width: rong, height: cao, fps, segment_sec: DO_DAI, total_frames: khungDau,
      duration_sec: +(khungDau / fps).toFixed(3), jpg_quality: Math.round(tuyChon.chatLuong * 100),
      created_at: new Date().toISOString().slice(0, 19), segments: daGhi,
      ...(chuaXong ? { chua_xong: true } : {}),
    }
    await ghiTep(thuMuc, 'danh_sach.js', [`VIDEO_CODE.setInfo(${JSON.stringify(info)});\n`])
    await ghiTep(thuMuc, 'index.html', [await (await fetch('/video-js/player.html')).text()])
    setKetQua(thuMuc)
    onDaGhi?.()
    if (loiGhi) throw loiGhi
    setTienDo(
      `${chuaXong ? 'Đã dừng giữa chừng (bấm Bắt đầu lại với cùng video để làm tiếp)' : 'Xong'}: ${daGhi.length} tệp .js, ${khungDau} khung hình, tổng ${tongMB.toFixed(0)} MB → thư mục "${ten}". ` +
        'Mở index.html trong thư mục đó để xem video phát lại từ code.',
    )
  }

  if (!coHoTro)
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
        Phần này cần <b>Chrome hoặc Edge trên máy tính</b> (để ghi tệp thẳng vào thư mục trên máy). Điện thoại và Firefox chưa hỗ trợ.
      </p>
    )

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>Chọn video, chọn độ nét.</li>
        <li>
          Bấm <b>Bắt đầu</b>. {thuMuc ? <>Code lưu vào thư mục <b>📁 {thuMuc.name}</b> (đổi ở danh sách phía trên).</> : <>Lần đầu trang hỏi thư mục lưu: nên chọn ổ còn trống nhiều (vd thư mục VIDEO_JS ở ổ E), bấm <b>Cho phép</b>.</>}
        </li>
        <li>Giữ tab mở tới khi xong. Video chạy đúng tốc độ thật: video 5 phút mất khoảng 5 phút.</li>
        <li>Mở <b>index.html</b> trong thư mục kết quả để xem video phát lại từ code.</li>
      </ol>
      <p className="text-xs text-slate-500">
        Mỗi 8 giây = 1 tệp doan_XXX.js chứa mọi khung hình (ảnh JPG dạng base64) và âm thanh 8 giây đó. Video 1080p: mỗi tệp khoảng 50–90 MB.
      </p>
      <input type="file" accept="video/*" disabled={chay} onChange={(e) => setTep(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white" />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="label">Độ nét</span>
          <select className="input w-44" value={tuyChon.rong} disabled={chay}
            onChange={(e) => setTuyChon({ ...tuyChon, rong: Number(e.target.value) })}>
            <option value={0}>Giữ nguyên gốc</option>
            <option value={1280}>720p (nhẹ hơn ~2 lần)</option>
            <option value={854}>480p (nhẹ nhất)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Chất lượng ảnh</span>
          <select className="input w-36" value={tuyChon.chatLuong} disabled={chay}
            onChange={(e) => setTuyChon({ ...tuyChon, chatLuong: Number(e.target.value) })}>
            <option value={0.9}>Cao (90)</option>
            <option value={0.85}>Vừa (85)</option>
            <option value={0.75}>Nhẹ (75)</option>
          </select>
        </label>
        {chay ? (
          <button className="btn btn-tt" onClick={() => (dung.current = true)}>Dừng</button>
        ) : (
          <button className="btn btn-fb" disabled={!tep} onClick={batDau}>Bắt đầu</button>
        )}
      </div>
      <div ref={xem} />
      {tienDo && <p className="text-sm font-medium text-blue-700">{tienDo}</p>}
      {ketQua && !chay && onXong && (
        <button className="btn btn-ca-hai" onClick={() => onXong(ketQua)}>→ Dùng code này để phục dựng bằng Veo 3</button>
      )}
      {loi && <p className="text-sm font-medium text-red-600">{loi}</p>}
      {nhatKy.length > 0 && (
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{nhatKy.join('\n')}</pre>
      )}
    </div>
  )
}
