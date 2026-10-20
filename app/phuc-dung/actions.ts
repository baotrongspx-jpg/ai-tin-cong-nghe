'use server'

import { redirect } from 'next/navigation'
import { dangNhap } from '@/lib/xacThuc'

export async function dangNhapPhucDung(_: string | null, form: FormData) {
  if (!(await dangNhap(String(form.get('mat_khau') ?? '')))) return 'Sai mật khẩu'
  redirect('/phuc-dung')
}
