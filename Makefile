SHELL := /bin/sh

export COMPOSE_PROJECT_NAME=privacy_advisor
ENV ?= dev

COMPOSE_BASE = -f infra/docker/docker-compose.yml

ifeq ($(ENV),dev)
COMPOSE_FILES = $(COMPOSE_BASE) -f infra/docker/docker-compose.dev.yml
endif
ifeq ($(ENV),stage)
COMPOSE_FILES = $(COMPOSE_BASE) -f infra/docker/docker-compose.dev.yml -f infra/docker/docker-compose.stage.yml
endif
ifeq ($(ENV),production)
COMPOSE_FILES = $(COMPOSE_BASE)
endif

DOCKER_COMPOSE = docker compose $(COMPOSE_FILES)

dev:
	$(MAKE) ENV=dev up
	$(MAKE) ENV=dev migrate
	$(MAKE) ENV=dev seed

stage:
	$(MAKE) ENV=stage up
	$(MAKE) ENV=stage migrate

prod:
	$(MAKE) ENV=production up

up:
	$(DOCKER_COMPOSE) up -d --build

down:
	$(DOCKER_COMPOSE) down -v

logs:
	$(DOCKER_COMPOSE) logs -f --tail=100

migrate:
	docker exec privacy-advisor-backend-1 npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma || true

seed:
	docker exec privacy-advisor-backend-1 node node_modules/tsx/dist/cli.js infra/prisma/seed.ts || true

test:
	pnpm -w test

fmt:
	pnpm -w prettier --write .

.PHONY: dev stage prod up down logs test seed fmt migrate
