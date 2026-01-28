'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Sparkles, Loader2 } from 'lucide-react';

const EXAMPLE_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Quiz Funnel - Preferences',
    prompt: 'We are an Adult dating company. Build me a quiz funnel prelander. The quiz should ask users about their goals, interests and preferences, and show personalized results with influence factors. Use a modern, clean design with an erotic color palette.',
  },
  {
    label: 'Compatibility Quiz',
    prompt: 'We are an Adult dating company. Build a 6-question compatibility quiz prelander that asks about age range, body type preference, distance, and relationship goals. Show a compatibility percentage at the end with a pulsing CTA. Dark theme with red and pink accents.',
  },
  {
    label: 'Multi-Step Profile Builder',
    prompt: 'We are an Adult dating company. Build a multi-step profile setup prelander with 5 steps: gender, looking for, age range, interests, and photo preference. Include a progress bar and motivational micro-copy between steps. Modern gradient design with purple and magenta tones.',
  },
  {
    label: 'Swipe-Style Cards',
    prompt: 'We are an Adult dating company. Create a swipe-style prelander that shows fake profile cards the user can like or skip, then prompts them to sign up to see who matched. Include a match counter and excitement-building animations. Bold, app-like mobile design.',
  },
  {
    label: 'Late-Night Hookup',
    prompt: 'We are an Adult dating company. Create a bold, direct hookup prelander targeting nighttime users. Feature a "Who\'s online near you" section with blurred profile previews, a quick 3-question intent quiz, and a pulsing "Start Chatting" CTA. Dark mode with hot pink highlights.',
  },
];

interface BriefInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function BriefInput({ value, onChange, onGenerate, isLoading }: BriefInputProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-500" />
          Describe Your Landing Page
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={"Describe the landing page you want to create...\n\nFor example: Build me a quiz funnel prelander for adult dating with 5 questions about body type, age preference, and location. Include a progress bar, urgency countdown, and social proof badges."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={7}
          className="resize-none"
        />

        {/* Example prompts */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => onChange(example.prompt)}
                className="text-xs px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/30 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={onGenerate}
          disabled={isLoading || !value.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate from Brief
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
