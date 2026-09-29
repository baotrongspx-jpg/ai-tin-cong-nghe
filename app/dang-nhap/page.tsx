'use client'

import { useActionState } from 'react'
import { dangNhapAction } from '../actions'

export default function TrangDangNhap() {
  const [loi, gui, dangGui] = useActionState(dangNhapAction, null)
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={gui} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">Duyệt bài tin công nghệ</h1>
        <p className="mb-6 text-sm text-slate-500">Nhập mật khẩu quản trị để tiếp tục.</p>
        <label className="label" htmlFor="mat_khau">Mật khẩu</label>
        <input id="mat_khau" name="mat_khau" type="password" required autoFocus className="input" />
        {loi && <p className="mt-2 text-sm text-red-600">{loi}</p>}
        <button disabled={dangGui} className="btn mt-5 w-full bg-blue-600 text-white hover:bg-blue-700">
          {dangGui ? 'Đang vào…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  )
}
