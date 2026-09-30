# AI tổng hợp tin công nghệ → bài đăng Facebook

Mỗi ngày lúc 6h, 12h, 18h (giờ VN), mỗi lần tối đa 2 bài, hệ thống tự:

1. Đọc RSS tin công nghệ / AI trong 24 giờ qua (VnExpress, Tuổi Trẻ, Thanh Niên, Dân trí, GenK, The Verge, TechCrunch — sửa ở `lib/nguonTin.ts`)
2. Bỏ tin đã soạn trước đó, AI (Gemini hoặc Claude) chọn các tin đáng đăng nhất (gộp tin trùng giữa các báo)
3. Đọc bài gốc, AI cô đọng thành bài đăng Facebook tiếng Việt + tiêu đề ảnh + hashtag
4. Vẽ ảnh minh họa 1080×1080 (tiêu đề lớn, nhãn chủ đề, nguồn, ngày — `lib/anh.tsx`)
5. Đăng thẳng lên Fanpage (`TU_DONG_DANG=1`, mặc định). Đặt `TU_DONG_DANG=0` thì chỉ lưu **bài nháp**, vào trang web duyệt rồi bấm **Đăng lên Facebook**

Bấm **✨ Tổng hợp ngay** trên trang để chạy bất kỳ lúc nào.

## Cài đặt

### 1. Supabase
Tạo project mới (miễn phí) ở supabase.com → SQL Editor → chạy `supabase/schema.sql`.

### 2. Biến môi trường
Chép `.env.example` thành `.env.local`, điền các khóa (giải thích trong file).

### 3. Chạy thử trên máy
```bash
npm install
npm run dev
```
Mở http://localhost:3000, đăng nhập bằng `ADMIN_PASSWORD`, bấm **Tổng hợp ngay**.

### 4. Deploy lên Vercel
Đẩy lên GitHub → Import vào Vercel → khai báo các biến môi trường như `.env.local`. Lịch chạy tự động nằm trong `vercel.json` (3 lịch `0 23`, `0 5`, `0 11` giờ UTC = 6h, 12h, 18h VN, `?so_bai=2` = số bài mỗi lần; gói Vercel miễn phí có thể chạy trễ trong vòng 1 giờ).

## Lấy token Facebook Fanpage

1. Vào developers.facebook.com → **Tạo ứng dụng**, chọn trường hợp sử dụng quản lý Trang (Pages).
2. Ứng dụng → **Cài đặt ứng dụng → Thông tin cơ bản**: chép **App ID** và **App Secret** vào `FB_APP_ID`, `FB_APP_SECRET`.
3. Mở **Graph API Explorer** (developers.facebook.com/tools/explorer), chọn ứng dụng, thêm quyền `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `pages_read_user_content`, `read_insights`, `pages_manage_engagement` (3 quyền cuối cho trang Thống kê và Bình luận: đọc cảm xúc, bình luận, lượt xem, trả lời và ẩn spam) → **Generate Access Token** → chọn Fanpage → chép token vào `FB_USER_TOKEN`.
4. Chạy `npm run token-fb`: script đổi sang token Fanpage không hết hạn và tự ghi `FB_PAGE_ID`, `FB_PAGE_TOKEN`.

Chưa có token thì vẫn dùng được: nút **Sao chép nội dung** + **Tải ảnh** để đăng tay.

## Chi phí
- **Gemini (đang dùng, miễn phí):** có `GEMINI_API_KEY` là dùng Gemini. Gói miễn phí hay báo quá tải, code tự thử lại và chuyển model (`GEMINI_MODELS`). Mỗi lần chạy mất khoảng 2–3 phút.
- **Claude (trả phí, viết hay hơn):** xóa `GEMINI_API_KEY`, điền `ANTHROPIC_API_KEY`. Với `claude-opus-5` cỡ 0,2–0,5 USD/ngày; đổi `MODEL` trong `lib/ai.ts` sang `claude-sonnet-5` cho rẻ hơn.
- Ảnh vẽ bằng code nên không tốn phí.

## Cấu trúc
| File | Việc |
|---|---|
| `lib/nguonTin.ts` | Danh sách nguồn RSS, đọc tin |
| `lib/docBai.ts` | Tải bài gốc, lấy phần chữ |
| `lib/ai.ts` | Lời nhắc cho Claude: chọn tin, viết bài |
| `lib/tongHop.ts` | Nối toàn bộ quy trình |
| `lib/anh.tsx`, `lib/bangMau.ts` | Mẫu ảnh và 5 bảng màu |
| `lib/facebook.ts` | Đăng ảnh + nội dung lên Fanpage (Graph API) |
| `app/page.tsx`, `app/TheBai.tsx` | Trang duyệt bài |
| `app/anh/[id]` | Link ảnh công khai (Facebook tải ảnh từ đây) |
| `app/api/cron` | Vercel Cron gọi mỗi sáng |
