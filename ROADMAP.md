# Adhoq Landing Page Builder - Roadmap

> Last updated: 2025-12-30

---

## V1 - Core Builder (Complete) ✅

### Analyzer Agent
- [x] Extract page sections (hook, quiz, CTA, testimonials, benefits)
- [x] Identify components (headlines, buttons, images, forms)
- [x] Detect persuasion elements (urgency, scarcity, social proof)
- [x] Section detection (Hook → Quiz → CTA flow)
- [x] Image categorization (hero vs background vs decorative)
- [x] Auto-detect tracking/redirect URLs

### Builder Agent
- [x] Rebuild page from component map
- [x] Conversion elements with smart positioning
- [x] Text rewriting (keep/slight/complete)
- [x] Style handling (colors, layout)
- [x] Multiple variations (1-5)
- [x] Self-contained HTML output

---

## V2 - Production Scale (Next)

### Database & Persistence
- [ ] PostgreSQL + Prisma setup
- [ ] Save/load projects
- [ ] Version history per project
- [ ] Duplicate & modify existing LPs
- [ ] Organize with folders/tags
- [ ] Search & filter projects

### Batch Processing & Parallelization
- [ ] Redis + Bull MQ job queue
- [ ] Generate multiple LPs simultaneously
- [ ] Background processing with status updates
- [ ] Progress tracking in UI
- [ ] Retry failed jobs automatically

### Templates System
- [ ] Pre-built LP templates by vertical
- [ ] Save generated LPs as templates
- [ ] One-click start from template
- [ ] Template categories (quiz, long-form, single-page)

---

## V3 - User Management

### Google Authentication
- [ ] Google OAuth login
- [ ] Session management
- [ ] User profiles

### Role-Based Access Control
```
Super Admin
├── Full system access
├── Manage all users
├── View all projects
├── System settings
└── Usage analytics

Admin
├── Manage team members
├── View team projects
├── Set user quotas
└── Team analytics

User
├── Create/edit own projects
├── Use allocated quota
├── Access shared templates
└── View own analytics
```

### Team Features
- [ ] Create teams/workspaces
- [ ] Invite team members
- [ ] Shared project folders
- [ ] Team templates library
- [ ] Activity logs

---

## V4 - AI Image Generation (Grok)

### Image Generation with Grok
- [ ] Generate hero images via Grok
- [ ] Generate profile/avatar images
- [ ] Background pattern generation
- [ ] Style-matched image generation
- [ ] Prompt templates for dating vertical

### Image Library
- [ ] Store all generated images
- [ ] Categorize by type (hero, profile, background, badge)
- [ ] Tag images by vertical/style
- [ ] Search & filter library
- [ ] Reuse images across projects
- [ ] Favorite/bookmark images
- [ ] Upload custom images

### Smart Image Features
- [ ] Auto-suggest images from library
- [ ] Match image style to LP tone
- [ ] Image variations from existing

---

## V5 - Advanced Generation

### Multi-Source Analysis
- [ ] Input multiple competitor LPs
- [ ] Extract best elements from each
- [ ] Merge winning patterns
- [ ] Side-by-side comparison view

### Copy Frameworks
- [ ] AIDA (Attention, Interest, Desire, Action)
- [ ] PAS (Problem, Agitate, Solution)
- [ ] Auto-suggest framework based on vertical

### Scoring & Recommendations
- [ ] Conversion score per section (1-100)
- [ ] AI recommendations
- [ ] Mobile optimization score

### Zero-Input Generation
- [ ] Generate LP with just vertical + offer type
- [ ] AI creates complete LP from scratch
- [ ] Use library images automatically
- [ ] Multiple style presets
- [ ] One-click generation

---

## V6 - Deployment (DigitalOcean)

### DO App Platform Hosting
- [ ] One-click deploy to DO
- [ ] Auto-build from generated HTML
- [ ] Custom subdomain per LP
- [ ] SSL certificates (auto)

### Asset Management
- [ ] DO Spaces for image storage
- [ ] CDN for fast delivery
- [ ] Auto-optimize images

### LP Management
- [ ] List all deployed LPs
- [ ] Enable/disable LPs
- [ ] Update deployed LP
- [ ] View deployment logs

---

## V7 - Tracker Integration & A/B Testing

### Voluum Integration
- [ ] Connect Voluum account (API)
- [ ] Sync campaigns
- [ ] Pull performance data
- [ ] Auto-create campaigns for new LPs
- [ ] View stats in dashboard

### Keitaro Integration
- [ ] Connect Keitaro instance
- [ ] Sync campaigns & flows
- [ ] Pull click/conversion data
- [ ] Landing page rotation setup

### A/B Testing
- [ ] Create test with multiple variations
- [ ] Auto-generate variations for testing
- [ ] Link variations to tracker rotation
- [ ] View test results from tracker
- [ ] Winner recommendations
- [ ] Auto-pause losing variations

### Reports Dashboard
- [ ] LP performance overview
- [ ] Best performing elements
- [ ] Conversion trends
- [ ] ROI per LP/variation
- [ ] Export reports

---

## Tech Stack

### Current (V1)
- Next.js 16 + TypeScript
- Tailwind CSS + shadcn/ui
- Grok AI (xAI)
- Local file storage

### V2+ Additions
- [ ] PostgreSQL + Prisma
- [ ] Redis + Bull MQ
- [ ] DO Spaces (images)
- [ ] Google OAuth
- [ ] Grok Vision (images)

---

## Implementation Order

### Phase 1: Production Ready (V2)
1. PostgreSQL + Prisma setup
2. Project CRUD (save/load)
3. Redis + Bull MQ queue
4. Batch generation UI

### Phase 2: Users (V3)
1. Google OAuth
2. User model + sessions
3. Basic roles (admin/user)
4. Teams

### Phase 3: Images (V4)
1. Grok image generation
2. DO Spaces storage
3. Image library UI
4. Reuse in builder

### Phase 4: Advanced (V5)
1. Multi-source analysis
2. Zero-input generation
3. Scoring system

### Phase 5: Deploy & Track (V6-V7)
1. DO deployment
2. Voluum/Keitaro integration
3. A/B testing workflow
4. Reports dashboard

---

## Quick Wins (Can Do Now)

- [ ] Add more verticals (sweepstakes, nutra, crypto)
- [ ] Improve quiz question generation
- [ ] Better mobile preview
- [ ] Copy to clipboard button
- [ ] Dark mode UI

---

## Metrics to Track

- LPs generated per day
- Generation success rate
- Average generation time
- A/B test win rate
- Best performing LP patterns
- Image library usage

