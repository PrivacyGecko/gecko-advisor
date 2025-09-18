SHELL := /bin/sh

export COMPOSE_PROJECT_NAME=privacy_advisor

dev:
	docker compose -f infra/docker/docker-compose.yml --profile dev up -d --build
	# Apply DB migrations inside backend container (uses npm exec available in Node image)
	docker exec privacy-advisor-backend-1 npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma || true
	# Seed demo data
	docker exec privacy-advisor-backend-1 node node_modules/tsx/dist/cli.js infra/prisma/seed.ts || true

up:
	docker compose -f infra/docker/docker-compose.yml up -d --build

down:
	docker compose -f infra/docker/docker-compose.yml down -v

logs:
	docker compose -f infra/docker/docker-compose.yml logs -f --tail=100

test:
	pnpm -w test

seed:
	npm exec --yes prisma migrate deploy -- --schema=infra/prisma/schema.prisma
	pnpm -w seed

fmt:
	pnpm -w prettier --write .

.PHONY: dev up down logs test seed fmt
