# Soi giật hình sau khi dựng (chủ trang 16/10/2026, phim Messi: "không muốn vấn đề này xuất hiện nữa"): đọc video ở 24
# hình/giây, thu nhỏ xám, đo độ đổi từng khung so với khung trước. "Cú nhảy" = một khung đổi mạnh mà hai khung bên cạnh
# gần như không đổi (cắt cảnh, nền nhảy nấc, hình loé một khung). Hai cú nhảy cách nhau dưới 1,2 giây ngoài các đoạn cố ý
# chớp nhanh (chuỗi ảnh dồn dập, máy dựng ghi ở cat_nhanh) là giật: người xem thấy màn hình nảy liên tục.
# Trả [[giây bắt đầu, giây kết thúc, số cú nhảy], ...]. Chạy thử: python soi_giat.py <video.mp4>
import subprocess
import sys
from pathlib import Path

import numpy as np

FFMPEG = Path(__file__).resolve().parent.parent / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe'
W, H, FPS = 192, 108, 24
NGUONG = 10.0  # độ đổi trung bình (0-255) của một khung coi là "nhảy"
CACH = 1.2  # hai cú nhảy gần hơn thế này là giật


def do_doi(tep):
    p = subprocess.Popen([str(FFMPEG), '-v', 'error', '-i', str(tep), '-vf', f'fps={FPS},scale={W}:{H},format=gray', '-f', 'rawvideo', '-'],
                         stdout=subprocess.PIPE)
    co = W * H
    truoc, ds = None, []
    while True:
        b = p.stdout.read(co * 240)
        if not b:
            break
        f = np.frombuffer(b[:len(b) // co * co], np.uint8).reshape(-1, H, W).astype(np.int16)
        if truoc is not None:
            f = np.concatenate([truoc[None], f])
        ds.append(np.abs(np.diff(f, axis=0)).mean(axis=(1, 2)))
        truoc = f[-1]
    p.wait()
    return np.concatenate(ds) if ds else np.zeros(0)


def soi_giat(tep, cat_nhanh=()):
    d = do_doi(tep)
    nhay = [(i + 1) / FPS for i in range(1, len(d) - 1)
            if d[i] > NGUONG and d[i - 1] < min(NGUONG * 0.5, d[i] * 0.3)]
    co_y = lambda t: any(a - 0.3 <= t <= b + 0.3 for a, b in cat_nhanh)
    nhay = [t for t in nhay if not co_y(t)]
    doan = []
    for a, b in zip(nhay, nhay[1:]):
        if b - a >= CACH:
            continue
        if doan and a - doan[-1][1] < CACH:
            doan[-1][1] = b
            doan[-1][2] += 1
        else:
            doan.append([a, b, 2])
    return [[round(a, 2), round(b, 2), n] for a, b, n in doan]


if __name__ == '__main__':
    for x in soi_giat(sys.argv[1]):
        print(f'{int(x[0] // 60)}:{x[0] % 60:05.2f} – {int(x[1] // 60)}:{x[1] % 60:05.2f}  ({x[2]} cú nhảy)')
