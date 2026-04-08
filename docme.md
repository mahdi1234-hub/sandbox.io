# Sandbox.io - End-to-End Configuration Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Prerequisites](#prerequisites)
4. [Step 1: GitHub Repository Setup](#step-1-github-repository-setup)
5. [Step 2: Next.js Project Initialization](#step-2-nextjs-project-initialization)
6. [Step 3: Frontend - NOVERA Luxury Chat UI](#step-3-frontend---novera-luxury-chat-ui)
7. [Step 4: Backend - Ollama API Route](#step-4-backend---ollama-api-route)
8. [Step 5: Ollama Installation and Configuration](#step-5-ollama-installation-and-configuration)
9. [Step 6: ngrok Tunnel Setup](#step-6-ngrok-tunnel-setup)
10. [Step 7: Vercel Deployment](#step-7-vercel-deployment)
11. [Step 8: Connecting Vercel to Ollama via ngrok](#step-8-connecting-vercel-to-ollama-via-ngrok)
12. [Step 9: Verification](#step-9-verification)
13. [File Structure](#file-structure)
14. [Environment Variables](#environment-variables)
15. [Startup Procedure](#startup-procedure)
16. [Troubleshooting](#troubleshooting)

---

## Project Overview

Sandbox.io is a Next.js 14 AI chat application featuring a luxury NOVERA-inspired design. It uses Ollama with the TinyLlama model for local LLM inference, exposed to the internet via ngrok, and deployed to Vercel.

**Live URL**: https://sandboxio.vercel.app
**GitHub**: https://github.com/mahdi1234-hub/sandbox.io

## Architecture Diagram

```
User Browser
     |
     v
Vercel (Next.js Frontend + API Routes)
  - Static pages served from Vercel CDN
  - /api/chat serverless function
     |
     v (HTTPS)
ngrok Static URL
  https://dichotomistic-talitha-detrital.ngrok-free.dev
     |
     v (HTTP forward)
Ollama (localhost:11434)
  - TinyLlama 1B model (Q4_0 quantization)
  - Running on Vercel Sandbox (Linux)
     |
     v
TinyLlama LLM
  - Generates streaming token responses
```

## Prerequisites

- Node.js 18+ (used: 22.x)
- npm or pnpm
- Git
- GitHub account with a Personal Access Token
- ngrok account with auth token
- Vercel account with API token
- Linux environment (Vercel Sandbox)

## Step 1: GitHub Repository Setup

Created a new public GitHub repository using the GitHub REST API:

```bash
curl -s -X POST https://api.github.com/user/repos \
  -H 'Authorization: token <GITHUB_PAT>' \
  -H 'Accept: application/vnd.github+json' \
  -d '{"name":"sandbox.io","description":"AI Chat Agent with NOVERA luxury design","public":true,"auto_init":true}'
```

Then cloned the repo:

```bash
git clone https://<GITHUB_PAT>@github.com/mahdi1234-hub/sandbox.io.git
```

## Step 2: Next.js Project Initialization

Created the project with the following configuration files:

### package.json

Key dependencies:
- `next@^14.2.0` - React framework with App Router
- `react@^18.3.0` / `react-dom@^18.3.0` - UI library
- `ollama@^0.5.0` - Ollama client library
- `tailwindcss@^3.4.0` - Utility-first CSS framework
- `typescript@^5.0.0` - Type safety

### tsconfig.json

- Target: ES5 for broad compatibility
- Module resolution: `bundler` (Next.js recommended)
- Path alias: `@/*` maps to `./src/*`
- JSX: `preserve` (handled by Next.js)

### tailwind.config.ts

Custom NOVERA design tokens:
- Primary color: `#1c1917` (stone-900)
- Cream background: `#f9f8f6`
- Font families: System serif for headings, system sans-serif for body

### postcss.config.js

Standard Tailwind CSS + Autoprefixer setup.

### next.config.js

- Remote image patterns configured for Supabase CDN (background image)

Installed dependencies:

```bash
npm install
```

## Step 3: Frontend - NOVERA Luxury Chat UI

### Design System

The UI follows the NOVERA luxury design language:

- **Background**: Full-screen hero image from Supabase CDN with dark overlays
  - `bg-black/30` base overlay
  - `bg-gradient-to-t from-black/60 via-black/20 to-transparent` gradient
- **Typography**:
  - Headings: serif font, tracking-tight
  - Labels: 10px uppercase, tracking-widest, white/50 opacity
  - Body: sans-serif, font-light, white/90
- **Chat bubbles**: Glassmorphism effect
  - User messages: `bg-white/20 backdrop-blur-md border border-white/20`
  - AI messages: `bg-white/10 backdrop-blur-md border border-white/10`
- **Borders**: 2px border-radius (minimal/architectural: `rounded-[2px]`)
- **Animations**:
  - `fadeInUp` entrance animation with cubic-bezier easing
  - Typing indicator with pulsing dots
  - Smooth scroll on new messages

### File: app/globals.css

Contains:
- Tailwind directives (`@tailwind base/components/utilities`)
- Custom `fade-in-up` animation
- Typing dot pulse animation (`pulse-dot`)
- Custom scrollbar styling (`.chat-scroll`)
- Markdown prose styling (`.prose-chat`)
- Reduced motion media query support

### File: app/layout.tsx

Root layout with:
- Metadata (title: "NOVERA AI - Intelligent Assistant")
- Google Fonts preconnect links
- Body classes matching NOVERA design system

### File: app/page.tsx

Main chat page with:
- **State management**: messages array, input text, loading state, Ollama status
- **Ollama health check**: Polls `GET /api/chat` every 10 seconds
- **Status indicator**: Green/red/yellow dot in header showing connection status
- **Empty state**: Large serif heading "How can I assist you?" with suggestion chips
- **Message rendering**: User and AI bubbles with role-based styling
- **Streaming**: Reads SSE stream from `/api/chat` POST endpoint
- **Input area**: Auto-resizing textarea with Enter to send, Shift+Enter for newline

## Step 4: Backend - Ollama API Route

### File: app/api/chat/route.ts

Two endpoints:

**GET /api/chat** (Health Check)
- Calls `OLLAMA_BASE_URL/api/tags` with 5-second timeout
- Includes `ngrok-skip-browser-warning` header to bypass ngrok's browser interstitial
- Returns `{"status":"ok","model":"tinyllama"}` or error

**POST /api/chat** (Chat Completion)
- Accepts `{ messages: [{ role, content }] }` body
- Prepends system prompt defining Novera AI personality
- Forwards to Ollama's `/api/chat` endpoint with `stream: true`
- Converts Ollama's NDJSON stream to SSE format for the frontend
- Each chunk: `data: {"content":"token"}\n\n`
- Completion signal: `data: [DONE]\n\n`

Key headers for ngrok compatibility:

```typescript
const OLLAMA_HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
  "User-Agent": "NoveraAI/1.0",
};
```

## Step 5: Ollama Installation and Configuration

### Installation

Ollama was installed directly as a native Linux binary (no Docker -- Docker is not available in the Vercel sandbox):

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

This installs the `ollama` binary to `/usr/local/bin/ollama`.

### Starting Ollama

Two critical environment variables are required:

```bash
OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='*' nohup ollama serve > /tmp/ollama.log 2>&1 &
```

- `OLLAMA_HOST=0.0.0.0`: Binds to all interfaces (required for ngrok to reach it)
- `OLLAMA_ORIGINS='*'`: Accepts requests from any origin (required because ngrok changes the Host/Origin headers, and Ollama returns 403 without this)

### Pulling the Model

TinyLlama was chosen as the fastest model for CPU-only inference:

```bash
ollama pull tinyllama
```

- Model: TinyLlama 1.1B parameters
- Quantization: Q4_0 (smallest, fastest)
- Size: ~637 MB
- Inference speed: ~200ms per token on CPU

### Verification

```bash
curl -s http://127.0.0.1:11434/api/tags
# Returns: {"models":[{"name":"tinyllama:latest",...}]}

curl -s http://127.0.0.1:11434/api/chat \
  -d '{"model":"tinyllama","messages":[{"role":"user","content":"Say hello"}],"stream":false}'
# Returns: {"message":{"role":"assistant","content":"Hello!"},...}
```

## Step 6: ngrok Tunnel Setup

### Installation

ngrok was installed as a native binary:

```bash
curl -sSL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -o /tmp/ngrok.tgz
tar -xzf /tmp/ngrok.tgz -C /home/vercel-sandbox/.local/bin
```

### Authentication

```bash
ngrok config add-authtoken <NGROK_AUTH_TOKEN>
```

Config saved to `/home/vercel-sandbox/.config/ngrok/ngrok.yml`.

### Starting the Tunnel

Using ngrok's static URL feature so the URL never changes between restarts:

```bash
nohup ngrok http --url=dichotomistic-talitha-detrital.ngrok-free.dev 11434 --log /tmp/ngrok.log > /dev/null 2>&1 &
```

- `--url=dichotomistic-talitha-detrital.ngrok-free.dev`: Static URL (same across restarts)
- `11434`: Ollama's port
- `--log /tmp/ngrok.log`: Log file for debugging

### Verification

```bash
curl -s https://dichotomistic-talitha-detrital.ngrok-free.dev/api/tags \
  -H 'ngrok-skip-browser-warning: true' \
  -H 'User-Agent: NoveraAI/1.0'
# Returns: {"models":[{"name":"tinyllama:latest",...}]}
```

## Step 7: Vercel Deployment

### Initial Deployment

```bash
cd /vercel/sandbox/repos/sandbox.io
npx vercel --yes --token <VERCEL_TOKEN>
```

This:
1. Auto-detected Next.js project settings
2. Linked to the Vercel project `sandbox.io`
3. Connected the GitHub repository
4. Built and deployed the app

### Production URL

- Primary: https://sandboxio.vercel.app
- Build: Next.js 14.2.35
- Routes:
  - `/ ` (Static) - Chat UI
  - `/api/chat` (Dynamic) - Ollama proxy

## Step 8: Connecting Vercel to Ollama via ngrok

### Setting the Environment Variable

```bash
npx vercel env add OLLAMA_BASE_URL production --token <VERCEL_TOKEN> <<< 'https://dichotomistic-talitha-detrital.ngrok-free.dev'
```

This sets `OLLAMA_BASE_URL` on the Vercel project so the API route knows where to forward Ollama requests.

### Redeployment

After setting the env var, a production redeployment was triggered:

```bash
npx vercel --prod --yes --token <VERCEL_TOKEN>
```

The API route reads `process.env.OLLAMA_BASE_URL` at runtime, so the serverless function now forwards requests to the ngrok tunnel.

## Step 9: Verification

### Health Check

```bash
curl -s https://sandboxio.vercel.app/api/chat
# {"status":"ok","model":"tinyllama"}
```

### Full Chat Test

```bash
curl -s -X POST https://sandboxio.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hello, who are you?"}]}'
# Streams SSE tokens: data: {"content":"Good"}\n\ndata: {"content":" question"}\n\n...
```

### Process Verification

```bash
pgrep -a ollama
# 1079 ollama serve

pgrep -a ngrok
# 1189 ngrok http --url=dichotomistic-talitha-detrital.ngrok-free.dev 11434
```

## File Structure

```
sandbox.io/
  .gitignore              # Node/Next.js ignore rules
  .vercel/                # Vercel project config (auto-generated)
  README.md               # Project overview
  docme.md                # This file - full configuration docs
  package.json            # Dependencies and scripts
  package-lock.json       # Locked dependency versions
  tsconfig.json           # TypeScript configuration
  next.config.js          # Next.js configuration
  tailwind.config.ts      # Tailwind CSS design tokens
  postcss.config.js       # PostCSS plugins
  app/
    globals.css           # Global styles, animations, scrollbar
    layout.tsx            # Root HTML layout
    page.tsx              # Main chat UI component
    api/
      chat/
        route.ts          # Ollama proxy API (GET health, POST chat)
```

## Environment Variables

| Variable | Location | Value | Purpose |
|----------|----------|-------|---------|
| `OLLAMA_BASE_URL` | Vercel (production) | `https://dichotomistic-talitha-detrital.ngrok-free.dev` | ngrok tunnel URL for Ollama |
| `OLLAMA_MODEL` | Vercel (optional) | `tinyllama` (default) | Which Ollama model to use |
| `OLLAMA_HOST` | Sandbox process env | `0.0.0.0` | Bind Ollama to all interfaces |
| `OLLAMA_ORIGINS` | Sandbox process env | `*` | Allow all CORS origins |

## Startup Procedure

When the sandbox restarts, run these two commands to bring everything back online:

```bash
# 1. Start Ollama with permissive network settings
OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='*' nohup ollama serve > /tmp/ollama.log 2>&1 &

# 2. Start ngrok with the static URL pointing to Ollama's port
nohup ngrok http --url=dichotomistic-talitha-detrital.ngrok-free.dev 11434 --log /tmp/ngrok.log > /dev/null 2>&1 &
```

No Vercel redeployment is needed because the ngrok URL is static and the `OLLAMA_BASE_URL` env var already points to it.

## Troubleshooting

### Ollama returns 403 through ngrok

Cause: `OLLAMA_ORIGINS` is not set to `*`.

Fix:
```bash
pkill ollama
OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='*' nohup ollama serve &
```

### Vercel API returns "Ollama not responding"

Possible causes:
1. Ollama is not running: `pgrep ollama` to check
2. ngrok is not running: `pgrep ngrok` to check
3. ngrok URL changed: Check with `curl http://127.0.0.1:4040/api/tunnels`

### ngrok returns HTML instead of JSON

Cause: Missing `ngrok-skip-browser-warning` header.

The API route already includes this header. If testing manually:
```bash
curl -H 'ngrok-skip-browser-warning: true' https://dichotomistic-talitha-detrital.ngrok-free.dev/api/tags
```

### Model not found

Pull the model:
```bash
ollama pull tinyllama
```

### Slow responses

TinyLlama on CPU typically generates ~5-10 tokens/second. For faster inference:
- Use a smaller quantization (already using Q4_0, the smallest)
- Consider switching to a cloud LLM API (Groq, Together AI)
