/**
 * Landing Page Rules - Non-negotiable requirements for ALL generated pages
 * These rules are always applied regardless of other options
 */

export const LP_RULES = {
  // 1. Layout & UX (Non-Negotiables)
  layoutUX: `
## LAYOUT & UX RULES (NON-NEGOTIABLE)

1. **Mobile-first design**
   - Design for 375×667 first. Tablet/desktop are adaptations.
   - Use responsive units (vh, vw, %, rem) not fixed pixels

2. **No vertical scrolling per step**
   - Each step must fully fit the viewport (including CTA) on:
     - iPhone SE / Mini (375×667)
     - Standard Android (360×640)
     - Desktop 1366×768
   - Use max-height: 100vh for step containers
   - Use overflow: hidden on step containers

3. **Primary CTA always above the fold**
   - CTA must be visible without scrolling
   - No secondary actions visually competing with CTA

4. **Single action per screen**
   - One question, one decision, one CTA per step
   - No multiple forms or competing actions

5. **Thumb-reachable CTAs (mobile)**
   - Buttons must sit in the lower 40% of the screen
   - Use position: fixed or flexbox with margin-top: auto

6. **Consistent CTA placement**
   - CTA appears in the same vertical position on every step
   - Use consistent padding/margins across all steps
`,

  // 3. Copy & Messaging Rules
  copyRules: `
## COPY & MESSAGING RULES

1. **Reading level ≤ 6th grade**
   - Short sentences (under 15 words)
   - No jargon or technical terms
   - No compound ideas - one thought per sentence

2. **Micro-commitment language for CTAs**
   - GOOD: "Continue", "Next", "See matches", "Show me", "Yes!", "Let's go"
   - BAD: "Submit", "Register", "Sign up", "Create account"
   - Make it feel like progress, not commitment

3. **Direct, action-oriented headlines**
   - Start with verbs or "You/Your"
   - Create curiosity or urgency
   - Keep under 10 words
`,

  // 4. Visual & Design Rules
  visualRules: `
## VISUAL & DESIGN RULES

1. **One dominant visual per step max**
   - Choose ONE: background image OR character OR illustration
   - Never combine all three
   - Keep visual hierarchy clean

2. **No stock-photo overload**
   - Faces should feel UGC-like, casual, imperfect
   - Avoid overly polished corporate stock photos
   - Prefer candid-style imagery

3. **High contrast CTAs**
   - Button color must have strong contrast with background
   - Minimum 4.5:1 contrast ratio (WCAG AA)
   - CTA should be the most visually prominent element

4. **No visual elements below CTA**
   - Nothing that visually implies scrolling
   - CTA is the final visual element on each step
   - Footer/legal text can be minimal and subdued

5. **Animations are optional, never required**
   - Flow must work perfectly with animations disabled
   - No animation-dependent interactions
   - Use CSS transitions, not JS animations for basic effects
`,

  // 5. Performance & Technical
  technicalRules: `
## PERFORMANCE & TECHNICAL RULES

1. **Lightweight page**
   - Inline all CSS (no external stylesheets)
   - Minimal JavaScript (only for step navigation)
   - Optimize/compress images or use original URLs

2. **No blocking scripts above the fold**
   - Place <script> tags at end of body
   - No render-blocking resources

3. **Stateless steps**
   - Page refresh must not break the flow
   - Each step works independently
   - Use simple JS state (no complex frameworks)

4. **Clean, semantic HTML**
   - Use proper heading hierarchy (h1 > h2 > h3)
   - Accessible button elements (not div/span)
   - Proper viewport meta tag
`,

  // CSS Framework to include
  cssFramework: `
/* Mobile-first base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden; /* Prevent scrolling */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.5;
}

/* Step container - full viewport, no scroll */
.step {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100vh;
  max-height: 100vh;
  padding: 20px;
  overflow: hidden;
}

.step.active {
  display: flex;
}

/* Content area - flexible, takes available space */
.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

/* CTA area - fixed at bottom, thumb-reachable */
.step-cta {
  padding: 20px 0;
  margin-top: auto;
}

/* CTA button - high contrast, full width on mobile */
.cta-button {
  display: block;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

.cta-button:hover {
  transform: scale(1.02);
}

.cta-button:active {
  transform: scale(0.98);
}

/* Progress indicator */
.progress {
  font-size: 14px;
  opacity: 0.7;
  margin-top: 16px;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .step {
    padding: 40px;
  }

  .cta-button {
    max-width: 400px;
  }
}
`,
};

/**
 * Get complete rules as a single string for the builder prompt
 */
export function getAllRules(): string {
  return `
# LANDING PAGE RULES (ALWAYS APPLY)

These rules are NON-NEGOTIABLE. Every generated page MUST follow them.

${LP_RULES.layoutUX}

${LP_RULES.copyRules}

${LP_RULES.visualRules}

${LP_RULES.technicalRules}

## RECOMMENDED CSS STRUCTURE

Use this CSS structure as a base:

\`\`\`css
${LP_RULES.cssFramework}
\`\`\`

## HTML STRUCTURE TEMPLATE

Each step should follow this structure:

\`\`\`html
<div id="step1" class="step active">
  <div class="step-content">
    <!-- Question/headline here -->
    <!-- Optional image here -->
    <!-- Answer options here (if quiz step) -->
  </div>
  <div class="step-cta">
    <button class="cta-button" onclick="nextStep()">Continue</button>
    <div class="progress">Step 1 of X</div>
  </div>
</div>
\`\`\`
`;
}

/**
 * Get CTA copy guidelines
 */
export function getCtaCopyGuidelines(): string[] {
  return [
    'Continue',
    'Next',
    'See matches',
    'Show me',
    'Yes!',
    "Let's go",
    'Find out',
    'Discover',
    'Get started',
    "I'm ready",
  ];
}

/**
 * Get forbidden CTA words
 */
export function getForbiddenCtaWords(): string[] {
  return [
    'Submit',
    'Register',
    'Sign up',
    'Create account',
    'Subscribe',
    'Join now',
  ];
}
