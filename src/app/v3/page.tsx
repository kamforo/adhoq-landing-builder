'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  UploadZone,
  ParsedSummary,
  QuickSettings,
  AdvancedSettings,
} from '@/components/landing-builder';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Upload,
  Search,
  PenTool,
  Hammer,
  CheckCircle,
  XCircle,
  Wrench,
  Loader2,
  ChevronRight,
  Download,
  Eye,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { ParsedLandingPage, GenerationOptions } from '@/types';
import type { ComponentAnalysis } from '@/types/component-analysis';

const DEFAULT_V3_OPTIONS: Partial<GenerationOptions> = {
  variationCount: 1,
  styleHandling: 'generate-new',
  colorScheme: 'generate-matching',
  layoutStyle: 'mobile-optimized',
  textHandling: 'rewrite-slight',
  linkHandling: 'replace-all',
  vertical: 'auto',
  tone: 'auto',
  targetAge: 'all',
  country: 'US',
  language: 'en',
  creativity: 0.7,
};

type Step = 'upload' | 'analyze' | 'architect' | 'build' | 'qa' | 'repair' | 'complete';
type ParseInput = { type: 'url' | 'file'; value: string | File };

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

type QAResultSummary = {
  id: string;
  passed: boolean;
  score: number;
  criticalCount: number;
  majorCount: number;
  summary: string;
};

type BlueprintSummary = {
  id: string;
  totalSteps: number;
  sections: { stepNumber: number; type: string; title: string }[];
  visualDirection: {
    colorPalette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
  };
  conversionStrategy: {
    mainHook: string;
    valueProposition: string;
    primaryPersuasion: string[];
    urgencyTactics: string[];
  };
};

type GeneratedVariation = {
  id: string;
  variationNumber: number;
  html: string;
  qaResult?: {
    passed: boolean;
    score: number;
    criticalCount: number;
    majorCount: number;
    issues?: { id: string; severity: string; title: string; description: string }[];
  };
  repairResult?: {
    fixedCount: number;
    summary: string;
  };
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
  const [isParsing, setIsParsing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [parsedPage, setParsedPage] = useState<ParsedLandingPage | null>(null);
  const [analysis, setAnalysis] = useState<ComponentAnalysis | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintSummary | null>(null);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [qaResults, setQaResults] = useState<QAResultSummary[]>([]);
  const [userIssueDescription, setUserIssueDescription] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [options, setOptions] = useState<Partial<GenerationOptions>>(DEFAULT_V3_OPTIONS);

  // Load project from URL
  const loadProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);

        // Restore parsedPage from project if it has sourceHtml
        if (data.sourceHtml) {
          setParsedPage({
            id: data.id,
            html: data.sourceHtml,
            sourceUrl: data.sourceUrl || undefined,
            title: data.name || 'Untitled',
            parsedAt: new Date(),
            originalSize: data.sourceHtml.length,
            textContent: [],
            links: [],
            assets: [],
            forms: [],
            trackingCodes: [],
          });
          setStep('analyze');
        }

        // Restore analysis if available
        if (data.analysis) {
          setAnalysis(data.analysis);
          setStep('architect');
        }

        // Restore blueprint if available
        if (data.architectPlan) {
          setBlueprint(data.architectPlan);
          setStep('build');
        }

        // Restore QA results if available
        if (data.qaResults) {
          setQaResults([data.qaResults]);
          setStep('complete');
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

  // Handle parse request - then auto-start generation
  const handleParse = async (input: ParseInput) => {
    setIsParsing(true);

    try {
      let response;

      if (input.type === 'url') {
        response = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input.value }),
        });
      } else {
        const formData = new FormData();
        formData.append('file', input.value);
        response = await fetch('/api/parse', {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error('Failed to parse page');
      }

      const parsed: ParsedLandingPage = await response.json();
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

      setIsParsing(false);

      // Auto-start V3 generation after parsing
      runV3GenerationWithPage(parsed);
    } catch (error) {
      console.error('Parse error:', error);
      alert('Failed to parse page. Please try again.');
      setIsParsing(false);
    }
  };

  // Run the full V3 generation workflow with a specific page
  const runV3GenerationWithPage = async (page: ParsedLandingPage) => {
    setIsGenerating(true);
    setGenerationError(null);
    setStep('analyze');

    try {
      // Call V3 API which runs the full workflow
      const response = await fetch('/api/v3/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePage: page,
          options: options,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const result = await response.json();

      // Update state with results progressively
      if (result.analysis) {
        setAnalysis(result.analysis);
      }

      // Move to architect step
      setStep('architect');

      if (result.blueprint) {
        setBlueprint(result.blueprint);
      }

      // Move to build step
      setStep('build');

      if (result.variations && result.variations.length > 0) {
        setVariations(result.variations);
      }

      // Move to QA step
      setStep('qa');

      if (result.qaResults) {
        setQaResults(result.qaResults);

        // Check if any QA failed with critical issues
        const hasFailures = result.qaResults.some((qa: QAResultSummary) => qa.criticalCount > 0);
        if (hasFailures) {
          setStep('repair');
        } else {
          setStep('complete');
        }
      } else {
        setStep('complete');
      }

      // Update project with results
      if (project && result.variations?.[0]) {
        await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            generatedHtml: result.variations[0].html,
            analysis: result.analysis,
            architectPlan: result.blueprint,
            qaResults: result.qaResults?.[0],
          }),
        });
      }
    } catch (error) {
      console.error('V3 generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Generation failed');
      setStep('analyze'); // Go back to analyze on error
    } finally {
      setIsGenerating(false);
    }
  };

  // Run V3 generation with current parsedPage state
  const runV3Generation = () => {
    if (parsedPage) {
      runV3GenerationWithPage(parsedPage);
    }
  };

  // Run repair on a variation
  const runRepair = async (variationIndex: number) => {
    if (!variations[variationIndex]) return;

    setIsRepairing(true);

    try {
      const response = await fetch('/api/v3/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: variations[variationIndex].html,
          blueprint,
          qaResult: variations[variationIndex].qaResult,
          userIssue: userIssueDescription ? { description: userIssueDescription } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Repair failed');
      }

      const result = await response.json();

      // Update variation with repaired HTML
      const updatedVariations = [...variations];
      updatedVariations[variationIndex] = {
        ...updatedVariations[variationIndex],
        html: result.html,
        repairResult: {
          fixedCount: result.fixedCount,
          summary: result.summary,
        },
      };
      setVariations(updatedVariations);

      // Clear user input and move to complete
      setUserIssueDescription('');
      setStep('complete');
    } catch (error) {
      console.error('Repair error:', error);
      alert('Repair failed. Please try again.');
    } finally {
      setIsRepairing(false);
    }
  };

  // Download HTML file
  const downloadHtml = (html: string, filename: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                      {isActive && isGenerating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
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
        {/* Error Display */}
        {generationError && (
          <div className="max-w-2xl mx-auto mb-6">
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
                  <XCircle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Generation Failed</p>
                    <p className="text-sm">{generationError}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setGenerationError(null);
                    setStep('upload');
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Upload Zone */}
              <div>
                <UploadZone onParse={handleParse} isLoading={isParsing} />
              </div>

              {/* Right: Settings */}
              <div className="space-y-4">
                <QuickSettings
                  options={options}
                  onChange={setOptions}
                />
                <AdvancedSettings
                  options={options}
                  onChange={setOptions}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Analyze */}
        {step === 'analyze' && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Analyze Source Page
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parsedPage && <ParsedSummary page={parsedPage} />}

                {analysis ? (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Analysis Complete</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Components:</span>
                        <span className="ml-2 font-medium">{analysis.components.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vertical:</span>
                        <span className="ml-2 font-medium capitalize">{analysis.vertical}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tone:</span>
                        <span className="ml-2 font-medium capitalize">{analysis.tone}</span>
                      </div>
                    </div>
                  </div>
                ) : isGenerating ? (
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
                ) : (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={runV3Generation} className="bg-purple-600 hover:bg-purple-700">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start V3 Generation
                    </Button>
                  </div>
                )}
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
                {blueprint ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Blueprint Created</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Structure ({blueprint.totalSteps} steps)</h4>
                        <div className="space-y-1 text-sm">
                          {blueprint.sections.map(s => (
                            <div key={s.stepNumber} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{s.type}</Badge>
                              <span>Step {s.stepNumber}: {s.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Color Palette</h4>
                        <div className="flex gap-2">
                          {Object.entries(blueprint.visualDirection.colorPalette).map(([name, color]) => (
                            <div key={name} className="text-center">
                              <div
                                className="w-8 h-8 rounded border"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs text-muted-foreground">{name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Conversion Strategy</h4>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Hook:</strong> {blueprint.conversionStrategy.mainHook}</p>
                        <p><strong>Value:</strong> {blueprint.conversionStrategy.valueProposition}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      <div>
                        <p className="font-medium">Planning Landing Page Structure...</p>
                        <p className="text-sm text-muted-foreground">
                          Deciding steps, components, colors, and conversion strategy
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                {variations.length > 0 ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">
                        Generated {variations.length} variation{variations.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ) : (
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
                )}
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
                {qaResults.length > 0 ? (
                  <div className="space-y-4">
                    {qaResults.map((qa, index) => (
                      <div
                        key={qa.id}
                        className={`p-4 rounded-lg border ${
                          qa.passed
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200'
                            : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {qa.passed ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            )}
                            <span className="font-medium">
                              Variation {index + 1}: {qa.passed ? 'Passed' : 'Issues Found'}
                            </span>
                          </div>
                          <Badge variant="outline">Score: {qa.score}/100</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{qa.summary}</p>
                        {!qa.passed && (
                          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                            {qa.criticalCount} critical, {qa.majorCount} major issues
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="flex justify-end gap-2">
                      {qaResults.some(qa => !qa.passed) && (
                        <Button variant="outline" onClick={() => setStep('repair')}>
                          <Wrench className="h-4 w-4 mr-2" />
                          Fix Issues
                        </Button>
                      )}
                      <Button onClick={() => setStep('complete')} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Continue to Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      <div>
                        <p className="font-medium">Validating Generated Page...</p>
                        <p className="text-sm text-muted-foreground">
                          Checking structure, JS functionality, responsiveness
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                  {variations[0]?.qaResult && !variations[0].qaResult.passed && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                        Issues to Fix ({variations[0].qaResult.criticalCount + variations[0].qaResult.majorCount})
                      </h4>
                      {variations[0].qaResult.issues?.slice(0, 5).map(issue => (
                        <div key={issue.id} className="text-sm py-1">
                          <Badge variant="outline" className="mr-2 text-xs">
                            {issue.severity}
                          </Badge>
                          <span className="text-yellow-700 dark:text-yellow-300">{issue.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Describe additional issues (optional)</label>
                    <Textarea
                      placeholder="e.g., The countdown timer shows wrong time format, buttons are too small..."
                      className="mt-2"
                      value={userIssueDescription}
                      onChange={(e) => setUserIssueDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep('complete')}>
                      Skip Repair
                    </Button>
                    <Button
                      onClick={() => runRepair(0)}
                      disabled={isRepairing}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isRepairing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Repairing...
                        </>
                      ) : (
                        <>
                          <Wrench className="h-4 w-4 mr-2" />
                          Fix All Issues
                        </>
                      )}
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
                  The V3 pipeline has successfully generated{variations[0]?.repairResult ? ' and repaired' : ''} your landing page.
                </p>

                {variations[0]?.repairResult && (
                  <div className="mb-6 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-sm">
                    <CheckCircle className="h-4 w-4 inline mr-2 text-green-600" />
                    Fixed {variations[0].repairResult.fixedCount} issues: {variations[0].repairResult.summary}
                  </div>
                )}

                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (variations[0]?.html) {
                        setPreviewHtml(variations[0].html);
                        setPreviewOpen(true);
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      if (variations[0]?.html) {
                        downloadHtml(
                          variations[0].html,
                          `${project.name.replace(/\s+/g, '-').toLowerCase()}-v3.html`
                        );
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download HTML
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="w-full h-[80vh]">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
