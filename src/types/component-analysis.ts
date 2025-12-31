// Types for AI-powered component analysis

/**
 * LP Section Types - the main structural sections of a landing page
 */
export type LPSectionType = 'hook' | 'quiz' | 'cta' | 'testimonial' | 'benefits' | 'unknown';

/**
 * Detected section in the LP
 */
export interface DetectedSection {
  type: LPSectionType;
  stepNumbers: number[];     // Which steps belong to this section (e.g., [1] for hook, [2,3,4] for quiz)
  description: string;       // Brief description of what this section does
  components: string[];      // Component IDs in this section
}

/**
 * Image types detected in the LP
 */
export type ImageType = 'hero' | 'background' | 'decorative' | 'icon' | 'badge' | 'profile' | 'unknown';

/**
 * Detected image with categorization
 */
export interface DetectedImage {
  url: string;
  type: ImageType;
  description: string;       // What the image shows (e.g., "Woman in casual outfit")
  position: 'hook' | 'quiz' | 'cta' | 'background' | 'floating';
  isRequired: boolean;       // Whether this image is critical to the LP's effectiveness
}

/**
 * Component importance levels
 */
export type ComponentImportance = 'critical' | 'important' | 'optional';

/**
 * Component roles in the LP
 */
export type ComponentRole =
  | 'attention-grabber'    // Main headline, hero image
  | 'qualifier'            // Age gate, location check
  | 'engagement'           // Quiz questions, interactive elements
  | 'trust-builder'        // Testimonials, badges, social proof
  | 'desire-creator'       // Benefits, features, transformation
  | 'objection-handler'    // FAQ, guarantees, risk reversal
  | 'action-driver'        // CTA buttons, forms
  | 'urgency-creator'      // Countdown, scarcity, limited offer
  | 'value-demonstrator'   // Pricing, comparison, what you get
  | 'brand-element'        // Logo, footer, legal
  | 'visual-support'       // Supporting images, icons
  | 'navigation'           // Progress indicator, back button
  | 'redirect'             // Final redirect to offer
  | 'unknown';

/**
 * Persuasion techniques used
 */
export type PersuasionTechnique =
  | 'curiosity'
  | 'urgency'
  | 'scarcity'
  | 'social-proof'
  | 'authority'
  | 'reciprocity'
  | 'commitment-consistency'  // Micro-commitments
  | 'liking'
  | 'fear-of-missing-out'
  | 'exclusivity'
  | 'personalization'
  | 'locality'
  | 'transformation'
  | 'pain-agitation'
  | 'benefit-stacking'
  | 'risk-reversal'
  | 'none';

/**
 * A single analyzed component
 */
export interface AnalyzedComponent {
  id: string;
  type: ComponentType;
  content: string;              // The actual text or description
  role: ComponentRole;          // What it does in the funnel
  importance: ComponentImportance;
  persuasionTechniques: PersuasionTechnique[];
  position: number;             // Order in the flow
  notes: string;                // AI explanation of why this works
  originalHtml?: string;        // Original HTML for reference
  originalSelector?: string;    // CSS selector
}

export type ComponentType =
  | 'headline'
  | 'subheadline'
  | 'body-text'
  | 'image'
  | 'video'
  | 'button'
  | 'form'
  | 'quiz-question'
  | 'testimonial'
  | 'badge'
  | 'countdown'
  | 'list'
  | 'icon'
  | 'progress-indicator'
  | 'logo'
  | 'footer'
  | 'divider'
  | 'container';

/**
 * Dating vertical types
 */
export type DatingVertical = 'adult' | 'casual' | 'mainstream';

/**
 * Tone/voice of the LP
 */
export type LPTone =
  | 'playful-seductive'
  | 'urgent-exciting'
  | 'professional-trustworthy'
  | 'friendly-approachable'
  | 'bold-confident'
  | 'intimate-personal'
  | 'fun-lighthearted';

/**
 * Complete AI-powered analysis result
 */
export interface ComponentAnalysis {
  id: string;
  sourceUrl?: string;
  analyzedAt: Date;

  // Core component breakdown
  components: AnalyzedComponent[];

  // Detected sections (Hook, Quiz, CTA, etc.)
  sections: DetectedSection[];

  // Flow information
  flow: {
    type: 'multi-step' | 'single-page' | 'long-form';
    totalSteps: number;
    hasProgressIndicator: boolean;
  };

  // Vertical and tone
  vertical: DatingVertical;
  tone: LPTone;

  // Critical URLs
  trackingUrl: string;

  // Images with categorization (hero, background, decorative)
  images: DetectedImage[];

  // Legacy: simple image URLs (for backward compatibility)
  originalImages: string[];

  // Overall strategy summary
  strategySummary: {
    mainHook: string;           // What grabs attention
    valueProposition: string;   // Core promise
    conversionMechanism: string; // How it converts (quiz, form, etc)
    keyPersuasionTactics: PersuasionTechnique[];
  };

  // Raw data for reference
  rawCheerioData: {
    headlines: string[];
    buttons: string[];
    images: string[];
    forms: number;
  };
}

/**
 * Prompt Writer output - the custom prompt for the builder
 */
export interface BuilderPrompt {
  systemContext: string;      // Context about what we're building
  requirements: string;       // Critical requirements (must have)
  suggestions: string;        // Creative suggestions (nice to have)
  componentInstructions: string; // How to handle each component
  technicalRequirements: string; // JS structure, redirect, etc.
  fullPrompt: string;         // The complete combined prompt
}

/**
 * Rules for the prompt writer
 */
export interface PromptWriterRules {
  // Always include
  mustIncludeComponents: ComponentRole[];
  mustPreserveFlow: boolean;
  mustEndWithRedirect: boolean;

  // Style guidance
  verticalGuidance: Record<DatingVertical, string>;
  toneGuidance: Record<LPTone, string>;

  // Constraints
  maxSteps: number;
  requireProgressIndicator: boolean;
}

export const DEFAULT_PROMPT_RULES: PromptWriterRules = {
  mustIncludeComponents: ['attention-grabber', 'action-driver', 'redirect'],
  mustPreserveFlow: true,
  mustEndWithRedirect: true,
  verticalGuidance: {
    adult: 'Explicit, seductive, intimate. Can show suggestive content.',
    casual: 'Sexy but not explicit. Flirty and fun.',
    mainstream: 'Completely SFW. Focus on connection and romance.',
  },
  toneGuidance: {
    'playful-seductive': 'Flirty, teasing, suggestive language',
    'urgent-exciting': 'High energy, FOMO, act now messaging',
    'professional-trustworthy': 'Clean, credible, reassuring',
    'friendly-approachable': 'Warm, welcoming, conversational',
    'bold-confident': 'Strong statements, assertive, powerful',
    'intimate-personal': 'Personal, one-on-one feel, direct address',
    'fun-lighthearted': 'Casual, fun, not taking itself too seriously',
  },
  maxSteps: 10,
  requireProgressIndicator: true,
};
