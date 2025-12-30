# Adhoq Landing Page Builder - Roadmap

> Last updated: 2025-12-29

## Current Status: V1 Development

---

## V1 - Agent-Based Workflow (In Progress)

### Core Architecture
```
Input Page(s) → Analyzer Agent → Component Map → Builder Agent → Output
```

### Analyzer Agent ✅
- [x] Extract page sections (hero, features, testimonials, CTA, footer)
- [x] Identify components (headlines, subheadlines, buttons, images, forms)
- [x] Detect persuasion elements (urgency, scarcity, social proof, guarantees, trust badges)
- [x] Extract style information (colors, fonts, spacing)
- [x] Output structured component map (JSON)
- [x] API endpoint: `/api/analyze`

### Builder Agent ✅
- [x] Rebuild page from component map
- [x] Toggle components on/off
- [x] Add new elements to pages:
  - [x] Countdown timers / time scarcity
  - [x] Scarcity indicators (spots, stock, viewers)
  - [x] Social proof (counter, notifications, reviews)
  - [x] Trust badges (secure, guarantee, verified, payment)
  - [x] Exit intent popup
  - [x] Sticky CTA bar
- [x] Auto-detect redirect/tracking URL from CTAs
- [x] Apply same tracking URL to all injected clickable elements
- [x] Text rewriting per component
- [x] Style modifications (colors, layout)
- [x] API endpoint: `/api/build`

### Additional V1 Features
- [ ] Custom placeholder images upload
- [ ] Generation history (save/load projects)

---

## V2 - Enhanced Workflow (Planned)

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

### Preview System
- [ ] Wireframe/outline preview before full generation
- [ ] User approves structure first
- [ ] Quick iteration on layout

---

## Completed Features

### Parsing & Extraction
- [x] URL scraping with CSS/JS inlining
- [x] Relative path resolution (./dist/css/main.css)
- [x] Unquoted HTML attribute handling
- [x] File upload (HTML)
- [x] Text content extraction
- [x] Link detection (affiliate, tracking, redirects)
- [x] Tracking code detection (GTM, Facebook Pixel, etc.)

### Generation
- [x] Text rewriting via Grok AI (keep/slight/complete)
- [x] Style handling (keep/colors/layout/restyle)
- [x] Image handling (keep/placeholder)
- [x] Link handling (keep/remove tracking/replace)
- [x] Multiple variations (1-10)
- [x] Creativity/temperature control

### Output
- [x] Self-contained HTML download
- [x] CSS/JS inlined
- [x] Absolute URLs for assets

### Infrastructure
- [x] Next.js 14+ with App Router
- [x] TypeScript
- [x] Tailwind CSS + shadcn/ui
- [x] LLM abstraction layer (Grok, extensible)
- [x] GitHub repo: https://github.com/kamforo/adhoq-landing-builder

---

## Future Ideas (Backlog)

- [ ] AI image generation (DALL-E/Midjourney integration)
- [ ] Batch processing (queue multiple URLs)
- [ ] ZIP upload with assets
- [ ] More LLM providers (OpenAI, Claude, Gemini)
- [ ] Deploy to DigitalOcean App Platform
- [ ] Template marketplace
- [ ] A/B test variant generation
- [ ] Mobile-first optimization analysis
- [ ] Multi-page funnel support

---

## Contributing

This roadmap is actively maintained. Check back for updates or open an issue to suggest features.
