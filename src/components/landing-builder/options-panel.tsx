'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { GenerationOptions, TextHandling, ImageHandling, LinkHandling, StyleHandling, DatingVertical } from '@/types';
import type { AddElementOptions } from '@/types/builder';

interface OptionsPanelProps {
  options: Partial<GenerationOptions>;
  onChange: (options: Partial<GenerationOptions>) => void;
}

export function OptionsPanel({ options, onChange }: OptionsPanelProps) {
  const [showAddElements, setShowAddElements] = useState(false);

  const updateOption = <K extends keyof GenerationOptions>(
    key: K,
    value: GenerationOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
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
      <CardHeader>
        <CardTitle className="text-lg">Generation Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tracking Link */}
        <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <Label htmlFor="ctaUrlOverride" className="font-medium">
            Tracking Link <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ctaUrlOverride"
            type="url"
            placeholder="https://your-tracking-link.com/?sub1=..."
            value={options.ctaUrlOverride || ''}
            onChange={(e) => updateOption('ctaUrlOverride', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            All CTAs and final redirect will point here. Override auto-detected or enter manually.
          </p>
        </div>

        <Separator />

        {/* Text Handling */}
        <div className="space-y-2">
          <Label htmlFor="textHandling">Text Handling</Label>
          <Select
            value={options.textHandling || 'rewrite-slight'}
            onValueChange={(v) => updateOption('textHandling', v as TextHandling)}
          >
            <SelectTrigger id="textHandling">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Keep Original</SelectItem>
              <SelectItem value="rewrite-slight">Rewrite Slightly</SelectItem>
              <SelectItem value="rewrite-complete">Rewrite Completely</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            How AI should handle text content
          </p>
        </div>

        {/* Image Handling */}
        <div className="space-y-2">
          <Label htmlFor="imageHandling">Image Handling</Label>
          <Select
            value={options.imageHandling || 'keep'}
            onValueChange={(v) => updateOption('imageHandling', v as ImageHandling)}
          >
            <SelectTrigger id="imageHandling">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Keep Original</SelectItem>
              <SelectItem value="placeholder">Use Placeholders</SelectItem>
              <SelectItem value="ai-generate" disabled>AI Generate (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Link Handling */}
        <div className="space-y-2">
          <Label htmlFor="linkHandling">Link Handling</Label>
          <Select
            value={options.linkHandling || 'keep'}
            onValueChange={(v) => updateOption('linkHandling', v as LinkHandling)}
          >
            <SelectTrigger id="linkHandling">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Keep All Links</SelectItem>
              <SelectItem value="remove-tracking">Remove Tracking Params</SelectItem>
              <SelectItem value="replace-custom">Replace with Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Style Handling */}
        <div className="space-y-2">
          <Label htmlFor="styleHandling">Style Handling</Label>
          <Select
            value={options.styleHandling || 'keep'}
            onValueChange={(v) => updateOption('styleHandling', v as StyleHandling)}
          >
            <SelectTrigger id="styleHandling">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Keep Original Styles</SelectItem>
              <SelectItem value="modify-colors">Modify Colors Only</SelectItem>
              <SelectItem value="modify-layout">Modify Layout & Fonts</SelectItem>
              <SelectItem value="restyle-complete">Complete Restyle</SelectItem>
              <SelectItem value="generate-new">Generate New Layout</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {options.styleHandling === 'generate-new'
              ? 'AI will create a completely new design based on the content'
              : 'How AI should modify the visual appearance'}
          </p>
        </div>

        {/* Vertical Selection & Step Count - shown when generating new layout */}
        {(options.styleHandling === 'generate-new' || options.styleHandling === 'restyle-complete') && (
          <div className="space-y-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="vertical">Content Vertical</Label>
              <Select
                value={options.vertical || 'auto'}
                onValueChange={(v) => updateOption('vertical', v as DatingVertical)}
              >
                <SelectTrigger id="vertical">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="adult">Adult Dating (Explicit)</SelectItem>
                  <SelectItem value="casual">Casual Dating (Sexy, not explicit)</SelectItem>
                  <SelectItem value="mainstream">Mainstream Dating (SFW)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {options.vertical === 'adult' && 'Bold colors, provocative imagery and language'}
                {options.vertical === 'casual' && 'Warm tones, flirty but tasteful content'}
                {options.vertical === 'mainstream' && 'Professional, wholesome, relationship-focused'}
                {(!options.vertical || options.vertical === 'auto') && 'AI will detect based on page content'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stepCount">Number of Steps/Questions</Label>
              <Select
                value={String(options.stepCount || 'auto')}
                onValueChange={(v) => updateOption('stepCount', v === 'auto' ? undefined : parseInt(v))}
              >
                <SelectTrigger id="stepCount">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect from source</SelectItem>
                  <SelectItem value="3">3 steps</SelectItem>
                  <SelectItem value="4">4 steps</SelectItem>
                  <SelectItem value="5">5 steps</SelectItem>
                  <SelectItem value="6">6 steps</SelectItem>
                  <SelectItem value="7">7 steps</SelectItem>
                  <SelectItem value="8">8 steps</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {options.stepCount
                  ? `Generate ${options.stepCount} quiz questions before final redirect`
                  : 'Will match the number of steps from the source page'}
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Variation Settings */}
        <div className="space-y-2">
          <Label htmlFor="variationCount">Number of Variations</Label>
          <Input
            id="variationCount"
            type="number"
            min={1}
            max={10}
            value={options.variationCount || 1}
            onChange={(e) => updateOption('variationCount', parseInt(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="variationStyle">Variation Style</Label>
          <Select
            value={options.variationStyle || 'moderate'}
            onValueChange={(v) => updateOption('variationStyle', v as 'subtle' | 'moderate' | 'significant')}
          >
            <SelectTrigger id="variationStyle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subtle">Subtle Changes</SelectItem>
              <SelectItem value="moderate">Moderate Changes</SelectItem>
              <SelectItem value="significant">Significant Changes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* AI Settings */}
        <div className="space-y-2">
          <Label htmlFor="creativity">AI Creativity (Temperature)</Label>
          <Input
            id="creativity"
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
            <span>{options.creativity || 0.7}</span>
            <span>Creative</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="textInstructions">Custom Instructions (Optional)</Label>
          <Textarea
            id="textInstructions"
            placeholder="E.g., 'Make the tone more professional' or 'Focus on urgency'"
            value={options.textInstructions || ''}
            onChange={(e) => updateOption('textInstructions', e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preserveKeywords">Preserve Keywords (Optional)</Label>
          <Input
            id="preserveKeywords"
            placeholder="keyword1, keyword2, brand name"
            value={options.preserveKeywords?.join(', ') || ''}
            onChange={(e) =>
              updateOption(
                'preserveKeywords',
                e.target.value.split(',').map((k) => k.trim()).filter(Boolean)
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated keywords to keep unchanged
          </p>
        </div>

        <Separator />

        {/* Tracking Options */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="removeTrackingCodes"
            checked={options.removeTrackingCodes || false}
            onChange={(e) => updateOption('removeTrackingCodes', e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="removeTrackingCodes" className="text-sm font-normal">
            Remove all tracking codes (pixels, analytics)
          </Label>
        </div>

        <Separator />

        {/* Add Elements Section */}
        <div className="space-y-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowAddElements(!showAddElements)}
          >
            <div>
              <Label className="text-base font-medium cursor-pointer">Add Conversion Elements</Label>
              <p className="text-xs text-muted-foreground">
                Inject countdown timers, social proof, exit popups, etc.
              </p>
            </div>
            <Badge variant="outline" className="ml-2">
              {showAddElements ? '−' : '+'}
            </Badge>
          </div>

          {showAddElements && (
            <div className="space-y-4 pl-2 border-l-2 border-muted">
              {/* Redirect URL */}
              <div className="space-y-2">
                <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
                <Input
                  id="redirectUrl"
                  type="url"
                  placeholder="https://your-offer.com/?ref=123"
                  value={addElements.redirectUrl || ''}
                  onChange={(e) => updateAddElements({ redirectUrl: e.target.value || undefined })}
                />
                <p className="text-xs text-muted-foreground">
                  URL for all CTA buttons. Auto-detected from page if empty.
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="countdownEnabled"
                    checked={addElements.countdown?.enabled || false}
                    onChange={(e) => updateAddElements({
                      countdown: {
                        ...addElements.countdown,
                        enabled: e.target.checked,
                        duration: addElements.countdown?.duration || 3600,
                        position: addElements.countdown?.position || 'top',
                        style: addElements.countdown?.style || 'prominent',
                      }
                    })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="countdownEnabled" className="font-medium cursor-pointer">
                    Countdown Timer
                  </Label>
                </div>
                {addElements.countdown?.enabled && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-xs">Duration (seconds)</Label>
                      <Input
                        type="number"
                        min={60}
                        value={addElements.countdown?.duration || 3600}
                        onChange={(e) => updateAddElements({
                          countdown: { ...addElements.countdown!, duration: parseInt(e.target.value) || 3600 }
                        })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Style</Label>
                      <Select
                        value={addElements.countdown?.style || 'prominent'}
                        onValueChange={(v) => updateAddElements({
                          countdown: { ...addElements.countdown!, style: v as 'minimal' | 'prominent' | 'urgent' }
                        })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="prominent">Prominent</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Text</Label>
                      <Input
                        placeholder="Offer expires in:"
                        value={addElements.countdown?.text || ''}
                        onChange={(e) => updateAddElements({
                          countdown: { ...addElements.countdown!, text: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Scarcity Indicator */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="scarcityEnabled"
                    checked={addElements.scarcity?.enabled || false}
                    onChange={(e) => updateAddElements({
                      scarcity: {
                        ...addElements.scarcity,
                        enabled: e.target.checked,
                        type: addElements.scarcity?.type || 'spots',
                        position: addElements.scarcity?.position || 'above-cta',
                      }
                    })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="scarcityEnabled" className="font-medium cursor-pointer">
                    Scarcity Indicator
                  </Label>
                </div>
                {addElements.scarcity?.enabled && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={addElements.scarcity?.type || 'spots'}
                        onValueChange={(v) => updateAddElements({
                          scarcity: { ...addElements.scarcity!, type: v as 'spots' | 'stock' | 'viewers' }
                        })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spots">Limited Spots</SelectItem>
                          <SelectItem value="stock">Low Stock</SelectItem>
                          <SelectItem value="viewers">Live Viewers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Value</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="7"
                        value={addElements.scarcity?.value || ''}
                        onChange={(e) => updateAddElements({
                          scarcity: { ...addElements.scarcity!, value: parseInt(e.target.value) || undefined }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Social Proof */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="socialProofEnabled"
                    checked={addElements.socialProof?.enabled || false}
                    onChange={(e) => updateAddElements({
                      socialProof: {
                        ...addElements.socialProof,
                        enabled: e.target.checked,
                        type: addElements.socialProof?.type || 'counter',
                        position: addElements.socialProof?.position || 'below-headline',
                      }
                    })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="socialProofEnabled" className="font-medium cursor-pointer">
                    Social Proof
                  </Label>
                </div>
                {addElements.socialProof?.enabled && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={addElements.socialProof?.type || 'counter'}
                        onValueChange={(v) => updateAddElements({
                          socialProof: { ...addElements.socialProof!, type: v as 'counter' | 'notification' | 'reviews' }
                        })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="counter">Customer Counter</SelectItem>
                          <SelectItem value="notification">Live Notifications</SelectItem>
                          <SelectItem value="reviews">Star Reviews</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Count</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="10000"
                        value={addElements.socialProof?.count || ''}
                        onChange={(e) => updateAddElements({
                          socialProof: { ...addElements.socialProof!, count: parseInt(e.target.value) || undefined }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="trustBadgesEnabled"
                    checked={addElements.trustBadges?.enabled || false}
                    onChange={(e) => updateAddElements({
                      trustBadges: {
                        ...addElements.trustBadges,
                        enabled: e.target.checked,
                        badges: addElements.trustBadges?.badges || ['secure', 'guarantee'],
                        position: addElements.trustBadges?.position || 'below-cta',
                      }
                    })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="trustBadgesEnabled" className="font-medium cursor-pointer">
                    Trust Badges
                  </Label>
                </div>
                {addElements.trustBadges?.enabled && (
                  <div className="mt-2 space-y-2">
                    <Label className="text-xs">Select Badges</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['secure', 'guarantee', 'verified', 'payment'] as const).map((badge) => (
                        <label key={badge} className="flex items-center space-x-1 text-xs">
                          <input
                            type="checkbox"
                            checked={addElements.trustBadges?.badges?.includes(badge) || false}
                            onChange={(e) => {
                              const current = addElements.trustBadges?.badges || [];
                              const updated = e.target.checked
                                ? [...current, badge]
                                : current.filter(b => b !== badge);
                              updateAddElements({
                                trustBadges: { ...addElements.trustBadges!, badges: updated }
                              });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="capitalize">{badge}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Exit Intent Popup */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="exitIntentEnabled"
                    checked={addElements.exitIntent?.enabled || false}
                    onChange={(e) => updateAddElements({
                      exitIntent: {
                        ...addElements.exitIntent,
                        enabled: e.target.checked,
                        headline: addElements.exitIntent?.headline || 'Wait! Before You Go...',
                        text: addElements.exitIntent?.text || 'Get an exclusive discount just for you!',
                        buttonText: addElements.exitIntent?.buttonText || 'Claim My Discount',
                      }
                    })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="exitIntentEnabled" className="font-medium cursor-pointer">
                    Exit Intent Popup
                  </Label>
                </div>
                {addElements.exitIntent?.enabled && (
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label className="text-xs">Headline</Label>
                      <Input
                        value={addElements.exitIntent?.headline || ''}
                        onChange={(e) => updateAddElements({
                          exitIntent: { ...addElements.exitIntent!, headline: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Text</Label>
                      <Input
                        value={addElements.exitIntent?.text || ''}
                        onChange={(e) => updateAddElements({
                          exitIntent: { ...addElements.exitIntent!, text: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Button Text</Label>
                      <Input
                        value={addElements.exitIntent?.buttonText || ''}
                        onChange={(e) => updateAddElements({
                          exitIntent: { ...addElements.exitIntent!, buttonText: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky CTA Bar */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="stickyCtaEnabled"
                    checked={addElements.stickyCta?.enabled || false}
                    onChange={(e) => updateAddElements({
                      stickyCta: {
                        ...addElements.stickyCta,
                        enabled: e.target.checked,
                        text: addElements.stickyCta?.text || 'Limited Time Offer!',
                        buttonText: addElements.stickyCta?.buttonText || 'Get Started Now',
                        position: addElements.stickyCta?.position || 'bottom',
                      }
                    })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="stickyCtaEnabled" className="font-medium cursor-pointer">
                    Sticky CTA Bar
                  </Label>
                </div>
                {addElements.stickyCta?.enabled && (
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Text</Label>
                        <Input
                          value={addElements.stickyCta?.text || ''}
                          onChange={(e) => updateAddElements({
                            stickyCta: { ...addElements.stickyCta!, text: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Position</Label>
                        <Select
                          value={addElements.stickyCta?.position || 'bottom'}
                          onValueChange={(v) => updateAddElements({
                            stickyCta: { ...addElements.stickyCta!, position: v as 'top' | 'bottom' }
                          })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Top</SelectItem>
                            <SelectItem value="bottom">Bottom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Button Text</Label>
                      <Input
                        value={addElements.stickyCta?.buttonText || ''}
                        onChange={(e) => updateAddElements({
                          stickyCta: { ...addElements.stickyCta!, buttonText: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
