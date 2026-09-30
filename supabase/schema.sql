-- Chạy một lần trong Supabase → SQL Editor.
-- Bảng lưu bài viết do AI soạn, chờ duyệt rồi đăng Facebook.

create table if not exists public.bai_viet (
  id           uuid primary key default gen_random_uuid(),
  tao_luc      timestamptz not null default now(),
  -- nhap: chờ duyệt | da_dang: đã lên Facebook | bo_qua: không đăng | loi: soạn lỗi
  trang_thai   text not null default 'nhap'
               check (trang_thai in ('nhap', 'da_dang', 'bo_qua', 'loi')),
  nguon_ten    text not null,
  nguon_link   text not null unique,       -- chống soạn trùng một bài báo
  tieu_de_goc  text not null,
  ngay_bao     timestamptz,
  tieu_de_anh  text not null default '',   -- chữ lớn trên ảnh
  chu_de       text not null default '',   -- nhãn nhỏ trên ảnh (AI, Điện thoại...)
  noi_dung     text not null default '',   -- nội dung bài đăng
  hashtag      text[] not null default '{}',
  mau_anh      int not null default 0,     -- bảng màu ảnh 0..4
  fb_post_id   text,
  dang_luc     timestamptz,
  loi          text
);

create index if not exists bai_viet_tao_luc on public.bai_viet (tao_luc desc);

-- Bật RLS, không tạo policy: chỉ server (service_role) đọc ghi được.
alter table public.bai_viet enable row level security;

-- TikTok (chạy thêm đoạn này nếu bảng đã tạo từ trước)
alter table public.bai_viet add column if not exists tiktok_publish_id text;
alter table public.bai_viet add column if not exists tiktok_dang_luc   timestamptz;
alter table public.bai_viet add column if not exists tiktok_loi        text;

-- Lưu token kết nối (TikTok tự làm mới token mỗi ngày nên phải lưu ở đây, không để trong biến môi trường)
create table if not exists public.cai_dat (
  khoa          text primary key,
  gia_tri       jsonb not null,
  cap_nhat_luc  timestamptz not null default now()
);
alter table public.cai_dat enable row level security;
