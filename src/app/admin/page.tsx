'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  Upload,
  Loader2,
  Check,
  X,
  Pencil,
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

// Relative time helper
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

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

    const interval = setInterval(() => {
      const hasGenerating = projects.some(p => p.status === 'GENERATING');
      if (hasGenerating) {
        fetchProjects();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProjects, projects]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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

  // Delete single project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} project(s)?`)) return;

    const deletePromises = Array.from(selectedIds).map(id =>
      fetch(`/api/projects/${id}`, { method: 'DELETE' })
    );

    await Promise.all(deletePromises);
    setProjects(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
  };

  // Bulk download
  const handleBulkDownload = () => {
    const selectedProjects = projects.filter(p => selectedIds.has(p.id));

    selectedProjects.forEach(project => {
      if (project.variations && project.variations.length > 0) {
        project.variations.forEach(variation => {
          const blob = new Blob([variation.html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${project.name}-v${variation.number}.html`;
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(url);
          a.remove();
        });
      }
    });
  };

  // Toggle selection
  const toggleSelection = (projectId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map(p => p.id)));
    }
  };

  // Start inline editing
  const startEditing = (project: Project) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };

  // Save inline edit
  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (response.ok) {
        setProjects(prev =>
          prev.map(p =>
            p.id === editingId ? { ...p, name: editingName.trim() } : p
          )
        );
      }
    } catch (error) {
      console.error('Failed to rename project:', error);
    } finally {
      setEditingId(null);
    }
  };

  // Cancel inline edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Download variation
  const handleDownload = (project: Project, variation: Variation) => {
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

  // Get status badge
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

  // Check if any selected projects have variations (for bulk download)
  const canBulkDownload = Array.from(selectedIds).some(id => {
    const project = projects.find(p => p.id === id);
    return project?.variations && project.variations.length > 0;
  });

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
        {/* Tabs and Bulk Actions */}
        <div className="flex items-center justify-between mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                disabled={!canBulkDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Select All */}
        {filteredProjects.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              checked={selectedIds.size === filteredProjects.length && filteredProjects.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Select all ({filteredProjects.length})
            </span>
          </div>
        )}

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
              <Card
                key={project.id}
                className={`flex flex-col ${selectedIds.has(project.id) ? 'ring-2 ring-primary' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedIds.has(project.id)}
                      onCheckedChange={() => toggleSelection(project.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      {/* Inline Editing */}
                      {editingId === project.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            ref={editInputRef}
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="h-7 text-lg font-semibold"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <CardTitle
                            className="text-lg truncate cursor-pointer hover:text-primary"
                            onClick={() => startEditing(project)}
                          >
                            {project.name}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEditing(project)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Timestamps */}
                      <CardDescription className="text-xs">
                        Updated {getRelativeTime(project.updatedAt)}
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
