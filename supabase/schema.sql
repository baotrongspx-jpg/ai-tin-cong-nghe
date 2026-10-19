-- Bảng duy nhất trang CV dùng: lưu ảnh đại diện, lượt xem, tin liên hệ...
create table if not exists public.cai_dat (
  khoa          text primary key,
  gia_tri       jsonb not null,
  cap_nhat_luc  timestamptz not null default now()
);
alter table public.cai_dat enable row level security;
