'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BuilderPrompt } from '@/types/component-analysis';

interface PromptPreviewProps {
  prompt: BuilderPrompt;
}

export function PromptPreview({ prompt }: PromptPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Count characters
  const charCount = prompt.fullPrompt.length;
  const wordCount = prompt.fullPrompt.split(/\s+/).length;

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
          <FileText className="h-4 w-4 text-purple-500" />
          <span className="font-medium">Generated Prompt</span>
        </div>
        <Badge variant="outline" className="text-xs font-normal">
          {wordCount.toLocaleString()} words
        </Badge>
      </button>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Prompt Sections Summary */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${prompt.systemContext ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-muted-foreground">System Context</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${prompt.requirements ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-muted-foreground">Requirements</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${prompt.suggestions ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-muted-foreground">Suggestions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${prompt.technicalRequirements ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-muted-foreground">Technical</span>
            </div>
          </div>

          {/* Full Prompt Preview */}
          <div className="relative">
            <div className="absolute right-2 top-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <pre className="p-4 bg-muted/50 rounded-lg text-xs font-mono max-h-80 overflow-auto whitespace-pre-wrap break-words">
              {prompt.fullPrompt}
            </pre>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{charCount.toLocaleString()} characters</span>
            <span>Preview what AI will build</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
