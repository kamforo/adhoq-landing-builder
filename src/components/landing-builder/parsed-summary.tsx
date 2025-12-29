'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ParsedLandingPage } from '@/types';

interface ParsedSummaryProps {
  page: ParsedLandingPage;
}

export function ParsedSummary({ page }: ParsedSummaryProps) {
  const stats = [
    { label: 'Text Blocks', value: page.textContent.length, icon: '📝' },
    { label: 'Images', value: page.assets.filter((a) => a.type === 'image').length, icon: '🖼️' },
    { label: 'Links', value: page.links.length, icon: '🔗' },
    { label: 'Forms', value: page.forms.length, icon: '📋' },
    { label: 'Tracking Codes', value: page.trackingCodes.length, icon: '📊' },
  ];

  const linksByType = page.links.reduce((acc, link) => {
    acc[link.type] = (acc[link.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const trackingByType = page.trackingCodes.reduce((acc, code) => {
    acc[code.type] = (acc[code.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Parsed Content</CardTitle>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">{page.title}</p>
          {page.sourceUrl && (
            <p className="truncate text-xs">{page.sourceUrl}</p>
          )}
          {page.sourceFileName && (
            <p className="text-xs">File: {page.sourceFileName}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-3 bg-muted rounded-lg"
            >
              <div className="text-2xl">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Link Types */}
        {Object.keys(linksByType).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Link Types</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(linksByType).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tracking Types */}
        {Object.keys(trackingByType).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Tracking Detected</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(trackingByType).map(([type, count]) => (
                <Badge key={type} variant="secondary">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Text Block Types */}
        {page.textContent.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Content Structure</h4>
            <div className="flex flex-wrap gap-2">
              {['heading', 'paragraph', 'button', 'list-item'].map((type) => {
                const count = page.textContent.filter((t) => t.type === type).length;
                if (count === 0) return null;
                return (
                  <Badge key={type} variant="outline">
                    {type}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Sample Headlines */}
        {page.textContent.filter((t) => t.type === 'heading').length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Headlines</h4>
            <div className="space-y-1">
              {page.textContent
                .filter((t) => t.type === 'heading')
                .slice(0, 5)
                .map((block) => (
                  <p
                    key={block.id}
                    className="text-sm text-muted-foreground truncate"
                  >
                    • {block.originalText}
                  </p>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
