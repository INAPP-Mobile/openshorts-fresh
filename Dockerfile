# ── Stage 1: build the React dashboard (Vite → dist/) ───────────────────────
FROM node:22-slim AS frontend
WORKDIR /build/dashboard
# Install build deps first (layer cache), then npm deps, then build.
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY dashboard/ ./
# VITE_API_URL left unset → the SPA calls the same-origin /api endpoints.
RUN npm run build

# ── Stage 2: runtime (CPU-only, no CUDA) ────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OUTPUT_DIR=/data/output \
    UPLOAD_DIR=/data/uploads \
    DIST_DIR=/app/dist \
    MAX_CONCURRENT_JOBS=2

# Runtime system deps:
#  - ffmpeg: video pipeline (clipping, cropping, subtitles, hooks)
#  - libgl1/libglib2.0-0/libsm6/libxext6/libxrender1: OpenCV (ultralytics) + mediapipe
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        curl \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps first for layer caching.
# torch/torchvision from the CPU index above; everything else from PyPI.
COPY requirements.txt ./
RUN pip install --no-cache-dir \
        torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download the YOLO model so job workers don't hit the network on first run.
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt'); print('yolov8n cache ready')"

# Application code.
COPY app.py main.py editor.py hooks.py subtitles.py translate.py thumbnail.py saasshorts.py s3_uploader.py ./
COPY fonts/ ./fonts/

# Pre-built dashboard (same origin as the API).
COPY --from=frontend /build/dashboard/dist ./dist

# Data dirs on the image (Railway volume mounts at /data).
RUN mkdir -p /data/output /data/uploads \
    && mkdir -p output uploads

# Default to 8000 (matches EXPOSE); honour $PORT when set (Railway injects
# its own PORT value and routes the public domain to it).
ENV PORT=8000
EXPOSE 8000

# Health check used by Docker/Orchestrator.
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD curl -fs "http://127.0.0.1:${PORT:-8000}/health" >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
