# MINT

A premium liquid-glass exchange for Telegram channel IPOs (TDAs), bringing
minimal, Nasdaq-style media equity trading to the TON ecosystem.

Built as a standalone **Next.js 15** application. It runs and deploys anywhere
that hosts Node.js (Vercel, Docker, a VPS, etc.) with no external platform
dependency.

## Tech stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4, `motion` for animations
- TON Connect (`@tonconnect/ui-react`) wallet integration
- Optional Gemini AI valuations (`@google/genai`) — gracefully falls back to
  built-in deterministic data when no key is configured
- Telegram bot webhook for on-demand channel valuations

## Prerequisites

- Node.js 20+

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in values you need (all are optional)
npm run dev
```

The app is fully functional with no environment variables: AI valuations use a
deterministic fallback and the Telegram webhook runs in sandbox mode.

## Environment variables

All variables are optional. See `.env.example` for details.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Enables live Gemini AI valuations. Without it, a deterministic mock is used. |
| `APP_URL` | Public URL used for self-referential links and the Telegram Mini App button. |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather. Without it, the webhook runs in sandbox mode. |
| `TELEGRAM_WEBHOOK_SECRET` | Optional shared secret. When set, incoming webhook requests must present a matching `X-Telegram-Bot-Api-Secret-Token` header. |

## Build and run (production)

```bash
npm run build
npm start
```

The project uses Next.js `output: "standalone"`, so it can also be containerised
and run as `node .next/standalone/server.js`.

## Deploy

- **Vercel:** import the repo; set any env vars under Project Settings; deploy.
- **Docker / VPS:** run `npm run build`, then serve the standalone output.

## Telegram bot setup

1. Create a bot with @BotFather and copy the token into `TELEGRAM_BOT_TOKEN`.
2. (Optional) set `TELEGRAM_WEBHOOK_SECRET` to a random string.
3. Deploy, then open `GET /api/telegram/webhook` once to register the webhook
   and the Mini App menu button automatically.
