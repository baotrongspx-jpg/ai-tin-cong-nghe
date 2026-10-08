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
import re
import shutil
import unicodedata
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

from kiem_tra_video import kiem_tra_video

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
# Mỗi video dựng xong lưu thêm một bản trên máy nhà, tên theo ngày + tiêu đề bài
THU_MUC_LUU = Path(os.environ.get('HOAT_HINH_LUU', r'C:\Users\Admin\OneDrive\Desktop\Video-Hoat-Hinh'))
# Video YouTube dài (trang /youtube): dựng từng phần rồi ghép, chỉ lưu trên máy nhà (quá nặng để gửi lên kho)
THU_MUC_YT = Path(os.environ.get('YOUTUBE_LUU', r'C:\Users\Admin\OneDrive\Desktop\Video-YouTube'))


def gui(duong, du_lieu, kieu):
    r = s.post(f'{URL}/{KHO}/{duong}', data=du_lieu, headers={'content-type': kieu, 'x-upsert': 'true'}, timeout=300)
    r.raise_for_status()


def xoa(*duong):
    s.delete(f'{URL}/{KHO}', json={'prefixes': list(duong)}, timeout=30)


def liet_ke(thu_muc, day_du=False):
    r = s.post(f'{URL}/list/{KHO}', json={'prefix': thu_muc, 'limit': 200, 'sortBy': {'column': 'created_at', 'order': 'asc'}}, timeout=30)
    r.raise_for_status()
    return r.json() if day_du else [f['name'] for f in r.json()]


def ds_viec():
    # Thứ tự: đọc giọng (ngắn, có người đang chờ) → video hoạt hình người dùng đang bấm Xem trước (hang-doi/uu-tien)
    # → video hoạt hình dựng sẵn trong nền → từng phần video YouTube (yt-, lâu nhất, làm xen giữa các việc kia);
    # cùng nhóm thì việc nào đặt trước làm trước
    ten = [n for n in liet_ke('hang-doi/viec') if n.endswith('.json')]
    uu_tien = set(liet_ke('hang-doi/uu-tien'))
    return sorted(ten, key=lambda n: 3 if n.startswith('yt-') else 0 if not n.startswith('hh-') else 1 if n in uu_tien else 2)


def don_rac():
    # Kết quả đọc giọng không ai lấy (trang web đã thôi chờ) và dấu ưu tiên cũ: xoá sau 1 giờ
    cu = []
    for thu_muc in ('hang-doi/xong', 'hang-doi/uu-tien', 'hang-doi/tien-do'):
        for f in liet_ke(thu_muc, day_du=True):
            luc = f.get('created_at') or ''
            if luc and time.time() - time.mktime(time.strptime(luc[:19], '%Y-%m-%dT%H:%M:%S')) + time.timezone > 3600:
                cu.append(f'{thu_muc}/{f["name"]}')
    if cu:
        xoa(*cu)


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


# Chỉnh giọng theo nhân vật sau khi đọc: Mèo Mun nâng tông 3,5 nửa cung, nói nhanh hơn 6%, sáng tiếng (chủ trang chọn
# bản "tươi hơn nhiều" ngày 08/10/2026). Trả (wav mới, độ dài giây).
CHINH_GIONG = {'meo': 3.5}


def chinh_giong(wav, nua_cung):
    with wave.open(io.BytesIO(wav)) as w:
        sr = w.getframerate()
    ty_le = 2 ** (nua_cung / 12)
    loc = f'asetrate={sr}*{ty_le:.4f},aresample={sr},atempo={1 / ty_le * 1.06:.4f},equalizer=f=3200:t=q:w=1:g=4,equalizer=f=200:t=q:w=1:g=-3'
    # Ra PCM thô rồi tự ghi đầu tệp WAV (WAV ghi qua pipe không có độ dài đúng)
    kq = subprocess.run([str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-f', 'wav', '-i', 'pipe:0', '-af', loc, '-ac', '1', '-ar', str(sr), '-f', 's16le', 'pipe:1'],
                        input=wav, capture_output=True, timeout=60)
    if kq.returncode != 0 or len(kq.stdout) < 100:
        return wav, None
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(kq.stdout)
    return buf.getvalue(), round(len(kq.stdout) / 2 / sr, 3)


def ten_tep(tieu_de):
    # Tiêu đề → tên tệp không dấu, an toàn cho Windows
    t = unicodedata.normalize('NFD', tieu_de or 'video').replace('đ', 'd').replace('Đ', 'D')
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    t = re.sub(r'[^A-Za-z0-9]+', '-', t).strip('-')[:70]
    return t or 'video'


class TienDo:
    # Ghi tiến độ (phần trăm + bước đang làm) lên kho để trang web vẽ thanh chạy; tối đa 3 giây ghi một lần.
    # `duong`: chỗ ghi khác (video YouTube ghi ở youtube/<dự án>/tien-do.json), `them`: thông tin kèm (phần đang dựng)
    def __init__(self, ma, duong=None, them=None):
        self.duong = duong or f'hang-doi/tien-do/{ma}.json'
        self.them = them or {}
        self.lan = 0.0
        self.cuoi = None

    def bao(self, phan_tram, buoc, ep=False):
        phan_tram = int(max(0, min(100, phan_tram)))
        if not ep and (self.cuoi == (phan_tram, buoc) or time.time() - self.lan < 3):
            return
        self.lan, self.cuoi = time.time(), (phan_tram, buoc)
        try:
            gui(self.duong, json.dumps({**self.them, 'phanTram': phan_tram, 'buoc': buoc, 'luc': int(time.time() * 1000)}, ensure_ascii=False), 'application/json')
        except Exception:
            traceback.print_exc()

    def xong(self):
        xoa(self.duong)


def chay_theo_doi(lenh, cwd, gioi_han, khi_co_phan_tram):
    # Chạy lệnh, đọc đầu ra từng đoạn, thấy "NN%" thì báo (thanh tiến độ của HyperFrames ghi đè dòng bằng \r)
    moi_truong = dict(os.environ)
    moi_truong['PATH'] = os.pathsep.join([str(FFMPEG.parent), str(FFPROBE_DIR), moi_truong.get('PATH', '')])
    p = subprocess.Popen(lenh, cwd=cwd, env=moi_truong, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    het_gio = time.time() + gioi_han
    duoi = ''
    while True:
        khuc = p.stdout.read1(4096)
        if not khuc:
            break
        duoi = (duoi + khuc.decode('utf-8', 'replace'))[-3000:]
        so = re.findall(r'(\d{1,3})%', duoi[-200:])
        if so:
            khi_co_phan_tram(int(so[-1]))
        if time.time() > het_gio:
            p.kill()
            raise RuntimeError(f'{lenh[0]} chạy quá {gioi_han} giây')
    if p.wait() != 0:
        raise RuntimeError(f'{lenh[0]} lỗi: {duoi[-500:]}')


def chay(lenh, cwd, gioi_han):
    moi_truong = dict(os.environ)
    moi_truong['PATH'] = os.pathsep.join([str(FFMPEG.parent), str(FFPROBE_DIR), moi_truong.get('PATH', '')])
    kq = subprocess.run(lenh, cwd=cwd, env=moi_truong, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=gioi_han)
    if kq.returncode != 0:
        raise RuntimeError(f'{lenh[0]} lỗi: {(kq.stderr or kq.stdout)[-500:]}')
    return kq.stdout


UA_WIKI = 'CongNghe24H/1.0 (https://ai-tin-cong-nghe-wpy7.vercel.app; phim tieu su)'


def tai_anh_wiki(loi, tai_san):
    # Phim tiểu sử: câu có "anh_wiki" (ảnh Wikimedia Commons) → tải về assets/anh-<n>.<đuôi>, ghi tên tệp vào "tep".
    # Dùng requests riêng (KHÔNG dùng phiên Supabase để khỏi gửi khoá sang Wikimedia). Ảnh lỗi thì bỏ, câu vẫn dựng.
    da_tai = {}
    for l in loi:
        a = l.get('anh_wiki')
        if not a:
            continue
        url = a.get('url', '')
        if url not in da_tai:
            da_tai[url] = None
            try:
                r = requests.get(url, headers={'User-Agent': UA_WIKI}, timeout=60)
                kieu = r.headers.get('content-type', '')
                if r.ok and kieu.startswith('image/'):
                    duoi = {'image/png': '.png', 'image/webp': '.webp'}.get(kieu.split(';')[0], '.jpg')
                    ten = f'anh-{len([v for v in da_tai.values() if v])}{duoi}'
                    (tai_san / ten).write_bytes(r.content)
                    da_tai[url] = ten
            except Exception:
                traceback.print_exc()
        if da_tai[url]:
            a['tep'] = da_tai[url]
        else:
            l.pop('anh_wiki', None)


def dung_video(may, ds_giong, lt, tm, td, fps=30, gioi_han=1500):
    # Đọc từng câu thoại bằng giọng của nhân vật nói câu đó, sinh trang HyperFrames rồi dựng ra tm/video.mp4.
    # Trả độ dài (giây) từng câu. Tiến độ: đọc giọng 10-30%, dựng hình 30-95%.
    shutil.rmtree(tm, ignore_errors=True)
    (tm / 'artifacts').mkdir(parents=True)
    tai_san = tm / 'hyperframes' / 'assets'
    tai_san.mkdir(parents=True)
    for tep in ('BeVietnamPro-Bold.ttf', 'BeVietnamPro-Medium.ttf'):
        shutil.copy(REPO / 'assets' / 'fonts' / tep, tai_san / tep)
    shutil.copy(HOAT_HINH / 'gsap.min.js', tai_san / 'gsap.min.js')
    # Hiệu ứng âm thanh + âm nền theo bối cảnh (tao_video.mjs chèn khi AI chọn)
    for tep in (HOAT_HINH / 'am-thanh').glob('*.wav'):
        shutil.copy(tep, tai_san / tep.name)
    tai_anh_wiki(lt['loi'], tai_san)
    do_dai = []
    for i, l in enumerate(lt['loi']):
        td.bao(10 + 20 * i / len(lt['loi']), f'Đọc giọng câu {i + 1}/{len(lt["loi"])}')
        wav, dd = doc(may, ds_giong, [l['chu']], lt['nhan_vat'][l['ai']]['giong'])
        if l['ai'] in CHINH_GIONG:
            wav2, giay = chinh_giong(wav, CHINH_GIONG[l['ai']])
            if giay:
                wav, dd = wav2, [giay]
        (tai_san / f'loi-{i}.wav').write_bytes(wav)
        do_dai.append(dd[0])
    (tm / 'artifacts' / 'loi_thoai.json').write_text(json.dumps(lt, ensure_ascii=False), encoding='utf-8')
    (tm / 'artifacts' / 'do_dai.json').write_text(json.dumps(do_dai), encoding='utf-8')
    chay(['node', str(HOAT_HINH / 'tao_video.mjs'), str(tm)], tm, 120)
    td.bao(30, 'Dựng hình 0%', ep=True)
    chay_theo_doi(['npx.cmd', '--yes', 'hyperframes', 'render', '--quality', 'standard', '--fps', str(fps), '-o', str(tm / 'video.mp4')],
                  tm / 'hyperframes', gioi_han, lambda pt: td.bao(30 + 0.65 * pt, f'Dựng hình {pt}%'))
    return do_dai


def do_dai_video(tep):
    # Đọc "Duration: hh:mm:ss.xx" ffmpeg in ra
    kq = subprocess.run([str(FFMPEG), '-hide_banner', '-i', str(tep)], capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', kq.stderr or '')
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else None


def tron_nhac_nen(thu_muc, vao, ra, ten_nhac, am_luong, td):
    # Nhạc nền dưới cả video: lặp cho đủ dài, to dần đầu / nhỏ dần cuối, TỰ NHỎ ĐI khi có lời nói (nén theo giọng —
    # sidechain), nghe rõ hơn ở chỗ chuyển cảnh / khoảng lặng / màn kết. Lỗi thì trả False (dùng bản không nhạc).
    try:
        td.bao(98, 'Trộn nhạc nền', ep=True)
        r = s.get(f'{URL}/{KHO}/nhac/{ten_nhac}', timeout=120)
        if not r.ok:
            return False
        tep_nhac = thu_muc / ('nhac-nen' + Path(ten_nhac).suffix)
        tep_nhac.write_bytes(r.content)
        tong = do_dai_video(vao) or 600
        loc = (f'[0:a]asplit=2[giong][dieu];[1:a]volume={am_luong / 100:.2f},afade=t=in:d=2,afade=t=out:st={max(0, tong - 4):.2f}:d=4[nhac];'
               '[nhac][dieu]sidechaincompress=threshold=0.015:ratio=8:attack=20:release=450[nhacnho];'
               '[giong][nhacnho]amix=inputs=2:duration=first:normalize=0[a]')
        chay([str(FFMPEG), '-hide_banner', '-y', '-i', vao.name, '-stream_loop', '-1', '-i', tep_nhac.name, '-filter_complex', loc,
              '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', f'{tong:.2f}', '-movflags', '+faststart', ra.name], thu_muc, 1800)
        tep_nhac.unlink(missing_ok=True)
        return True
    except Exception:
        traceback.print_exc()
        return False


def tao_anh_bia(thu_muc, goc, thong_tin):
    # Ảnh bìa 1280x720 (hoat-hinh/tao_anh_bia.mjs) lưu cạnh video và gửi lên kho để trang web hiện / tải. Lỗi thì bỏ qua.
    try:
        vao = thu_muc / 'anh-bia.json'
        ra = thu_muc / 'anh-bia.png'
        vao.write_text(json.dumps(thong_tin, ensure_ascii=False), encoding='utf-8')
        chay(['node', str(HOAT_HINH / 'tao_anh_bia.mjs'), str(vao), str(ra)], thu_muc, 180)
        vao.unlink(missing_ok=True)
        gui(f'{goc}/anh-bia.png', ra.read_bytes(), 'image/png')
        return True
    except Exception:
        traceback.print_exc()
        return False


def dung_youtube(may, ds_giong, yc):
    # Một phần của video YouTube dài (lib/youtube.ts): {"du_an", "tieu_de", "phan" (1, 2...), "ma_phan": [mã từng phần],
    # "loi_thoai"}. Dựng xong lưu phan-<số>-<mã>.mp4 trong thư mục dự án ở máy nhà, báo youtube/<dự án>/phan-<số>.json.
    # Đủ mọi phần (đúng mã hiện tại) thì ghép thành một video, báo youtube/<dự án>/xong.json.
    du_an, k, ds_ma = yc['du_an'], yc['phan'], yc['ma_phan']
    goc = f'youtube/{du_an}'
    thu_muc = THU_MUC_YT / f'{ten_tep(yc.get("tieu_de"))}-{du_an[:6]}'
    thu_muc.mkdir(parents=True, exist_ok=True)
    tep = thu_muc / f'phan-{k:02d}-{ds_ma[k - 1]}.mp4'
    td = TienDo(None, duong=f'{goc}/tien-do.json', them={'phan': k})
    try:
        if not tep.exists():
            tm = THU_MUC_TAM / f'yt-{du_an}-{k}'
            try:
                # Phần dài vài phút: 24 khung hình/giây cho nhanh, cho dựng tới ~40 giây mỗi giây video
                uoc = sum(len(l['chu']) for l in yc['loi_thoai']['loi']) / 14
                dung_video(may, ds_giong, yc['loi_thoai'], tm, td, fps=24, gioi_han=max(1800, int(uoc * 40)))
                shutil.move(str(tm / 'video.mp4'), str(tep))
            finally:
                shutil.rmtree(tm, ignore_errors=True)
        for cu in thu_muc.glob(f'phan-{k:02d}-*.mp4'):
            if cu != tep:
                cu.unlink(missing_ok=True)
        gui(f'{goc}/phan-{k}.json', json.dumps({'xong': True, 'ma': ds_ma[k - 1], 'luc': int(time.time() * 1000)}), 'application/json')
        cac_phan = [thu_muc / f'phan-{j + 1:02d}-{m}.mp4' for j, m in enumerate(ds_ma)]
        if all(p.exists() for p in cac_phan):
            td.bao(97, 'Ghép các phần thành một video', ep=True)
            ra = thu_muc / f'{ten_tep(yc.get("tieu_de"))}.mp4'
            (thu_muc / 'ds.txt').write_text('\n'.join(f"file '{p.name}'" for p in cac_phan), encoding='utf-8')
            ghep = thu_muc / 'ghep-tam.mp4'
            chay([str(FFMPEG), '-hide_banner', '-y', '-f', 'concat', '-safe', '0', '-i', 'ds.txt', '-c', 'copy', '-movflags', '+faststart', ghep.name], thu_muc, 1800)
            (thu_muc / 'ds.txt').unlink(missing_ok=True)
            nhac = yc.get('nhac')
            if nhac and tron_nhac_nen(thu_muc, ghep, ra, nhac, yc.get('am_luong_nhac', 30), td):
                ghep.unlink(missing_ok=True)
            else:
                nhac = None
                shutil.move(str(ghep), str(ra))
            # Tự kiểm tra (độ to tiếng chuẩn YouTube, im lặng, hình đen) + ảnh bìa
            td.bao(99, 'Tự kiểm tra video, vẽ ảnh bìa', ep=True)
            try:
                kiem_tra = kiem_tra_video(ra)
            except Exception as e:
                traceback.print_exc()
                kiem_tra = {'do_dai': do_dai_video(ra), 'lufs': None, 'lufs_goc': None, 'da_chinh_am': False, 'im_lang': [], 'man_den': [],
                            'ghi_chu': [f'Máy nhà chưa tự kiểm tra được: {str(e)[:150]}']}
            anh_bia = bool(yc.get('anh_bia')) and tao_anh_bia(thu_muc, goc, yc['anh_bia'])
            gui(f'{goc}/xong.json', json.dumps({'tep': str(ra), 'ma': ds_ma, 'nhac': nhac, 'kiem_tra': kiem_tra, 'anh_bia': anh_bia,
                                                'luc': int(time.time() * 1000)}, ensure_ascii=False), 'application/json')
    finally:
        td.xong()


def dung_hoat_hinh(may, ds_giong, yc, td):
    ten = yc['ten']
    bai_id = ten.split('/')[0]
    lt = yc['loi_thoai']
    tm = THU_MUC_TAM / ten.replace('/', '_').replace('.mp4', '')
    try:
        do_dai = dung_video(may, ds_giong, lt, tm, td)
        ra = tm / 'video.mp4'
        # 3. Trộn nhạc nền nhỏ dưới lời thoại (lặp cho đủ dài, to dần đầu, nhỏ dần cuối)
        td.bao(96, 'Trộn nhạc và lưu', ep=True)
        if yc.get('nhac'):
            r = s.get(f'{URL}/{KHO}/nhac/{yc["nhac"]}', timeout=120)
            if r.ok:
                nhac = tm / ('nhac' + Path(yc['nhac']).suffix)
                nhac.write_bytes(r.content)
                tong = sum(do_dai) + 0.4 + 0.8
                chay([str(FFMPEG), '-hide_banner', '-y', '-i', 'video.mp4', '-stream_loop', '-1', '-i', nhac.name,
                      '-filter_complex', f'[1:a]volume={yc.get("am_luong", 12) / 100:.2f},afade=t=in:d=1.5,afade=t=out:st={max(0, tong - 2):.2f}:d=2[n];[0:a][n]amix=inputs=2:duration=first:normalize=0[a]',
                      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'co-nhac.mp4'], tm, 300)
                ra = tm / 'co-nhac.mp4'
        # 4. Gửi lên kho đúng tên đã hẹn, bỏ các bản hoạt hình cũ của bài
        gui(ten, ra.read_bytes(), 'video/mp4')
        # Lưu thêm một bản trên máy nhà (lỗi thì thôi, video vẫn đã lên kho)
        try:
            THU_MUC_LUU.mkdir(parents=True, exist_ok=True)
            shutil.copy(ra, THU_MUC_LUU / f'{time.strftime("%Y-%m-%d")}-{ten_tep(yc.get("tieu_de"))}.mp4')
        except Exception:
            traceback.print_exc()
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
    lan_don = 0.0
    while True:
        try:
            if time.time() - lan_don > 600:
                don_rac()
                lan_don = time.time()
            viec = ds_viec()
            if not viec:
                time.sleep(2)
                continue
            ten = viec[0]
            ma = ten[:-5]
            r = s.get(f'{URL}/{KHO}/hang-doi/viec/{ten}', timeout=30)
            # Nhận việc: xóa phiếu (và dấu ưu tiên) trước để không làm trùng
            xoa(f'hang-doi/viec/{ten}', f'hang-doi/uu-tien/{ten}')
            if not r.ok:
                continue
            yc = r.json()
            bat_dau = time.time()
            try:
                if yc.get('loai') == 'hoat_hinh':
                    gui('hang-doi/dang-lam.json', json.dumps({'ten': yc['ten'], 'luc': int(time.time() * 1000)}), 'application/json')
                    print(f'Dựng video hoạt hình {yc["ten"]} ({len(yc["loi_thoai"]["loi"])} câu thoại)...', flush=True)
                    td = TienDo(ma)
                    try:
                        giay = dung_hoat_hinh(may, ds_giong, yc, td)
                    finally:
                        td.xong()
                    print(f'Xong video hoạt hình {giay:.0f}s trong {time.time() - bat_dau:.0f}s', flush=True)
                elif yc.get('loai') == 'xoa_youtube':
                    # Trang web đã xoá dự án: xoá thư mục video (…-<6 ký tự đầu mã>) và thư mục tạm của nó trên máy nhà
                    du_an = yc['du_an']
                    so = 0
                    for tm in [*THU_MUC_YT.glob(f'*-{du_an[:6]}'), *THU_MUC_TAM.glob(f'yt-{du_an}-*')]:
                        if tm.is_dir():
                            shutil.rmtree(tm, ignore_errors=True)
                            so += 1
                    print(f'Đã xoá {so} thư mục video của dự án {du_an[:6]}', flush=True)
                elif yc.get('loai') == 'youtube':
                    print(f'Dựng video YouTube "{yc.get("tieu_de")}" phần {yc["phan"]}/{len(yc["ma_phan"])} ({len(yc["loi_thoai"]["loi"])} câu thoại)...', flush=True)
                    dung_youtube(may, ds_giong, yc)
                    print(f'Xong phần {yc["phan"]} trong {time.time() - bat_dau:.0f}s', flush=True)
                else:
                    wav, do_dai = doc(may, ds_giong, [c for c in yc['cau'] if c.strip()], yc.get('giong'))
                    gui(f'hang-doi/xong/{ma}.wav', wav, 'audio/wav')
                    gui(f'hang-doi/xong/{ma}.json', json.dumps({'doDai': do_dai}), 'application/json')
                    print(f'Đọc xong {len(do_dai)} câu ({sum(do_dai):.0f}s âm thanh) trong {time.time() - bat_dau:.0f}s', flush=True)
            except Exception as e:
                if yc.get('loai') == 'youtube':
                    loi = {'loi': str(e)[:300], 'ma': yc['ma_phan'][yc['phan'] - 1], 'luc': int(time.time() * 1000)}
                    gui(f'youtube/{yc["du_an"]}/phan-{yc["phan"]}.json', json.dumps(loi, ensure_ascii=False), 'application/json')
                else:
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
