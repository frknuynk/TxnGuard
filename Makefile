.DEFAULT_GOAL := help

.PHONY: help install env setup dev web api infra-up infra-down infra-status infra-logs migrate migration studio demo-flow live-incident typecheck build test check

help: ## Show the available commands
	@awk 'BEGIN {FS = ":.*##"}; /^[a-zA-Z0-9_-]+:.*##/ {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install workspace dependencies
	pnpm install

env: ## Create .env from .env.example when needed
	@test -f .env || cp .env.example .env
	@echo ".env is ready"

setup: ## Install, configure, start infrastructure, and apply migrations
	@$(MAKE) install
	@$(MAKE) env
	@$(MAKE) infra-up
	@$(MAKE) migrate

dev: ## Start all development applications
	pnpm dev

web: ## Start only the Next.js dashboard
	pnpm --filter @txnguard/web dev

api: ## Start only the NestJS API
	pnpm --filter @txnguard/api dev

infra-up: ## Start PostgreSQL and Redis
	docker compose up -d

infra-down: ## Stop PostgreSQL and Redis
	docker compose down

infra-status: ## Show infrastructure health
	docker compose ps

infra-logs: ## Follow PostgreSQL and Redis logs
	docker compose logs -f

migrate: ## Apply pending database migrations
	pnpm --filter @txnguard/api db:migrate

migration: ## Generate a migration from the Drizzle schema
	pnpm --filter @txnguard/api db:generate

studio: ## Open Drizzle Studio
	pnpm --filter @txnguard/api db:studio

demo-flow: ## Send a mixed fraud-demo transaction stream to one merchant
	@test -n "$$TXNGUARD_API_KEY" || (echo "Set TXNGUARD_API_KEY before running make demo-flow"; exit 1)
	node scripts/demo-transaction-stream.mjs

live-incident: ## Send a paced incident stream to demonstrate BullMQ and Socket.IO delivery
	@test -n "$$TXNGUARD_API_KEY" || (echo "Set TXNGUARD_API_KEY before running make live-incident"; exit 1)
	node scripts/demo-live-incident.mjs

typecheck: ## Run TypeScript checks across the workspace
	pnpm typecheck

build: ## Create production builds for all packages
	pnpm build

test: ## Run workspace tests
	pnpm test

check: ## Run the local quality gate and validate Docker Compose
	pnpm typecheck
	pnpm build
	pnpm test
	docker compose config -q
