# CLAUDE.md - AI Assistant Context

This file provides context for AI assistants (Claude, etc.) working on this codebase.

## Project Summary

**Adhoq Landing Page Builder** is an AI-powered tool that generates high-converting landing page variations for dating verticals. It uses multi-agent AI workflows to analyze, plan, build, and validate landing pages from existing source pages.

Two generation pipelines:

1. **V1 (Classic)**: `Analyzer -> Prompt Writer -> Builder -> Output`
2. **V3 (Architect)**: `Analyzer -> Architect -> Builder -> QA -> Repair -> Output`

The tool is internal — used by a media buying team to produce landing page variations at scale.

## Tech Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Framework | Next.js 16.1.1 (App Router) | React 19, TypeScript 5 |
| Database | PostgreSQL (Supabase) | Pooled connections via `pg` adapter |
| ORM | Prisma 7.2 | `@prisma/adapter-pg` for Supabase |
| UI | shadcn/ui + Tailwind CSS 4 | New York style, neutral base |
| AI (Builder) | Grok (x.ai) | `grok-3-fast` model, OpenAI-compatible SDK |
| AI (QA) | OpenAI | `gpt-4o` for QA reviews |
| HTML Parse | Cheerio | Landing page analysis |
| File Bundling | JSZip + Archiver | ZIP downloads |
| Deployment | DigitalOcean App Platform | Region: NYC, port 3002 |

## Key Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3002)
npm run build            # Production build
npm run start            # Start production server (port 3002)
npm run lint             # ESLint check

# Database
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema to database
npx prisma migrate dev   # Create and apply migration
npx prisma studio        # Open database GUI
```

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Admin dashboard (980 lines)
│   ├── builder/page.tsx          # V1 Classic builder UI
│   ├── v3/page.tsx               # V3 Architect builder UI
│   ├── layout.tsx                # Root layout (Geist fonts)
│   ├── globals.css               # Tailwind + OKLCH color vars
│   └── api/
│       ├── parse/                # URL/file parsing
│       ├── analyze/              # AI analysis (legacy)
│       ├── generate/             # Variation generation (3-agent)
│       ├── build/                # HTML building (legacy)
│       ├── download/             # ZIP/HTML download
│       ├── projects/             # Project CRUD
│       │   └── [id]/
│       │       ├── route.ts      # GET/PATCH/DELETE + duplicate
│       │       ├── generate/     # Background generation
│       │       ├── variations/   # Add variations
│       │       └── duplicate/    # Clone project
│       └── v3/
│           ├── generate/         # Full V3 pipeline
│           └── repair/           # QA/Repair agent
│
├── components/
│   ├── ui/                       # shadcn/ui (15 components)
│   └── landing-builder/          # Custom components (12)
│       ├── upload-zone.tsx       # URL/file input with drag-drop
│       ├── quick-settings.tsx    # Country, vertical, tone, steps
│       ├── advanced-settings.tsx # Colors, layout, elements
│       ├── options-panel.tsx     # Full options (V1)
│       ├── analysis-panel.tsx    # AI analysis display
│       ├── analysis-results.tsx  # Legacy analysis display
│       ├── parsed-summary.tsx    # Parsed content stats
│       ├── preview.tsx           # Variation preview/code/diff
│       ├── prompt-preview.tsx    # Builder prompt display
│       ├── link-editor.tsx       # Link management
│       └── project-manager.tsx   # Project selector/CRUD
│
├── lib/
│   ├── agents/                   # V3 AI Agents
│   │   ├── architect.ts          # Plans LP structure -> LPBlueprint
│   │   ├── qa.ts                 # Validates HTML (OpenAI gpt-4o)
│   │   └── repair.ts            # Fixes issues (Grok)
│   ├── analyzer/                 # Page analysis pipeline
│   │   ├── ai-analyzer.ts       # Grok + Cheerio analysis
│   │   ├── component-extractor.ts
│   │   ├── flow-detector.ts
│   │   ├── persuasion-detector.ts
│   │   ├── section-detector.ts
│   │   └── style-extractor.ts
│   ├── builder/                  # Legacy HTML builder
│   │   ├── element-injector.ts
│   │   ├── layout-generator.ts
│   │   ├── style-builder.ts
│   │   └── text-builder.ts
│   ├── builder-agent/            # AI builder agent
│   │   ├── index.ts             # buildVariations(), buildLandingPage()
│   │   └── lp-rules.ts          # Non-negotiable LP rules
│   ├── prompt-writer/            # Prompt engineering (631 lines)
│   │   └── index.ts             # writeBuilderPrompt()
│   ├── generator/                # Variation generation
│   │   ├── variation.ts
│   │   ├── link-processor.ts
│   │   ├── style-modifier.ts
│   │   ├── text-modifier.ts
│   │   └── tracking-processor.ts
│   ├── parser/                   # Input parsing
│   │   ├── url-scraper.ts       # Fetch + inline CSS/JS
│   │   ├── file-parser.ts       # HTML/ZIP parsing
│   │   ├── text-extractor.ts
│   │   ├── link-detector.ts
│   │   ├── form-extractor.ts
│   │   └── tracking-detector.ts
│   ├── llm/                      # LLM abstraction layer
│   │   ├── base.ts              # LLMProvider interface + BaseLLMProvider
│   │   ├── grok.ts              # Grok (x.ai) via OpenAI SDK
│   │   └── index.ts             # Provider registry + getLLMProvider()
│   ├── output/                   # File output
│   │   ├── storage.ts           # File system storage
│   │   └── bundler.ts           # ZIP creation
│   ├── db/                       # Database layer
│   │   ├── prisma.ts            # PrismaClient singleton (pg adapter)
│   │   └── projects.ts          # Project CRUD functions
│   └── utils.ts                  # cn() utility
│
└── types/
    ├── landing-page.ts           # ParsedLandingPage, DetectedLink, etc.
    ├── generation-options.ts     # GenerationOptions, defaults
    ├── component-analysis.ts     # ComponentAnalysis, roles, techniques
    ├── analyzer.ts               # PageAnalysis, LPFlow, sections
    ├── builder.ts                # BuildOptions, AddElementOptions
    ├── llm.ts                    # LLMOptions, LLMResponse, providers
    ├── languages.ts              # 26 languages, 40 countries, RTL support
    └── index.ts                  # Barrel exports
```

## Key Architecture Patterns

### AI Agent Pipeline

Each AI agent follows the same pattern:
1. Build a detailed prompt with analysis data + user preferences
2. Call LLM (Grok or OpenAI)
3. Parse JSON from response (regex: `/\{[\s\S]*\}/`)
4. Return typed result with fallback if AI fails

All agents have **fallback logic** — if the AI call fails, a deterministic fallback runs.

### LLM Provider Abstraction

```typescript
// Get any configured provider
const llm = getLLMProvider('grok');
const response = await llm.generateText(prompt, { temperature: 0.6 });
```

Providers implement `LLMProvider` interface from `src/lib/llm/base.ts`. Currently only Grok is implemented. The QA agent uses OpenAI directly (different perspective from the builder's LLM).

### Database Access

```typescript
import prisma from '@/lib/db/prisma';
// Or use higher-level functions:
import { createProject, getProject, updateProject } from '@/lib/db';
```

Prisma uses `@prisma/adapter-pg` with a `pg.Pool` for Supabase connection pooling. Singleton pattern prevents multiple instances during hot reload.

### Component Pattern

All custom components in `landing-builder/` are client components (`"use client"`). They receive state via props and call `onChange` callbacks to update parent state. No custom hooks — all logic is component-internal.

## Database Schema (Key Models)

| Model | Purpose |
|-------|---------|
| `User` | Users with roles (SUPER_ADMIN, ADMIN, USER) — prepared for V3 |
| `Team` | Team groupings — prepared for V3 |
| `Project` | Landing page projects with pipeline version (v1/v3) |
| `Variation` | Generated HTML variations per project |
| `Template` | Saved templates for reuse — prepared for V4 |
| `Job` | Background job queue — prepared for V5 |
| `Image` | Image library — prepared for V4 |
| `TrackerConfig` | Tracker integration — prepared for V7 |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/parse` | POST | Parse URL or file upload (HTML/ZIP) |
| `/api/analyze` | POST | Legacy page analysis |
| `/api/generate` | POST | Generate variations (3-agent or legacy) |
| `/api/build` | POST | Legacy HTML building |
| `/api/download` | POST | Download HTML/ZIP |
| `/api/projects` | GET/POST | List/create projects |
| `/api/projects/[id]` | GET/PATCH/DELETE/POST | Project CRUD + duplicate |
| `/api/projects/[id]/generate` | POST | Background generation |
| `/api/projects/[id]/variations` | POST | Add variation |
| `/api/projects/[id]/duplicate` | POST | Clone project |
| `/api/v3/generate` | POST | Full V3 pipeline |
| `/api/v3/repair` | POST | Repair agent |

## Coding Conventions

### TypeScript
- Strict mode enabled
- Path aliases: `@/*` maps to `src/*`
- All AI responses parsed via regex JSON extraction: `response.match(/\{[\s\S]*\}/)`
- Types defined in `src/types/`, exported via barrel `index.ts`

### React Components
- All dashboard/builder components use `"use client"`
- State managed via `useState` hooks in page components, passed to children
- shadcn/ui for all UI primitives
- Lucide React for icons

### API Routes
- App Router route handlers (export `GET`, `POST`, etc.)
- Return `NextResponse.json()` with appropriate status codes
- No authentication yet (prepared in schema but not enforced)
- Background generation uses fire-and-forget pattern

### Landing Page Rules
Non-negotiable rules enforced on generated pages (see `lp-rules.ts`):
- Mobile-first design (375x667 base)
- `min-height: 100vh` (NEVER `max-height`)
- NEVER `overflow: hidden` on body/containers
- Font sizes in `px`/`rem` (NEVER `vw`)
- Single CTA per screen, thumb-reachable (lower 40%)
- 6th grade reading level, sentences under 15 words
- Inline CSS/JS only — no external resources

## Environment Variables

```env
# AI Providers
GROK_API_KEY=          # Required: Grok (x.ai) for builder/architect/repair
OPENAI_API_KEY=        # Required for V3 QA agent only

# Database (Supabase PostgreSQL)
DATABASE_URL=          # Transaction pooler (port 6543, pgbouncer=true)
DIRECT_URL=            # Direct connection (port 5432, for migrations)

# Optional
OUTPUT_DIR=./output    # Local file storage directory
```

## Important Gotchas

### 1. Dual Pipeline System
V1 (Classic) and V3 (Architect) are completely separate workflows. The `pipelineVersion` field on `Project` tracks which was used. Both accessible from the admin dashboard.

### 2. LLM JSON Parsing
All AI responses are parsed by extracting JSON with regex (`/\{[\s\S]*\}/`). If extraction fails, fallback logic produces a deterministic result. Always handle the case where AI returns invalid JSON.

### 3. QA Uses Different LLM
The QA agent intentionally uses OpenAI (`gpt-4o`) while the builder uses Grok. This "fresh perspective" approach catches issues the builder's LLM might miss.

### 4. No Authentication Yet
The schema has `User` and `Team` models ready, but no auth is enforced on API routes. All projects are currently unscoped.

### 5. Background Generation
`POST /api/projects/[id]/generate` fires off generation without awaiting — the project status is polled from the frontend every 5 seconds.

### 6. Landing Page Output Rules
Generated HTML must follow strict rules in `lp-rules.ts`. The QA agent specifically checks for `overflow:hidden`, `max-height:100vh`, and `vw` font units — these are marked CRITICAL.

### 7. Supabase Connection Pooling
The Prisma client uses `@prisma/adapter-pg` with a `pg.Pool` pointing to Supabase's transaction pooler (port 6543). Direct connections (port 5432) are only for migrations.

## Testing

No test infrastructure is set up yet. The project would benefit from:
- Unit tests for parser, analyzer, and generator modules
- Integration tests for API routes
- E2E tests for the builder workflow
