'use client'

import { useActionState } from 'react'
import { dangNhapPhucDung } from './actions'

export default function FormDangNhap() {
  const [loi, gui, dangGui] = useActionState(dangNhapPhucDung, null)
  return (
    <form action={gui} className="the mx-auto mt-10 max-w-sm p-6">
      <h1 className="mb-1 text-lg font-extrabold text-[#0f1b3d]">Phục dựng video bằng Veo 3</h1>
      <p className="mb-5 text-sm text-slate-500">Trang riêng của chủ trang.</p>
      <label className="label" htmlFor="mat_khau">Mật khẩu quản trị</label>
      <input id="mat_khau" name="mat_khau" type="password" required autoFocus className="input" placeholder="••••••••" />
      {loi && <p className="mt-2 text-sm font-medium text-red-600">{loi}</p>}
      <button disabled={dangGui} className="btn btn-fb mt-4 w-full py-2.5">
        {dangGui ? 'Đang vào…' : 'Đăng nhập'}
      </button>
    </form>
  )
}
