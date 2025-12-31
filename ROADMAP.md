# Adhoq Landing Page Builder - Roadmap

> Last updated: 2025-12-30

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

## V2 - Production Scale (In Progress)

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

### Debug & Fix (QA Agent)
- [ ] **QA Agent** - Reviews and tests generated pages (separate LLM, e.g. OpenAI)
  - [ ] Validate HTML structure and JS functionality
  - [ ] Check all buttons/links work correctly
  - [ ] Verify countdown timers, forms, and interactive elements
  - [ ] Test mobile responsiveness
- [ ] **Repair Agent** - Fixes issues found by QA or reported by user
  - [ ] Describe issue in natural language → agent fixes it
  - [ ] One-click "Fix Issues" for common problems
  - [ ] Auto-retry with different approach if generation fails
- [ ] Manual edit mode for quick fixes before download

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

---

## V3 - Scale & Monetize (Future)

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
