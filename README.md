# SignalRelay

TradingView webhook inbox and alert desk for **Momentum Master v1 Plus** and **Hope & Failure v1 Plus** Pine scripts.

Live desk: [signalrelay-weld.vercel.app](https://signalrelay-weld.vercel.app/)

## TradingView setup

1. Paste `reference/momentum-master-v1-plus.pine` into Pine Editor → save → add to chart.
2. **Alerts** → create on that chart → condition **Any alert() function call**.
3. Notifications → **Webhook URL**: `https://YOUR-DOMAIN/api/webhook`
4. Optional second alert on **Hope & Failure v1 Plus** (`reference/hope-failure-burst-reversal-v1-plus.pine`) with the same webhook URL.

**Strategy Mode = Disabled** is fine for golden-zone and Fib-touch webhooks. Turn on a strategy only if you want entry / TP-hit alerts from simulated trades.

## Local dev

```bash
npm install
npm run dev
```

Webhook: `POST http://localhost:3000/api/webhook` with JSON body from Pine `alert()`.

Events are stored in `data/events.json` (gitignored).

## Vercel production (required for persistent alerts)

Serverless filesystem is **not** reliable. Add **Upstash Redis**:

1. Vercel project → **Storage** → create **Upstash Redis** (or link existing).
2. Vercel injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Redeploy. Desk header shows **Redis** when connected.

### Optional env

| Variable | Purpose |
|----------|---------|
| `SIGNALRELAY_WEBHOOK_SECRET` | Reject webhooks unless `secret` field in JSON or header `x-signalrelay-secret` |
| `SIGNALRELAY_DESK_PASSWORD` | HTTP Basic auth on desk + `/api/events` (webhook stays public) |

## Pine reference files

| File | Use |
|------|-----|
| `momentum-master-v1-original.pine` | Chart only, no webhooks |
| `momentum-master-v1-plus.pine` | Production + SignalRelay JSON alerts |
| `hope-failure-burst-reversal-v1-plus.pine` | Hope script + webhooks |
| `signalrelay-momentum-auto-alerts.pine` | Snippet to append manually |

## Desk features

- Horizon filters (Scalp / Intraday / Swing)
- Alert kinds: Golden, Fib touch, TP/SL hit, Entries, Burst
- SSE live updates (fallback poll)
- **Copy Cursor prompt** (Review / Risk / Scalp / Swing)
- Export CSV

## Scripts

```bash
npm run build
npm test
```
