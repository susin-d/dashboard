# Deploy — Vercel (frontend) + GCP VM (backend)

> Split: **Vercel** hosts `website/` (React/Vite), **GCP e2-micro VM** hosts `server` + `postgres` + `redis` + `whatsapp-worker` + `nginx`.

## 1) GHCR images (already building)

Pushed on every `main` push:

- `ghcr.io/susin-d/dashboard-backend:latest` — FastAPI backend (single image, no website)
- `ghcr.io/susin-d/dashboard-server` / `-whatsapp-worker` / `-website` — legacy 3-image stack (ignore if using Vercel)

New backend-only workflow: `.github/workflows/docker-backend.yml` → `dashboard-backend` (also alias `dashboard`).

## 2) GCP VM — one-time setup

```bash
# create e2-micro (us-central1, Debian 12, 30GB, allow http/https)
gcloud compute instances create starwaves-api \
  --machine-type=e2-micro --zone=us-central1-a --image-family=debian-12 --image-project=debian-cloud \
  --tags=http-server,https-server --boot-disk-size=30GB

gcloud compute firewall-rules create allow-starwaves --allow tcp:80,tcp:443 --target-tags=http-server,https-server || true

# ssh
gcloud compute ssh starwaves-api --zone=us-central1-a
```

On VM:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git

# swap for 1GB VM (free tier)
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

git clone https://github.com/susin-d/dashboard.git starwaves && cd starwaves

# env
cp .env.docker.example server/.env
nano server/.env  # set:
#  AUTH_SECRET_KEY=$(openssl rand -base64 48)
#  CRON_SECRET=$(openssl rand -hex 32)
#  CORS_ORIGINS=https://starwaves.vercel.app,https://starwaves.susindran.in,https://*.vercel.app,http://<VM_EXTERNAL_IP>
#  FRONTEND_URL=https://starwaves.vercel.app
#  DATABASE_URL=postgresql+asyncpg://starwaves:starwaves_password@postgres:5432/starwaves
#  plus OPENAI/ANTHROPIC/GEMINI keys etc

# login to GHCR (use PAT classic with read:packages)
echo $GITHUB_TOKEN | docker login ghcr.io -u susin-d --password-stdin

# pull + run backend-only (no website container)
docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml pull
docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d
docker compose -f docker-compose.yml -f docker-compose.backend.yml ps
curl -i http://localhost/health
curl -i http://localhost:8000/api/v1/health

# logs
docker compose -f docker-compose.yml -f docker-compose.backend.yml logs -f server
```

`nginx/conf.d/default.backend.conf` on VM serves:
- `GET /health`, `/api/*`, `/ws/*`, `/docs` → `server:8000`
- `GET /` → `302` to `https://starwaves.vercel.app`

Add DNS **A** `api.susindran.in` (and `api.starwaves.susindran.in` alias) `→ <VM_EXTERNAL_IP>` and TLS:

```bash
# 1) Get VM external IP
gcloud compute instances describe personal-vm --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
# or: gcloud compute instances describe starwaves-api --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# 2) In Vercel Dashboard → Domains → susindran.in → Add Record:
#    Type: A, Name: api, Value: <VM_EXTERNAL_IP>, TTL: 60
#    Also add: Name: api.starwaves, Value: <VM_EXTERNAL_IP> (alias)
# Verify DNS (wait 1-5 min):
#    nslookup api.susindran.in  # should return VM IP, not NXDOMAIN
#    curl -i http://api.susindran.in/health  # should 200 via HTTP before TLS

# 3) Ensure firewall (once)
gcloud compute firewall-rules create allow-starwaves --allow tcp:80,tcp:443 --target-tags=http-server,https-server || true
gcloud compute instances add-tags personal-vm --tags=http-server,https-server --zone=us-central1-a || true

# 4) Issue TLS (webroot, works with docker nginx — no host nginx needed)
#    Pull latest nginx conf (has /.well-known/acme-challenge)
git pull
mkdir -p certbot/www certbot/certs
docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d nginx
#    Run once (replace email):
EMAIL=you@susindran.in ./scripts/init-letsencrypt.sh
#    or: ./scripts/init-letsencrypt.sh you@susindran.in

# 5) Enable HTTPS block after certs exist
./scripts/enable-https.sh
docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d --force-recreate nginx
curl -i https://api.susindran.in/health
curl -i https://api.susindran.in/api/v1/health
```

Then update Vercel + VM env to `VITE_API_URL=https://api.susindran.in/api/v1` and redeploy.

## 3) Vercel — frontend

Vercel Project → Settings → Environment Variables:

```
VITE_API_URL=https://api.starwaves.susindran.in/api/v1
# or http://<VM_EXTERNAL_IP>/api/v1 during dev
```

`vercel.json` already SPA rewrites (`/(.*) → /index.html`), no API proxy needed — frontend calls GCP directly.
On push to `main`, Vercel auto-deploys `website/`.

Local dev still works:

```bash
# website/.env
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

## 4) Pull updates (zero-build on VM)

```bash
cd ~/starwaves
git pull
echo $GITHUB_TOKEN | docker login ghcr.io -u susin-d --password-stdin
docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml pull
docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d
```

Or dispatch **Backend — Build and Push to GHCR** workflow → VM `watchtower` / cron pull.

## 5) Cost — e2-micro free tier

- VM: 1 vCPU, 1GB RAM + 1G swap → fits `postgres 128M + redis 96M + server 512M + nginx`
- Disk: 30GB standard (free)
- If OOM, `docker stats --no-stream` + `free -h`, prune `docker system prune`.

## 6) Troubleshooting

- `AUTH_SECRET_KEY must be strong` → `openssl rand -base64 48` → `server/.env`
- `CORS` 403 on Vercel → add `https://<vercel-preview>--*.vercel.app` to `CORS_ORIGINS`
- `502` on `/` → expected (redirects to Vercel), check `/api/v1/health`
- `502` on `/api` → `docker logs starwaves-server` → DB `DATABASE_URL` typo?
- GHCR `denied` → `docker login ghcr.io`, ensure package is Public (`ghcr.io/susin-d/dashboard-backend` → Package settings → Public)
