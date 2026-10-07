FROM python:3.12-slim-bookworm
ENV PYTHONUNBUFFERED=1 HF_HOME=/home/user/.cache/huggingface HF_HUB_DISABLE_SYMLINKS_WARNING=1
RUN useradd -m -u 1000 user
RUN pip install --no-cache-dir vieneu==3.8.3 fastapi==0.118.0 uvicorn==0.38.0
USER user
WORKDIR /home/user/app
# Tải sẵn bộ giọng lúc dựng để khởi động nhanh
RUN python -c "from vieneu import Vieneu; Vieneu()"
COPY --chown=user app.py .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
