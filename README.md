# TxnGuard

TxnGuard is a real-time fraud detection and transaction monitoring MVP for merchant payment flows. A merchant sends a payment event with an API key; TxnGuard scores it, records the decision and audit events, then updates the operations dashboard in real time.

## What it does

- Merchant registration, login, refresh-token rotation, and API-key rotation
- API-key-protected transaction ingestion with idempotency keys
- Rule-based fraud scoring: country mismatch, high amount, merchant velocity, and overnight high-value transactions
- PostgreSQL transaction and fraud-event audit trail
- Redis fixed-window velocity counting
- BullMQ-powered realtime-event delivery with retry
- Next.js risk-operations dashboard with overview, filtering, transaction detail, and settings

## Architecture

```text
Merchant integration --HTTP/API key--> NestJS API --writes--> PostgreSQL
                                      |
                                      +--velocity--> Redis
                                      +--job--> BullMQ / Redis --> Socket.IO --> Dashboard
```

PostgreSQL is the source of truth. Redis holds temporary velocity counters and BullMQ jobs. The fraud decision is made synchronously during ingestion; the queue handles the downstream dashboard notification.

## Stack

- pnpm workspace and Turborepo
- NestJS, Drizzle ORM, PostgreSQL, Redis, BullMQ, Socket.IO
- Next.js, React Query, Zustand, Recharts
- Shared TypeScript and Zod contracts

## Quick start

Prerequisites: Node.js 22+, pnpm 11+, and Docker Desktop.

The shortest path is:

```bash
make setup
make dev
```

`make setup` installs dependencies, creates `.env` from the example when necessary, starts PostgreSQL and Redis, and applies migrations.

<details>
<summary>Equivalent manual commands</summary>

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter @txnguard/api db:migrate
pnpm dev
```

</details>

The web app runs at [http://localhost:3000](http://localhost:3000), the API at [http://localhost:3001](http://localhost:3001), and Swagger at [http://localhost:3001/docs](http://localhost:3001/docs) in development.

Wait for the local dependencies to become healthy when needed:

```bash
docker compose ps
curl http://localhost:3001/health
```

## Local services

| Service | Address | Purpose |
| --- | --- | --- |
| PostgreSQL | `localhost:5433` | Durable merchant, transaction, and fraud-event data |
| Redis | `localhost:6379` | Velocity counters and BullMQ jobs |
| API | `localhost:3001` | REST API, Swagger, and Socket.IO |
| Web | `localhost:3000` | Risk-operations dashboard |

## Try the transaction flow

1. Open `http://localhost:3000/register`, create a merchant, and copy the one-time API key.
2. Keep the dashboard open, then submit a transaction from another terminal:

```bash
curl -X POST http://localhost:3001/transactions \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "amountMinor": 125000,
    "currency": "USD",
    "cardBin": "411111",
    "cardCountry": "US",
    "ipAddress": "203.0.113.42",
    "ipCountry": "TR",
    "idempotencyKey": "demo-transaction-0001"
  }'
```

The country mismatch and high amount rules should produce a flagged decision. The dashboard receives a realtime event and refreshes its data.

## Demo data flow

Use the included demo stream to fill one merchant dashboard with a realistic mix of clean, flagged, and declined payments.

1. Start the stack and open the Wise Company dashboard in one browser tab:

   ```bash
   make infra-up
   make dev
   ```

2. Use the API key shown when the merchant was registered. If it was not saved, sign in as Wise Company and use **Settings → Rotate API key**. Rotation invalidates the previous key and shows the replacement only once.

3. In a second terminal, keep the key out of files and set it only for the shell session:

   ```bash
   export TXNGUARD_API_KEY='tg_live_your_key_here'
   make demo-flow
   ```

   For a non-local API, add `TXNGUARD_API_URL=https://your-api.example` before the command.

4. Keep the dashboard open while the script runs. It sends nine transactions in under a minute. On a fresh velocity window, expect:

   | Result | Expected count | Where to inspect it |
   | --- | ---: | --- |
   | Approved | 6 | Overview and Transactions |
   | Flagged | 2 | Fraud review and Transactions |
   | Declined | 1 | Fraud review and Transactions |

   The sequence demonstrates all deterministic v1 rules: country mismatch, high amount, and merchant velocity. The overnight rule is time-dependent and only triggers between 00:00 and 05:00 UTC.

5. Verify the flow:

   - **Overview:** transaction count becomes 9; severity mix and the activity chart update.
   - **Transactions:** filter by **Flagged** and then **Declined**. Open a row to see its fraud-event audit trail.
   - **Fraud review:** it should show the two flagged payments and one declined payment.
   - **Realtime:** new rows and dashboard totals refresh without a manual browser refresh.

## Live delivery incident

To see why the API response, BullMQ and Socket.IO are separate concerns, keep **Overview** open and run:

```bash
export TXNGUARD_API_KEY='tg_live_your_key_here'
make live-incident
```

The script paces eight payments roughly one second apart. Each request is scored and stored first; its already-final decision is then placed on the `transaction-events` BullMQ queue. The worker delivers that event to the merchant Socket.IO room, and the dashboard refreshes its totals and table without polling or a browser refresh. If Redis or the worker is unavailable, the API still records the payment, while delivery is retried by BullMQ rather than making the merchant retry a charge request.

The velocity counter has a 60-second TTL. Wait at least one minute between demo runs if you want the expected counts above; otherwise earlier activity can cause the velocity rule to trigger sooner.

## Database migrations

```bash
pnpm --filter @txnguard/api db:generate
pnpm --filter @txnguard/api db:migrate
```

`db:migrate` reads `DATABASE_URL` from `.env`. Commit generated migration SQL and Drizzle metadata together.

## Quality checks

```bash
make check
```

The GitHub Actions workflow runs the TypeScript checks and production builds on every push and pull request.

## Make commands

Run `make help` to see the complete list. The most useful commands are:

| Command | Purpose |
| --- | --- |
| `make setup` | First-time local setup: dependencies, `.env`, Docker, migrations |
| `make dev` | Start the API and dashboard together |
| `make api` / `make web` | Start one application only |
| `make infra-up` / `make infra-down` | Start or stop PostgreSQL and Redis |
| `make infra-status` | Check Docker service health |
| `make migrate` / `make migration` | Apply or generate database migrations |
| `make demo-flow` | Send a mixed transaction stream using `TXNGUARD_API_KEY` |
| `make check` | Typecheck, build, test, and validate Docker Compose |

## Environment

Copy `.env.example` to `.env` for local development. Do not commit `.env`; use unique, high-entropy JWT secrets outside local development.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `API_PORT` | API port, default `3001` |
| `CORS_ORIGIN` | Allowed dashboard origin(s), comma-separated |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets, 32+ characters |
| `VELOCITY_WINDOW_SECONDS` | Redis fixed-window duration |
| `VELOCITY_THRESHOLD` | Transactions allowed before the velocity rule triggers |
| `API_KEY_ROTATION_WINDOW_SECONDS` / `API_KEY_ROTATION_LIMIT` | Merchant-specific fixed window for API-key rotations; defaults to 3 per hour |
| `NEXT_PUBLIC_API_URL` | Browser-visible API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Browser-visible Socket.IO base URL |

## Current scope and next hardening steps

This is an MVP, not a payment processor. Before a production deployment, add automated API/UI tests, a durable outbox for transaction-to-queue publishing, atomic idempotency conflict handling, broader endpoint rate limiting, monitoring, secrets management, data-retention policies, and merchant fraud-review workflows. API-key rotation is already protected by a merchant-specific Redis limit (3 per hour by default).
