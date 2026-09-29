import 'server-only'
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'

// Một mật khẩu chung (ADMIN_PASSWORD) cho trang duyệt bài. Cookie lưu mã băm, không lưu mật khẩu.
const TEN_COOKIE = 'duyet_bai'

const bam = (s: string) => createHash('sha256').update(`tin-cong-nghe:${s}`).digest('hex')

export async function daDangNhap() {
  // Đọc cookie trước để trang luôn chạy động, kể cả khi chưa đặt mật khẩu
  const giaTri = (await cookies()).get(TEN_COOKIE)?.value
  const mk = process.env.ADMIN_PASSWORD
  return !!mk && giaTri === bam(mk)
}

export async function dangNhap(matKhau: string) {
  const mk = process.env.ADMIN_PASSWORD
  if (!mk || matKhau !== mk) return false
  ;(await cookies()).set(TEN_COOKIE, bam(mk), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
  })
  return true
}

export async function dangXuat() {
  ;(await cookies()).delete(TEN_COOKIE)
}
