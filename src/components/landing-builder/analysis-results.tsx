'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { PageAnalysis } from '@/types/analyzer';

interface AnalysisResultsProps {
  analysis: PageAnalysis;
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const lpFlow = analysis.lpFlow;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Page Analysis
          <Badge variant="secondary" className="text-xs">
            {analysis.sections.length} sections
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* LP Flow */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            LP Flow
            <Badge variant="default" className="text-xs">
              {lpFlow.type}
            </Badge>
            {lpFlow.framework && (
              <Badge variant="outline" className="text-xs">
                {lpFlow.framework}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {lpFlow.stages.length} steps
            </Badge>
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">CTA:</span>
              <span className="font-medium">"{lpFlow.ctaStrategy.primaryCta}"</span>
              <Badge variant="outline" className="text-xs">
                {lpFlow.ctaStrategy.ctaFrequency}
              </Badge>
            </div>
            {/* CTA URL - show warning if missing */}
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">Redirect URL:</span>
              {lpFlow.ctaStrategy.primaryCtaUrl ? (
                <span className="font-mono text-green-600 dark:text-green-400 break-all text-xs">
                  {lpFlow.ctaStrategy.primaryCtaUrl.slice(0, 60)}
                  {lpFlow.ctaStrategy.primaryCtaUrl.length > 60 ? '...' : ''}
                </span>
              ) : (
                <span className="text-red-500 font-medium">
                  ⚠️ Not detected - Enter manually in options below
                </span>
              )}
            </div>
            {/* For multi-step flows, show stages with messages */}
            {lpFlow.type === 'multi-step' ? (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {lpFlow.stages.map((stage) => (
                  <div
                    key={stage.sectionId}
                    className="flex items-start gap-2 px-2 py-1 bg-white dark:bg-gray-800 rounded"
                  >
                    <span className="text-muted-foreground shrink-0">{stage.order}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{stage.sectionType}</span>
                        <span className="text-muted-foreground">({stage.purpose})</span>
                        {stage.hasCtaButton && <span className="text-green-600">●</span>}
                      </div>
                      {stage.keyMessage && (
                        <p className="text-muted-foreground truncate" title={stage.keyMessage}>
                          {stage.keyMessage.slice(0, 50)}{stage.keyMessage.length > 50 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {lpFlow.stages.slice(0, 6).map((stage) => (
                  <div
                    key={stage.sectionId}
                    className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs"
                  >
                    <span className="text-muted-foreground">{stage.order}.</span>
                    <span>{stage.sectionType}</span>
                    {stage.hasCtaButton && <span className="text-green-600">●</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Sections */}
        <div>
          <h4 className="text-sm font-medium mb-2">Detected Sections</h4>
          <div className="flex flex-wrap gap-1">
            {analysis.sections.map((section) => (
              <Badge key={section.id} variant="outline" className="text-xs">
                {section.type}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Components */}
        <div>
          <h4 className="text-sm font-medium mb-2">Components Found</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Headlines</span>
              <Badge variant="secondary">{analysis.components.headlines.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buttons/CTAs</span>
              <Badge variant="secondary">{analysis.components.buttons.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Images</span>
              <Badge variant="secondary">{analysis.components.images.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forms</span>
              <Badge variant="secondary">{analysis.components.forms.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lists</span>
              <Badge variant="secondary">{analysis.components.lists.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Videos</span>
              <Badge variant="secondary">{analysis.components.videos.length}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Persuasion Elements */}
        <div>
          <h4 className="text-sm font-medium mb-2">Persuasion Elements</h4>
          {analysis.persuasionElements.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {analysis.persuasionElements.map((el, i) => (
                <Badge
                  key={i}
                  variant={el.strength === 'strong' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {el.type}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No persuasion elements detected</p>
          )}
        </div>

        <Separator />

        {/* Style Info */}
        <div>
          <h4 className="text-sm font-medium mb-2">Style Information</h4>
          <div className="space-y-2">
            {/* Colors */}
            <div>
              <span className="text-xs text-muted-foreground">Primary Colors</span>
              <div className="flex gap-1 mt-1">
                {analysis.styleInfo.colors.primary.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {analysis.styleInfo.colors.primary.length === 0 && (
                  <span className="text-xs text-muted-foreground">None detected</span>
                )}
              </div>
            </div>
            {/* CTA Colors */}
            {analysis.styleInfo.colors.cta.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">CTA Colors</span>
                <div className="flex gap-1 mt-1">
                  {analysis.styleInfo.colors.cta.slice(0, 3).map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Typography */}
            <div>
              <span className="text-xs text-muted-foreground">Fonts</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.styleInfo.typography.headingFonts.slice(0, 2).map((font, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {font}
                  </Badge>
                ))}
                {analysis.styleInfo.typography.headingFonts.length === 0 && (
                  <span className="text-xs text-muted-foreground">System fonts</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Headlines Preview */}
        {analysis.components.headlines.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Main Headlines</h4>
              <div className="space-y-1">
                {analysis.components.headlines.slice(0, 3).map((headline, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate" title={headline.text}>
                    {headline.level}: {headline.text.slice(0, 60)}{headline.text.length > 60 ? '...' : ''}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
