# CV – Nông Bảo Trọng

Trang CV trực tuyến (Next.js). Trang chủ `/` chuyển thẳng tới `/cv`.

- `/cv` – CV chính, có robot trả lời câu hỏi về hồ sơ
- `/cv/ban-in` – bản in, `/cv/tai-pdf` – tải PDF
- `/cv/doi-anh` – đổi ảnh đại diện (cần mật khẩu `ADMIN_PASSWORD`)

Nội dung CV sửa ở `app/cv/duLieu.ts`.

## Cài đặt
1. Supabase: chạy `supabase/schema.sql` (chỉ một bảng `cai_dat`).
2. Chép `.env.example` thành `.env.local` rồi điền.
3. `npm install` rồi `npm run dev`.
