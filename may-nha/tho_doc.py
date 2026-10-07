# Thợ đọc giọng chạy trên máy nhà (VieNeu-TTS, giọng Hải Đăng) cho trang duyệt bài.
# Không mở cổng nào, không cần ngrok: cứ vài giây lấy "phiếu việc" trang web để trong kho Supabase
# (video-tiktok/hang-doi/viec/<id>.json = {"cau": [...], "giong": "..."}), đọc xong gửi lên
# hang-doi/xong/<id>.wav rồi hang-doi/xong/<id>.json = {"doDai": [...]} (lỗi: {"loi": "..."}).
# Cứ 20 giây ghi hang-doi/song.json để trang web biết máy nhà đang chạy.
# Khóa Supabase đọc từ .env.local của repo (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
import io
import json
import os
import sys
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


def gui(duong, du_lieu, kieu):
    r = s.post(f'{URL}/{KHO}/{duong}', data=du_lieu, headers={'content-type': kieu, 'x-upsert': 'true'}, timeout=60)
    r.raise_for_status()


def ds_viec():
    r = s.post(f'{URL}/list/{KHO}', json={'prefix': 'hang-doi/viec', 'limit': 50, 'sortBy': {'column': 'created_at', 'order': 'asc'}}, timeout=30)
    r.raise_for_status()
    return [f['name'] for f in r.json() if f['name'].endswith('.json')]


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


def main():
    print('Đang nạp giọng VieNeu...', flush=True)
    # int8 nhanh hơn ~1,4 lần nhưng cần CPU có VNNI (Intel đời 12 trở lên...), máy cũ hơn đặt DO_CHINH_XAC=fp32
    may = Vieneu(precision=os.environ.get('DO_CHINH_XAC', 'int8'))
    ds_giong = {ten for _, ten in may.list_preset_voices()}
    may.infer('Xin chào.', voice=GIONG_MAC_DINH)  # làm nóng: lần đọc đầu tiên chậm gấp đôi
    print('Sẵn sàng. Để cửa sổ này chạy (thu nhỏ được).', flush=True)
    lan_song = 0.0
    while True:
        try:
            if time.time() - lan_song > 20:
                gui('hang-doi/song.json', json.dumps({'luc': int(time.time() * 1000)}), 'application/json')
                lan_song = time.time()
            viec = ds_viec()
            if not viec:
                time.sleep(2)
                continue
            ten = viec[0]
            ma = ten[:-5]
            r = s.get(f'{URL}/{KHO}/hang-doi/viec/{ten}', timeout=30)
            # Nhận việc: xóa phiếu trước để không làm trùng
            s.delete(f'{URL}/{KHO}', json={'prefixes': [f'hang-doi/viec/{ten}']}, timeout=30)
            if not r.ok:
                continue
            yc = r.json()
            bat_dau = time.time()
            try:
                wav, do_dai = doc(may, ds_giong, [c for c in yc['cau'] if c.strip()], yc.get('giong'))
                gui(f'hang-doi/xong/{ma}.wav', wav, 'audio/wav')
                gui(f'hang-doi/xong/{ma}.json', json.dumps({'doDai': do_dai}), 'application/json')
                print(f'Đọc xong {len(do_dai)} câu ({sum(do_dai):.0f}s âm thanh) trong {time.time() - bat_dau:.0f}s', flush=True)
            except Exception as e:
                gui(f'hang-doi/xong/{ma}.json', json.dumps({'loi': str(e)[:300]}), 'application/json')
                traceback.print_exc()
        except Exception:
            traceback.print_exc()  # mất mạng... thì chờ rồi thử lại
            time.sleep(10)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
