'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { GenerationResult } from '@/types';

interface PreviewProps {
  variations: GenerationResult[];
  onDownload: () => void;
  isDownloading: boolean;
}

export function Preview({ variations, onDownload, isDownloading }: PreviewProps) {
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'changes'>('preview');

  const currentVariation = variations[selectedVariation];

  if (!currentVariation) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Generated Variations ({variations.length})
          </CardTitle>
          <Button onClick={onDownload} disabled={isDownloading}>
            {isDownloading ? 'Preparing...' : 'Download All'}
          </Button>
        </div>

        {/* Variation Selector */}
        {variations.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {variations.map((_, index) => (
              <Button
                key={index}
                variant={selectedVariation === index ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedVariation(index)}
              >
                Variation {index + 1}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList className="mb-4">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">HTML Code</TabsTrigger>
            <TabsTrigger value="changes">
              Changes
              {currentVariation.changes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {currentVariation.changes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-0">
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={currentVariation.html}
                className="w-full h-[600px]"
                title={`Preview Variation ${selectedVariation + 1}`}
                sandbox="allow-same-origin"
              />
            </div>
          </TabsContent>

          <TabsContent value="code" className="mt-0">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => {
                  navigator.clipboard.writeText(currentVariation.html);
                }}
              >
                Copy
              </Button>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-xs">
                <code>{currentVariation.html}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="changes" className="mt-0">
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {currentVariation.changes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No changes were made to this variation
                </p>
              ) : (
                currentVariation.changes.map((change, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{change.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {change.selector}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{change.reason}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-red-50 p-2 rounded">
                        <p className="font-medium text-red-700 mb-1">Original</p>
                        <p className="text-red-900 break-words">
                          {change.originalValue.substring(0, 200)}
                          {change.originalValue.length > 200 ? '...' : ''}
                        </p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="font-medium text-green-700 mb-1">New</p>
                        <p className="text-green-900 break-words">
                          {change.newValue.substring(0, 200)}
                          {change.newValue.length > 200 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
