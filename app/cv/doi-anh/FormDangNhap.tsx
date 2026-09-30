'use client'

import { useActionState } from 'react'
import { dangNhapDoiAnh } from '../actions'

export default function FormDangNhap() {
  const [loi, gui, dangGui] = useActionState(dangNhapDoiAnh, null)
  return (
    <form action={gui}>
      <label className="label" htmlFor="mat_khau">Mật khẩu quản trị</label>
      <input id="mat_khau" name="mat_khau" type="password" required autoFocus className="input" placeholder="••••••••" />
      {loi && <p className="mt-2 text-sm font-medium text-red-600">{loi}</p>}
      <button disabled={dangGui} className="btn btn-fb mt-4 w-full py-2.5">
        {dangGui ? 'Đang vào…' : 'Đăng nhập'}
      </button>
    </form>
  )
}
