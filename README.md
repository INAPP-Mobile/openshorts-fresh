# OpenShorts — AI-Powered Vertical Video Generator

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.com/deploy/openshorts-1)

OpenShorts turns long-form videos into viral vertical shorts. It offers three tools in one dashboard:

1. **Clip Generator** — paste a YouTube URL, get AI-detected highlight clips cropped to 9:16.
2. **AI Shorts** — generate UGC-style marketing videos with AI actors, subtitles and voice-over.
3. **YouTube Studio** — generate thumbnails, titles and descriptions with AI.

This is the official one-click Railway template. The dashboard is served same-origin from the FastAPI backend, so there is no extra service to configure.

---

## Features

- **AI clip detection** — Gemini analyses long videos and picks the most viral moments.
- **Vertical crop with smart tracking** — auto-faces/peaks keep subjects centred in 9:16.
- **Burned subtitles** — faster-whisper transcription, baked into the final MP4.
- **AI voice-over and translation** — synthesis + translation pipeline for multilingual shorts.
- **AI thumbnail & title generation** — artwork and copy from Gemini.
- **S3 backup gallery** — optionally mirror generated clips to AWS S3 for a public gallery.
- **Hash-routed dashboard** — single-page React app served by FastAPI (no separate web server).
- **One worker-concurrency limit** — stay inside a small Railway plan's RAM envelope.

## Quick Start

1. Click the **Deploy to Railway** button above.
2. Railway will prompt you for `RAPIDAPI_KEY` and `GEMINI_API_KEY` — both are required for the full pipeline. Supply them during setup (or add them in the service's Variables tab afterward).
3. Wait for provisioning and the build to finish (first build pulls torch + deps; allow 3–5 minutes).
4. Open your service URL — the dashboard loads at `/`.
5. Use the **Clip Generator** tab with a YouTube URL, or upload a local video file.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RAPIDAPI_KEY` | Yes | RapidAPI key for the youtube-mp41 downloader (YouTube URL jobs). Get one at https://rapidapi.com/ytjar/api/youtube-mp41 — free tier works. |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI analysis, titles/thumbnails, voice-over. Get one at https://aistudio.google.com/apikey. Can also be passed per request via the `X-Gemini-Key` header. |
| `MAX_CONCURRENT_JOBS` | No | Max parallel video jobs. Each is CPU/RAM heavy. Default `2`. |
| `AWS_ACCESS_KEY_ID` | No | Optional AWS access key for S3 upload of generated clips. |
| `AWS_SECRET_ACCESS_KEY` | No | Optional AWS secret key paired with `AWS_ACCESS_KEY_ID`. |
| `AWS_REGION` | No | Optional AWS region. Default `eu-west-3`. |
| `AWS_S3_BUCKET` | No | Optional S3 bucket for generated clips. |
| `AWS_S3_PUBLIC_BUCKET` | No | Optional public S3 bucket for gallery public URLs. |
| `PORT` | No | HTTP port (Railway sets this; default 8000 in the image). |

## Prerequisites

- A [Railway account](https://railway.app).
- A [RapidAPI](https://rapidapi.com/ytjar/api/youtube-mp41) key (free tier works).
- A [Google Gemini](https://aistudio.google.com/apikey) API key.
- (Optional) an AWS account + S3 bucket if you want the public gallery.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Railway Project                         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │          OpenShorts service (single)             │    │
│  │                                                  │    │
│  │  uvicorn ── app:app (port $PORT)                 │    │
│  │    ├── /api/*      JSON API (process, status…)   │    │
│  │    ├── /health     Railway healthcheck           │    │
│  │    ├── /videos/*   static generated clips        │    │
│  │    ├── /thumbnails/*  static thumbnails          │    │
│  │    └── /*          pre-built React dashboard     │    │
│  │                                                  │    │
│  │  Volume: /data  ──  output/ + uploads/           │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

The multi-stage Docker build compiles the Vite dashboard in a `node` stage, then copies the result into a `python:3.11-slim` runtime image with CPU-only PyTorch, ffmpeg and all ML deps. There is no separate renderer to run — the dashboard's preview is in-browser (`@remotion/player`).

## Deploy

Click the button at the top of this README. Railway builds the image, mounts a persistent volume for your generated clips, and routes a public domain to the service. If you set a custom domain later, update the service's **Settings → Networking → Custom Domains** page.

## How It Works

1. You submit a YouTube URL (or upload a file) with a Gemini key.
2. The backend queues the job and spawns `main.py` in a subprocess.
3. If a YouTube URL was given, `youtube-mp41` on RapidAPI downloads the source MP4.
4. Gemini picks highlight moments; ffmpeg crops each to 9:16 with smart tracking.
5. `faster-whisper` transcribes audio; subtitles are burned in.
6. The finished clips land under `/data/output/<job-id>/` and are streamable at `/videos/...`.

---

# Deploy and Host

Deploy this template on Railway with one click. Railway provides compute, TLS at the edge, and a public URL. The service restarts automatically on failures.

## About Hosting

This template runs as a single container with a persistent volume for generated videos and uploaded source files. The dashboard, the JSON API, the healthcheck and the video files are all served by one FastAPI process on `$PORT`. There is no external database to manage — clips are written directly to the attached volume.

## Why Deploy

- **One-click deploy** — no setup, just provide two API keys and go.
- **Single service** — no multi-service orchestration, no extra Redis/Postgres to wire.
- **Automatic HTTPS** — Railway provisions TLS certificates automatically.
- **Self-healing** — automatic restarts on failure.
- **Persistent storage** — your generated clips survive deploys and restarts on the attached volume.
- **CPU-only ML** — PyTorch runs on CPU, which is all a default Railway plan needs.

## Common Use Cases

- Repurpose long-form YouTube/Twitch content into TikToks, Reels and Shorts.
- Produce AI-UGC marketing videos at scale.
- Generate AI thumbnails and titles for a video pipeline.
- Run a self-hosted alternative to paid clipping SaaS.
- Prototype a short-video pipeline on a free Railway plan.

## Dependencies for OpenShorts

### Deployment Dependencies

- [Railway Account](https://railway.app) — hosting platform.
- [RapidAPI — youtube-mp41](https://rapidapi.com/ytjar/api/youtube-mp41) — YouTube video downloader (free tier works).
- [Google Gemini API](https://aistudio.google.com/apikey) — AI clip detection, titles, thumbnails, voice-over.

No external database, cache or message queue is required. Optional AWS S3 is only needed if you want generated clips mirrored to a public gallery.
