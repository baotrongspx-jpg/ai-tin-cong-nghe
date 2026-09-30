'use client'

import { useActionState } from 'react'
import { dangNhapAction } from '../actions'
import { IconFacebook, IconTikTok, Xoay } from '../BieuTuong'

export default function TrangDangNhap() {
  const [loi, gui, dangGui] = useActionState(dangNhapAction, null)
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={gui} className="the hien-len w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 text-xs font-black leading-none text-white shadow-lg shadow-blue-600/30">
            TIN
            <br />
            TECH
          </span>
          <div>
            <h1 className="text-xl font-extrabold">Tin Công Nghệ</h1>
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              Bảng duyệt bài <IconFacebook className="h-3.5 w-3.5 text-blue-600" /> <IconTikTok className="h-3.5 w-3.5" />
            </p>
          </div>
        </div>
        <label className="label" htmlFor="mat_khau">Mật khẩu quản trị</label>
        <input id="mat_khau" name="mat_khau" type="password" required autoFocus className="input" placeholder="••••••••" />
        {loi && <p className="mt-2 text-sm font-medium text-red-600">{loi}</p>}
        <button disabled={dangGui} className="btn btn-fb mt-5 w-full py-2.5">
          {dangGui && <Xoay />}
          {dangGui ? 'Đang vào…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  )
}
