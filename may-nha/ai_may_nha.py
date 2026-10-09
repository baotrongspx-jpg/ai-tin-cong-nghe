# AI chạy ngay trên máy nhà (Ollama, mã nguồn mở, miễn phí, không giới hạn lượt) — dùng cho những việc AI tốn lượt
# Gemini: vòng biên tập cả kịch bản, và viết thay khi Gemini hết lượt trong ngày. Mọi thứ nằm ở ổ D (ổ C gần đầy):
# D:\ollama\ollama.exe, mô hình ở D:\ollama\models. Máy chủ Ollama chỉ nghe ở 127.0.0.1 (không mở ra ngoài).
# Trang web gửi phiếu việc {"loai": "ai", "system", "noi_dung", "schema"} → máy nhà trả hang-doi/xong/<mã>.json {"text"}.
import base64
import json
import os
import subprocess
import time
from pathlib import Path

import requests

THU_MUC = Path(os.environ.get('OLLAMA_DIR', r'D:\ollama'))
OLLAMA = THU_MUC / 'ollama.exe'
DIA_CHI = 'http://127.0.0.1:11434'
MO_HINH = os.environ.get('AI_MAY_NHA', 'qwen3:8b')


def dang_chay():
    try:
        return requests.get(f'{DIA_CHI}/api/tags', timeout=3).ok
    except Exception:
        return False


def dam_bao_chay():
    # Chưa chạy thì bật "ollama serve" ngầm (mô hình để ở D:), đợi tối đa 40 giây
    if dang_chay():
        return
    if not OLLAMA.exists():
        raise RuntimeError(f'Chưa cài AI máy nhà ({OLLAMA})')
    env = dict(os.environ, OLLAMA_MODELS=str(THU_MUC / 'models'), OLLAMA_HOST='127.0.0.1:11434')
    subprocess.Popen([str(OLLAMA), 'serve'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                     creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    for _ in range(40):
        time.sleep(1)
        if dang_chay():
            return
    raise RuntimeError('Không bật được AI máy nhà (ollama serve)')


def dam_bao_mo_hinh(mo_hinh):
    ten = {m['name'] for m in requests.get(f'{DIA_CHI}/api/tags', timeout=10).json().get('models', [])}
    if mo_hinh in ten or f'{mo_hinh}:latest' in ten:
        return
    print(f'Tải mô hình AI {mo_hinh} về ổ D (một lần)...', flush=True)
    r = requests.post(f'{DIA_CHI}/api/pull', json={'name': mo_hinh, 'stream': False}, timeout=7200)
    r.raise_for_status()


def goi(system, noi_dung, schema=None, mo_hinh=None, nhiet=0.6):
    # Trả chuỗi JSON (khi có schema, Ollama ép đúng dạng). Không suy nghĩ dài (think=False) cho nhanh.
    mo_hinh = mo_hinh or MO_HINH
    dam_bao_chay()
    dam_bao_mo_hinh(mo_hinh)
    than = {
        'model': mo_hinh,
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': noi_dung}],
        'stream': False,
        'think': False,
        'options': {'num_ctx': 16384, 'temperature': nhiet},
        'keep_alive': '1m',  # nhả bộ nhớ card đồ hoạ sớm cho việc dựng hình
    }
    if schema:
        than['format'] = schema
    r = requests.post(f'{DIA_CHI}/api/chat', json=than, timeout=3600)
    r.raise_for_status()
    return r.json()['message']['content']


def nha_bo_nho():
    # Nhả mọi mô hình đang nạp (qwen3:8b chiếm ~8 GB RAM) TRƯỚC khi dựng hình: máy 16 GB vừa giữ AI, vừa giữ giọng đọc
    # (~5 GB) vừa chạy trình dựng hình thì hết RAM ("process out of memory", đo 09/10/2026). Đợi câu đang trả lời xong.
    if not dang_chay():
        return
    try:
        for _ in range(60):
            dang_nap = [m['name'] for m in requests.get(f'{DIA_CHI}/api/ps', timeout=5).json().get('models', [])]
            if not dang_nap:
                return
            for ten in dang_nap:
                requests.post(f'{DIA_CHI}/api/generate', json={'model': ten, 'keep_alive': 0}, timeout=600)
            time.sleep(2)
    except Exception:
        pass


MO_HINH_NHIN = os.environ.get('AI_NHIN_ANH', 'qwen2.5vl:3b')  # mô hình nhỏ nhìn được ảnh (~3 GB ở ổ D)


def xem_anh(anh, cau_hoi, schema):
    # Cho AI nhìn một ảnh (bytes JPG/PNG) và trả lời theo schema JSON → dict. Dùng để lọc ảnh nền Pixabay.
    dam_bao_chay()
    dam_bao_mo_hinh(MO_HINH_NHIN)
    than = {
        'model': MO_HINH_NHIN,
        'messages': [{'role': 'user', 'content': cau_hoi, 'images': [base64.b64encode(anh).decode()]}],
        'stream': False,
        'format': schema,
        'options': {'temperature': 0},
        'keep_alive': '2m',
    }
    r = requests.post(f'{DIA_CHI}/api/chat', json=than, timeout=300)
    r.raise_for_status()
    return json.loads(r.json()['message']['content'])


if __name__ == '__main__':
    # Thử: python ai_may_nha.py
    bd = time.time()
    kq = goi('Bạn là biên kịch phim tài liệu Việt Nam. Trả lời bằng tiếng Việt có dấu.',
             'Viết 3 câu thoại mở đầu phim về Thành Cát Tư Hãn: 1 câu người kể, 1 câu Mèo Mun phản ứng, 1 câu Robot Bit.',
             {'type': 'object', 'properties': {'cau': {'type': 'array', 'items': {'type': 'object', 'properties': {
                 'ai': {'type': 'string', 'enum': ['nguoi_ke', 'meo', 'robot']}, 'chu': {'type': 'string'}}, 'required': ['ai', 'chu']}}},
              'required': ['cau']})
    print(json.dumps(json.loads(kq), ensure_ascii=False, indent=1))
    print(f'{time.time() - bd:.0f} giây')
