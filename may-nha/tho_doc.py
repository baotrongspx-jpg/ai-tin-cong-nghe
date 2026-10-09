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
from PIL import Image
import requests
from vieneu import Vieneu

from kiem_tra_video import kiem_tra_video
import ai_may_nha

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
# Thư mục tạm khi dựng hình (khung hình HyperFrames): ổ D nếu có, không thì để mặc định (TEMP của Windows)
TAM_DUNG_HINH = Path(os.environ.get('TAM_DUNG_HINH', r'D:\tam-dung-hinh')) if Path('D:/').exists() else None


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
    return sorted(ten, key=lambda n: 3 if n.startswith(('yt-', 'yts-')) else 0 if not n.startswith('hh-') else 1 if n in uu_tien else 2)


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


def ghi_wav(phan, sr):
    pcm = (np.clip(np.concatenate(phan), -1, 1) * 32767).astype('<i2').tobytes()
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)
    return buf.getvalue()


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
    return ghi_wav(phan, sr), do_dai


def doc_rieng(may, ds_giong, cac_cau, giong):
    # Đọc cả loạt câu cùng một giọng trong một lần (card NVIDIA: nhanh ~9 lần so với từng câu), trả [(wav, giây)] từng câu.
    # Lỗi (vd thiếu bộ nhớ card khi AI máy nhà đang chiếm) thì đọc lại từng câu.
    giong = giong if giong in ds_giong else GIONG_MAC_DINH
    try:
        doan = may.infer_batch(cac_cau, voice=giong)
    except Exception:
        traceback.print_exc()
        doan = [may.infer_batch([c], voice=giong)[0] for c in cac_cau]
    sr = may.sample_rate
    lang = np.zeros(int(sr * NGAT), dtype=np.float32)
    ra = []
    for a in doan:
        a = np.asarray(a, dtype=np.float32).reshape(-1)
        ra.append((ghi_wav([a, lang], sr), round((len(a) + len(lang)) / sr, 3)))
    return ra


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


# Bảng tin chung "máy nhà đang làm gì" (hang-doi/hien-tai.json) cho trang web: việc nào (mã, dự án, phần), bước nào, lúc
# nào. Ghi khi nhận việc, mỗi lần báo tiến độ, xoá khi xong việc. VIEC_HIEN_TAI: việc đang làm (main đặt).
VIEC_HIEN_TAI = {}


def bao_hien_tai(buoc, phan_tram=None):
    if not VIEC_HIEN_TAI:
        return
    try:
        gui('hang-doi/hien-tai.json', json.dumps({**VIEC_HIEN_TAI, 'buoc': buoc, 'phanTram': phan_tram, 'luc': int(time.time() * 1000)},
                                                 ensure_ascii=False), 'application/json')
    except Exception:
        traceback.print_exc()


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
            bao_hien_tai(buoc, phan_tram)
        except Exception:
            traceback.print_exc()

    def xong(self):
        xoa(self.duong)


def chay_theo_doi(lenh, cwd, gioi_han, khi_co_phan_tram):
    # Chạy lệnh, đọc đầu ra từng đoạn, thấy "NN%" thì báo (thanh tiến độ của HyperFrames ghi đè dòng bằng \r)
    moi_truong = dict(os.environ)
    moi_truong['PATH'] = os.pathsep.join([str(FFMPEG.parent), str(FFPROBE_DIR), moi_truong.get('PATH', '')])
    # Khung hình tạm của HyperFrames (~1,5 GB mỗi phút video) để ở ổ D: ổ C gần đầy (bộ nhớ ảo Windows phình lên)
    if TAM_DUNG_HINH:
        TAM_DUNG_HINH.mkdir(parents=True, exist_ok=True)
        moi_truong['TEMP'] = moi_truong['TMP'] = str(TAM_DUNG_HINH)
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


# Ảnh nền hoạt hình cho từng cảnh video YouTube (tranh vẽ Pixabay: dùng thương mại được, không bắt buộc ghi nguồn). Cụm từ
# khoá AI đặt ở câu đầu cảnh (anh_nen, 4-8 từ tiếng Anh); kịch bản cũ chưa có thì lấy theo bối cảnh vẽ. Trường quay để
# trống: giữ cảnh vẽ của kênh. AI máy nhà nhìn từng tranh ứng viên, chỉ nhận tranh là PHONG CẢNH hoạt hình phủ kín khung,
# không có nhân vật lớn (Pixabay "cartoon" hay trả tranh nhân vật / hình dán).
TU_KHOA_CANH = {
    'pho_florida': 'sunny city street with shops and palm trees', 'may_chu': 'data center server room with glowing racks',
    'don_canh_sat': 'police station office interior', 'phong_khach': 'cozy living room interior with sofa',
    'van_phong': 'modern tech company office with computers', 'vu_tru': 'outer space with earth and stars',
    'cua_hang': 'electronics store interior with phones on shelves', 'thanh_pho_dem': 'big city skyline at night with lights',
    'nong_thon': 'vietnamese countryside rice field with mountains', 'truong_hoc': 'school classroom with blackboard and desks',
    'benh_vien': 'hospital ward interior with beds', 'nha_may': 'factory assembly line with robot arms',
    'cong_truong': 'construction site with cranes and buildings', 'san_bay': 'airport terminal with planes outside window',
    'bai_bien': 'tropical beach with palm trees and sea', 'nui_rung': 'mountain forest landscape with waterfall',
    'cho': 'asian street market with stalls and lanterns', 'nha_hang': 'restaurant interior with tables and kitchen',
    'san_van_dong': 'football stadium with crowd and lights', 'phong_hop': 'business meeting room with big table',
    'phong_thi_nghiem': 'science laboratory with equipment', 'hoi_truong': 'grand conference hall with stage and podium',
    'cang_bien': 'seaport with container ships and cranes', 'nha_ngheo': 'old poor wooden house in village',
    'san_khau': 'concert stage with spotlights', 'thanh_pho_tuyet': 'snowy european city street in winter',
    'thu_vien': 'old library with tall bookshelves', 'san_chung_khoan': 'stock exchange trading floor with screens',
    'thao_nguyen': 'mongolian steppe grassland with yurts', 'cung_dien': 'ancient chinese royal palace courtyard',
    'chien_truong': 'ancient battlefield with smoke and flags', 'thanh_co': 'medieval stone castle with towers',
    'lang_xua': 'old vietnamese village with banyan tree', 'sa_mac': 'desert dunes landscape at sunset',
    'bien_ca': 'old sailing ship on the open ocean', 'den_chua': 'asian pagoda temple in the mountains',
    'ga_ra': 'garage workshop with tools on the wall', 'be_phong': 'rocket launch pad at dawn',
    'phong_thu': 'music recording studio with microphone', 'phim_truong': 'film studio set with cameras and lights',
}
KHO_PIXABAY = THU_MUC_TAM.parent / 'anh-pixabay'  # tranh đã tải (theo mã) + kết quả tìm (Pixabay yêu cầu nhớ 24 giờ) + điểm AI chấm


def doc_nho(ten):
    try:
        return json.loads((KHO_PIXABAY / ten).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def ghi_nho(ten, du_lieu):
    KHO_PIXABAY.mkdir(parents=True, exist_ok=True)
    (KHO_PIXABAY / ten).write_text(json.dumps(du_lieu, ensure_ascii=False), encoding='utf-8')


_lan_goi_pixabay = [0.0]
NGHI_PIXABAY = 1800  # bị Pixabay chặn (429) thì thôi gọi Pixabay 30 phút: cảnh dùng nền vẽ / tranh đã tải, dựng không phải chờ


def pixabay_dang_chan():
    try:
        return time.time() < float((KHO_PIXABAY / 'nghi-den.txt').read_text())
    except (OSError, ValueError):
        return False


def goi_pixabay(url, params=None):
    # Mọi lần gọi pixabay.com (tìm + tải tranh lớn) đều tính vào giới hạn ~100 lượt / phút dùng chung với trang tin:
    # cách nhau tối thiểu 1 giây (≤ 60 / phút). Bị chặn (429) thì KHÔNG thử lại (gọi tiếp lúc đang bị chặn làm Pixabay chặn
    # lâu hơn, và mỗi cảnh chờ vài phút làm phần video kẹt rất lâu): ghi giờ được gọi lại vào nghi-den.txt rồi báo lỗi ngay.
    tep = KHO_PIXABAY / 'nghi-den.txt'
    try:
        if time.time() < float(tep.read_text()):
            raise RuntimeError('Pixabay đang tạm chặn, bỏ qua')
    except (OSError, ValueError):
        pass
    cho = _lan_goi_pixabay[0] + 1.0 - time.time()
    if cho > 0:
        time.sleep(cho)
    _lan_goi_pixabay[0] = time.time()
    r = requests.get(url, params=params, timeout=60)
    if r.status_code == 429:
        KHO_PIXABAY.mkdir(parents=True, exist_ok=True)
        tep.write_text(str(time.time() + NGHI_PIXABAY))
        print(f'Pixabay chặn (429): tạm không dùng tranh Pixabay {NGHI_PIXABAY // 60} phút, cảnh giữ nền vẽ', flush=True)
    r.raise_for_status()
    return r


def tim_pixabay(tu_khoa):
    # Tranh hoạt hình ngang cho cụm từ khoá: [{id, url (lớn), xem (bản nhỏ cho AI nhìn)}], nhớ 24 giờ. Cụm dài ít kết quả
    # thì bớt dần từ cuối (giữ tối thiểu 2 từ). Không có khoá / lỗi mạng thì trả rỗng.
    if not env.get('PIXABAY_KEY'):
        return []
    nho = doc_nho('tim-hoat-hinh-2.json')
    o = nho.get(tu_khoa)
    if o and time.time() - o['luc'] < 86400:
        return o['anh']
    tu = tu_khoa.split()
    anh = []
    try:
        while True:
            r = goi_pixabay('https://pixabay.com/api/', {'key': env['PIXABAY_KEY'], 'q': f'{" ".join(tu)} cartoon'[:100], 'image_type': 'illustration',
                                                          'orientation': 'horizontal', 'safesearch': 'true', 'order': 'popular',
                                                          'min_width': 1280, 'per_page': 30})
            # Ảnh xem trước cho AI chấm lấy ở cdn.pixabay.com (không tính lượt API) — bản 640 suy từ previewURL
            anh = [{'id': h['id'], 'url': h['largeImageURL'], 'xem': h['previewURL'].replace('_150.', '_640.'), 'xem_nho': h['previewURL']}
                   for h in r.json().get('hits', [])]
            if len(anh) >= 6 or len(tu) <= 2:
                break
            tu = tu[:-1]
    except Exception as e:
        print(f'Không tìm được tranh "{tu_khoa}": {str(e)[:120]}', flush=True)
        return anh
    nho[tu_khoa] = {'luc': time.time(), 'anh': anh}
    ghi_nho('tim-hoat-hinh-2.json', nho)
    return anh


HOI_ANH = '''Look at this image. It may become the background behind two cartoon mascots in an animated video about: "{tu_khoa}".
Answer in JSON:
- mo_ta: one English sentence describing everything you see, starting with the main subject (mention every person, character or animal).
- canh: true only if the image is a PLACE or SCENERY that fills the whole frame (a street, a room, a landscape, a building), false if it is mainly a character, a portrait, an object, an icon, a sticker, a logo or text on a plain background.
- nguoi: true if a person, animal or character is the main subject or is large in the frame.
- hoat_hinh: true if it is drawn (cartoon, anime, flat illustration, painting), false if it looks like a real photo or a photorealistic 3D render.
- khop: 0 to 10, how well the place matches "{tu_khoa}".'''
# mo_ta đứng đầu để AI tả trước rồi mới phán: mô hình nhỏ hay trả lời sai câu có / không về người, nhưng tả thì đúng
SCHEMA_ANH = {'type': 'object', 'properties': {'mo_ta': {'type': 'string'}, 'canh': {'type': 'boolean'}, 'nguoi': {'type': 'boolean'},
                                               'hoat_hinh': {'type': 'boolean'}, 'khop': {'type': 'integer'}},
              'required': ['mo_ta', 'canh', 'nguoi', 'hoat_hinh', 'khop']}
# Lời tả có người / nhân vật / chi tiết nhạy cảm thì loại, dù AI phán thế nào
TU_CO_NGUOI = re.compile(r'\b(wom[ae]n|m[ae]n|girls?|boys?|lady|ladies|person|people|persons|human|child|children|kids?|figures?|characters?|'
                         r'warriors?|soldiers?|couple|crowd|face|portrait|silhouette|bikini|lingerie|naked|nude|sexy|cleavage|blood|weapon|gun)\b', re.I)


def cham_anh(a, tu_khoa, nho):
    # Điểm 0-10 của một tranh ứng viên làm nền cho cụm từ khoá; -1 = loại. Nhớ theo mã tranh + từ khoá.
    khoa = f'{a["id"]}|{tu_khoa}'
    if khoa in nho:
        return nho[khoa]
    try:
        r = requests.get(a['xem'], timeout=30)
        if not r.ok or not r.headers.get('content-type', '').startswith('image/'):
            r = requests.get(a['xem_nho'], timeout=30)
        r.raise_for_status()
        anh = r.content
        hinh = Image.open(io.BytesIO(anh))
        # Hình dán / biểu tượng: nền trong suốt, hoặc một màu chiếm phần lớn khung
        if hinh.mode in ('RGBA', 'LA', 'P') and min(hinh.convert('RGBA').getchannel('A').getextrema()) < 250:
            diem = -1
        elif max(c for c, _ in hinh.convert('RGB').resize((64, 36)).quantize(16).getcolors()) / (64 * 36) > 0.25:
            diem = -1
        else:
            kq = ai_may_nha.xem_anh(anh, HOI_ANH.format(tu_khoa=tu_khoa), SCHEMA_ANH)
            co_nguoi = kq['nguoi'] or TU_CO_NGUOI.search(kq.get('mo_ta', ''))
            diem = int(kq['khop']) if kq['canh'] and not co_nguoi and kq['hoat_hinh'] else -1
    except Exception:
        traceback.print_exc()
        return -1  # lỗi (mạng, AI máy nhà chưa bật...): bỏ tranh này, không nhớ để lần sau chấm lại
    nho[khoa] = diem
    return diem


def tai_anh_nen(loi, tai_san, lech=0, td=None):
    # Mỗi cảnh (các câu liền nhau cùng boi_canh, như tao_video.mjs) một tranh nền → assets/px-<mã>.jpg, ghi tên tệp vào
    # anh_nen_tep của câu đầu cảnh. Không lặp tranh trong một phần; lech (số phần) để các phần chọn tranh khác nhau.
    # Chấm tối đa 8 ứng viên mỗi cảnh, lấy tranh điểm cao nhất (từ 5 trở lên). Không có tranh đạt thì giữ nền vẽ.
    da_dung, lan = set(), {}
    nho = doc_nho('cham.json')
    try:
        for i, l in enumerate(loi):
            if i and l.get('boi_canh') == loi[i - 1].get('boi_canh'):
                continue
            tu_khoa = ' '.join((l.get('anh_nen') or '').lower().split()) or TU_KHOA_CANH.get(l.get('boi_canh'), '')
            if not tu_khoa:
                continue
            if td:
                so_canh = sum(1 for j in range(len(loi)) if j == 0 or loi[j].get('boi_canh') != loi[j - 1].get('boi_canh'))
                canh_thu = sum(1 for j in range(i + 1) if j == 0 or loi[j].get('boi_canh') != loi[j - 1].get('boi_canh'))
                bi_chan = pixabay_dang_chan()
                td.bao(3 + 6 * canh_thu / max(1, so_canh), f'Chọn tranh nền cảnh {canh_thu}/{so_canh}'
                       + (' — Pixabay đang tạm chặn, dùng nền vẽ / tranh đã tải' if bi_chan else ' (AI máy nhà xem tranh)'), ep=True)
            ds = [a for a in tim_pixabay(tu_khoa) if a['id'] not in da_dung]
            if not ds:
                continue
            bd = (lech * 2 + lan.get(tu_khoa, 0) * 3) % len(ds)
            lan[tu_khoa] = lan.get(tu_khoa, 0) + 1
            tot, diem_tot = None, 4
            for a in (ds[bd:] + ds[:bd])[:8]:
                d = cham_anh(a, tu_khoa, nho)
                if d > diem_tot:
                    tot, diem_tot = a, d
                if d >= 8:
                    break
            if not tot:
                print(f'Cảnh "{tu_khoa}": không có tranh nền đạt, giữ nền vẽ', flush=True)
                continue
            goc = KHO_PIXABAY / f'{tot["id"]}.jpg'
            try:
                if not goc.exists():
                    r = goi_pixabay(tot['url'])
                    KHO_PIXABAY.mkdir(parents=True, exist_ok=True)
                    goc.write_bytes(r.content)
                shutil.copy(goc, tai_san / f'px-{tot["id"]}.jpg')
            except Exception:
                traceback.print_exc()
                continue
            da_dung.add(tot['id'])
            l['anh_nen_tep'] = f'px-{tot["id"]}.jpg'
    finally:
        ghi_nho('cham.json', nho)


def ap_phat_am(chu, bang):
    # bang: [[viết, đọc], ...] — thay cả từ (không phân biệt hoa thường) trước khi đọc
    for viet, doc_la in sorted(bang or [], key=lambda x: -len(x[0] or '')):  # tên dài trước (Genghis Khan trước Genghis)
        if viet and doc_la:
            chu = re.sub(r'(?<![\w])' + re.escape(viet) + r'(?![\w])', doc_la, chu, flags=re.IGNORECASE)
    return chu


def gio_srt(giay):
    ms = int(round(giay * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def tao_srt(cac_cau):
    # cac_cau: [{"bd", "kt", "chu"}] (giây, đã cộng độ lệch của từng phần). Câu dài tách thành đoạn ~84 ký tự (2 dòng),
    # thời gian chia theo số chữ
    khoi = []
    for c in cac_cau:
        tu = c['chu'].split()
        doan, hien = [], []
        for w in tu:
            if hien and len(' '.join(hien + [w])) > 84:
                doan.append(hien)
                hien = [w]
            else:
                hien.append(w)
        if hien:
            doan.append(hien)
        tong = max(1, sum(len(' '.join(d)) for d in doan))
        t = c['bd']
        for d in doan:
            chu = ' '.join(d)
            dai = (c['kt'] - c['bd']) * len(chu) / tong
            # tách 2 dòng cho dễ đọc
            if len(chu) > 42:
                giua = len(d) // 2
                chu = ' '.join(d[:giua]) + '\n' + ' '.join(d[giua:])
            khoi.append(f'{len(khoi) + 1}\n{gio_srt(t)} --> {gio_srt(t + dai)}\n{chu}\n')
            t += dai
    return '\n'.join(khoi)


LOI_KET = 'Nếu thấy hay, hãy bấm đăng ký {kenh} và bật chuông để xem video mới mỗi tuần nhé!'


def dung_video(may, ds_giong, lt, tm, td, fps=30, gioi_han=1500, anh_nen=None):
    # Đọc từng câu thoại bằng giọng của nhân vật nói câu đó, sinh trang HyperFrames rồi dựng ra tm/video.mp4.
    # Trả độ dài (giây) từng câu. Tiến độ: đọc giọng 10-30%, dựng hình 30-95%.
    shutil.rmtree(tm, ignore_errors=True)
    td.bao(2, 'Chuẩn bị (phông chữ, âm thanh, ảnh tư liệu)', ep=True)
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
    if anh_nen is not None:  # video YouTube: ảnh nền Pixabay theo cảnh (anh_nen = số phần, để các phần chọn ảnh khác nhau)
        tai_anh_nen(lt['loi'], tai_san, anh_nen, td)
    # Gom các câu cùng giọng đọc một lần (nhanh hơn nhiều so với từng câu, nhất là trên card NVIDIA)
    theo_giong = {}
    for i, l in enumerate(lt['loi']):
        theo_giong.setdefault(lt['nhan_vat'][l['ai']]['giong'], []).append(i)
    do_dai = [0.0] * len(lt['loi'])
    xong = 0
    for giong, ds in theo_giong.items():
        td.bao(10 + 20 * xong / len(lt['loi']), f'Đọc giọng câu {xong + 1}/{len(lt["loi"])}')
        kq = doc_rieng(may, ds_giong, [ap_phat_am(lt['loi'][i]['chu'], lt.get('phat_am')) for i in ds], giong)
        for i, (wav, giay) in zip(ds, kq):
            if lt['loi'][i]['ai'] in CHINH_GIONG:
                wav2, giay2 = chinh_giong(wav, CHINH_GIONG[lt['loi'][i]['ai']])
                if giay2:
                    wav, giay = wav2, giay2
            (tai_san / f'loi-{i}.wav').write_bytes(wav)
            do_dai[i] = giay
        xong += len(ds)
    # Màn kết (phần cuối video): Mèo Mun đọc lời mời đăng ký (tao_video.mjs phát assets/ket.wav, nhép miệng theo)
    if lt.get('man_ket'):
        try:
            nv = lt['nhan_vat'].get('meo') or {}
            wav, giay = doc_rieng(may, ds_giong, [LOI_KET.replace('{kenh}', lt.get('kenh') or 'Công Nghệ 24H')], nv.get('giong'))[0]
            if 'meo' in CHINH_GIONG:
                wav2, giay2 = chinh_giong(wav, CHINH_GIONG['meo'])
                if giay2:
                    wav = wav2
            (tai_san / 'ket.wav').write_bytes(wav)
        except Exception:
            traceback.print_exc()
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


def dai_nhac_theo_phan(thu_muc, cac_bai, do_dai_phan):
    # Ghép dải nhạc nền: chương j dùng bài cac_bai[j] (lặp cho đủ), cắt đúng độ dài chương, chuyển bài êm (mờ dần 1,5 giây
    # ở hai đầu mỗi đoạn). Trả tệp .m4a hoặc None
    tep = {}
    for ten in dict.fromkeys(cac_bai):
        r = s.get(f'{URL}/{KHO}/nhac/{ten}', timeout=120)
        if not r.ok:
            return None
        p = thu_muc / f'nhac-{len(tep)}{Path(ten).suffix}'
        p.write_bytes(r.content)
        tep[ten] = p
    vao, loc = [], []
    for j, (ten, dai) in enumerate(zip(cac_bai, do_dai_phan)):
        vao += ['-stream_loop', '-1', '-i', tep[ten].name]
        loc.append(f'[{j}:a]atrim=0:{dai:.2f},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,'
                   f'afade=t=in:d=1.5,afade=t=out:st={max(0, dai - 1.5):.2f}:d=1.5[n{j}]')
    loc.append(''.join(f'[n{j}]' for j in range(len(cac_bai))) + f'concat=n={len(cac_bai)}:v=0:a=1[ra]')
    ra = thu_muc / 'nhac-dai.m4a'
    chay([str(FFMPEG), '-hide_banner', '-y', *vao, '-filter_complex', ';'.join(loc), '-map', '[ra]', '-c:a', 'aac', '-b:a', '192k', ra.name], thu_muc, 1800)
    for p in tep.values():
        p.unlink(missing_ok=True)
    return ra


def tron_nhac_nen(thu_muc, vao, ra, ten_nhac, am_luong, td, tep_nhac_san=None):
    # Nhạc nền dưới cả video: lặp cho đủ dài, to dần đầu / nhỏ dần cuối, TỰ NHỎ ĐI khi có lời nói (nén theo giọng —
    # sidechain), nghe rõ hơn ở chỗ chuyển cảnh / khoảng lặng / màn kết. Lỗi thì trả False (dùng bản không nhạc).
    try:
        td.bao(98, 'Trộn nhạc nền', ep=True)
        if tep_nhac_san:
            tep_nhac = tep_nhac_san
        else:
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
    # 4 ảnh bìa 1280x720 (hoat-hinh/tao_anh_bia.mjs kiểu 1-4; phim tiểu sử có ảnh chân dung thật thêm kiểu 5) lưu cạnh
    # video (anh-bia.png, anh-bia-2.png…), gửi lên kho + youtube/<dự án>/anh-bia.json {so, luc} cho trang chọn.
    # Trả số ảnh làm được (0 = lỗi).
    vao = thu_muc / 'anh-bia.json'
    anh_that = thu_muc / 'anh-that.jpg'
    so = 0
    try:
        tt = dict(thong_tin)
        if tt.get('anh_that'):
            try:
                r = requests.get(tt['anh_that'], headers={'User-Agent': UA_WIKI}, timeout=60)
                if r.ok and r.headers.get('content-type', '').startswith('image/'):
                    anh_that.write_bytes(r.content)
                    tt['anh_that'] = str(anh_that)
                else:
                    tt['anh_that'] = None
            except Exception:
                tt['anh_that'] = None
        vao.write_text(json.dumps(tt, ensure_ascii=False), encoding='utf-8')
        for kieu in (1, 2, 3, 4, 5) if tt.get('anh_that') else (1, 2, 3, 4):
            ten = 'anh-bia.png' if so == 0 else f'anh-bia-{so + 1}.png'
            try:
                chay(['node', str(HOAT_HINH / 'tao_anh_bia.mjs'), str(vao), str(thu_muc / ten), str(kieu)], thu_muc, 180)
                gui(f'{goc}/{ten}', (thu_muc / ten).read_bytes(), 'image/png')
                so += 1
            except Exception:
                traceback.print_exc()
        if so:
            gui(f'{goc}/anh-bia.json', json.dumps({'so': so, 'luc': int(time.time() * 1000)}), 'application/json')
    finally:
        vao.unlink(missing_ok=True)
        anh_that.unlink(missing_ok=True)
    return so


def thu_muc_du_an(du_an, tieu_de):
    # MỘT thư mục cho mỗi video, nhận theo mã dự án (đuôi -<6 ký tự đầu mã>), tên theo tiêu đề hiện tại. Đổi tiêu đề thì
    # đổi tên thư mục cũ (không tạo thư mục mới); lỡ có nhiều thư mục cùng mã thì gom các phần đã dựng (phan-*) về một chỗ
    # để đủ phần mà ghép — trước đây đổi tiêu đề làm các phần nằm rải rác hai thư mục, máy nhà không bao giờ ghép được.
    dich = THU_MUC_YT / f'{ten_tep(tieu_de)}-{du_an[:6]}'
    cu = [p for p in THU_MUC_YT.glob(f'*-{du_an[:6]}') if p.is_dir() and p != dich]
    if not dich.exists() and len(cu) == 1:
        try:
            cu[0].rename(dich)
            cu = []
        except OSError:
            pass
    dich.mkdir(parents=True, exist_ok=True)
    for p in cu:
        for tep in p.glob('phan-*'):
            if not (dich / tep.name).exists():
                try:
                    shutil.move(str(tep), str(dich / tep.name))
                except OSError:
                    traceback.print_exc()
    return dich


def dung_youtube(may, ds_giong, yc):
    # Một phần của video YouTube dài (lib/youtube.ts): {"du_an", "tieu_de", "phan" (1, 2...), "ma_phan": [mã từng phần],
    # "loi_thoai"}. Dựng xong lưu phan-<số>-<mã>.mp4 trong thư mục dự án ở máy nhà, báo youtube/<dự án>/phan-<số>.json.
    # Đủ mọi phần (đúng mã hiện tại) thì ghép thành một video, báo youtube/<dự án>/xong.json.
    du_an, k, ds_ma = yc['du_an'], yc['phan'], yc['ma_phan']
    goc = f'youtube/{du_an}'
    thu_muc = thu_muc_du_an(du_an, yc.get("tieu_de"))
    tep = thu_muc / f'phan-{k:02d}-{ds_ma[k - 1]}.mp4'
    td = TienDo(None, duong=f'{goc}/tien-do.json', them={'phan': k})
    try:
        if not tep.exists():
            tm = THU_MUC_TAM / f'yt-{du_an}-{k}'
            try:
                # Phần dài vài phút: 24 khung hình/giây cho nhanh, cho dựng tới ~40 giây mỗi giây video
                uoc = sum(len(l['chu']) for l in yc['loi_thoai']['loi']) / 14
                dung_video(may, ds_giong, yc['loi_thoai'], tm, td, fps=24, gioi_han=max(1800, int(uoc * 40)), anh_nen=k)
                shutil.move(str(tm / 'video.mp4'), str(tep))
                if (tm / 'artifacts' / 'phu_de.json').exists():
                    shutil.copy(tm / 'artifacts' / 'phu_de.json', tep.with_suffix('.phu-de.json'))
            finally:
                shutil.rmtree(tm, ignore_errors=True)
        for cu in thu_muc.glob(f'phan-{k:02d}-*'):
            if cu != tep and cu != tep.with_suffix('.phu-de.json'):
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
            # Nhạc theo cảm xúc từng chương: ghép dải nhạc theo độ dài từng phần rồi trộn như một bài
            dai_nhac = None
            if nhac and yc.get('nhac_phan') and len(yc['nhac_phan']) == len(cac_phan):
                try:
                    dai_nhac = dai_nhac_theo_phan(thu_muc, yc['nhac_phan'], [do_dai_video(p) or 0 for p in cac_phan])
                except Exception:
                    traceback.print_exc()
            if nhac and (dai_nhac or not yc.get('nhac_phan')) and tron_nhac_nen(thu_muc, ghep, ra, nhac, yc.get('am_luong_nhac', 30), td, dai_nhac):
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
            anh_bia = tao_anh_bia(thu_muc, goc, yc['anh_bia']) if yc.get('anh_bia') else 0
            moc_chuong, cac_cau, lech = [], [], 0.0
            for ph in cac_phan:
                moc_chuong.append(round(lech, 2))
                pd = ph.with_suffix('.phu-de.json')
                if pd.exists():
                    cac_cau += [{**c, 'bd': c['bd'] + lech, 'kt': c['kt'] + lech} for c in json.loads(pd.read_text(encoding='utf-8'))]
                lech += do_dai_video(ph) or 0
            phu_de = False
            if cac_cau:
                try:
                    srt = tao_srt(cac_cau)
                    ra.with_suffix('.srt').write_text(srt, encoding='utf-8')
                    gui(f'{goc}/phu-de.srt', srt.encode('utf-8'), 'application/x-subrip')
                    phu_de = True
                except Exception:
                    traceback.print_exc()
            # Dọn các bản phần cũ không còn dùng (mã khác mã hiện tại), vd bản cũ gom từ thư mục trước khi đổi tiêu đề
            dung = {p.name for p in cac_phan} | {p.with_suffix('.phu-de.json').name for p in cac_phan}
            for cu in thu_muc.glob('phan-*'):
                if cu.name not in dung:
                    cu.unlink(missing_ok=True)
            gui(f'{goc}/xong.json', json.dumps({'tep': str(ra), 'ma': ds_ma, 'nhac': nhac, 'kiem_tra': kiem_tra, 'anh_bia': anh_bia,
                                                'moc_chuong': moc_chuong, 'phu_de': phu_de,
                                                'luc': int(time.time() * 1000)}, ensure_ascii=False), 'application/json')
    finally:
        td.xong()


def dung_short(may, ds_giong, yc):
    # Shorts (khung dọc 9:16) từ đoạn gay cấn của video YouTube dài: dựng như video TikTok, chỉnh tiếng chuẩn, lưu
    # Shorts-<số>.mp4 trong thư mục video trên máy nhà, báo youtube/<dự án>/short-<số>.json
    du_an, so = yc['du_an'], yc['so']
    goc = f'youtube/{du_an}'
    thu_muc = thu_muc_du_an(du_an, yc.get("tieu_de"))
    td = TienDo(None, duong=f'{goc}/tien-do-short.json', them={'so': so})
    tm = THU_MUC_TAM / f'yts-{du_an}-{so}'
    try:
        dung_video(may, ds_giong, yc['loi_thoai'], tm, td, fps=30, gioi_han=1800, anh_nen=so)
        ra = thu_muc / f'Shorts-{so}.mp4'
        shutil.move(str(tm / 'video.mp4'), str(ra))
        try:
            kiem_tra_video(ra)
        except Exception:
            traceback.print_exc()
        gui(f'{goc}/short-{so}.json', json.dumps({'tep': str(ra), 'luc': int(time.time() * 1000)}, ensure_ascii=False), 'application/json')
    except Exception as e:
        gui(f'{goc}/short-{so}.json', json.dumps({'loi': str(e)[:300]}, ensure_ascii=False), 'application/json')
        raise
    finally:
        shutil.rmtree(tm, ignore_errors=True)
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


VIEC_DAI = ('youtube', 'youtube_short', 'hoat_hinh')
VIEC_DO = THU_MUC_TAM / 'viec-dang-lam.json'  # phiếu việc dài đang làm (xoá khi xong, kể cả lỗi)


def khong_ngu(bat):
    # Windows: giữ máy không tự ngủ trong lúc dựng (máy ngủ là dựng dừng giữa chừng); tắt thì trả lại như thường
    try:
        import ctypes
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | (0x00000001 if bat else 0))
    except Exception:
        pass


def lam_tiep_viec_do():
    # Lần trước máy nhà tắt / khởi động lại khi đang dựng: gửi lại phiếu vào hàng đợi để làm tiếp (phần đã dựng xong
    # nằm sẵn trên máy nên không dựng lại)
    if not VIEC_DO.exists():
        return
    try:
        o = json.loads(VIEC_DO.read_text(encoding='utf-8'))
        du_an = o['yc'].get('du_an')
        # Video đã bị xoá trên trang trong lúc máy nhà tắt thì thôi, không dựng lại
        if du_an and not s.head(f'{URL}/{KHO}/youtube/{du_an}/du-an.json', timeout=30).ok:
            print(f'Bỏ việc dang dở {o["ten"]}: video đã bị xoá', flush=True)
        else:
            gui(f'hang-doi/viec/{o["ten"]}', json.dumps(o['yc'], ensure_ascii=False).encode('utf-8'), 'application/json')
            print(f'Làm tiếp việc dang dở lần trước: {o["ten"]}', flush=True)
    except Exception:
        traceback.print_exc()
    VIEC_DO.unlink(missing_ok=True)


def main():
    print('Đang nạp giọng VieNeu...', flush=True)
    # int8 nhanh hơn ~1,4 lần nhưng cần CPU có VNNI (Intel đời 12 trở lên...), máy cũ hơn đặt DO_CHINH_XAC=fp32
    # Có card NVIDIA + PyTorch CUDA (môi trường D:\vieneu-gpu, chay-vieneu.bat) thì đọc bằng card, nhanh hơn nhiều
    try:
        import torch
        co_card = torch.cuda.is_available()
    except ImportError:
        co_card = False
    may = Vieneu(device='cuda') if co_card else Vieneu(precision=os.environ.get('DO_CHINH_XAC', 'int8'))
    print('Đọc giọng bằng ' + ('card NVIDIA' if co_card else 'CPU'), flush=True)
    ds_giong = {ten for _, ten in may.list_preset_voices()}
    may.infer('Xin chào.', voice=GIONG_MAC_DINH)  # làm nóng: lần đọc đầu tiên chậm gấp đôi
    lam_tiep_viec_do()
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
            # Việc dài (dựng video): ghi phiếu ra máy để lỡ máy nhà tắt / khởi động lại giữa chừng thì lần chạy sau gửi
            # lại phiếu làm tiếp (main → lam_tiep_viec_do); giữ máy không ngủ trong lúc làm
            viec_dai = yc.get('loai') in VIEC_DAI
            # Bảng tin chung cho trang web: việc gì, của video nào, phần nào
            MO_TA_VIEC = {'youtube': 'Dựng video YouTube', 'youtube_short': 'Dựng Shorts', 'yt_anh_bia': 'Vẽ ảnh bìa', 'hoat_hinh': 'Dựng video TikTok',
                          'ai': 'AI máy nhà biên tập kịch bản', 'xoa_youtube': 'Xoá video'}
            VIEC_HIEN_TAI.clear()
            VIEC_HIEN_TAI.update({'viec': ma, 'loai': yc.get('loai') or 'doc_giong', 'mo_ta': MO_TA_VIEC.get(yc.get('loai'), 'Đọc giọng'),
                                  'du_an': yc.get('du_an'), 'tieu_de': yc.get('tieu_de') or yc.get('ten'), 'phan': yc.get('phan') or yc.get('so')})
            bao_hien_tai('Bắt đầu', 0)
            if viec_dai:
                VIEC_DO.write_text(json.dumps({'ten': ten, 'yc': yc}, ensure_ascii=False), encoding='utf-8')
                khong_ngu(True)
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
                    for tm in [*THU_MUC_YT.glob(f'*-{du_an[:6]}'), *THU_MUC_TAM.glob(f'yt-{du_an}-*'), *THU_MUC_TAM.glob(f'yts-{du_an}-*')]:
                        if tm.is_dir():
                            shutil.rmtree(tm, ignore_errors=True)
                            # OneDrive đôi khi còn giữ thư mục lúc vừa xoá tệp bên trong: đợi rồi xoá lại thư mục rỗng
                            for _ in range(3):
                                if not tm.exists():
                                    break
                                time.sleep(2)
                                shutil.rmtree(tm, ignore_errors=True)
                            so += 1
                    print(f'Đã xoá {so} thư mục video của dự án {du_an[:6]}', flush=True)
                elif yc.get('loai') == 'yt_anh_bia':
                    # Vẽ (lại) ảnh bìa theo chữ chủ trang đặt, không cần dựng video
                    so = tao_anh_bia(thu_muc_du_an(yc['du_an'], yc.get('tieu_de')), f'youtube/{yc["du_an"]}', yc['anh_bia'])
                    print(f'Vẽ {so} ảnh bìa trong {time.time() - bat_dau:.0f}s', flush=True)
                elif yc.get('loai') == 'youtube_short':
                    print(f'Dựng Shorts {yc["so"]} của "{yc.get("tieu_de")}" ({len(yc["loi_thoai"]["loi"])} câu)...', flush=True)
                    try:
                        dung_short(may, ds_giong, yc)
                    except Exception:
                        traceback.print_exc()
                    print(f'Xong Shorts trong {time.time() - bat_dau:.0f}s', flush=True)
                elif yc.get('loai') == 'ai':
                    # Việc AI (vòng biên tập cả phim…): chạy AI máy nhà (Ollama, ổ D), trả chuỗi JSON
                    print(f'AI máy nhà: {ma}...', flush=True)
                    text = ai_may_nha.goi(yc['system'], yc['noi_dung'], yc.get('schema'))
                    gui(f'hang-doi/xong/{ma}.json', json.dumps({'text': text}, ensure_ascii=False), 'application/json')
                    print(f'AI máy nhà xong trong {time.time() - bat_dau:.0f}s', flush=True)
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
                if viec_dai:
                    VIEC_DO.unlink(missing_ok=True)
                    khong_ngu(False)
                VIEC_HIEN_TAI.clear()
                xoa('hang-doi/hien-tai.json')
        except Exception:
            traceback.print_exc()  # mất mạng... thì chờ rồi thử lại
            time.sleep(10)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
