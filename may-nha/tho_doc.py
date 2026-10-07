# Thợ chạy trên máy nhà cho trang duyệt bài: đọc giọng VieNeu-TTS và dựng video hoạt hình nhân vật.
# Không mở cổng nào, không cần ngrok: cứ vài giây lấy "phiếu việc" trang web để trong kho Supabase
# (video-tiktok/hang-doi/viec/<id>.json), làm xong gửi kết quả lên kho. Hai loại việc:
# - Đọc giọng: {"cau": [...], "giong": "..."} → hang-doi/xong/<id>.wav rồi hang-doi/xong/<id>.json = {"doDai": [...]}
# - Video hoạt hình (lib/hoatHinh.ts): {"loai": "hoat_hinh", "ten": "<bài>/hh-....mp4", "nhac": ..., "loi_thoai": {...}}
#   → đọc từng câu thoại bằng giọng của nhân vật, dựng bằng HyperFrames (may-nha/hoat-hinh), trộn nhạc nền,
#   gửi video lên đúng "ten". Đang làm thì ghi hang-doi/dang-lam.json.
# Lỗi: hang-doi/xong/<id>.json = {"loi": "..."}. Cứ 20 giây ghi hang-doi/song.json để trang web biết máy nhà đang chạy.
# Khóa Supabase đọc từ .env.local của repo (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
import io
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import traceback
import wave
from pathlib import Path

import numpy as np
import requests
from vieneu import Vieneu

REPO = Path(__file__).resolve().parent.parent
env = {}
for dong in (REPO / '.env.local').read_text(encoding='utf-8').splitlines():
    if '=' in dong and not dong.lstrip().startswith('#'):
        k, v = dong.split('=', 1)
        env[k.strip()] = v.strip()
URL = env['SUPABASE_URL'].rstrip('/') + '/storage/v1/object'
KHOA = env['SUPABASE_SERVICE_ROLE_KEY']
KHO = 'video-tiktok'
GIONG_MAC_DINH = 'Hải Đăng'
NGAT = 0.25  # giây im lặng sau mỗi câu
s = requests.Session()
s.headers.update({'authorization': f'Bearer {KHOA}', 'apikey': KHOA})

# Dựng video hoạt hình: bộ sinh cảnh, font, ffmpeg (của repo), ffprobe (cài riêng: npm i ffprobe-static ở FFPROBE_DIR)
HOAT_HINH = REPO / 'may-nha' / 'hoat-hinh'
FFMPEG = REPO / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe'
FFPROBE_DIR = Path(os.environ.get('FFPROBE_DIR', r'C:\Users\Admin\VieNeu-TTS\cong-cu\node_modules\ffprobe-static\bin\win32\x64'))
THU_MUC_TAM = Path(os.environ.get('HOAT_HINH_TAM', r'C:\Users\Admin\VieNeu-TTS\hoat-hinh-tam'))


def gui(duong, du_lieu, kieu):
    r = s.post(f'{URL}/{KHO}/{duong}', data=du_lieu, headers={'content-type': kieu, 'x-upsert': 'true'}, timeout=300)
    r.raise_for_status()


def xoa(*duong):
    s.delete(f'{URL}/{KHO}', json={'prefixes': list(duong)}, timeout=30)


def liet_ke(thu_muc):
    r = s.post(f'{URL}/list/{KHO}', json={'prefix': thu_muc, 'limit': 100, 'sortBy': {'column': 'created_at', 'order': 'asc'}}, timeout=30)
    r.raise_for_status()
    return [f['name'] for f in r.json()]


def ds_viec():
    # Việc đọc giọng (ngắn, có người đang chờ) làm trước việc dựng hoạt hình (vài phút)
    ten = [n for n in liet_ke('hang-doi/viec') if n.endswith('.json')]
    return sorted(ten, key=lambda n: n.startswith('hh-'))


def doc(may, ds_giong, cau, giong):
    giong = giong if giong in ds_giong else GIONG_MAC_DINH
    doan = may.infer_batch(cau, voice=giong)
    sr = may.sample_rate
    lang = np.zeros(int(sr * NGAT), dtype=np.float32)
    phan, do_dai = [], []
    for a in doan:
        a = np.asarray(a, dtype=np.float32).reshape(-1)
        phan += [a, lang]
        do_dai.append(round((len(a) + len(lang)) / sr, 3))
    pcm = (np.clip(np.concatenate(phan), -1, 1) * 32767).astype('<i2').tobytes()
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)
    return buf.getvalue(), do_dai


def chay(lenh, cwd, gioi_han):
    moi_truong = dict(os.environ)
    moi_truong['PATH'] = os.pathsep.join([str(FFMPEG.parent), str(FFPROBE_DIR), moi_truong.get('PATH', '')])
    kq = subprocess.run(lenh, cwd=cwd, env=moi_truong, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=gioi_han)
    if kq.returncode != 0:
        raise RuntimeError(f'{lenh[0]} lỗi: {(kq.stderr or kq.stdout)[-500:]}')
    return kq.stdout


def dung_hoat_hinh(may, ds_giong, yc):
    ten = yc['ten']
    bai_id = ten.split('/')[0]
    lt = yc['loi_thoai']
    tm = THU_MUC_TAM / ten.replace('/', '_').replace('.mp4', '')
    shutil.rmtree(tm, ignore_errors=True)
    (tm / 'artifacts').mkdir(parents=True)
    tai_san = tm / 'hyperframes' / 'assets'
    tai_san.mkdir(parents=True)
    for tep in ('BeVietnamPro-Bold.ttf', 'BeVietnamPro-Medium.ttf'):
        shutil.copy(REPO / 'assets' / 'fonts' / tep, tai_san / tep)
    shutil.copy(HOAT_HINH / 'gsap.min.js', tai_san / 'gsap.min.js')
    try:
        # 1. Đọc từng câu thoại bằng giọng của nhân vật nói câu đó
        do_dai = []
        for i, l in enumerate(lt['loi']):
            wav, dd = doc(may, ds_giong, [l['chu']], lt['nhan_vat'][l['ai']]['giong'])
            (tai_san / f'loi-{i}.wav').write_bytes(wav)
            do_dai.append(dd[0])
        (tm / 'artifacts' / 'loi_thoai.json').write_text(json.dumps(lt, ensure_ascii=False), encoding='utf-8')
        (tm / 'artifacts' / 'do_dai.json').write_text(json.dumps(do_dai), encoding='utf-8')
        # 2. Sinh trang HyperFrames rồi dựng video
        chay(['node', str(HOAT_HINH / 'tao_video.mjs'), str(tm)], tm, 120)
        chay(['npx.cmd', '--yes', 'hyperframes', 'render', '--quality', 'standard', '-o', str(tm / 'video.mp4')], tm / 'hyperframes', 1200)
        ra = tm / 'video.mp4'
        # 3. Trộn nhạc nền nhỏ dưới lời thoại (lặp cho đủ dài, to dần đầu, nhỏ dần cuối)
        if yc.get('nhac'):
            r = s.get(f'{URL}/{KHO}/nhac/{yc["nhac"]}', timeout=120)
            if r.ok:
                nhac = tm / ('nhac' + Path(yc['nhac']).suffix)
                nhac.write_bytes(r.content)
                tong = sum(do_dai) + 0.4 + 0.8
                chay([str(FFMPEG), '-hide_banner', '-y', '-i', 'video.mp4', '-stream_loop', '-1', '-i', nhac.name,
                      '-filter_complex', f'[1:a]volume=0.12,afade=t=in:d=1.5,afade=t=out:st={max(0, tong - 2):.2f}:d=2[n];[0:a][n]amix=inputs=2:duration=first:normalize=0[a]',
                      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'co-nhac.mp4'], tm, 300)
                ra = tm / 'co-nhac.mp4'
        # 4. Gửi lên kho đúng tên đã hẹn, bỏ các bản hoạt hình cũ của bài
        gui(ten, ra.read_bytes(), 'video/mp4')
        cu = [f'{bai_id}/{n}' for n in liet_ke(bai_id) if n.startswith('hh-') and f'{bai_id}/{n}' != ten]
        if cu:
            xoa(*cu)
        return sum(do_dai)
    finally:
        shutil.rmtree(tm, ignore_errors=True)


def bao_song():
    # Chạy riêng một luồng: lúc dựng video vài phút trang web vẫn biết máy nhà đang chạy
    while True:
        try:
            gui('hang-doi/song.json', json.dumps({'luc': int(time.time() * 1000)}), 'application/json')
        except Exception:
            traceback.print_exc()
        time.sleep(20)


def main():
    print('Đang nạp giọng VieNeu...', flush=True)
    # int8 nhanh hơn ~1,4 lần nhưng cần CPU có VNNI (Intel đời 12 trở lên...), máy cũ hơn đặt DO_CHINH_XAC=fp32
    may = Vieneu(precision=os.environ.get('DO_CHINH_XAC', 'int8'))
    ds_giong = {ten for _, ten in may.list_preset_voices()}
    may.infer('Xin chào.', voice=GIONG_MAC_DINH)  # làm nóng: lần đọc đầu tiên chậm gấp đôi
    threading.Thread(target=bao_song, daemon=True).start()
    print('Sẵn sàng. Để cửa sổ này chạy (thu nhỏ được).', flush=True)
    while True:
        try:
            viec = ds_viec()
            if not viec:
                time.sleep(2)
                continue
            ten = viec[0]
            ma = ten[:-5]
            r = s.get(f'{URL}/{KHO}/hang-doi/viec/{ten}', timeout=30)
            # Nhận việc: xóa phiếu trước để không làm trùng
            xoa(f'hang-doi/viec/{ten}')
            if not r.ok:
                continue
            yc = r.json()
            bat_dau = time.time()
            try:
                if yc.get('loai') == 'hoat_hinh':
                    gui('hang-doi/dang-lam.json', json.dumps({'ten': yc['ten'], 'luc': int(time.time() * 1000)}), 'application/json')
                    print(f'Dựng video hoạt hình {yc["ten"]} ({len(yc["loi_thoai"]["loi"])} câu thoại)...', flush=True)
                    giay = dung_hoat_hinh(may, ds_giong, yc)
                    print(f'Xong video hoạt hình {giay:.0f}s trong {time.time() - bat_dau:.0f}s', flush=True)
                else:
                    wav, do_dai = doc(may, ds_giong, [c for c in yc['cau'] if c.strip()], yc.get('giong'))
                    gui(f'hang-doi/xong/{ma}.wav', wav, 'audio/wav')
                    gui(f'hang-doi/xong/{ma}.json', json.dumps({'doDai': do_dai}), 'application/json')
                    print(f'Đọc xong {len(do_dai)} câu ({sum(do_dai):.0f}s âm thanh) trong {time.time() - bat_dau:.0f}s', flush=True)
            except Exception as e:
                gui(f'hang-doi/xong/{ma}.json', json.dumps({'loi': str(e)[:300]}, ensure_ascii=False), 'application/json')
                traceback.print_exc()
            finally:
                if yc.get('loai') == 'hoat_hinh':
                    xoa('hang-doi/dang-lam.json')
        except Exception:
            traceback.print_exc()  # mất mạng... thì chờ rồi thử lại
            time.sleep(10)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
