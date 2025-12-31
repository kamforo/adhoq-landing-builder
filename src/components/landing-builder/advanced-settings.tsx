'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Palette, Layout, Link2, Type, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { GenerationOptions, TextHandling, ColorScheme, LayoutStyle, LinkHandling, CustomColors } from '@/types';
import type { AddElementOptions } from '@/types/builder';

interface AdvancedSettingsProps {
  options: Partial<GenerationOptions>;
  onChange: (options: Partial<GenerationOptions>) => void;
  vertical?: string;
  tone?: string;
}

export function AdvancedSettings({
  options,
  onChange,
}: AdvancedSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddElements, setShowAddElements] = useState(false);

  const updateOption = <K extends keyof GenerationOptions>(
    key: K,
    value: GenerationOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  const updateCustomColors = (colorKey: keyof CustomColors, value: string) => {
    onChange({
      ...options,
      customColors: {
        ...options.customColors,
        [colorKey]: value || undefined,
      },
    });
  };

  const updateAddElements = (updates: Partial<AddElementOptions>) => {
    onChange({
      ...options,
      addElements: {
        ...options.addElements,
        ...updates,
      },
    });
  };

  const addElements = options.addElements || {};

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
          <span className="font-medium">Advanced Settings</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {isExpanded ? 'Click to collapse' : 'Colors, layout, links & more'}
        </span>
      </button>

      {isExpanded && (
        <CardContent className="pt-0 space-y-6">
          {/* Color Scheme Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4 text-pink-500" />
              <span>Color Scheme</span>
            </div>
            <Select
              value={options.colorScheme || 'generate-matching'}
              onValueChange={(v) => updateOption('colorScheme', v as ColorScheme)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generate-matching">Generate matching palette</SelectItem>
                <SelectItem value="keep">Keep original colors</SelectItem>
                <SelectItem value="custom">Custom colors</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {options.colorScheme === 'keep' && 'Use colors from the source page'}
              {options.colorScheme === 'generate-matching' && 'AI generates colors that match the vertical'}
              {options.colorScheme === 'custom' && 'Specify your own color palette'}
            </p>

            {/* Custom Colors */}
            {options.colorScheme === 'custom' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Primary</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={options.customColors?.primary || '#e91e63'}
                      onChange={(e) => updateCustomColors('primary', e.target.value)}
                      className="w-10 h-8 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      placeholder="#e91e63"
                      value={options.customColors?.primary || ''}
                      onChange={(e) => updateCustomColors('primary', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CTA Button</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={options.customColors?.cta || '#ff3366'}
                      onChange={(e) => updateCustomColors('cta', e.target.value)}
                      className="w-10 h-8 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      placeholder="#ff3366"
                      value={options.customColors?.cta || ''}
                      onChange={(e) => updateCustomColors('cta', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Background</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={options.customColors?.background || '#1a1a2e'}
                      onChange={(e) => updateCustomColors('background', e.target.value)}
                      className="w-10 h-8 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      placeholder="#1a1a2e"
                      value={options.customColors?.background || ''}
                      onChange={(e) => updateCustomColors('background', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Text</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={options.customColors?.text || '#ffffff'}
                      onChange={(e) => updateCustomColors('text', e.target.value)}
                      className="w-10 h-8 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      placeholder="#ffffff"
                      value={options.customColors?.text || ''}
                      onChange={(e) => updateCustomColors('text', e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Layout Style Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Layout className="h-4 w-4 text-blue-500" />
              <span>Layout Style</span>
            </div>
            <Select
              value={options.layoutStyle || 'mobile-optimized'}
              onValueChange={(v) => updateOption('layoutStyle', v as LayoutStyle)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile-optimized">Mobile-optimized (Recommended)</SelectItem>
                <SelectItem value="keep-structure">Keep original structure</SelectItem>
                <SelectItem value="generate-new">Generate completely new</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {options.layoutStyle === 'mobile-optimized' && 'Full-viewport steps, thumb-reachable CTAs, no scrolling'}
              {options.layoutStyle === 'keep-structure' && 'Maintain the original page structure and flow'}
              {options.layoutStyle === 'generate-new' && 'AI creates a completely new layout design'}
            </p>
          </div>

          <Separator />

          {/* Link Handling Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4 text-green-500" />
              <span>Link Handling</span>
            </div>
            <Select
              value={options.linkHandling || 'replace-all'}
              onValueChange={(v) => updateOption('linkHandling', v as LinkHandling)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replace-all">Replace all with tracking URL</SelectItem>
                <SelectItem value="keep">Keep original links</SelectItem>
                <SelectItem value="remove-non-cta">Remove non-CTA links</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {options.linkHandling === 'replace-all' && 'All clickable elements point to your tracking URL'}
              {options.linkHandling === 'keep' && 'Keep all original links unchanged'}
              {options.linkHandling === 'remove-non-cta' && 'Only keep CTA buttons, remove other links'}
            </p>
          </div>

          <Separator />

          {/* Text Handling Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Type className="h-4 w-4 text-purple-500" />
              <span>Text Handling</span>
            </div>
            <Select
              value={options.textHandling || 'rewrite-slight'}
              onValueChange={(v) => updateOption('textHandling', v as TextHandling)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rewrite-slight">Rewrite slightly (Recommended)</SelectItem>
                <SelectItem value="keep">Keep original text</SelectItem>
                <SelectItem value="rewrite-complete">Rewrite completely</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Creativity Slider */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Creativity Level</span>
            </div>
            <Input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={options.creativity || 0.7}
              onChange={(e) => updateOption('creativity', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Conservative</span>
              <span className="font-mono">{options.creativity || 0.7}</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label className="text-sm">Custom Instructions</Label>
            <Textarea
              placeholder="E.g., 'Make the tone more urgent' or 'Use shorter sentences'"
              value={options.textInstructions || ''}
              onChange={(e) => updateOption('textInstructions', e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <Separator />

          {/* Add Elements Section */}
          <div>
            <button
              onClick={() => setShowAddElements(!showAddElements)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAddElements ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Add Conversion Elements
            </button>

            {showAddElements && (
              <div className="mt-4 space-y-3 pl-2 border-l-2 border-muted">
                <p className="text-xs text-muted-foreground">
                  AI will generate matching text based on the page content and tone
                </p>

                {/* Countdown Timer */}
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="countdownEnabled"
                    checked={addElements.countdown?.enabled || false}
                    onChange={(e) => updateAddElements({
                      countdown: {
                        enabled: e.target.checked,
                        duration: 300,
                        position: 'top',
                        style: 'prominent',
                      }
                    })}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div>
                    <Label htmlFor="countdownEnabled" className="text-sm font-medium cursor-pointer">
                      Countdown Timer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      e.g., &quot;Offer expires in 5:00&quot; or &quot;Limited time remaining&quot;
                    </p>
                  </div>
                </div>

                {/* Scarcity Indicator */}
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="scarcityEnabled"
                    checked={addElements.scarcity?.enabled || false}
                    onChange={(e) => updateAddElements({
                      scarcity: {
                        enabled: e.target.checked,
                        type: 'spots',
                        position: 'above-cta',
                      }
                    })}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div>
                    <Label htmlFor="scarcityEnabled" className="text-sm font-medium cursor-pointer">
                      Scarcity Indicator
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      e.g., &quot;Only 3 spots left&quot; or &quot;7 singles waiting nearby&quot;
                    </p>
                  </div>
                </div>

                {/* Social Proof */}
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="socialProofEnabled"
                    checked={addElements.socialProof?.enabled || false}
                    onChange={(e) => updateAddElements({
                      socialProof: {
                        enabled: e.target.checked,
                        type: 'counter',
                        position: 'below-headline',
                      }
                    })}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div>
                    <Label htmlFor="socialProofEnabled" className="text-sm font-medium cursor-pointer">
                      Social Proof
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      e.g., &quot;47 people matched this hour&quot; or &quot;Join 10,000+ members&quot;
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
