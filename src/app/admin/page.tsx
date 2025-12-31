'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  Upload,
  Loader2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import Link from 'next/link';

type Variation = {
  id: string;
  number: number;
  html: string;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  status: 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
  vertical: string | null;
  language: string;
  country: string;
  sourceUrl: string | null;
  trackingUrl: string | null;
  createdAt: string;
  updatedAt: string;
  variations: Variation[];
  _count?: { variations: number };
};

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects?limit=100');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll for updates on generating projects
  useEffect(() => {
    fetchProjects();

    // Poll every 5 seconds for status updates
    const interval = setInterval(() => {
      const hasGenerating = projects.some(p => p.status === 'GENERATING');
      if (hasGenerating) {
        fetchProjects();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProjects, projects]);

  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          sourceUrl: newProjectUrl.trim() || undefined,
        }),
      });

      if (response.ok) {
        const project = await response.json();
        setProjects(prev => [project, ...prev]);
        setNewProjectName('');
        setNewProjectUrl('');
        setIsNewProjectDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Start generation for a project
  const handleStartGeneration = async (projectId: string) => {
    // Update status to GENERATING immediately for UI feedback
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId ? { ...p, status: 'GENERATING' as const } : p
      )
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert status on error
        setProjects(prev =>
          prev.map(p =>
            p.id === projectId ? { ...p, status: 'FAILED' as const } : p
          )
        );
      }
      // On success, the polling will pick up the new status
    } catch (error) {
      console.error('Failed to start generation:', error);
      setProjects(prev =>
        prev.map(p =>
          p.id === projectId ? { ...p, status: 'FAILED' as const } : p
        )
      );
    }
  };

  // Download variation
  const handleDownload = async (project: Project, variation: Variation) => {
    const blob = new Blob([variation.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-v${variation.number}.html`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  // Get status badge color
  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'GENERATING':
        return (
          <Badge className="bg-yellow-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Generating
          </Badge>
        );
      case 'FAILED':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'ARCHIVED':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  // Filter projects by tab
  const filteredProjects = projects.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'generating') return p.status === 'GENERATING';
    if (activeTab === 'completed') return p.status === 'COMPLETED';
    if (activeTab === 'draft') return p.status === 'DRAFT';
    return true;
  });

  // Count by status
  const statusCounts = {
    all: projects.length,
    generating: projects.filter(p => p.status === 'GENERATING').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    draft: projects.filter(p => p.status === 'DRAFT').length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Manage your landing page projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchProjects}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Start a new landing page project. You can upload a source page or start from scratch.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        placeholder="My Landing Page"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="url">Source URL (optional)</Label>
                      <Input
                        id="url"
                        value={newProjectUrl}
                        onChange={e => setNewProjectUrl(e.target.value)}
                        placeholder="https://example.com/landing-page"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProject} disabled={isCreating || !newProjectName.trim()}>
                      {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Link href="/">
                <Button variant="ghost">
                  <Upload className="h-4 w-4 mr-2" />
                  Builder
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">
              All ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger value="generating">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Generating ({statusCounts.generating})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({statusCounts.completed})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts ({statusCounts.draft})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No projects found</p>
            <Button onClick={() => setIsNewProjectDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {/* Project Details */}
                  <div className="text-sm text-muted-foreground space-y-1 mb-4">
                    {project.vertical && (
                      <p>Vertical: <span className="text-foreground">{project.vertical}</span></p>
                    )}
                    <p>Language: <span className="text-foreground">{project.language.toUpperCase()}</span></p>
                    {project.trackingUrl && (
                      <p className="truncate">
                        Tracking: <span className="text-foreground">{project.trackingUrl}</span>
                      </p>
                    )}
                  </div>

                  {/* Variations Preview */}
                  {project.variations && project.variations.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {project.variations.length} Variation(s)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {project.variations.slice(0, 4).map(variation => (
                          <div
                            key={variation.id}
                            className="relative aspect-[9/16] bg-muted rounded-md overflow-hidden border cursor-pointer group"
                            onClick={() => setPreviewHtml(variation.html)}
                          >
                            <iframe
                              srcDoc={variation.html}
                              className="w-[300%] h-[300%] origin-top-left scale-[0.333] pointer-events-none"
                              title={`Variation ${variation.number}`}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                              V{variation.number}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No variations generated yet
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2 pt-4 border-t">
                  {project.status === 'DRAFT' && (
                    <Link href={`/?project=${project.id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full">
                        <Upload className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                    </Link>
                  )}
                  {project.status === 'COMPLETED' && project.variations?.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewHtml(project.variations[0].html)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(project, project.variations[0])}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                  {project.status === 'GENERATING' && (
                    <Button variant="outline" size="sm" disabled className="flex-1">
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Processing...
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Landing Page Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-md border">
            <iframe
              srcDoc={previewHtml || ''}
              className="w-full h-full"
              title="Preview"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewHtml(null)}>
              Close
            </Button>
            {previewHtml && (
              <Button
                onClick={() => {
                  const blob = new Blob([previewHtml], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'landing-page.html';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
