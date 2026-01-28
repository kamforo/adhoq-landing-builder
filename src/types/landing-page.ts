// Types for parsed landing page content

export interface ParsedLandingPage {
  id: string;
  sourceUrl?: string;
  resolvedUrl?: string;
  sourceFileName?: string;
  html: string;
  title: string;
  description?: string;

  // Extracted content
  textContent: TextBlock[];
  assets: Asset[];
  links: DetectedLink[];
  trackingCodes: TrackingCode[];
  forms: FormElement[];

  // Metadata
  parsedAt: Date;
  originalSize: number;
}

export interface TextBlock {
  id: string;
  selector: string; // CSS selector to locate this element
  tagName: string;
  originalText: string;
  modifiedText?: string;
  type: 'heading' | 'paragraph' | 'button' | 'link' | 'list-item' | 'other';
}

export interface Asset {
  id: string;
  type: 'image' | 'css' | 'js' | 'font' | 'video' | 'other';
  originalUrl: string;
  localPath?: string;
  base64Data?: string;
  fileName: string;
  mimeType?: string;
  size?: number;
}

export interface DetectedLink {
  id: string;
  type: 'affiliate' | 'tracking' | 'redirect' | 'cta' | 'navigation' | 'external' | 'internal';
  originalUrl: string;
  replacementUrl?: string;
  anchorText?: string;
  selector: string;
  confidence: number; // 0-1, how confident we are about the type
  detectionReason: string;
}

export interface TrackingCode {
  id: string;
  type: 'facebook-pixel' | 'google-analytics' | 'google-tag-manager' | 'tiktok-pixel' | 'custom' | 'other';
  code: string;
  selector?: string;
  shouldRemove: boolean;
  shouldReplace: boolean;
  replacementCode?: string;
}

export interface FormElement {
  id: string;
  action: string;
  method: string;
  fields: FormField[];
  selector: string;
}

export interface FormField {
  name: string;
  type: string;
  placeholder?: string;
  required: boolean;
}
