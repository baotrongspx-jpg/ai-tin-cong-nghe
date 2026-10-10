# Tách ảnh từ PDF chủ trang nạp cho phim tiểu sử (trang /youtube, mục "Ảnh tự làm từ PDF"):
# - PDF nhân vật: mỗi ảnh là một bảng thiết kế nhân vật (nhiều dáng + chữ) → cắt lấy DÁNG CAO NHẤT (thường là dáng đứng toàn
#   thân), xoá nền → PNG nền trong suốt.
# - PDF cảnh: mỗi ảnh ngang là một cảnh → giữ nguyên.
# Kèm mỗi ảnh là chữ nằm gần nó trên trang (tên nhân vật, mô tả cảnh…) để AI trên web biết ảnh nào là ai / cảnh nào.
# Thư viện: pdfplumber (vị trí ảnh + chữ, chụp lại vùng ảnh trên trang), numpy, scipy, PIL. Không lấy dữ liệu ảnh nhúng theo tên
# (tên ảnh mỗi thư viện PDF đọc một kiểu, ghép nhầm ảnh): chụp lại đúng khung ảnh trên trang ở độ phân giải bằng ảnh gốc.
import io
import re
from pathlib import Path

import numpy as np
import pdfplumber
from PIL import Image
from scipy import ndimage


def _chup(trang, img):
    # Chụp vùng ảnh trên trang, độ phân giải theo kích thước gốc của ảnh (tối đa 400 dpi)
    rong_pt = max(1.0, img['x1'] - img['x0'])
    goc = (img.get('srcsize') or (0, 0))[0] or rong_pt * 3
    dpi = max(72, min(400, 72 * goc / rong_pt))
    hop = (max(0, img['x0']), max(0, img['top']), min(trang.width, img['x1']), min(trang.height, img['bottom']))
    return trang.crop(hop).to_image(resolution=dpi).original.convert('RGBA')


def _chu_gan(dong, hop, cao_trang):
    # Các dòng chữ gần ảnh: cùng dải dọc với ảnh (mở rộng 25% chiều cao trang lên trên / 8% xuống dưới), gần nhất trước
    x0, top, x1, bottom = hop
    tren, duoi = top - 0.25 * cao_trang, bottom + 0.08 * cao_trang
    gan = []
    for d in dong:
        if d['bottom'] < tren or d['top'] > duoi:
            continue
        cy = (d['top'] + d['bottom']) / 2
        dy = 0 if top <= cy <= bottom else min(abs(cy - top), abs(cy - bottom))
        dx = 0 if d['x1'] >= x0 and d['x0'] <= x1 else min(abs(d['x0'] - x1), abs(d['x1'] - x0))
        gan.append((dy + dx * 0.5, d['top'], d['text']))
    gan.sort()
    chon = sorted(gan[:14], key=lambda g: g[1])
    return ' | '.join(re.sub(r'\s+', ' ', g[2]).strip() for g in chon)[:900]


def _cat_nhan_vat(im):
    # Bảng thiết kế → dáng cao nhất, nền trong suốt. Nền = vùng gần màu mép khung (hoặc màu mép trái/phải từng hàng khi nền
    # chuyển màu) và nối liền với mép; giữ khối người cao nhất (các khối chữ / mũi tên nhỏ bị bỏ)
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    h, w, _ = a.shape
    mep = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    goc = np.median(mep, axis=0)
    trai, phai = a[:, :3].mean(axis=1), a[:, -3:].mean(axis=1)
    t = np.linspace(0, 1, w)[None, :, None]
    nen_hang = trai[:, None, :] * (1 - t) + phai[:, None, :] * t
    nguong = 30
    gan = (np.abs(a - goc).max(axis=2) < nguong) | (np.abs(a - nen_hang).max(axis=2) < nguong)
    nhan, _ = ndimage.label(gan)
    cham = set(np.unique(np.concatenate([nhan[0], nhan[-1], nhan[:, 0], nhan[:, -1]]))) - {0}
    nguoi = ~np.isin(nhan, list(cham))
    # Tách các dáng đứng sát nhau: bỏ cầu nối mảnh (mở hình thái học) trước khi đếm khối
    nguoi_mo = ndimage.binary_opening(nguoi, iterations=2)
    nhan2, so2 = ndimage.label(nguoi_mo)
    if so2 == 0:
        return None
    hop = ndimage.find_objects(nhan2)
    dt = ndimage.sum(nguoi_mo, nhan2, range(1, so2 + 1))
    # Dáng cao nhất trong các khối đủ lớn (≥3% ảnh), ưu tiên khối đứng (cao > rộng)
    ung = []
    for i, (sl, s) in enumerate(zip(hop, dt)):
        ch, cr = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if s < 0.03 * h * w * 0.3 or ch < 0.25 * h:
            continue
        ung.append((ch * (1.2 if ch > cr else 1), i + 1))
    if not ung:
        return None
    _, chon = max(ung)
    mat = nhan2 == chon
    mat = ndimage.binary_dilation(mat, iterations=2) & nguoi
    # Lấp lỗ nhỏ (mắt, cúc áo…), không lấp khe lớn giữa chân / giữa tay và thân
    lo, so_lo = ndimage.label(ndimage.binary_fill_holes(mat) & ~mat)
    if so_lo:
        co_lo = ndimage.sum(lo > 0, lo, range(1, so_lo + 1))
        mat = mat | np.isin(lo, [i + 1 for i, c in enumerate(co_lo) if c < 0.003 * mat.sum()])
    alpha = (ndimage.uniform_filter(mat.astype(np.float32), 3) * 255).clip(0, 255).astype(np.uint8)
    alpha[~ndimage.binary_dilation(mat)] = 0
    ys, xs = np.where(mat)
    out = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')
    return out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def tach(pdf, ra, loai):
    # loai 'nhan_vat' | 'canh'. Ghi ảnh vào thư mục ra (nv-pdf-<n>.png / canh-pdf-<n>.jpg), trả [{tep, chu, trang}]
    ra.mkdir(parents=True, exist_ok=True)
    dau = 'nv-pdf' if loai == 'nhan_vat' else 'canh-pdf'
    for cu in ra.glob(f'{dau}-*'):
        cu.unlink(missing_ok=True)
    kq = []
    with pdfplumber.open(str(pdf)) as p:
        for so_trang, tr in enumerate(p.pages, 1):
            dong = tr.extract_text_lines() if hasattr(tr, 'extract_text_lines') else []
            for img in sorted(tr.images, key=lambda x: (round(x['top'] / 20), x['x0'])):
                if min(img['x1'] - img['x0'], img['bottom'] - img['top']) < 60:  # biểu tượng nhỏ
                    continue
                try:
                    im = _chup(tr, img)
                except Exception:
                    continue
                if min(im.size) < 200:
                    continue
                rong, cao = im.size
                ngang = rong > cao * 1.25
                # PDF nhân vật: bỏ ảnh ngang (sơ đồ tư duy, banner); PDF cảnh: bỏ ảnh dọc nhỏ (biểu tượng, chân dung lẻ)
                if (loai == 'nhan_vat' and ngang) or (loai == 'canh' and not ngang):
                    continue
                chu = _chu_gan(dong, (img['x0'], img['top'], img['x1'], img['bottom']), tr.height)
                n = len(kq) + 1
                if loai == 'nhan_vat':
                    cat = _cat_nhan_vat(im)
                    if cat is None:
                        continue
                    tep = f'{dau}-{n}.png'
                    cat.save(ra / tep)
                else:
                    tep = f'{dau}-{n}.jpg'
                    im.convert('RGB').save(ra / tep, quality=92)
                kq.append({'tep': tep, 'chu': chu, 'trang': so_trang})
    return kq


def anh_nho(tep, rong=320):
    # Ảnh xem trước nhỏ (JPG, nền tối cho ảnh trong suốt) để trang web hiện
    im = Image.open(tep)
    im.thumbnail((rong, rong * 2))
    if im.mode == 'RGBA':
        nen = Image.new('RGB', im.size, (30, 41, 59))
        nen.paste(im, (0, 0), im)
        im = nen
    buf = io.BytesIO()
    im.convert('RGB').save(buf, 'JPEG', quality=82)
    return buf.getvalue()


if __name__ == '__main__':
    # Thử: python tach_pdf.py <pdf> <thư mục ra> nhan_vat|canh
    import json
    import sys
    print(json.dumps(tach(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]), ensure_ascii=False, indent=1))
