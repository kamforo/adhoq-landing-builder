// Types for the Analyzer Agent

/**
 * LP Flow - The persuasion journey/funnel structure
 * This captures the STRATEGY, not the visual design
 */
export interface LPFlow {
  // Flow type detected
  type: 'single-page' | 'multi-step' | 'long-form' | 'video-sales';

  // Ordered stages of the funnel
  stages: FlowStage[];

  // Framework detected (if any)
  framework?: 'AIDA' | 'PAS' | 'BAB' | 'custom';

  // CTA strategy
  ctaStrategy: {
    primaryCta: string;
    primaryCtaUrl?: string;
    ctaFrequency: 'single' | 'repeated' | 'progressive';
    ctaPositions: string[]; // section types where CTAs appear
  };

  // Key messaging flow
  messagingFlow: {
    hook?: string;        // Attention grabber
    problem?: string;     // Pain point
    agitation?: string;   // Making problem worse
    solution?: string;    // The offer
    benefits?: string[];  // Key benefits
    proof?: string;       // Social proof summary
    offer?: string;       // What they get
    urgency?: string;     // Why act now
    guarantee?: string;   // Risk reversal
  };
}

export interface FlowStage {
  order: number;
  sectionId: string;
  sectionType: SectionType;
  purpose: 'attention' | 'interest' | 'desire' | 'action' | 'trust' | 'objection-handling';
  hasCtaButton: boolean;
  keyMessage?: string;
}

/**
 * Complete analysis of a landing page
 */
export interface PageAnalysis {
  id: string;
  sourceUrl?: string;
  analyzedAt: Date;

  // Page structure
  sections: PageSection[];

  // Extracted components
  components: ComponentMap;

  // Persuasion elements found
  persuasionElements: PersuasionElement[];

  // Style information
  styleInfo: StyleInfo;

  // LP Flow - the funnel/journey structure
  lpFlow: LPFlow;

  // Raw HTML for builder
  html: string;
}

/**
 * A section of the landing page
 */
export interface PageSection {
  id: string;
  type: SectionType;
  selector: string;
  order: number;
  components: string[]; // IDs of components in this section
  html: string;
}

export type SectionType =
  | 'header'
  | 'hero'
  | 'features'
  | 'benefits'
  | 'testimonials'
  | 'social-proof'
  | 'pricing'
  | 'faq'
  | 'cta'
  | 'footer'
  | 'form'
  | 'gallery'
  | 'video'
  | 'unknown';

/**
 * Map of all components by type
 */
export interface ComponentMap {
  headlines: HeadlineComponent[];
  subheadlines: TextComponent[];
  paragraphs: TextComponent[];
  buttons: ButtonComponent[];
  images: ImageComponent[];
  forms: FormComponent[];
  lists: ListComponent[];
  videos: VideoComponent[];
}

/**
 * Base component interface
 */
interface BaseComponent {
  id: string;
  selector: string;
  sectionId?: string;
}

export interface HeadlineComponent extends BaseComponent {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  isMainHeadline: boolean;
}

export interface TextComponent extends BaseComponent {
  text: string;
  wordCount: number;
}

export interface ButtonComponent extends BaseComponent {
  text: string;
  href?: string;
  type: 'cta' | 'secondary' | 'navigation' | 'submit';
  hasUrgency: boolean;
}

export interface ImageComponent extends BaseComponent {
  src: string;
  alt?: string;
  isHero: boolean;
  isIcon: boolean;
  dimensions?: { width: number; height: number };
}

export interface FormComponent extends BaseComponent {
  action?: string;
  method: string;
  fields: AnalyzerFormField[];
  submitButton?: string;
}

export interface AnalyzerFormField {
  name: string;
  type: string;
  label?: string;
  required: boolean;
}

export interface ListComponent extends BaseComponent {
  items: string[];
  type: 'bullet' | 'numbered' | 'check' | 'icon';
}

export interface VideoComponent extends BaseComponent {
  src: string;
  type: 'youtube' | 'vimeo' | 'html5' | 'embed';
  thumbnail?: string;
}

/**
 * Persuasion elements detected on the page
 */
export interface PersuasionElement {
  id: string;
  type: PersuasionType;
  selector: string;
  content: string;
  strength: 'weak' | 'medium' | 'strong';
}

export type PersuasionType =
  | 'urgency'           // "Limited time", "Only X left"
  | 'scarcity'          // "Only 5 spots", "Selling fast"
  | 'social-proof'      // Testimonials, reviews, user counts
  | 'authority'         // "As seen on", expert endorsements
  | 'trust-badge'       // Security badges, guarantees, certifications
  | 'guarantee'         // Money-back, satisfaction guarantee
  | 'fomo'              // "Others are viewing", "X people bought"
  | 'countdown'         // Timer elements
  | 'discount'          // Price reductions, savings
  | 'free-offer';       // Free trials, bonuses

/**
 * Style information extracted from the page
 */
export interface StyleInfo {
  colors: ColorInfo;
  typography: TypographyInfo;
  layout: LayoutInfo;
}

export interface ColorInfo {
  primary: string[];      // Main brand colors
  secondary: string[];    // Accent colors
  background: string[];   // Background colors
  text: string[];         // Text colors
  cta: string[];          // Button/CTA colors
}

export interface TypographyInfo {
  headingFonts: string[];
  bodyFonts: string[];
  fontSizes: string[];
}

export interface LayoutInfo {
  maxWidth?: string;
  hasFixedHeader: boolean;
  hasStickyElements: boolean;
  columnLayout: 'single' | 'two-column' | 'multi-column' | 'mixed';
}
