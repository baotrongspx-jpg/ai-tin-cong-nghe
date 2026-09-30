import 'server-only'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BANG_MAU } from './bangMau'
import { layAnhNen } from './pixabay'

const fontDam = readFile(join(process.cwd(), 'assets/fonts/BeVietnamPro-Bold.ttf'))
const fontVua = readFile(join(process.cwd(), 'assets/fonts/BeVietnamPro-Medium.ttf'))

export type DuLieuAnh = {
  tieuDe: string
  chuDe: string
  nguon: string
  ngay: string // đã định dạng dd/mm/yyyy
  mau: number
  anhNen?: string | null // data URL ảnh chụp làm nền; không có thì nền màu
}

// Vẽ ảnh cho một bài viết (dùng ở link ảnh và khi đăng Facebook / TikTok)
export async function veAnhBai(b: {
  tieu_de_anh: string
  chu_de: string
  nguon_ten: string
  ngay_bao: string | null
  tao_luc: string
  mau_anh: number
  anh_nen?: number | null // mã ảnh Pixabay; 0 hoặc trống: nền màu
}) {
  const ngay = new Date(b.ngay_bao ?? b.tao_luc).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const anhNen = b.anh_nen ? await layAnhNen(b.anh_nen) : null
  return veAnh({ tieuDe: b.tieu_de_anh, chuDe: b.chu_de, nguon: b.nguon_ten, ngay, mau: b.mau_anh, anhNen })
}

// Chữ dài thì nhỏ lại để luôn vừa khung
const coChu = (s: string) => (s.length <= 40 ? 92 : s.length <= 60 ? 80 : s.length <= 80 ? 68 : 58)

// "#0b1a3a" + độ trong → "rgba(11,26,58,0.8)"
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export async function veAnh(d: DuLieuAnh) {
  const m = BANG_MAU[((d.mau % BANG_MAU.length) + BANG_MAU.length) % BANG_MAU.length]
  const tenTrang = process.env.TEN_TRANG ?? 'Tin Công Nghệ'
  const coAnh = !!d.anhNen

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          color: 'white',
          fontFamily: 'BVP',
          backgroundColor: m.nen1,
          // Thư viện vẽ ảnh lỗi khi gặp giá trị undefined, nên chỉ thêm khi dùng nền màu
          ...(coAnh ? {} : { backgroundImage: `linear-gradient(135deg, ${m.nen1} 0%, ${m.nen1} 45%, ${m.nen2} 100%)` }),
          position: 'relative',
        }}
      >
        {coAnh ? (
          <>
            {/* Ảnh chụp phủ kín khung, phủ lên một lớp màu đậm dần xuống dưới để chữ trắng luôn dễ đọc */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.anhNen!}
              alt=""
              width={1080}
              height={1080}
              style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1080, objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute', left: 0, top: 0, width: 1080, height: 1080, display: 'flex',
                backgroundImage: `linear-gradient(180deg, ${rgba(m.nen1, 0.6)} 0%, ${rgba(m.nen1, 0.2)} 22%, ${rgba(m.nen1, 0.55)} 42%, ${rgba(m.nen1, 0.9)} 60%, ${rgba(m.nen1, 0.97)} 80%, ${m.nen1} 100%)`,
              }}
            />
          </>
        ) : (
          <>
            {/* Vòng tròn trang trí */}
            <div
              style={{
                // Tính từ trái (1080 - 620 + 180): thư viện vẽ ảnh đặt sai khi dùng right
                position: 'absolute', left: 640, top: -180, width: 620, height: 620,
                borderRadius: 9999, border: `2px solid ${m.nhan}`, opacity: 0.25, display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute', left: 760, top: -60, width: 380, height: 380,
                borderRadius: 9999, backgroundColor: m.nen2, opacity: 0.35, display: 'flex',
              }}
            />
          </>
        )}

        {/* Lớp chữ */}
        <div
          style={{
            position: 'relative', width: 1080, height: 1080, padding: 80,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
        {/* Đầu: tên trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', width: 16, height: 56, backgroundColor: m.nhan, borderRadius: 4 }} />
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: 1 }}>{tenTrang}</div>
        </div>

        {/* Giữa (hoặc dưới khi có ảnh, để lộ ảnh phía trên): chủ đề + tiêu đề */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, marginTop: coAnh ? 'auto' : 0, marginBottom: coAnh ? 48 : 0 }}>
          {d.chuDe && (
            <div style={{ display: 'flex' }}>
              <div
                style={{
                  display: 'flex', fontSize: 34, fontWeight: 700, color: m.nen1,
                  backgroundColor: m.nhan, padding: '10px 28px', borderRadius: 999,
                  textTransform: 'uppercase',
                }}
              >
                {d.chuDe}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', fontSize: coChu(d.tieuDe), fontWeight: 700, lineHeight: 1.2 }}>{d.tieuDe}</div>
        </div>

        {/* Chân: nguồn + ngày */}
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 30, fontWeight: 500, opacity: 0.85,
            borderTop: '2px solid rgba(255,255,255,0.25)', paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex' }}>
            {coAnh ? `Nguồn: ${d.nguon} · Ảnh: Pixabay` : `Nguồn: ${d.nguon}`}
          </div>
          <div style={{ display: 'flex' }}>{d.ngay}</div>
        </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'BVP', data: await fontDam, weight: 700, style: 'normal' },
        { name: 'BVP', data: await fontVua, weight: 500, style: 'normal' },
      ],
      headers: { 'Cache-Control': 'public, max-age=300' },
    },
  )
}
