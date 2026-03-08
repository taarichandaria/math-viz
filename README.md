# MathViz — Deployment Guide

Describe a math concept in plain English → get a Manim animation + written explanation.

---

## Architecture (What You're Deploying)

There are **two things** to deploy:

1. **Next.js frontend** — the website (Input box, video player, explanation, etc.)
2. **Manim renderer** — a Python server that runs Manim code and returns videos

```
[User's Browser] → [Next.js on Vercel] → [Claude API] → (code + explanation)
                                        → [Manim Renderer] → (video)
```

---

## Prerequisites

You need:

- [ ] An **Anthropic API key** — get one at https://console.anthropic.com/
- [ ] **Docker Desktop** installed — https://www.docker.com/products/docker-desktop/
- [ ] A **Vercel** account (free) — https://vercel.com/signup
- [ ] A server to run the Manim renderer (options below)

---

## Step 1: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to **API Keys** in the sidebar
4. Click **Create Key**
5. Copy it — it looks like `sk-ant-api03-...`
6. **Save it somewhere safe.** You'll need it in Step 3.

---

## Step 2: Deploy the Manim Renderer

The renderer is a Python server that takes Manim code, runs it, and returns a video. It needs Linux + Cairo + FFmpeg + LaTeX, which is why we use Docker.

### Option A: Run Locally (Easiest for Testing)

```bash
# From the project root
cd renderer

# Build the Docker image (~2-5 min first time, downloads ~2GB)
docker build -t mathviz-renderer .

# Run it
docker run -p 8000:8000 mathviz-renderer
```

Test it works:
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

Your renderer URL is: `http://localhost:8000`

### Option B: Deploy to Railway.app (Recommended for Production)

Railway makes it dead simple to deploy Docker containers.

1. Go to https://railway.app/ and sign up (free tier available)
2. Click **New Project** → **Deploy from GitHub repo**
3. Point it to your repo, set the **Root Directory** to `renderer`
4. Railway will auto-detect the Dockerfile and build it
5. Go to **Settings** → **Networking** → **Generate Domain**
6. Copy the public URL — it'll look like `https://mathviz-renderer-production-xxxx.up.railway.app`

That's your renderer URL.

### Option C: Deploy to Fly.io

```bash
# Install flyctl: https://fly.io/docs/flyctl/install/
cd renderer

# First time only
fly launch --name mathviz-renderer --no-deploy
# When asked: pick a region close to you, say YES to Dockerfile, NO to database

# Deploy
fly deploy

# Get your URL
fly status
# Your URL is: https://mathviz-renderer.fly.dev
```

### Option D: Deploy to a VPS (DigitalOcean, Hetzner, etc.)

```bash
# SSH into your server
ssh user@your-server-ip

# Install Docker if not installed
curl -fsSL https://get.docker.com | sh

# Clone your repo
git clone https://github.com/YOUR_USERNAME/mathviz.git
cd mathviz/renderer

# Build and run
docker build -t mathviz-renderer .
docker run -d -p 8000:8000 --restart unless-stopped mathviz-renderer
```

Your renderer URL is: `http://your-server-ip:8000`

> **Tip:** Put it behind a reverse proxy (Caddy/nginx) with HTTPS for production.

---

## Step 3: Deploy the Frontend to Vercel

### 3a. Push your code to GitHub

```bash
# From the project root (not the renderer folder)
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mathviz.git
git push -u origin main
```

### 3b. Deploy on Vercel

1. Go to https://vercel.com/new
2. Click **Import** next to your `mathviz` repository
3. Vercel auto-detects Next.js — leave the defaults
4. **Expand "Environment Variables"** and add these:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` (your key from Step 1) |
| `RENDERER_URL` | The URL from Step 2 (e.g. `https://mathviz-renderer-production-xxxx.up.railway.app`) |

5. Click **Deploy**
6. Wait ~1 minute. Vercel gives you a URL like `https://mathviz-xxxx.vercel.app`

**That's it. You're live.**

---

## Running Everything Locally (Development)

If you just want to run it on your machine:

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/mathviz.git
cd mathviz
npm install

# 2. Create .env.local
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Start the Manim renderer (in a separate terminal)
cd renderer
docker build -t mathviz-renderer .
docker run -p 8000:8000 mathviz-renderer

# 4. Start the frontend (in another terminal, from project root)
npm run dev
```

Open http://localhost:3000 and you're good.

---

## Troubleshooting

### "ANTHROPIC_API_KEY is not configured"
→ You forgot to set the environment variable. Check `.env.local` (local) or Vercel dashboard (production).

### "Renderer returned 500" or "fetch failed"
→ The Manim renderer isn't running or the URL is wrong. Test it:
```bash
curl YOUR_RENDERER_URL/health
```
If that doesn't return `{"status":"ok"}`, the renderer is down.

### "Animation couldn't be rendered"
→ This is expected ~20-30% of the time. The AI-generated Manim code sometimes has bugs. The app retries twice automatically. Click Generate again for a new attempt.

### Docker build fails on ARM Mac (M1/M2/M3)
→ The Manim Docker image supports ARM. If you still hit issues:
```bash
docker build --platform linux/amd64 -t mathviz-renderer .
docker run --platform linux/amd64 -p 8000:8000 mathviz-renderer
```

### Vercel deploy fails with "Function too large"
→ This shouldn't happen with the current setup, but if it does, make sure you're not accidentally including the `renderer/` folder in the Vercel build. Add to your `vercel.json`:
```json
{
  "ignoreCommand": "exit 0"
}
```

### Video takes forever / times out
→ The renderer has a 90-second timeout. Complex animations can take a while. The system prompt tells Claude to keep animations under 60 seconds, but occasionally it generates something heavy.

---

## Cost Estimates

| Component | Cost |
|-----------|------|
| Vercel (frontend) | Free tier is fine for personal use |
| Railway (renderer) | Free tier: 500 hours/month. Plenty for personal use |
| Claude API (Sonnet) | ~$0.01-0.03 per generation |
| Claude API (Opus) | ~$0.10-0.30 per generation |

**For personal use, expect to spend ~$1-5/month on the Claude API.**

---

## Quick Reference

| What | Where |
|------|-------|
| Frontend code | `app/` |
| API route | `app/api/generate/route.ts` |
| Claude integration | `lib/claude.ts` + `lib/prompts.ts` |
| Renderer client | `lib/renderer.ts` |
| Manim renderer | `renderer/` |
| Environment variables | `.env.local` (local) or Vercel dashboard (prod) |
