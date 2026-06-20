# TxnGuard

TxnGuard is a real-time fraud detection and transaction monitoring platform for merchant payment flows.

## Current Stack

- pnpm workspace
- Turborepo
- TypeScript
- NestJS API
- Drizzle ORM
- PostgreSQL
- Redis
- Shared TypeScript/Zod contracts

## Workspace Structure

```txt
apps/api
packages/shared
```

## Local Infrastructure

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

Services:

```txt
PostgreSQL: localhost:5433
Redis: localhost:6379
```

## API

Run the API:

```bash
pnpm --filter @txnguard/api dev
```

Health check:

```bash
curl http://localhost:3001/health
```

## Database

Generate migrations:

```bash
pnpm --filter @txnguard/api db:generate
```

Apply migrations:

```bash
DATABASE_URL="postgresql://txnguard:txnguard@localhost:5433/txnguard" pnpm --filter @txnguard/api db:migrate
```

## Quality Checks

```bash
pnpm typecheck
pnpm build
```
