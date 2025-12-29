'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DetectedLink } from '@/types';

interface LinkEditorProps {
  links: DetectedLink[];
  onLinksChange: (links: DetectedLink[]) => void;
}

const linkTypeBadgeColors: Record<string, string> = {
  affiliate: 'bg-orange-100 text-orange-800',
  tracking: 'bg-yellow-100 text-yellow-800',
  redirect: 'bg-purple-100 text-purple-800',
  cta: 'bg-green-100 text-green-800',
  navigation: 'bg-blue-100 text-blue-800',
  external: 'bg-gray-100 text-gray-800',
  internal: 'bg-slate-100 text-slate-800',
};

export function LinkEditor({ links, onLinksChange }: LinkEditorProps) {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLinks = links.filter((link) => {
    if (filter !== 'all' && link.type !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        link.originalUrl.toLowerCase().includes(query) ||
        link.anchorText?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const updateLink = (id: string, updates: Partial<DetectedLink>) => {
    const updated = links.map((link) =>
      link.id === id ? { ...link, ...updates } : link
    );
    onLinksChange(updated);
  };

  const linkTypes = ['all', ...new Set(links.map((l) => l.type))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Detected Links ({links.length})</span>
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          {linkTypes.map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type)}
            >
              {type === 'all' ? 'All' : type}
              {type !== 'all' && (
                <span className="ml-1 text-xs">
                  ({links.filter((l) => l.type === type).length})
                </span>
              )}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search links..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-2"
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No links found matching your criteria
            </p>
          ) : (
            filteredLinks.map((link) => (
              <div
                key={link.id}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className={linkTypeBadgeColors[link.type] || ''}
                      >
                        {link.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(link.confidence * 100)}% confident
                      </span>
                    </div>
                    {link.anchorText && (
                      <p className="text-sm font-medium truncate">
                        "{link.anchorText}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {link.originalUrl}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {link.detectionReason}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Replacement URL (optional)</label>
                  <Input
                    placeholder="Leave empty to keep original"
                    value={link.replacementUrl || ''}
                    onChange={(e) =>
                      updateLink(link.id, { replacementUrl: e.target.value || undefined })
                    }
                    className="text-sm"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
