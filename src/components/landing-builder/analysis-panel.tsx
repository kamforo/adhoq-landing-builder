'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Target, Zap, Link2, Layers, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ComponentAnalysis, AnalyzedComponent, DetectedSection, DetectedImage } from '@/types/component-analysis';

interface AnalysisPanelProps {
  analysis: ComponentAnalysis;
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComponents, setShowComponents] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showImages, setShowImages] = useState(false);

  // Count critical/important components
  const criticalCount = analysis.components.filter(c => c.importance === 'critical').length;
  const importantCount = analysis.components.filter(c => c.importance === 'important').length;

  // Format vertical name
  const formatVertical = (v: string) => {
    const map: Record<string, string> = {
      adult: 'Adult Dating',
      casual: 'Casual Dating',
      mainstream: 'Mainstream Dating',
    };
    return map[v] || v;
  };

  // Format tone name
  const formatTone = (t: string) => {
    return t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Format section type
  const formatSectionType = (type: string) => {
    const map: Record<string, string> = {
      hook: '🎯 Hook',
      quiz: '❓ Quiz',
      cta: '🔥 CTA',
      testimonial: '⭐ Testimonial',
      benefits: '✨ Benefits',
      unknown: '📄 Unknown',
    };
    return map[type] || type;
  };

  // Format image type
  const formatImageType = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      hero: { label: 'Hero', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200' },
      background: { label: 'Background', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
      decorative: { label: 'Decorative', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
      badge: { label: 'Badge', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' },
      icon: { label: 'Icon', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
      profile: { label: 'Profile', color: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200' },
      unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    };
    return map[type] || map.unknown;
  };

  // Count images by type
  const heroImages = analysis.images?.filter(i => i.type === 'hero').length || 0;
  const bgImages = analysis.images?.filter(i => i.type === 'background' || i.type === 'decorative').length || 0;

  return (
    <Card>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Eye className="h-4 w-4 text-blue-500" />
          <span className="font-medium">Page Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {formatVertical(analysis.vertical)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {analysis.flow.totalSteps} steps
          </Badge>
        </div>
      </button>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Target className="h-3 w-3" />
                <span>Flow Type</span>
              </div>
              <p className="font-medium capitalize">
                {analysis.flow.type.replace('-', ' ')}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap className="h-3 w-3" />
                <span>Tone</span>
              </div>
              <p className="font-medium">
                {formatTone(analysis.tone)}
              </p>
            </div>
          </div>

          {/* Strategy Summary */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Strategy</p>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Hook:</span> {analysis.strategySummary.mainHook}</p>
              <p><span className="text-muted-foreground">Value:</span> {analysis.strategySummary.valueProposition}</p>
              <p><span className="text-muted-foreground">Mechanism:</span> {analysis.strategySummary.conversionMechanism}</p>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {analysis.strategySummary.keyPersuasionTactics.map((tactic, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tactic}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tracking URL */}
          {analysis.trackingUrl && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Link2 className="h-3 w-3" />
                <span>Tracking URL</span>
              </div>
              <p className="font-mono text-xs break-all">{analysis.trackingUrl}</p>
            </div>
          )}

          {/* Detected Sections */}
          {analysis.sections && analysis.sections.length > 0 && (
            <div>
              <button
                onClick={() => setShowSections(!showSections)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSections ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Layers className="h-3 w-3" />
                Page Sections ({analysis.sections.length})
              </button>

              {showSections && (
                <div className="mt-3 space-y-2">
                  {analysis.sections.map((section, i) => (
                    <SectionItem key={i} section={section} formatSectionType={formatSectionType} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detected Images */}
          {analysis.images && analysis.images.length > 0 && (
            <div>
              <button
                onClick={() => setShowImages(!showImages)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showImages ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <ImageIcon className="h-3 w-3" />
                Images ({analysis.images.length})
                <span className="text-xs">
                  ({heroImages} hero, {bgImages} background)
                </span>
              </button>

              {showImages && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {analysis.images.map((image, i) => (
                    <ImageItem key={i} image={image} formatImageType={formatImageType} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Component Breakdown */}
          <div>
            <button
              onClick={() => setShowComponents(!showComponents)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showComponents ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              View Components ({analysis.components.length})
              <span className="text-xs">
                ({criticalCount} critical, {importantCount} important)
              </span>
            </button>

            {showComponents && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {analysis.components.map((component, i) => (
                  <ComponentItem key={component.id || i} component={component} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function SectionItem({
  section,
  formatSectionType,
}: {
  section: DetectedSection;
  formatSectionType: (type: string) => string;
}) {
  const sectionColors: Record<string, string> = {
    hook: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
    quiz: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    cta: 'bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800',
    testimonial: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    benefits: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    unknown: 'bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700',
  };

  return (
    <div className={`p-3 rounded-lg border text-sm ${sectionColors[section.type] || sectionColors.unknown}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{formatSectionType(section.type)}</span>
        <Badge variant="secondary" className="text-xs">
          Step{section.stepNumbers.length > 1 ? 's' : ''} {section.stepNumbers.join(', ')}
        </Badge>
      </div>
      {section.description && (
        <p className="text-xs mt-1 opacity-70">{section.description}</p>
      )}
    </div>
  );
}

function ImageItem({
  image,
  formatImageType,
}: {
  image: DetectedImage;
  formatImageType: (type: string) => { label: string; color: string };
}) {
  const typeInfo = formatImageType(image.type);

  return (
    <div className="p-2 rounded-lg bg-muted/30 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className="text-xs truncate opacity-60" title={image.url}>
            {image.url.split('/').pop()?.slice(0, 30) || 'image'}
          </span>
        </div>
        {image.isRequired && (
          <Badge variant="outline" className="text-xs shrink-0">Required</Badge>
        )}
      </div>
      {image.description && (
        <p className="text-xs mt-1 opacity-70">{image.description}</p>
      )}
      <p className="text-xs mt-0.5 opacity-50 capitalize">Position: {image.position}</p>
    </div>
  );
}

function ComponentItem({ component }: { component: AnalyzedComponent }) {
  const importanceColors = {
    critical: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    important: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    optional: 'text-gray-500 bg-gray-50 dark:bg-gray-900/30',
  };

  return (
    <div className={`p-2 rounded-lg text-sm ${importanceColors[component.importance]}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium capitalize">{component.type.replace('-', ' ')}</span>
        <Badge variant="outline" className="text-xs capitalize">
          {component.role.replace(/-/g, ' ')}
        </Badge>
      </div>
      <p className="text-xs mt-1 line-clamp-2 opacity-80">
        {component.content}
      </p>
      {component.notes && (
        <p className="text-xs mt-1 italic opacity-60">
          {component.notes}
        </p>
      )}
    </div>
  );
}
