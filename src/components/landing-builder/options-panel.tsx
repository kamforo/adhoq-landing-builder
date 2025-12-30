'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { GenerationOptions, TextHandling, ImageHandling, LinkHandling, StyleHandling } from '@/types';

interface OptionsPanelProps {
  options: Partial<GenerationOptions>;
  onChange: (options: Partial<GenerationOptions>) => void;
}

export function OptionsPanel({ options, onChange }: OptionsPanelProps) {
  const updateOption = <K extends keyof GenerationOptions>(
    key: K,
    value: GenerationOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Generation Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            How AI should modify the visual appearance
          </p>
        </div>

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
      </CardContent>
    </Card>
  );
}
