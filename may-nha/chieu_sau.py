# Ảnh 2,5D cho ảnh cảnh chủ trang tự làm: mô hình đoán chiều sâu nhỏ (Depth Anything V2 Small, ~100 MB, tải một lần về
# D:\hf-models) tách ảnh thành 2 lớp — NỀN (cả ảnh, chỗ vật ở gần được vá lại để khi lớp trước trượt đi không lộ lỗ) và
# TRƯỚC (người / vật ở gần, viền mềm, nền trong suốt). tao_video.mjs cho hai lớp trượt / phóng lệch nhau theo máy quay →
# ảnh tĩnh có chiều sâu như camera thật (parallax). Lỗi gì thì trả None, cảnh dựng bằng ảnh phẳng như cũ.
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

os.environ.setdefault('HF_HOME', r'D:\hf-models' if Path('D:/').exists() else str(Path.home() / '.cache' / 'huggingface'))
MO_HINH = 'depth-anything/Depth-Anything-V2-Small-hf'
PHIEN_BAN = 1  # tăng khi đổi cách tách để tách lại các ảnh đã lưu
_may = {}


def _doan_sau(im):
    # Bản đồ chiều sâu 0..1 (1 = gần), cùng cỡ ảnh
    import torch
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    if 'm' not in _may:
        _may['p'] = AutoImageProcessor.from_pretrained(MO_HINH)
        _may['m'] = AutoModelForDepthEstimation.from_pretrained(MO_HINH).to('cuda' if torch.cuda.is_available() else 'cpu').eval()
    p, m = _may['p'], _may['m']
    with torch.no_grad():
        vao = p(images=im, return_tensors='pt').to(m.device)
        sau = m(**vao).predicted_depth
        sau = torch.nn.functional.interpolate(sau.unsqueeze(1), size=im.size[::-1], mode='bicubic', align_corners=False)[0, 0]
    d = sau.float().cpu().numpy()
    return (d - d.min()) / max(1e-6, d.max() - d.min())


def nha_bo_nho():
    # Nhả mô hình khỏi card đồ hoạ (dựng hình / đọc giọng cần chỗ)
    if _may:
        _may.clear()
        try:
            import torch
            torch.cuda.empty_cache()
        except Exception:
            pass


def tach_lop(anh, thu_muc):
    # anh: đường dẫn ảnh cảnh. Lưu <tên>-nen.jpg + <tên>-truoc.png trong thu_muc (dùng lại nếu đã có). Trả (nen, truoc) hoặc None
    import cv2
    thu_muc.mkdir(parents=True, exist_ok=True)
    goc = Path(anh).stem
    nen_p, truoc_p = thu_muc / f'{goc}-v{PHIEN_BAN}-nen.jpg', thu_muc / f'{goc}-v{PHIEN_BAN}-truoc.png'
    if nen_p.exists() and truoc_p.exists():
        return nen_p, truoc_p
    im = Image.open(anh).convert('RGB')
    d = _doan_sau(im)
    # Lớp trước: phần gần nhất (~30% điểm ảnh gần nhất, nhưng phải gần hẳn so với phần còn lại), mịn viền
    nguong = max(float(np.quantile(d, 0.70)), float(d.mean() + 0.15))
    mat = (d >= nguong).astype(np.uint8)
    mat = cv2.morphologyEx(mat, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    mat = cv2.morphologyEx(mat, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    # Góc dưới phải (dấu "Gemini Notebook" của ảnh AI) không bao giờ thuộc lớp trước: lớp trước trượt có thể làm lộ ra,
    # còn lớp nền luôn bị máy quay cắt mép phải / dưới nên dấu đó không hiện
    h, w = mat.shape
    mat[int(h * 0.88):, int(w * 0.72):] = 0
    ty_le = mat.mean()
    if ty_le < 0.03 or ty_le > 0.65:  # không có vật nào nổi hẳn lên (hoặc gần như cả ảnh): 2,5D không có lợi
        return None
    alpha = Image.fromarray(mat * 255).filter(ImageFilter.GaussianBlur(3))
    truoc = im.copy()
    truoc.putalpha(alpha)
    truoc.save(truoc_p)
    # Lớp nền: vá chỗ vật gần (nở rộng ra để lớp trước trượt tới đâu cũng không lộ viền), vá ở ảnh thu nhỏ cho nhanh
    a = np.asarray(im)
    vung = cv2.dilate(mat, np.ones((41, 41), np.uint8))
    k = 0.5
    nho = cv2.resize(a, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    vung_nho = cv2.resize(vung, (nho.shape[1], nho.shape[0]), interpolation=cv2.INTER_NEAREST)
    va = cv2.inpaint(nho, vung_nho, 12, cv2.INPAINT_TELEA)
    va = cv2.resize(va, (a.shape[1], a.shape[0]), interpolation=cv2.INTER_CUBIC)
    m3 = cv2.GaussianBlur(vung.astype(np.float32), (21, 21), 0)[..., None]
    nen = (a * (1 - m3) + va * m3).astype(np.uint8)
    Image.fromarray(nen).save(nen_p, quality=92)
    return nen_p, truoc_p


if __name__ == '__main__':
    # Thử: python chieu_sau.py <ảnh>... <thư mục ra>
    import sys
    import time
    for a in sys.argv[1:-1]:
        t = time.time()
        print(a, tach_lop(a, Path(sys.argv[-1])), f'{time.time() - t:.1f}s')
