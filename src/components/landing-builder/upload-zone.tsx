'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UploadZoneProps {
  onParse: (data: { type: 'url' | 'file'; value: string | File }) => void;
  isLoading: boolean;
}

export function UploadZone({ onParse, isLoading }: UploadZoneProps) {
  const [url, setUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onParse({ type: 'url', value: url.trim() });
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onParse({ type: 'file', value: e.dataTransfer.files[0] });
      }
    },
    [onParse]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onParse({ type: 'file', value: e.target.files[0] });
    }
  };

  return (
    <Card className="p-6">
      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="url">From URL</TabsTrigger>
          <TabsTrigger value="file">Upload File</TabsTrigger>
        </TabsList>

        <TabsContent value="url">
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                Landing Page URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/landing-page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !url.trim()} className="w-full">
              {isLoading ? 'Parsing...' : 'Parse Landing Page'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="file">
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".html,.htm,.zip"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            <div className="space-y-2">
              <div className="text-4xl">📁</div>
              <p className="text-sm font-medium">
                {dragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports .html, .htm, or .zip files
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
