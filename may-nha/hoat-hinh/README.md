# Thư viện video hoạt hình Công Nghệ 24H

Mỗi bài tin được AI viết thành một **câu chuyện nhiều người nói** rồi dựng thành video dọc 1080×1920 bằng
[HyperFrames](https://www.npmjs.com/package/hyperframes) (HTML + GSAP), trên máy nhà (`may-nha/tho_doc.py`).
Thư viện này là nền chung cho mọi video và mọi nhân vật về sau: thêm một mục là mọi video mới dùng được ngay.

## Luồng làm một video

1. Trang web (`lib/hoatHinh.ts`) nhờ AI viết kịch bản (`lib/ai.ts` → `vietLoiThoai`): câu giật tít + từng câu thoại
   (người nói, cảm xúc, bối cảnh, đạo cụ, nhân vật phụ, bảng tin, minh hoạ chèn), rồi để phiếu việc trong kho Supabase.
2. Thợ máy nhà đọc từng câu bằng giọng VieNeu của người nói, ghi `artifacts/loi_thoai.json` + `do_dai.json`.
3. `node tao_video.mjs <thư mục>` sinh `hyperframes/index.html`; `npx hyperframes render` ra MP4; trộn nhạc nền; gửi lên kho.

Thử nhanh không cần trang web: tạo thư mục có `artifacts/loi_thoai.json`, các file `hyperframes/assets/loi-<i>.wav`,
font + `gsap.min.js` trong `hyperframes/assets/`, rồi chạy `tao_video.mjs` và `npx hyperframes snapshot --at ...`.

## Các phần dùng lại được

| Phần | File | Thêm mục mới |
|---|---|---|
| Nhân vật chính (Mèo Mun, Robot Bit) | `tao_video.mjs` (`meoSvg`, `robotSvg`) | Vẽ SVG có nhóm `<id>-dau`, `-tay-trai`, `-tay-phai`, `-mieng-dong`, `-mieng-mo`, `-mat-trai/phai`, thêm điểm xoay vào `XOAY` |
| Nhân vật phụ (có giọng riêng) | `nhanVatPhu.mjs` | Thêm một mục `nguoi(id, {...})` + `ten`, `mau`, `bieu_tuong`; thêm tên vào `NHAN_VAT_PHU` (`lib/ai.ts`) và giọng vào `NHAN_VAT` (`lib/hoatHinh.ts`) |
| Bối cảnh | `boiCanh.mjs` | Thêm hàm trả `{ svg, tw }` (mặt sàn từ y≈1180); thêm tên + mô tả khi nào dùng vào `BOI_CANH` và lời dặn AI (`lib/ai.ts`) |
| Đạo cụ | `tao_video.mjs` (`DAO_CU`) | Thêm `ten: 'emoji'` + tên vào `DAO_CU` (`lib/ai.ts`) |
| Cử chỉ theo cảm xúc | `tao_video.mjs` (`CU_CHI`) | Thêm hàm `(p, t0) => [tween...]` dùng tiền tố bộ phận `p`; thêm tên vào `CAM_XUC` (`lib/ai.ts`) |
| Minh hoạ chèn theo chi tiết (thẻ nhỏ trên đầu người nói) | `minhHoa.mjs` (`MINH_HOA`) | Thêm hàm `(id, m) => { html, tw }` + CSS trong `CSS_MINH_HOA`; thêm tên + khi nào dùng vào `MINH_HOA` (`lib/ai.ts`) |
| Chuyển cảnh | `tao_video.mjs` (`KIEU_CHUYEN`) | Thêm nhánh xử lý theo tên kiểu |
| Câu giật tít mở đầu | `minhHoa.mjs` (`mocMoDau`) | |

Tên trong `lib/ai.ts` và trong thư viện phải khớp nhau: AI chỉ được chọn những gì có trong danh sách.
Đổi cách dựng thì tăng `PHIEN_BAN` trong `lib/hoatHinh.ts` để video cũ tự dựng lại.

## Quy tắc để video dễ xem, giữ chân người xem

- **2 giây đầu**: câu giật tít chữ lớn (cũng là ảnh bìa TikTok), trung thực, không câu view sai sự thật.
- **Mỗi 2–3 giây có một thay đổi**: máy quay đổi góc, đạo cụ bật ra, minh hoạ chèn đúng chi tiết, đổi bối cảnh sau 2–3 câu
  — nhưng không đổi tất cả cùng lúc.
- **Máy quay theo cảm xúc**: bất ngờ cận nhanh, lo lắng tiến dần, vui nâng lên, suy nghĩ xoay nhẹ, lùi về cảnh rộng trước khi đổi cảnh.
- **Ai cũng hiểu**: câu ≤ 25 chữ, từ phổ thông, giải thích thuật ngữ; phụ đề lớn 2 dòng sát đáy, xem không tiếng vẫn hiểu.
- **Nhiều giọng**: Mèo hỏi, Robot giải thích, 1–2 nhân vật phụ lên tiếng; nhân vật phụ không nói thay nghi phạm / nạn nhân.
- **Không che**: phụ đề không có khung lớn; đạo cụ ở góc trên; nhân vật chính dạt ra khi nhân vật phụ xuất hiện.

## Quy tắc kỹ thuật HyperFrames (lỗi im lặng nếu sai)

- Mọi chuyển động nằm trong một `gsap.timeline({ paused: true })` đăng ký ở `window.__timelines["main"]`.
- Không `repeat: -1`, không `Math.random`, không đồng hồ; lặp hữu hạn bằng `lap(giây, chu kỳ)`.
- Phần tử phải có trong DOM từ đầu (nhân vật, bối cảnh, đạo cụ nằm trong khung chung, ẩn/hiện bằng `opacity`).
- `fromTo` làm hiện phần tử đang ẩn phải ghi `opacity: 1` ở trạng thái đích.
- Chạy `npx hyperframes lint` (0 lỗi) và `snapshot` để nhìn khung hình trước khi render.
- Cần `ffmpeg` (repo) và `ffprobe` (`npm i ffprobe-static`) trên PATH; trong bash dùng đường dẫn `/c/...`, không `C:/...`.
