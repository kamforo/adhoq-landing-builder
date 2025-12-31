'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, FolderOpen, Plus, Trash2, Copy, Archive } from 'lucide-react';

type Project = {
  id: string;
  name: string;
  status: string;
  vertical: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { variations: number };
};

type ProjectManagerProps = {
  currentProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  onProjectCreate: (name: string) => void;
  onProjectDelete?: (projectId: string) => void;
};

export function ProjectManager({
  currentProjectId,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
}: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Fetch projects list
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects?limit=50');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);

        // Set current project if we have one
        if (currentProjectId) {
          const current = data.projects.find((p: Project) => p.id === currentProjectId);
          if (current) setCurrentProject(current);
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentProjectId]);

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onProjectCreate(newProjectName.trim());
      setNewProjectName('');
      setIsNewProjectDialogOpen(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchProjects();
        if (onProjectDelete) onProjectDelete(projectId);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/duplicate`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        await fetchProjects();
        onProjectSelect(data.id);
      }
    } catch (error) {
      console.error('Failed to duplicate project:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600';
      case 'GENERATING': return 'text-yellow-600';
      case 'FAILED': return 'text-red-600';
      case 'ARCHIVED': return 'text-gray-400';
      default: return 'text-gray-600';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            <span className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {currentProject ? currentProject.name : 'Select Project'}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[300px]">
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setIsNewProjectDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {isLoading ? (
            <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
          ) : projects.length === 0 ? (
            <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>
          ) : (
            projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                className="flex items-center justify-between group"
                onClick={() => onProjectSelect(project.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{project.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className={getStatusColor(project.status)}>
                      {project.status.toLowerCase()}
                    </span>
                    {project._count && (
                      <span>{project._count.variations} variation(s)</span>
                    )}
                  </div>
                </div>
                <div className="hidden group-hover:flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateProject(project.id);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Project Dialog */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Give your project a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My Landing Page"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
