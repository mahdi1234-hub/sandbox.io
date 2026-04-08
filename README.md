# Sandbox.io - AI Chat Agent

Everything is back online and working end-to-end.

**Live app**: https://sandboxio.vercel.app

Health check returns `{"status":"ok","model":"tinyllama"}`

## Architecture

The setup uses ngrok's static URL feature (`--url=dichotomistic-talitha-detrital.ngrok-free.dev`), which means the ngrok URL remains the same across restarts. The Vercel env var `OLLAMA_BASE_URL` pointing to `https://dichotomistic-talitha-detrital.ngrok-free.dev` never needs to change.

### Current running services

- **Ollama** serving TinyLlama on `0.0.0.0:11434` (with `OLLAMA_ORIGINS=*`)
- **ngrok tunnel**: `https://dichotomistic-talitha-detrital.ngrok-free.dev` forwarding to port 11434

### How it works

1. User opens https://sandboxio.vercel.app
2. Next.js frontend loads from Vercel
3. Chat messages are sent to `/api/chat` (Vercel serverless function)
4. The API route forwards requests through the ngrok tunnel to Ollama
5. Ollama processes the request with TinyLlama and streams tokens back
6. The response streams in real time to the user's browser

### Tech Stack

- **Frontend**: Next.js 14 (App Router) with Tailwind CSS
- **Design**: NOVERA luxury design system (glassmorphism, serif headings, backdrop blur)
- **LLM**: Ollama with TinyLlama (1B parameter model, Q4_0 quantization)
- **Tunnel**: ngrok with static URL for persistent connectivity
- **Hosting**: Vercel (frontend + API routes)

### Startup Commands

To restart the backend services:

```bash
# Start Ollama with permissive CORS
OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='*' nohup ollama serve &

# Start ngrok with static URL on Ollama's port
nohup ngrok http --url=dichotomistic-talitha-detrital.ngrok-free.dev 11434 &
```

No Vercel redeployment needed since the ngrok URL is stable.
