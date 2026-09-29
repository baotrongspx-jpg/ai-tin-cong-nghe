import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type TrangThai = 'nhap' | 'da_dang' | 'bo_qua' | 'loi'

export type BaiViet = {
  id: string
  tao_luc: string
  trang_thai: TrangThai
  nguon_ten: string
  nguon_link: string
  tieu_de_goc: string
  ngay_bao: string | null
  tieu_de_anh: string
  chu_de: string
  noi_dung: string
  hashtag: string[]
  mau_anh: number
  fb_post_id: string | null
  dang_luc: string | null
  loi: string | null
}

let client: SupabaseClient | null = null

// Dùng service_role: bảng bai_viet không mở cho trình duyệt
export function db() {
  client ??= createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  return client
}
