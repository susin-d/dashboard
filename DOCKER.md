# StarWaves Server Docker Deployment Guide

This guide explains how to build, run, and manage the StarWaves FastAPI backend containerized alongside Nginx reverse proxy.

---

## 🚀 Quick Start with Docker Compose

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine (v24.0+)
- Docker Compose (v2.20+)

### 2. Environment Setup
Create or update `server/.env` with your production secrets (refer to `.env.docker.example`):

```bash
cp .env.docker.example server/.env
```

### 3. Build & Launch Containers

Run the docker compose stack in detached mode:

```bash
docker compose up --build -d
```

Check the status of running services:

```bash
docker compose ps
```

---

## 🔍 Verification & Health Check

### Test Server Health via Nginx Proxy
```bash
curl -i http://localhost/health
```

Expected Response:
```json
HTTP/1.1 200 OK
Server: nginx/...
Content-Type: application/json

{"status":"ok"}
```

### Direct FastAPI Backend Check
```bash
curl -i http://localhost:8000/api/v1/health
```

---

## 🛠 Useful Commands

| Action | Command |
| --- | --- |
| **View logs** | `docker compose logs -f` |
| **View server logs only** | `docker compose logs -f server` |
| **View nginx logs only** | `docker compose logs -f nginx` |
| **Restart services** | `docker compose restart` |
| **Stop stack** | `docker compose down` |
| **Stop stack & remove volumes** | `docker compose down -v` |
| **Run server unit tests inside container** | `docker compose exec server python -m unittest discover tests` |
| **Rebuild server image without cache** | `docker compose build --no-cache server` |

---

## 🔒 Production Security & SSL/TLS Setup

1. **Non-Root Execution**: The FastAPI server process runs as a low-privilege `appuser` (UID 10001) inside the container.
2. **Reverse Proxy Security**: Nginx strips internal server headers, applies Gzip compression, sets security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), and limits body uploads to 20MB.
3. **HTTPS / Certbot Setup**:
   - Place your SSL certs in `nginx/certs/`.
   - Uncomment the SSL server block in [`nginx/conf.d/default.conf`](file:///c:/project/starwaves/nginx/conf.d/default.conf).
   - Reload Nginx: `docker compose exec nginx nginx -s reload`.
