# Quiz Generator Agents Guide

## Mission
- Deliver the NCTB Quiz Generator MVP outlined in `requirements.md` and `plan.md`.
- Process chapter PDFs into MCQs with editorial review, question bank publishing, exports, and an internal API.
- Keep the entire stack TypeScript-first across backend (`apps/api`), frontend (`apps/web`), and shared packages (`packages/*`).

## Core Delivery Principles
- No unused code: remove unused variables and imports before merge; keep lint warnings at zero.
- Type safety: never use `any`; prefer precise `type` aliases or interfaces that match domain models.
- Consistency: apply DRY (user called out "DYR"), KISS, and clear separation of concerns.
- Error handling: wrap async route handlers with `catchAsync` and send payloads with `sendResponse`.
- Feedback UX: trigger toast notifications for both success and error cases in the web UI.
- Collaboration: document assumptions, keep backend and frontend contracts in sync, and update this guide when conventions evolve.

## Architecture Snapshot
- Backend: Express + Prisma + BullMQ + Zod, layered into controllers, services, repositories, and workers. Depends on Postgres (RDS), Redis (for queues), AWS S3 and SES.
- Frontend: Next.js (App Router) + TypeScript + axios + tanstack query, styled with Tailwind and shadcn/ui components.
- Workers: BullMQ queues run rasterization and Gemini generation, respecting the 30 RPM global cap and 5 concurrent workers.
- Shared Libraries: Common TypeScript utilities, HTTP clients, and domain types reside in `packages/*`; keep OpenAPI clients or hand-rolled SDKs here.
- Infra: Docker Compose mirrors local services (API, worker, web, Postgres, Redis, Nginx); deployments target AWS EC2, S3 + CloudFront, RDS, Redis, and SES.

## Backend Implementation Guidelines
- Routing and Controllers
  - Group routes by domain (auth, settings, taxonomy, uploads, generation, questions, exports).
  - All async handlers must use `catchAsync` so the global error handler captures failures.
  - Respond through `sendResponse({ statusCode, success, message, data })` to preserve the envelope.
- Validation and Types
  - Validate inputs with Zod; halt on first failure with descriptive errors.
  - Mirror Prisma models with exported types in shared packages for frontend consumption.
  - Centralize enums and constants (statuses, difficulty weights, queue names) in one place.
- Business Logic
  - Keep controllers thin; services coordinate Prisma access and domain rules (locks, sequencing, regeneration).
  - Background jobs handle rasterization and Gemini calls; record attempts in `page_generation_attempts` and `llm_usage_events`.
  - Enforce role-based access in middleware (Admin versus Approver).
- Integration
  - Use the typed Prisma client; prefer repository helpers to avoid duplication.
  - Wrap AWS SDK usage for S3 pre-signed URLs and SES mailers; provide mocks for tests.
- Error and Logging
  - Emit structured logs with correlation IDs for requests and jobs.
  - Persist LLM failure diagnostics (prompt, response excerpt, attempt count) for UI visibility.

## Frontend Implementation Guidelines
- Foundation
  - Use Next.js layouts for context separation; configure providers for auth session, tanstack query, and toast.
  - Centralize axios configuration with interceptors for auth token management and error normalization.
- State and Data
  - Fetch data through tanstack query hooks; invalidate caches on mutations and show toast feedback.
  - Store query keys and data contracts in shared typed modules.
- UI Components
  - Build on shadcn/ui primitives and create reusable wrappers in `apps/web/components/ui`.
  - Deliver responsive layouts and default to Bangla localization.
- Forms and Validation
  - Pair react-hook-form with Zod schemas; surface backend validation errors inline and via toast.
- Access Control
  - Implement route guards in both server and client contexts; redirect unauthenticated users to the login flow.

## Cross-Cutting Utilities
- Keep `sendResponse` and `catchAsync` in shared utilities; update tests and docs when their signatures change.
- House the axios client (and any fetch wrappers) in a shared package so workers or scripts can reuse them.
- Maintain canonical constants (statuses, difficulty weights, queue metadata) in `packages/config` or equivalent.

## Feature Expectations (MVP Slices)
- Auth and Settings: email/password auth, admin user management, SES-based password resets, and settings for API token and queue configuration.
- Taxonomy: CRUD for Class (6-10), Subjects (two-letter code), and Chapters (unique ordinal per class and subject).
- Uploads and Rasterization: validate PDF size/page limits, store original plus generated PNG/JPEG assets, queue rasterization, and expose job progress.
- Generation Pipeline: per-page BullMQ jobs hitting Gemini 2.5 Flash with three-attempt exponential backoff; record successes and failures.
- Editorial Review: role-aware UI for status changes, inline edits, bulk actions, regeneration, and question bank locking.
- Exports and Internal API: CSV/JSON exports aligned with requirement schemas plus a bearer-protected API for approved questions.
- Observability: request and job logging, metrics dashboards, `/healthz`, and SES alerts for failures.

## Testing and Quality Gates
- Backend: use Vitest or Jest for unit and integration coverage across auth, uploads, generation orchestration, and publish flows.
- Frontend: rely on React Testing Library for components, tanstack query hooks, and core workflows.
- Maintain coverage >=70%; run `tsc --noEmit`, ESLint, and format checks locally and in CI. Add regression tests with every bug fix.

## Workflow Checklist
- Align work with `plan.md`; update documentation or runbooks when delivering a feature slice.
- Before opening a PR: lint, type-check, and run relevant unit/integration tests.
- Capture manual QA steps for complex flows such as uploads, regeneration retries, and exports.
- Update Docker Compose files or env templates when adding services or configuration.
- Keep deployment scripts and operational playbooks current with infra changes.

## Communication Expectations
- Flag blockers early (LLM quotas, AWS limits, SES sandbox restrictions).
- Keep changelog entries concise and highlight schema or migration impacts.
- When deviating from this guide, explain the reasoning and revise the guide if the change becomes standard practice.

