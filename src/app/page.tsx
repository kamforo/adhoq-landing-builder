'use client';

import { useState } from 'react';
import { UploadZone, OptionsPanel, LinkEditor, ParsedSummary, Preview } from '@/components/landing-builder';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ParsedLandingPage, GenerationOptions, GenerationResult, DetectedLink } from '@/types';

type Step = 'upload' | 'configure' | 'generate' | 'preview';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // State for parsed page
  const [parsedPage, setParsedPage] = useState<ParsedLandingPage | null>(null);

  // State for generation options
  const [options, setOptions] = useState<Partial<GenerationOptions>>({
    textHandling: 'rewrite-slight',  // Default to rewriting text
    imageHandling: 'keep',
    linkHandling: 'keep',
    styleHandling: 'keep',  // Default to keeping original styles
    variationCount: 1,
    variationStyle: 'moderate',
    creativity: 0.7,
    removeTrackingCodes: false,
  });

  // State for generated variations
  const [variations, setVariations] = useState<GenerationResult[]>([]);

  // Handle parse from URL or file
  const handleParse = async (data: { type: 'url' | 'file'; value: string | File }) => {
    setIsLoading(true);
    setError(null);
    setProgress(10);

    try {
      let response: Response;

      if (data.type === 'url') {
        response = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: data.value }),
        });
      } else {
        const formData = new FormData();
        formData.append('file', data.value as File);
        response = await fetch('/api/parse', {
          method: 'POST',
          body: formData,
        });
      }

      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse landing page');
      }

      const parsed = await response.json();
      setParsedPage(parsed);
      setProgress(100);
      setStep('configure');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // Handle link updates
  const handleLinksChange = (links: DetectedLink[]) => {
    if (parsedPage) {
      setParsedPage({ ...parsedPage, links });
    }
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!parsedPage) return;

    setIsLoading(true);
    setError(null);
    setProgress(10);
    setStep('generate');

    try {
      setProgress(30);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePage: parsedPage,
          options,
        }),
      });

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate variations');
      }

      const result = await response.json();
      setVariations(result.variations);
      setProgress(100);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('configure');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (variations.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variations,
          projectName: parsedPage?.title || 'landing-pages',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create download');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'landing-pages.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to start
  const handleReset = () => {
    setStep('upload');
    setParsedPage(null);
    setVariations([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Adhoq Landing Page Builder</h1>
              <p className="text-sm text-muted-foreground">
                Generate landing page variations with AI
              </p>
            </div>
            {step !== 'upload' && (
              <Button variant="outline" onClick={handleReset}>
                Start Over
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {isLoading && (
        <div className="container mx-auto px-4 py-2">
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="container mx-auto px-4 py-2">
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <UploadZone onParse={handleParse} isLoading={isLoading} />
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 'configure' && parsedPage && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ParsedSummary page={parsedPage} />
              <LinkEditor
                links={parsedPage.links}
                onLinksChange={handleLinksChange}
              />
            </div>
            <div className="space-y-6">
              <OptionsPanel options={options} onChange={setOptions} />
              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Generating...' : 'Generate Variations'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generate (Loading State) */}
        {step === 'generate' && (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="text-xl font-semibold mb-2">Generating Variations</h2>
            <p className="text-muted-foreground mb-4">
              AI is creating {options.variationCount} variation(s) of your landing page...
            </p>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && variations.length > 0 && (
          <Preview
            variations={variations}
            onDownload={handleDownload}
            isDownloading={isLoading}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Adhoq Landing Page Builder - Powered by Grok AI
        </div>
      </footer>
    </div>
  );
}
