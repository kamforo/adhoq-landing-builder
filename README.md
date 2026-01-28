# Adhoq Landing Page Builder

AI-powered tool that generates high-converting landing page variations for dating verticals. Uses multi-agent AI workflows to analyze, plan, build, and validate landing pages.

## Pipelines

**V1 (Classic)**: Analyzer → Prompt Writer → Builder → Output
**V3 (Architect)**: Analyzer → Architect → Builder → QA → Repair → Output

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router, React 19, TypeScript)
- **Database**: PostgreSQL (Supabase) via Prisma 7.2
- **AI**: Grok (x.ai) for generation, OpenAI (gpt-4o) for QA
- **UI**: shadcn/ui + Tailwind CSS 4
- **Deployment**: DigitalOcean App Platform

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Setup database
npx prisma generate
npx prisma db push

# Start dev server (port 3002)
npm run dev
```

Open [http://localhost:3002](http://localhost:3002).

## Environment Variables

```env
GROK_API_KEY=          # Required: x.ai API key
OPENAI_API_KEY=        # Required for V3 QA agent
DATABASE_URL=          # Supabase pooler (port 6543)
DIRECT_URL=            # Supabase direct (port 5432, migrations)
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI assistant context for working on this codebase
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and data flow
- [AGENTS.md](./AGENTS.md) - Development agent definitions for future work
- [ROADMAP.md](./ROADMAP.md) - Feature roadmap and progress tracking

## Project Structure

```
src/
├── app/                  # Pages + API routes
│   ├── page.tsx          # Admin dashboard
│   ├── builder/          # V1 builder UI
│   ├── v3/              # V3 builder UI
│   └── api/             # 16 API endpoints
├── components/
│   ├── ui/              # shadcn/ui (15)
│   └── landing-builder/ # Custom (12)
├── lib/
│   ├── agents/          # V3 agents (architect, qa, repair)
│   ├── analyzer/        # Page analysis (6 modules)
│   ├── builder-agent/   # HTML builder + LP rules
│   ├── prompt-writer/   # Prompt engineering
│   ├── parser/          # URL/file parsing (7 modules)
│   ├── generator/       # Variation generation
│   ├── llm/             # LLM abstraction (Grok, extensible)
│   ├── output/          # ZIP/file storage
│   └── db/              # Prisma client + queries
└── types/               # TypeScript type definitions (8 files)
```

## Scripts

```bash
npm run dev       # Development server (port 3002)
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
```
