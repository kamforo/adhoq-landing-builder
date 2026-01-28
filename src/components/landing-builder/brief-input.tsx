'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Sparkles, Loader2 } from 'lucide-react';

const EXAMPLE_PROMPTS = [
  'Quiz funnel for adult dating with 5 questions about preferences',
  'Single-page countdown CTA with scarcity and social proof for casual dating',
  'Multi-step quiz prelander for mainstream dating targeting 40+ women',
  'Bold, urgent hookup funnel with age verification and location qualifier',
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
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onChange(prompt)}
                className="text-xs px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/30 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt}
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
