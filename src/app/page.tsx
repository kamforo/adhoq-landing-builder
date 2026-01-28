'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Plus,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  Loader2,
  Check,
  X,
  Pencil,
  FolderOpen,
  FileText,
  Clock,
  Settings,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { QuickSettings, AdvancedSettings } from '@/components/landing-builder';
import { COUNTRIES, LANGUAGES } from '@/types/languages';
import type { GenerationOptions } from '@/types';

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
  pipelineVersion: string;
  vertical: string | null;
  language: string;
  country: string;
  sourceUrl: string | null;
  trackingUrl: string | null;
  options: Record<string, unknown> | null;
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
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // New project form (Classic V1)
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // New V3 project form
  const [newV3ProjectName, setNewV3ProjectName] = useState('');
  const [isCreatingV3, setIsCreatingV3] = useState(false);

  // New V3 scratch project form
  const [newScratchProjectName, setNewScratchProjectName] = useState('');
  const [isCreatingScratch, setIsCreatingScratch] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [previewVariationIndex, setPreviewVariationIndex] = useState(0);

  // View Settings dialog state
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);

  // Clone with New Settings dialog state
  const [cloneProject, setCloneProject] = useState<Project | null>(null);
  const [cloneOptions, setCloneOptions] = useState<Partial<GenerationOptions>>({});
  const [cloneName, setCloneName] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  // Ref to track projects for polling without causing re-renders
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

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

  // Initial fetch and polling
  useEffect(() => {
    fetchProjects();

    const interval = setInterval(() => {
      const hasGenerating = projectsRef.current.some(p => p.status === 'GENERATING');
      if (hasGenerating) {
        fetchProjects();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProjects]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Create new project and go to builder (Classic V1)
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          pipelineVersion: 'v1',
        }),
      });

      if (response.ok) {
        const project = await response.json();
        setNewProjectName('');
        router.push(`/builder?project=${project.id}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      setIsCreating(false);
    }
  };

  // Create new V3 project and go to V3 builder
  const handleCreateV3Project = async () => {
    if (!newV3ProjectName.trim()) return;

    setIsCreatingV3(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newV3ProjectName.trim(),
          pipelineVersion: 'v3',
        }),
      });

      if (response.ok) {
        const project = await response.json();
        setNewV3ProjectName('');
        router.push(`/v3?project=${project.id}`);
      }
    } catch (error) {
      console.error('Failed to create V3 project:', error);
      setIsCreatingV3(false);
    }
  };

  // Create new V3 scratch project and go to V3 builder in scratch mode
  const handleCreateScratchProject = async () => {
    if (!newScratchProjectName.trim()) return;

    setIsCreatingScratch(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newScratchProjectName.trim(),
          pipelineVersion: 'v3',
        }),
      });

      if (response.ok) {
        const project = await response.json();
        setNewScratchProjectName('');
        router.push(`/v3?project=${project.id}&mode=scratch`);
      }
    } catch (error) {
      console.error('Failed to create scratch project:', error);
      setIsCreatingScratch(false);
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
    if (!confirm(`Delete ${selectedIds.size} project(s)?`)) return;

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
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map(p => p.id)));
    }
  };

  // Start inline editing
  const startEditing = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Download all variations for a project
  const handleDownloadProject = (project: Project) => {
    if (!project.variations || project.variations.length === 0) return;

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
  };

  // Preview project variations
  const handlePreviewProject = (project: Project) => {
    if (!project.variations || project.variations.length === 0) return;
    setPreviewProject(project);
    setPreviewVariationIndex(0);
  };

  const closePreview = () => {
    setPreviewProject(null);
    setPreviewVariationIndex(0);
  };

  const nextVariation = () => {
    if (previewProject && previewVariationIndex < previewProject.variations.length - 1) {
      setPreviewVariationIndex(prev => prev + 1);
    }
  };

  const prevVariation = () => {
    if (previewVariationIndex > 0) {
      setPreviewVariationIndex(prev => prev - 1);
    }
  };

  // Open View Settings dialog
  const handleViewSettings = async (project: Project) => {
    // If the project doesn't have options loaded, fetch the full project
    if (project.options === null || project.options === undefined) {
      try {
        const response = await fetch(`/api/projects/${project.id}`);
        if (response.ok) {
          const fullProject = await response.json();
          setSettingsProject({ ...project, options: fullProject.options, pipelineVersion: fullProject.pipelineVersion });
          return;
        }
      } catch (error) {
        console.error('Failed to fetch project details:', error);
      }
    }
    setSettingsProject(project);
  };

  // Open Clone with New Settings dialog
  const handleOpenClone = (project: Project) => {
    setSettingsProject(null); // Close settings dialog if open
    const projectOptions = (project.options || {}) as Partial<GenerationOptions>;
    setCloneOptions({
      ...projectOptions,
      // Ensure key fields are populated from project-level fields if not in options
      language: projectOptions.language || project.language as GenerationOptions['language'],
      country: (projectOptions.country || project.country) as GenerationOptions['country'],
      vertical: (projectOptions.vertical || project.vertical || 'auto') as GenerationOptions['vertical'],
    });
    setCloneName(`${project.name} (Clone)`);
    setCloneProject(project);
  };

  // Submit clone
  const handleCloneSubmit = async () => {
    if (!cloneProject || !cloneName.trim()) return;

    setIsCloning(true);
    try {
      const response = await fetch(`/api/projects/${cloneProject.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cloneName.trim(),
          options: cloneOptions,
          skipVariations: true,
        }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setCloneProject(null);
        router.push(`/v3?project=${newProject.id}`);
      }
    } catch (error) {
      console.error('Failed to clone project:', error);
    } finally {
      setIsCloning(false);
    }
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

  // Stats
  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    generating: projects.filter(p => p.status === 'GENERATING').length,
    draft: projects.filter(p => p.status === 'DRAFT').length,
    totalVariations: projects.reduce((acc, p) => acc + (p.variations?.length || 0), 0),
  };

  // Check if any selected projects have variations
  const canBulkDownload = Array.from(selectedIds).some(id => {
    const project = projects.find(p => p.id === id);
    return project?.variations && project.variations.length > 0;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Adhoq Landing Page Builder</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your landing pages
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="new">New Project</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="v3" className="gap-1">
                <Sparkles className="h-3 w-3" />
                V3 Architect
              </TabsTrigger>
            </TabsList>

            {activeTab === 'projects' && (
              <Button variant="outline" size="sm" onClick={fetchProjects}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <span className="text-3xl font-bold">{stats.total}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-3xl font-bold">{stats.completed}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    In Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                    <span className="text-3xl font-bold">{stats.generating}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Variations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-3xl font-bold">{stats.totalVariations}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No projects yet</p>
                    <Button
                      variant="link"
                      onClick={() => setActiveTab('new')}
                      className="mt-2"
                    >
                      Create your first project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.slice(0, 5).map(project => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/?project=${project.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Updated {getRelativeTime(project.updatedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {project.variations?.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {project.variations.length} variation(s)
                            </span>
                          )}
                          {getStatusBadge(project.status)}
                        </div>
                      </div>
                    ))}
                    {projects.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setActiveTab('projects')}
                      >
                        View all {projects.length} projects
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Project Tab */}
          <TabsContent value="new">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Create New Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Name</label>
                  <Input
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="My Landing Page"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newProjectName.trim()) {
                        handleCreateProject();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleCreateProject}
                  disabled={isCreating || !newProjectName.trim()}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create & Configure
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
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

            {/* Projects Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No projects found</p>
                <Button onClick={() => setActiveTab('new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === projects.length && projects.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Variations</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map(project => (
                      <TableRow
                        key={project.id}
                        className={selectedIds.has(project.id) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(project.id)}
                            onCheckedChange={() => toggleSelection(project.id)}
                          />
                        </TableCell>
                        <TableCell>
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
                                className="h-8 w-48"
                              />
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span
                                className="font-medium cursor-pointer hover:text-primary"
                                onClick={() => router.push(`/?project=${project.id}`)}
                              >
                                {project.name}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => startEditing(project, e)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(project.status)}</TableCell>
                        <TableCell>{project.variations?.length || 0}</TableCell>
                        <TableCell>{project.language.toUpperCase()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {getRelativeTime(project.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewSettings(project)}
                              title="View Settings"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            {project.variations && project.variations.length > 0 && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePreviewProject(project)}
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadProject(project)}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteProject(project.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* V3 Architect Tab */}
          <TabsContent value="v3">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create V3 Project */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    New V3 Project
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                      Architect Flow
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      The V3 pipeline uses an Architect agent that plans your LP structure before building,
                      plus QA and Repair agents to ensure quality output.
                    </p>
                    <div className="mt-3 text-xs text-purple-600 dark:text-purple-400 font-mono">
                      Analyzer → Architect → Builder → QA → Repair → Output
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project Name</label>
                    <Input
                      value={newV3ProjectName}
                      onChange={e => setNewV3ProjectName(e.target.value)}
                      placeholder="My V3 Landing Page"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newV3ProjectName.trim()) {
                          handleCreateV3Project();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleCreateV3Project}
                    disabled={isCreatingV3 || !newV3ProjectName.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isCreatingV3 ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Create V3 Project
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Create from Scratch */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    Create from Scratch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                      No Source Page Needed
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Describe the landing page you want and the AI will generate it from scratch.
                      Just provide a brief and the system handles the rest.
                    </p>
                    <div className="mt-3 text-xs text-purple-600 dark:text-purple-400 font-mono">
                      Brief → Architect → Builder → QA → Repair → Output
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project Name</label>
                    <Input
                      value={newScratchProjectName}
                      onChange={e => setNewScratchProjectName(e.target.value)}
                      placeholder="My Scratch Landing Page"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newScratchProjectName.trim()) {
                          handleCreateScratchProject();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleCreateScratchProject}
                    disabled={isCreatingScratch || !newScratchProjectName.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isCreatingScratch ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Create from Scratch
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Preview Modal */}
      <Dialog open={!!previewProject} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
          {previewProject && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold">{previewProject.name}</h2>
                  {previewProject.variations.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={prevVariation}
                        disabled={previewVariationIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Variation {previewVariationIndex + 1} of {previewProject.variations.length}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={nextVariation}
                        disabled={previewVariationIndex === previewProject.variations.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const variation = previewProject.variations[previewVariationIndex];
                      const blob = new Blob([variation.html], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${previewProject.name}-v${variation.number}.html`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      a.remove();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Preview iframe */}
              <div className="flex-1 bg-gray-100">
                <iframe
                  srcDoc={previewProject.variations[previewVariationIndex]?.html || ''}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Settings Dialog */}
      <Dialog open={!!settingsProject} onOpenChange={(open) => !open && setSettingsProject(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {settingsProject && (() => {
            const opts = (settingsProject.options || {}) as Record<string, unknown>;
            const hasOptions = Object.keys(opts).length > 0;

            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">{settingsProject.name}</h2>
                  <p className="text-sm text-muted-foreground">Generation settings</p>
                </div>

                {!hasOptions ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p>No settings saved for this project.</p>
                    <p className="text-xs mt-1">Settings are saved when generating with V3.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Pipeline */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pipeline</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Version</div>
                        <div className="font-medium">{settingsProject.pipelineVersion || 'v1'}</div>
                      </div>
                    </div>

                    {/* Source */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Source</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {settingsProject.sourceUrl && (
                          <>
                            <div className="text-muted-foreground">Source URL</div>
                            <div className="font-medium truncate" title={settingsProject.sourceUrl}>{settingsProject.sourceUrl}</div>
                          </>
                        )}
                        {!!(opts.ctaUrlOverride || settingsProject.trackingUrl) && (
                          <>
                            <div className="text-muted-foreground">Tracking URL</div>
                            <div className="font-medium truncate" title={String(opts.ctaUrlOverride || settingsProject.trackingUrl)}>
                              {String(opts.ctaUrlOverride || settingsProject.trackingUrl)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Targeting */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Targeting</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Vertical</div>
                        <div className="font-medium capitalize">{String(opts.vertical || settingsProject.vertical || 'auto')}</div>
                        <div className="text-muted-foreground">Tone</div>
                        <div className="font-medium capitalize">{String(opts.tone || 'auto').replace(/-/g, ' ')}</div>
                        <div className="text-muted-foreground">Target Age</div>
                        <div className="font-medium">{String(opts.targetAge || 'all') === 'all' ? 'All Ages (18+)' : String(opts.targetAge)}</div>
                        <div className="text-muted-foreground">Country</div>
                        <div className="font-medium">
                          {(() => {
                            const code = String(opts.country || settingsProject.country || 'US');
                            const country = COUNTRIES[code as keyof typeof COUNTRIES];
                            return country ? `${country.flag} ${country.name}` : code;
                          })()}
                        </div>
                        <div className="text-muted-foreground">Language</div>
                        <div className="font-medium">
                          {(() => {
                            const code = String(opts.language || settingsProject.language || 'en');
                            const lang = LANGUAGES[code as keyof typeof LANGUAGES];
                            return lang ? lang.nativeName : code.toUpperCase();
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Generation */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Generation</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {!!opts.stepCount && (
                          <>
                            <div className="text-muted-foreground">Steps</div>
                            <div className="font-medium">{String(opts.stepCount)}</div>
                          </>
                        )}
                        <div className="text-muted-foreground">Variations</div>
                        <div className="font-medium">{String(opts.variationCount || 1)}</div>
                        <div className="text-muted-foreground">Creativity</div>
                        <div className="font-medium">{String(opts.creativity || 0.7)}</div>
                      </div>
                    </div>

                    {/* Style */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Style</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Color Scheme</div>
                        <div className="font-medium capitalize">{String(opts.colorScheme || 'generate-matching').replace(/-/g, ' ')}</div>
                        <div className="text-muted-foreground">Layout</div>
                        <div className="font-medium capitalize">{String(opts.layoutStyle || 'mobile-optimized').replace(/-/g, ' ')}</div>
                        <div className="text-muted-foreground">Text Handling</div>
                        <div className="font-medium capitalize">{String(opts.textHandling || 'rewrite-slight').replace(/-/g, ' ')}</div>
                        <div className="text-muted-foreground">Link Handling</div>
                        <div className="font-medium capitalize">{String(opts.linkHandling || 'replace-all').replace(/-/g, ' ')}</div>
                      </div>
                    </div>

                    {/* Custom Instructions */}
                    {!!opts.textInstructions && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Custom Instructions</h3>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">{String(opts.textInstructions)}</p>
                      </div>
                    )}

                    {/* Add Elements */}
                    {!!(opts.addElements && typeof opts.addElements === 'object') && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Added Elements</h3>
                        <div className="flex flex-wrap gap-2">
                          {(opts.addElements as Record<string, { enabled?: boolean }>).countdown?.enabled && (
                            <Badge variant="secondary">Countdown Timer</Badge>
                          )}
                          {(opts.addElements as Record<string, { enabled?: boolean }>).scarcity?.enabled && (
                            <Badge variant="secondary">Scarcity Indicator</Badge>
                          )}
                          {(opts.addElements as Record<string, { enabled?: boolean }>).socialProof?.enabled && (
                            <Badge variant="secondary">Social Proof</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Clone button */}
                <div className="pt-2 border-t">
                  <Button
                    className="w-full"
                    onClick={() => handleOpenClone(settingsProject)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clone with New Settings
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Clone with New Settings Dialog */}
      <Dialog open={!!cloneProject} onOpenChange={(open) => !open && setCloneProject(null)}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col">
          {cloneProject && (
            <>
              <div className="p-6 border-b bg-background">
                <h2 className="text-lg font-semibold">Clone with New Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Source: {cloneProject.name}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Project Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project Name</label>
                    <Input
                      value={cloneName}
                      onChange={e => setCloneName(e.target.value)}
                      placeholder="New project name"
                    />
                  </div>

                  {/* Settings */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <QuickSettings
                      options={cloneOptions}
                      onChange={setCloneOptions}
                    />
                    <AdvancedSettings
                      options={cloneOptions}
                      onChange={setCloneOptions}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-background flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCloneProject(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCloneSubmit}
                  disabled={isCloning || !cloneName.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isCloning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cloning...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Clone & Open in Builder
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
