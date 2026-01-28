# Architecture

## System Overview

Adhoq Landing Page Builder is a full-stack Next.js application that transforms existing landing pages into optimized variations using multi-agent AI workflows. The system ingests a source page (URL or HTML file), analyzes its structure and persuasion patterns, then generates new variations with configurable styling, language, and conversion elements.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19)                          │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Dashboard │  │ V1 Builder   │  │ V3 Builder   │                  │
│  │ page.tsx  │  │ builder/     │  │ v3/page.tsx  │                  │
│  │ (980 LOC) │  │ page.tsx     │  │ (1016 LOC)   │                  │
│  └────┬──────┘  └──────┬───────┘  └──────┬───────┘                  │
│       │                │                  │                          │
│       └────────────────┴──────────────────┘                          │
│                        │                                             │
│               ┌────────┴────────┐                                    │
│               │ Custom Components│                                    │
│               │ landing-builder/ │                                    │
│               │ (12 components)  │                                    │
│               └────────┬────────┘                                    │
│                        │                                             │
└────────────────────────┼─────────────────────────────────────────────┘
                         │ fetch()
┌────────────────────────┼─────────────────────────────────────────────┐
│                   API LAYER (Next.js Route Handlers)                 │
│                        │                                             │
│  ┌──────────┐  ┌───────┴──────┐  ┌──────────────┐  ┌────────────┐  │
│  │ /parse   │  │ /generate    │  │ /v3/generate  │  │ /projects  │  │
│  │          │  │ (3-agent)    │  │ (5-agent)     │  │ CRUD       │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│       │                │                  │                │          │
└───────┼────────────────┼──────────────────┼────────────────┼─────────┘
        │                │                  │                │
┌───────┼────────────────┼──────────────────┼────────────────┼─────────┐
│       │           CORE LIBRARY LAYER                       │          │
│       │                │                  │                │          │
│  ┌────┴─────┐   ┌──────┴──────┐   ┌──────┴──────┐  ┌─────┴──────┐  │
│  │ Parser   │   │ Analyzer    │   │ Agents (V3) │  │ DB Layer   │  │
│  │ 7 modules│   │ 6 modules   │   │ 3 agents    │  │ Prisma     │  │
│  └──────────┘   └─────────────┘   └─────────────┘  └────────────┘  │
│                                                                      │
│  ┌──────────┐   ┌─────────────┐   ┌─────────────┐  ┌────────────┐  │
│  │ Builder  │   │ Prompt      │   │ Generator   │  │ Output     │  │
│  │ Agent    │   │ Writer      │   │ 6 modules   │  │ Storage    │  │
│  └──────────┘   └─────────────┘   └─────────────┘  └────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    LLM Abstraction Layer                      │    │
│  │   BaseLLMProvider -> GrokProvider (x.ai, grok-3-fast)        │    │
│  │                  -> [Future: OpenAI, Claude, Gemini]         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
        │                                                    │
        │                                                    │
   ┌────┴─────┐                                       ┌──────┴───────┐
   │  Grok AI │                                       │  PostgreSQL  │
   │  (x.ai)  │                                       │  (Supabase)  │
   └──────────┘                                       └──────────────┘
   ┌──────────┐
   │ OpenAI   │  (QA agent only)
   │ gpt-4o   │
   └──────────┘
```

## Generation Pipelines

### V1 Pipeline (Classic)

Used when `styleHandling !== 'generate-new'`. Modifies existing HTML.

```
Source Page (URL/HTML)
       │
       ▼
  ┌─────────┐
  │  Parser  │  Scrape URL or parse file
  │          │  Extract: text, links, forms, tracking codes
  └────┬─────┘
       │  ParsedLandingPage
       ▼
  ┌──────────┐
  │ Analyzer │  Cheerio-based structure analysis
  │ (Legacy) │  Detect: sections, components, flow
  └────┬─────┘
       │  PageAnalysis
       ▼
  ┌──────────┐
  │ Builder  │  Modify HTML: text, styles, links, elements
  │ (Legacy) │  Apply user options (rewrite level, style changes)
  └────┬─────┘
       │  GenerationResult[]
       ▼
  ┌──────────┐
  │ Output   │  Package as HTML or ZIP
  └──────────┘
```

### V3 Pipeline (Architect)

Used when `styleHandling === 'generate-new'` or via V3 UI. Generates new HTML from scratch.

```
Source Page (URL/HTML)
       │
       ▼
  ┌──────────────┐
  │   Parser     │  Same as V1
  └────┬─────────┘
       │  ParsedLandingPage
       ▼
  ┌──────────────┐
  │ AI Analyzer  │  Grok + Cheerio deep analysis
  │ (Agent 1)    │  Detect: vertical, tone, components, strategy
  └────┬─────────┘
       │  ComponentAnalysis
       ▼
  ┌──────────────┐
  │ Architect    │  Plans LP structure before building
  │ (Agent 2)    │  Decides: sections, colors, flow, persuasion
  └────┬─────────┘
       │  LPBlueprint + builderPrompt
       ▼
  ┌──────────────┐
  │ Builder      │  Generates complete HTML from prompt
  │ (Agent 3)    │  Uses Grok to create standalone page
  └────┬─────────┘
       │  HTML string
       ▼
  ┌──────────────┐
  │ QA Agent     │  Reviews HTML against blueprint
  │ (Agent 4)    │  Uses OpenAI gpt-4o for fresh perspective
  └────┬─────────┘
       │  QAResult (pass/fail, issues, score)
       ▼
  ┌──────────────┐
  │ Repair Agent │  Fixes critical/major issues
  │ (Agent 5)    │  Auto-fixes + user-reported issues
  └────┬─────────┘
       │  RepairResult (fixed HTML)
       ▼
  ┌──────────────┐
  │   Output     │  Package as HTML or ZIP
  └──────────────┘
```

## AI Agent Architecture

### Shared Agent Pattern

Every agent follows the same structure:

```typescript
async function agentFunction(input: AgentInput): Promise<AgentOutput> {
  const llm = getLLMProvider('grok');  // or new OpenAI() for QA

  const prompt = `...detailed prompt with input data...
  Return ONLY valid JSON.`;

  try {
    const response = await llm.generateText(prompt, { temperature, maxTokens });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    // Map parsed data to typed output with defaults
    return { ...parsed, id: `agent-${Date.now()}` };
  } catch (error) {
    return getFallbackResult(input);  // Deterministic fallback
  }
}
```

### Agent Details

| Agent | LLM | Model | Temperature | Max Tokens | Input | Output |
|-------|-----|-------|-------------|------------|-------|--------|
| AI Analyzer | Grok | grok-3-fast | 0.3 | 4000 | ParsedLandingPage | ComponentAnalysis |
| Prompt Writer | Grok | grok-3-fast | 0.5 | 3000 | ComponentAnalysis + StylingOptions | BuilderPrompt |
| Architect | Grok | grok-3-fast | 0.6 | 4000 | ComponentAnalysis + StylingOptions | LPBlueprint |
| Builder | Grok | grok-3-fast | 0.7 | 8000 | BuilderPrompt + ComponentAnalysis | HTML string |
| QA | OpenAI | gpt-4o | 0.3 | 3000 | HTML + LPBlueprint | QAResult |
| Repair | Grok | grok-3-fast | 0.3 | 8000 | HTML + Blueprint + QAResult | RepairResult |

### Fallback Strategy

Each agent has a deterministic fallback:

- **Analyzer**: Returns minimal analysis with defaults
- **Prompt Writer**: `getFallbackPrompt()` builds prompt from analysis data directly
- **Architect**: `getFallbackBlueprint()` creates hook/quiz/CTA structure from analysis
- **Builder**: `generateFallbackPage()` creates basic multi-step HTML template
- **QA**: `doBasicValidation()` checks HTML structure with regex patterns
- **Repair**: `attemptBasicRepairs()` fixes common issues (overflow, missing functions)

## Data Model

```
┌──────────┐       ┌───────────┐       ┌───────────┐
│   User   │──────>│  Project   │──────>│ Variation │
│          │       │            │       │           │
│ id       │       │ id         │       │ id        │
│ email    │       │ name       │       │ number    │
│ role     │       │ status     │       │ html      │
│ teamId   │       │ pipeline   │       │ clicks    │
└──────────┘       │ sourceUrl  │       │ conversions│
      │            │ analysis   │       └───────────┘
      │            │ architect  │
      ▼            │ qaResults  │       ┌───────────┐
┌──────────┐       │ vertical   │       │    Job    │
│   Team   │       │ language   │       │           │
│          │       │ country    │       │ type      │
│ id       │       └───────────┘       │ status    │
│ name     │                            │ progress  │
│ ownerId  │       ┌───────────┐       │ result    │
└──────────┘       │ Template  │       └───────────┘
                   │           │
                   │ html      │       ┌───────────┐
                   │ vertical  │       │   Image   │
                   │ isPublic  │       │           │
                   └───────────┘       │ url       │
                                       │ type      │
                   ┌───────────┐       │ tags      │
                   │ Tracker   │       └───────────┘
                   │ Config    │
                   │ type      │
                   │ apiKey    │
                   └───────────┘
```

**Active models**: Project, Variation
**Prepared models**: User, Team, Template, Job, Image, TrackerConfig

## LLM Abstraction

```
                    LLMProvider (interface)
                         │
                    BaseLLMProvider (abstract)
                    │ generateText()
                    │ analyzeContent()
                    │ rewriteText()
                    │ generateVariation()
                         │
              ┌──────────┴──────────┐
              │                     │
         GrokProvider          [Future Providers]
         grok-3-fast           OpenAI, Claude, Gemini
         x.ai/v1
```

The provider registry in `src/lib/llm/index.ts` allows adding providers by name:

```typescript
const providers: Record<string, () => LLMProvider> = {
  grok: getGrokProvider,
  // openai: getOpenAIProvider,
  // claude: getClaudeProvider,
};
```

## Landing Page Structure

Generated pages follow a strict multi-step structure:

```
┌─────────────────────────────┐
│ Step 1: HOOK                │
│ ┌─────────────────────────┐ │
│ │ Hero Image              │ │
│ │ Headline                │ │
│ │ Hook Text               │ │
│ │ [Continue] Button       │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Step 2-N: QUIZ              │
│ ┌─────────────────────────┐ │
│ │ Question Headline       │ │
│ │ [Answer A] → nextStep() │ │
│ │ [Answer B] → nextStep() │ │
│ │ [Answer C] → nextStep() │ │
│ │ NO separate button      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Step N: CTA                 │
│ ┌─────────────────────────┐ │
│ │ Countdown Timer (top)   │ │
│ │ Conversion Headline     │ │
│ │ Scarcity Text           │ │
│ │ [CTA Button] → redirect │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
              │
              ▼
        Tracking URL
```

## Frontend Architecture

Three client-side pages, each managing their own state:

### Dashboard (`page.tsx`)
- Tabs: Dashboard stats | New Project | Projects table | V3 info
- Project table with bulk operations (select, download, delete)
- Real-time polling for GENERATING projects (5s interval)
- Preview modal with variation navigation

### V1 Builder (`builder/page.tsx`)
- Steps: Upload → Configure → Generate → Preview
- State: parsedPage, analysis, builderPrompt, options, variations
- API calls: `/api/parse` → `/api/generate` → `/api/download`

### V3 Builder (`v3/page.tsx`)
- Steps: Upload → Analyze → Architect → Build → QA → Repair → Complete
- State: parsedPage, analysis, blueprint, variations, qaResults
- API calls: `/api/parse` → `/api/v3/generate` → `/api/v3/repair`

## Configuration

### Generation Options

```typescript
GenerationOptions {
  textHandling: 'keep' | 'rewrite-slight' | 'rewrite-complete'
  styleHandling: 'keep' | 'modify-colors' | 'modify-layout' | 'restyle-complete' | 'generate-new'
  imageHandling: 'keep' | 'placeholder' | 'ai-generate'
  linkHandling: 'keep' | 'replace-all' | 'remove-non-cta'
  vertical: 'auto' | 'adult' | 'casual' | 'mainstream'
  tone: ToneStyle (7 options)
  targetAge: 'all' | '30+' | '40+' | '50+' | '60+'
  language: LanguageCode (26 languages)
  country: CountryCode (40 countries)
  variationCount: 1-10
  addElements: { countdown, scarcity, socialProof, trustBadges, exitIntent, stickyCta }
}
```

### Supported Languages

26 languages with native name, direction (LTR/RTL), and specific guidelines. RTL support for Arabic, Hebrew, Farsi with `dir="rtl"` injection.

### Deployment

DigitalOcean App Platform configuration in `.do/app.yaml`:
- Region: NYC
- Instance: basic-xxs
- Port: 3002
- Auto-deploy from `main` branch
- Secrets: GROK_API_KEY, OPENAI_API_KEY, DATABASE_URL, DIRECT_URL

## File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| `app/v3/page.tsx` | 1016 | V3 builder UI |
| `app/page.tsx` | 980 | Admin dashboard |
| `lib/prompt-writer/index.ts` | 631 | Prompt engineering |
| `app/builder/page.tsx` | 590 | V1 builder UI |
| `lib/agents/architect.ts` | 511 | Architect agent |
| `lib/builder-agent/index.ts` | 464 | Builder agent |
| `lib/agents/qa.ts` | 401 | QA agent |
| `lib/agents/repair.ts` | 308 | Repair agent |
| `lib/builder-agent/lp-rules.ts` | 287 | LP rules |
| `lib/db/projects.ts` | 260 | Project CRUD |
| `lib/llm/base.ts` | 253 | LLM base class |
| `lib/output/storage.ts` | 230 | File storage |
| `types/component-analysis.ts` | 235 | Analysis types |
| `types/analyzer.ts` | 229 | Analyzer types |
| `types/builder.ts` | 208 | Builder types |
