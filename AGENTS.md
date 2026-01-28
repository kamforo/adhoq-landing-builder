# Development Agents Guide

This document defines specialized AI agents for developing the Adhoq Landing Page Builder. Each agent has a focused scope, clear inputs/outputs, and instructions for how to prompt it.

## Agent Index

| # | Agent | Scope | When to Use |
|---|-------|-------|-------------|
| 1 | **LP Generator Agent** | AI pipeline code | Modifying analyzer, builder, prompt writer, or agents |
| 2 | **UI Agent** | Frontend components | Dashboard, builder UI, settings panels |
| 3 | **API Agent** | Route handlers | New endpoints, request validation, background jobs |
| 4 | **Schema Agent** | Database & Prisma | Migrations, new models, query optimization |
| 5 | **Parser Agent** | Input processing | URL scraping, file parsing, content extraction |
| 6 | **QA & Test Agent** | Testing & quality | Unit tests, integration tests, test infrastructure |
| 7 | **LLM Integration Agent** | AI providers | Adding new LLM providers, prompt optimization |
| 8 | **Deploy & Infra Agent** | DevOps | DigitalOcean, environment config, CI/CD |

---

## Agent 1: LP Generator Agent

**Scope**: The AI generation pipeline — analyzer, architect, prompt writer, builder agent, QA, repair.

**Key files**:
- `src/lib/agents/architect.ts` — Plans LP structure (LPBlueprint)
- `src/lib/agents/qa.ts` — Validates generated HTML
- `src/lib/agents/repair.ts` — Fixes issues
- `src/lib/builder-agent/index.ts` — Builds HTML from prompt
- `src/lib/builder-agent/lp-rules.ts` — Non-negotiable LP rules
- `src/lib/prompt-writer/index.ts` — Writes builder prompts
- `src/lib/analyzer/ai-analyzer.ts` — AI-powered page analysis
- `src/lib/analyzer/*.ts` — Component, section, flow, style, persuasion detection
- `src/app/api/generate/route.ts` — 3-agent endpoint
- `src/app/api/v3/generate/route.ts` — V3 pipeline endpoint
- `src/app/api/v3/repair/route.ts` — Repair endpoint

**Context to provide**:
- The agent pattern: prompt -> LLM call -> regex JSON extract -> typed result + fallback
- LP rules from `lp-rules.ts` (mobile-first, no overflow:hidden, min-height, no vw fonts)
- Multi-step structure: HOOK (step 1) → QUIZ (steps 2-N-1) → CTA (step N)
- LPBlueprint type structure from architect.ts
- QAResult type with severity levels and check categories
- The fallback pattern — every agent has a deterministic fallback function

**Example prompt**:
> "Add a new agent that generates social proof notifications. It should receive the ComponentAnalysis and return an array of notification texts. Follow the same pattern as architect.ts: build a prompt, call Grok, parse JSON, handle fallback. Add it to the V3 pipeline between Build and QA."

---

## Agent 2: UI Agent

**Scope**: React components, pages, and user interface.

**Key files**:
- `src/app/page.tsx` — Admin dashboard (980 LOC)
- `src/app/builder/page.tsx` — V1 builder (590 LOC)
- `src/app/v3/page.tsx` — V3 builder (1016 LOC)
- `src/components/landing-builder/*.tsx` — 12 custom components
- `src/components/ui/*.tsx` — 15 shadcn/ui components
- `src/app/globals.css` — Tailwind + OKLCH color variables

**Context to provide**:
- All custom components are `"use client"` and receive props from parent page
- State lives in page components, children get `options` + `onChange` callbacks
- shadcn/ui New York style with neutral base
- Tailwind CSS 4 with OKLCH color variables
- Lucide React icons
- No custom hooks — logic is component-internal
- Component barrel export: `src/components/landing-builder/index.ts`
- Types: `GenerationOptions`, `ParsedLandingPage`, `ComponentAnalysis`

**Example prompt**:
> "Add a new Template Library tab to the dashboard. It should show saved templates in a grid, allow filtering by vertical, and support one-click project creation from a template. Use shadcn Card, Badge, and Dialog components. Follow the same pattern as the Projects tab in page.tsx."

---

## Agent 3: API Agent

**Scope**: Next.js API route handlers and request processing.

**Key files**:
- `src/app/api/projects/route.ts` — List/create projects
- `src/app/api/projects/[id]/route.ts` — Project CRUD
- `src/app/api/projects/[id]/generate/route.ts` — Background generation
- `src/app/api/generate/route.ts` — V1 generation endpoint
- `src/app/api/v3/generate/route.ts` — V3 pipeline endpoint
- `src/app/api/v3/repair/route.ts` — Repair endpoint
- `src/app/api/parse/route.ts` — URL/file parsing
- `src/app/api/download/route.ts` — ZIP/HTML download

**Context to provide**:
- App Router route handlers: `export async function GET/POST/PATCH/DELETE(request: NextRequest)`
- Return `NextResponse.json({ ... }, { status: ... })`
- Database access via `import { createProject, ... } from '@/lib/db'`
- No authentication middleware yet — prepared in schema but not enforced
- Background generation pattern: update status to GENERATING, fire async function, don't await
- Project polling: frontend checks status every 5 seconds
- Download: single variation returns HTML, multiple returns ZIP via JSZip

**Example prompt**:
> "Add a batch generation endpoint at /api/batch/generate. It should accept an array of project IDs, queue them for generation, and return immediately. Each project should be processed sequentially to avoid rate limiting. Update status via the existing updateProject function."

---

## Agent 4: Schema Agent

**Scope**: Prisma schema, migrations, database queries.

**Key files**:
- `prisma/schema.prisma` — Full database schema (348 lines)
- `prisma.config.ts` — Prisma configuration (Supabase adapter)
- `src/lib/db/prisma.ts` — PrismaClient singleton with pg adapter
- `src/lib/db/projects.ts` — Project CRUD functions (260 lines)

**Context to provide**:
- PostgreSQL on Supabase with connection pooling (port 6543)
- `@prisma/adapter-pg` with `pg.Pool` — not standard PrismaClient
- Active models: Project, Variation (everything else is prepared/unused)
- Project statuses: DRAFT, GENERATING, COMPLETED, FAILED, ARCHIVED
- Variation has A/B test fields (clicks, conversions, isWinner) — not yet used
- Template, Job, Image, TrackerConfig models exist but have no query layer yet
- No migrations directory exists — using `prisma db push` currently

**Example prompt**:
> "Add CRUD functions for the Template model in a new file src/lib/db/templates.ts. Follow the same pattern as projects.ts. Include: createTemplate, getTemplate, listTemplates (with vertical/category/isPublic filters), updateTemplate, deleteTemplate, incrementUsageCount."

---

## Agent 5: Parser Agent

**Scope**: URL scraping, file parsing, content extraction.

**Key files**:
- `src/lib/parser/url-scraper.ts` — Fetch URL, inline CSS/JS
- `src/lib/parser/file-parser.ts` — Parse HTML/ZIP files
- `src/lib/parser/text-extractor.ts` — Extract text blocks
- `src/lib/parser/link-detector.ts` — Classify links
- `src/lib/parser/form-extractor.ts` — Extract forms
- `src/lib/parser/tracking-detector.ts` — Detect tracking codes
- `src/lib/parser/index.ts` — Parser orchestration
- `src/app/api/parse/route.ts` — Parse API endpoint

**Context to provide**:
- Uses Cheerio for HTML parsing
- URL scraper inlines CSS and resolves relative paths
- Returns `ParsedLandingPage` with text blocks, assets, links, tracking codes, forms
- Link types: affiliate, tracking, redirect, cta, navigation, external, internal
- Tracking types: facebook-pixel, google-analytics, google-tag-manager, tiktok-pixel, custom
- File parser handles both .html/.htm and .zip uploads

**Example prompt**:
> "Add image scraping to the URL parser. After scraping a page, download all images referenced in img tags and data-src attributes. Store them as base64 data URLs so the generated page is fully self-contained. Update ParsedLandingPage.assets to include the base64 data."

---

## Agent 6: QA & Test Agent

**Scope**: Testing infrastructure, unit tests, integration tests.

**Key files**:
- No test infrastructure exists yet
- Source files to test: all `src/lib/` modules
- Types to test: `src/types/*.ts`
- API routes to test: `src/app/api/`

**Context to provide**:
- Framework: Vitest recommended (used in sister project affiliate-manager)
- Testing pattern from affiliate-manager: `vi.mock()` for dependencies, factory functions for test data
- Parser modules are pure functions — easy to unit test
- AI agents need mocked LLM responses
- Database functions need mocked Prisma client
- API routes need mocked NextRequest/NextResponse

**Example prompt**:
> "Set up Vitest test infrastructure for this project. Create: vitest.config.ts, src/__tests__/setup.ts, src/__tests__/mocks/prisma.ts, src/__tests__/mocks/llm.ts, src/__tests__/factories.ts. Then write unit tests for src/lib/parser/link-detector.ts and src/lib/parser/tracking-detector.ts. Follow the pattern from the affiliate-manager project."

---

## Agent 7: LLM Integration Agent

**Scope**: Adding new LLM providers, optimizing prompts, managing AI costs.

**Key files**:
- `src/lib/llm/base.ts` — LLMProvider interface + BaseLLMProvider abstract class
- `src/lib/llm/grok.ts` — Grok provider (x.ai, OpenAI-compatible SDK)
- `src/lib/llm/index.ts` — Provider registry
- `src/types/llm.ts` — LLM types (options, response, provider names)

**Context to provide**:
- `BaseLLMProvider` has default implementations for `analyzeContent`, `rewriteText`, `generateVariation`
- Only `generateText` is abstract — that's the minimum to implement
- Grok uses OpenAI SDK with `baseURL: 'https://api.x.ai/v1'`
- Provider registry: `Record<string, () => LLMProvider>`
- QA agent bypasses the abstraction and uses OpenAI directly (intentional)
- All providers are singletons via module-level variables
- Supported provider names: `'grok' | 'openai' | 'claude' | 'gemini'`

**Example prompt**:
> "Add a Claude provider at src/lib/llm/claude.ts. It should use the Anthropic SDK (@anthropic-ai/sdk). Implement BaseLLMProvider with generateText using claude-sonnet-4-20250514. Register it in the provider index. Add ANTHROPIC_API_KEY to the env validation."

---

## Agent 8: Deploy & Infra Agent

**Scope**: Deployment, environment configuration, infrastructure.

**Key files**:
- `.do/app.yaml` — DigitalOcean App Platform config
- `prisma.config.ts` — Prisma configuration
- `.env.example` — Environment template
- `package.json` — Scripts and dependencies
- `next.config.ts` — Next.js configuration

**Context to provide**:
- Deployed to DigitalOcean App Platform (NYC, basic-xxs)
- Port 3002 (both dev and prod)
- Database: Supabase PostgreSQL (pooler port 6543, direct port 5432)
- Build: `npm ci --include=dev && npx prisma generate && npm run build`
- Secrets: GROK_API_KEY, OPENAI_API_KEY, DATABASE_URL, DIRECT_URL
- No CI/CD pipeline beyond DigitalOcean auto-deploy from main
- No environment validation at startup

**Example prompt**:
> "Add environment validation that runs at startup. Create src/lib/env-validation.ts that checks for required variables (GROK_API_KEY, DATABASE_URL) and warns for optional ones (OPENAI_API_KEY). Add src/instrumentation.ts to run it via Next.js instrumentation hook."

---

## Multi-Agent Workflow Example

For a complex task like "Add A/B testing support", you'd coordinate multiple agents:

1. **Schema Agent**: Add tracking fields, campaign model, update Variation model
2. **API Agent**: Create `/api/campaigns` CRUD + `/api/track` pixel endpoint
3. **LP Generator Agent**: Modify builder to inject tracking pixel into generated HTML
4. **UI Agent**: Add A/B test dashboard tab, campaign creation wizard
5. **Deploy Agent**: Add Redis for real-time stats, update deployment config

Each agent works independently on its files, coordinated by the task management system.

---

## Roadmap Alignment

| Roadmap Item | Primary Agent | Supporting Agents |
|--------------|---------------|-------------------|
| V3 remaining (styling options, persist blueprint) | LP Generator + UI | Schema |
| V4 Scoring & Recommendations | LP Generator | UI, Schema |
| V4 Image Library | Parser + Schema | UI, API |
| V4 Component Library | LP Generator | Schema, UI |
| V5 Multi-provider LLM | LLM Integration | Deploy |
| V5 Batch processing | API + Schema | Deploy |
| V5 A/B testing | API + UI | Schema, LP Generator, Deploy |
| V5 Template marketplace | Schema + API + UI | — |
| Auth integration | API + Schema | UI, Deploy |
