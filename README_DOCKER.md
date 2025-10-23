# Docker Setup (NCTB Quiz Generator)

This repository includes a Docker-based local development setup that matches the requirements in `nctb_quiz_generator_mvp_requirements_updated.md`.

## Stack
- Postgres 16 (DB name `enayet`, schemas `quiz_gen`, `quiz_gen_shadow`)
- Redis 7 (BullMQ queues)
- API (Express/TypeScript) – dev mode
- Worker (BullMQ) – dev mode
- Web (Next.js App Router) – dev mode
- Nginx (reverse proxy `/: web`, `/api: api`)

## Quickstart
1) Copy env template:
- `cp .env.example .env` (or duplicate manually on Windows)

2) Start infra only (DB + Redis):
- `docker compose up -d postgres redis`

3) Start all services once code exists in `apps/api` and `apps/web`:
- `docker compose up --build`
- Web at `http://localhost:8080` (via Nginx). API proxied under `/api`.

Notes:
- Postgres init mounts `db/schema.sql` and applies it under `quiz_gen` schema via `ALTER DATABASE ... search_path`.
- Prisma URLs for containers use `host=postgres`. Host tooling (e.g., Prisma CLI on your machine) should use `host=localhost`.
- Worker concurrency is configurable via `WORKER_CONCURRENCY` in `.env`.

## Ports
- Postgres: `5432` (mapped to host)
- Redis: `6379` (mapped to host)
- API: `4000` (direct) and proxied at `/api` via Nginx
- Web: `3000` (direct) and proxied at `/` via Nginx
- Nginx: `8080` on host

## Expected Project Layout
- `apps/api` – Express/TypeScript backend (Prisma, queues)
- `apps/web` – Next.js frontend (App Router)

> The Dockerfiles assume each app folder contains its own `package.json`.

## Environment
- `.env.example` includes local dev defaults aligned with the requirements (DB name `enayet`, schemas `quiz_gen` & `quiz_gen_shadow`, Redis URL, AWS/SES placeholders, internal API bearer token, etc.).

## Common Commands
- Stop everything: `docker compose down`
- Reset DB data: `docker compose down -v` (removes volumes)
- Logs: `docker compose logs -f <service>` (e.g., `postgres`, `api`)

