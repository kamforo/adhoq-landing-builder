# Adhoq Landing Page Builder - Roadmap

> Last updated: 2026-01-01

---

## V1 - Agent-Based Workflow ✅ COMPLETE

### Core Architecture
```
Input Page → Analyzer Agent → Prompt Writer → Builder Agent → QA Agent → Repair Agent (if needed) → Output
```

### Analyzer Agent ✅
- [x] Extract page sections (hero, features, testimonials, CTA, footer)
- [x] Identify components (headlines, subheadlines, buttons, images, forms)
- [x] Detect persuasion elements (urgency, scarcity, social proof, guarantees)
- [x] Extract style information (colors, fonts, spacing)
- [x] Output structured component map (JSON)

### Builder Agent ✅
- [x] Rebuild page from component map
- [x] Toggle components on/off
- [x] Add new elements to pages:
  - [x] Countdown timers / time scarcity
  - [x] Social proof widgets
  - [x] Trust badges
  - [x] Guarantee sections
- [x] Text rewriting per component
- [x] Style modifications (colors, layout)

### Additional V1 Features ✅
- [x] Custom placeholder images upload
- [x] Generation history (save/load projects)

---

## V2 - Production Scale ✅ COMPLETE

### Database & Admin ✅
- [x] Supabase PostgreSQL integration
- [x] Project CRUD operations
- [x] Admin dashboard with tabs (Dashboard, New Project, Projects)
- [x] Table view for projects
- [x] Inline rename, bulk select/delete/download
- [x] Multi-language support (26 languages, 40 countries)

### Builder UI Improvements ✅
- [x] Quick Settings + Advanced Settings split
- [x] AnalysisPanel (show AI analyzer output)
- [x] PromptPreview (show prompt before generation)
- [x] Dynamic Add Elements text (auto-generate based on vertical)

---

## V3 - Architect Flow (In Progress)

### Dual Pipeline System ✅
- [x] **V3 Architect tab** in admin - separate from V1 (Classic) workflow
- [x] Both flows accessible independently, won't break existing workflow
- [x] Per-project pipeline version tracking (`pipelineVersion` field)

### V1 Flow (Classic) - Current
```
Analyzer → Prompt Writer → Builder → Output
```

### V3 Flow (Architect) - New ✅
```
Analyzer → Architect → Builder → QA Agent → Repair Agent (if needed) → Output
```

### Architect Agent ✅
- [x] Receives analyzer data + user preferences
- [x] **Plans LP structure** before writing prompt:
  - [x] Decides number of steps and section types (hook, quiz, cta)
  - [x] Chooses persuasion elements to include
  - [x] Plans component placement per step
  - [x] Selects conversion strategy and urgency tactics
- [x] **Creates visual direction** (color palette, typography, imagery)
- [x] **Writes detailed builder prompt** based on blueprint
- [x] Outputs: LPBlueprint (for UI) + builder prompt

### QA Agent ✅
- [x] Reviews and tests generated pages (uses OpenAI for fresh perspective)
  - [x] Validates HTML structure and JS functionality
  - [x] Checks all buttons/links work correctly (onclick handlers defined)
  - [x] Verifies redirect URL is correct
  - [x] Tests responsive CSS rules (no overflow:hidden, min-height)
- [x] Returns pass/fail with issues (critical, major, minor, suggestion)
- [x] Score-based system (0-100)
- [x] Fallback to basic validation if OpenAI unavailable

### Repair Agent ✅
- [x] Fixes issues found by QA automatically
- [x] Accepts user-described issues in natural language
- [x] Common auto-fixes: overflow:hidden, max-height:100vh, missing functions
- [x] One-click "Fix All Issues" in V3 workflow

### V3 UI ✅
- [x] Step visualization (Upload → Analyze → Architect → Build → QA → Repair → Complete)
- [x] Blueprint preview (sections, color palette, conversion strategy)
- [x] QA results display with pass/fail status
- [x] Issue list with severity badges
- [x] User issue description textarea for Repair agent
- [x] Preview and download in completion step

### Remaining V3 Tasks
- [ ] Add styling options to V3 workflow (color scheme, tone, language)
- [ ] Persist blueprint to database
- [ ] Show V3 projects separately in admin Projects tab

---

## V4 - Intelligence (Future)

### Scoring & Recommendations
- [ ] Conversion score per section (weak/strong)
- [ ] AI recommendations ("Add social proof here", "Headline too long")
- [ ] Overall page effectiveness rating

### Multi-Page Analysis
- [ ] Input multiple competitor pages
- [ ] Extract best elements from each
- [ ] Combine winning patterns into optimized output

### Copy Frameworks
- [ ] AIDA (Attention, Interest, Desire, Action)
- [ ] PAS (Problem, Agitate, Solution)
- [ ] Ensure page follows proven structure

### Component Library
- [ ] Save analyzed components for reuse
- [ ] Mix components from different projects
- [ ] Build library over time

### Offer-Aware Generation
- [ ] Extract: What's the offer? Target audience? Desired action?
- [ ] Tailor all content to specific offer context

### Image Library
- [ ] Scrape and store images from analyzed landing pages
- [ ] Auto-tag images (model photos, backgrounds, icons, logos, etc.)
- [ ] Categorize by vertical (dating, finance, health, etc.)
- [ ] Search/filter images by tag, category, style
- [ ] Use library images in new LP generation
- [ ] Detect and remove duplicates

---

## V5 - Scale & Monetize (Future)

### Infrastructure
- [ ] Deploy to DigitalOcean App Platform
- [ ] More LLM providers (OpenAI, Claude, Gemini)
- [ ] Batch processing (queue multiple URLs)

### Advanced Features
- [ ] AI image generation (DALL-E/Midjourney integration)
- [ ] A/B test variant generation with tracking
- [ ] Template marketplace
- [ ] Mobile-first optimization analysis
- [ ] Multi-page funnel support

---

## Completed Infrastructure

- [x] URL scraping with CSS/JS inlining
- [x] Relative path resolution
- [x] File upload (HTML)
- [x] Text content extraction
- [x] Link detection (affiliate, tracking, redirects)
- [x] Text rewriting via Grok AI (keep/slight/complete)
- [x] Style handling (keep/colors/layout/restyle)
- [x] Image handling (keep/placeholder)
- [x] Multiple variations (1-10)
- [x] Creativity/temperature control
- [x] Self-contained HTML download
- [x] Next.js 14+ with App Router
- [x] TypeScript + Tailwind CSS + shadcn/ui
