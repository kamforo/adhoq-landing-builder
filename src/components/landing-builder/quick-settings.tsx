'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { GenerationOptions, DatingVertical, ToneStyle, TargetAgeGroup, CountryCode, LanguageCode } from '@/types';
import { COUNTRIES, LANGUAGES, getAllCountriesSorted } from '@/types/languages';

interface QuickSettingsProps {
  options: Partial<GenerationOptions>;
  onChange: (options: Partial<GenerationOptions>) => void;
  detectedTrackingUrl?: string;
  detectedVertical?: string;
  detectedTone?: string;
  detectedSteps?: number;
}

export function QuickSettings({
  options,
  onChange,
  detectedTrackingUrl,
  detectedVertical,
  detectedTone,
  detectedSteps,
}: QuickSettingsProps) {
  const updateOption = <K extends keyof GenerationOptions>(
    key: K,
    value: GenerationOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Tracking Link - Most Important */}
        <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <Label htmlFor="ctaUrlOverride" className="font-medium">
            Tracking URL <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ctaUrlOverride"
            type="url"
            placeholder="https://your-tracking-link.com"
            value={options.ctaUrlOverride || ''}
            onChange={(e) => updateOption('ctaUrlOverride', e.target.value)}
            className="font-mono text-sm"
          />
          {detectedTrackingUrl && !options.ctaUrlOverride && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Auto-detected from page
            </p>
          )}
        </div>

        {/* Country Selection */}
        <div className="space-y-2">
          <Label htmlFor="country">Target Country</Label>
          <Select
            value={options.country || 'US'}
            onValueChange={(v) => {
              const countryCode = v as CountryCode;
              const country = COUNTRIES[countryCode];
              onChange({
                ...options,
                country: countryCode,
                language: country.language,
              });
            }}
          >
            <SelectTrigger id="country">
              <SelectValue>
                {options.country && COUNTRIES[options.country] ? (
                  <span>
                    {COUNTRIES[options.country].flag} {COUNTRIES[options.country].name}
                  </span>
                ) : (
                  <span>🇺🇸 United States</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {getAllCountriesSorted().map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {options.language && (
            <p className="text-xs text-muted-foreground">
              Language: {LANGUAGES[options.language]?.nativeName || options.language}
              {LANGUAGES[options.language]?.direction === 'rtl' && ' (RTL)'}
            </p>
          )}
        </div>

        {/* Vertical & Tone - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vertical">Vertical</Label>
            <Select
              value={options.vertical || 'auto'}
              onValueChange={(v) => updateOption('vertical', v as DatingVertical)}
            >
              <SelectTrigger id="vertical">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto {detectedVertical && detectedVertical !== 'auto' && `(${detectedVertical})`}
                </SelectItem>
                <SelectItem value="adult">Adult</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="mainstream">Mainstream</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Select
              value={options.tone || 'auto'}
              onValueChange={(v) => updateOption('tone', v as ToneStyle)}
            >
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto {detectedTone && detectedTone !== 'auto' && `(${detectedTone})`}
                </SelectItem>
                <SelectItem value="playful-flirty">Playful & Flirty</SelectItem>
                <SelectItem value="urgent-exciting">Urgent & Exciting</SelectItem>
                <SelectItem value="intimate-seductive">Intimate & Seductive</SelectItem>
                <SelectItem value="friendly-casual">Friendly & Casual</SelectItem>
                <SelectItem value="bold-confident">Bold & Confident</SelectItem>
                <SelectItem value="romantic-emotional">Romantic & Emotional</SelectItem>
                <SelectItem value="mysterious-intriguing">Mysterious & Intriguing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Target Age & Steps - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetAge">Target Age</Label>
            <Select
              value={options.targetAge || 'all'}
              onValueChange={(v) => updateOption('targetAge', v as TargetAgeGroup)}
            >
              <SelectTrigger id="targetAge">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages (18+)</SelectItem>
                <SelectItem value="30+">30+</SelectItem>
                <SelectItem value="40+">40+</SelectItem>
                <SelectItem value="50+">50+</SelectItem>
                <SelectItem value="60+">60+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stepCount">Steps</Label>
            <Select
              value={String(options.stepCount || 'auto')}
              onValueChange={(v) => updateOption('stepCount', v === 'auto' ? undefined : parseInt(v))}
            >
              <SelectTrigger id="stepCount">
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto {detectedSteps && `(${detectedSteps})`}
                </SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="7">7</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Variations */}
        <div className="space-y-2">
          <Label htmlFor="variationCount">Variations</Label>
          <Select
            value={String(options.variationCount || 1)}
            onValueChange={(v) => updateOption('variationCount', parseInt(v))}
          >
            <SelectTrigger id="variationCount">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
