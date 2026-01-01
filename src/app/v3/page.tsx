'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UploadZone,
  ParsedSummary,
} from '@/components/landing-builder';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Upload,
  Search,
  PenTool,
  Hammer,
  CheckCircle,
  Wrench,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import type { ParsedLandingPage } from '@/types';

type Step = 'upload' | 'analyze' | 'architect' | 'build' | 'qa' | 'repair' | 'complete';

type Project = {
  id: string;
  name: string;
  status: string;
  pipelineVersion: string;
  sourceUrl?: string | null;
  sourceHtml?: string | null;
  analysis?: unknown;
  architectPlan?: unknown;
  qaResults?: unknown;
};

const STEPS: { id: Step; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'upload', label: 'Upload', icon: Upload, description: 'Upload source page' },
  { id: 'analyze', label: 'Analyze', icon: Search, description: 'AI extracts components' },
  { id: 'architect', label: 'Architect', icon: PenTool, description: 'Plan LP structure' },
  { id: 'build', label: 'Build', icon: Hammer, description: 'Generate HTML' },
  { id: 'qa', label: 'QA', icon: CheckCircle, description: 'Validate output' },
  { id: 'repair', label: 'Repair', icon: Wrench, description: 'Fix issues' },
  { id: 'complete', label: 'Complete', icon: Sparkles, description: 'Download LP' },
];

export default function V3BuilderPage() {
  const searchParams = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>('upload');
  const [parsedPage, setParsedPage] = useState<ParsedLandingPage | null>(null);

  // Load project from URL
  const loadProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);

        // Set step based on project state
        if (data.sourceHtml) {
          setStep('analyze');
        }
        if (data.analysis) {
          setStep('architect');
        }
        if (data.architectPlan) {
          setStep('build');
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId) {
      loadProject(projectId);
    } else {
      setIsLoading(false);
    }
  }, [searchParams, loadProject]);

  // Handle page parsed
  const handlePageParsed = async (parsed: ParsedLandingPage) => {
    setParsedPage(parsed);

    // Update project with source HTML
    if (project) {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: parsed.sourceUrl || null,
          sourceHtml: parsed.html,
        }),
      });
    }

    setStep('analyze');
  };

  // Get current step index
  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">No project selected</p>
            <Link href="/admin">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-purple-50 dark:bg-purple-950/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <h1 className="text-xl font-bold">{project.name}</h1>
                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                    V3 Architect
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Analyzer → Architect → Builder → QA → Repair
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isComplete = index < currentStepIndex;
              const isFuture = index > currentStepIndex;

              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        h-10 w-10 rounded-full flex items-center justify-center
                        ${isActive ? 'bg-purple-600 text-white' : ''}
                        ${isComplete ? 'bg-green-500 text-white' : ''}
                        ${isFuture ? 'bg-muted text-muted-foreground' : ''}
                      `}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Source Page
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UploadZone onPageParsed={handlePageParsed} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Analyze */}
        {step === 'analyze' && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Analyzing Page...
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parsedPage && <ParsedSummary parsed={parsedPage} />}

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    <div>
                      <p className="font-medium">AI Analyzer is extracting components...</p>
                      <p className="text-sm text-muted-foreground">
                        Detecting headlines, CTAs, persuasion elements, and styles
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setStep('architect')} className="bg-purple-600 hover:bg-purple-700">
                    Continue to Architect
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Architect */}
        {step === 'architect' && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-purple-600" />
                  Architect Agent
                  <Badge variant="outline" className="border-purple-300">New in V3</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-4">
                    Planning Landing Page Structure
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      <span>Deciding optimal number of steps...</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4" />
                      <span>Choosing persuasion elements...</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4" />
                      <span>Planning component placement...</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4" />
                      <span>Selecting conversion strategy...</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setStep('build')} className="bg-purple-600 hover:bg-purple-700">
                    Continue to Builder
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Build */}
        {step === 'build' && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hammer className="h-5 w-5" />
                  Builder Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <div>
                      <p className="font-medium">Generating HTML based on Architect&apos;s plan...</p>
                      <p className="text-sm text-muted-foreground">
                        Building responsive, self-contained landing page
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setStep('qa')} className="bg-purple-600 hover:bg-purple-700">
                    Continue to QA
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: QA */}
        {step === 'qa' && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  QA Agent
                  <Badge variant="outline" className="border-purple-300">New in V3</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-4">
                    Validating Generated Page
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      <span>Checking HTML structure...</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4" />
                      <span>Testing JavaScript functionality...</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4" />
                      <span>Verifying buttons and links...</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4" />
                      <span>Checking mobile responsiveness...</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep('repair')}>
                    <Wrench className="h-4 w-4 mr-2" />
                    Fix Issues
                  </Button>
                  <Button onClick={() => setStep('complete')} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    All Good - Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 6: Repair */}
        {step === 'repair' && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-purple-600" />
                  Repair Agent
                  <Badge variant="outline" className="border-purple-300">New in V3</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                      Issues Found
                    </h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                      <li>Button click handler not working on step 3</li>
                      <li>Timer not starting on page load</li>
                    </ul>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Describe additional issues (optional)</label>
                    <Input
                      placeholder="e.g., The countdown timer shows wrong time format..."
                      className="mt-2"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep('qa')}>
                      Back to QA
                    </Button>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Wrench className="h-4 w-4 mr-2" />
                      Fix All Issues
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 7: Complete */}
        {step === 'complete' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-500" />
                  Generation Complete!
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Your Landing Page is Ready</h3>
                <p className="text-muted-foreground mb-6">
                  The V3 pipeline has successfully generated and validated your landing page.
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline">
                    Preview
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Download HTML
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
