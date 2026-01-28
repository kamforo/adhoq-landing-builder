import prisma from './prisma';
import type { Prisma } from '@prisma/client';

// Project CRUD operations

export type CreateProjectInput = {
  name: string;
  description?: string;
  pipelineVersion?: string;
  sourceUrl?: string;
  sourceHtml?: string;
  trackingUrl?: string;
  vertical?: string;
  language?: string;
  country?: string;
  options?: Prisma.InputJsonValue;
  analysis?: Prisma.InputJsonValue;
  architectPlan?: Prisma.InputJsonValue;
  qaResults?: Prisma.InputJsonValue;
  folder?: string;
  tags?: string[];
  userId?: string;
  teamId?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  status?: 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
};

// Create a new project
export async function createProject(data: CreateProjectInput) {
  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      pipelineVersion: data.pipelineVersion || 'v1',
      sourceUrl: data.sourceUrl,
      sourceHtml: data.sourceHtml,
      trackingUrl: data.trackingUrl,
      vertical: data.vertical,
      language: data.language || 'en',
      country: data.country || 'US',
      options: data.options || {},
      analysis: data.analysis,
      architectPlan: data.architectPlan,
      qaResults: data.qaResults,
      folder: data.folder,
      tags: data.tags || [],
      userId: data.userId,
      teamId: data.teamId,
    },
    include: {
      variations: true,
    },
  });
}

// Get project by ID
export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      variations: {
        orderBy: { number: 'asc' },
      },
    },
  });
}

// List projects with filtering and pagination
export async function listProjects(options: {
  userId?: string;
  teamId?: string;
  status?: string;
  folder?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, teamId, status, folder, search, page = 1, limit = 20 } = options;

  const where: Prisma.ProjectWhereInput = {};

  if (userId) where.userId = userId;
  if (teamId) where.teamId = teamId;
  if (status) where.status = status as 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
  if (folder) where.folder = folder;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        variations: {
          orderBy: { number: 'asc' },
          take: 4, // Limit for thumbnail previews
        },
        _count: {
          select: { variations: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Update project
export async function updateProject(id: string, data: UpdateProjectInput) {
  return prisma.project.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      variations: true,
    },
  });
}

// Delete project (and its variations)
export async function deleteProject(id: string) {
  return prisma.project.delete({
    where: { id },
  });
}

// Duplicate a project
export async function duplicateProject(
  id: string,
  newName?: string,
  overrides?: {
    options?: Prisma.InputJsonValue;
    skipVariations?: boolean;
  }
) {
  const original = await prisma.project.findUnique({
    where: { id },
    include: { variations: true },
  });

  if (!original) {
    throw new Error('Project not found');
  }

  // Create new project with copied data
  const duplicate = await prisma.project.create({
    data: {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      sourceUrl: original.sourceUrl,
      sourceHtml: original.sourceHtml,
      trackingUrl: original.trackingUrl,
      vertical: original.vertical,
      language: original.language,
      country: original.country,
      options: overrides?.options ?? original.options ?? {},
      analysis: original.analysis || undefined,
      folder: original.folder,
      tags: original.tags,
      userId: original.userId,
      teamId: original.teamId,
      status: 'DRAFT',
    },
  });

  // Copy variations (unless skipped)
  if (!overrides?.skipVariations && original.variations.length > 0) {
    await prisma.variation.createMany({
      data: original.variations.map((v) => ({
        projectId: duplicate.id,
        number: v.number,
        html: v.html,
        generationTime: v.generationTime,
      })),
    });
  }

  return getProject(duplicate.id);
}

// Archive/unarchive project
export async function archiveProject(id: string, archive = true) {
  return prisma.project.update({
    where: { id },
    data: {
      status: archive ? 'ARCHIVED' : 'DRAFT',
    },
  });
}

// Get project folders (for organization)
export async function getProjectFolders(userId?: string, teamId?: string) {
  const where: Prisma.ProjectWhereInput = {};
  if (userId) where.userId = userId;
  if (teamId) where.teamId = teamId;

  const folders = await prisma.project.findMany({
    where: {
      ...where,
      folder: { not: null },
    },
    select: {
      folder: true,
    },
    distinct: ['folder'],
  });

  return folders.map((f) => f.folder).filter(Boolean) as string[];
}

// Delete all variations for a project
export async function deleteVariations(projectId: string) {
  return prisma.variation.deleteMany({
    where: { projectId },
  });
}

// Add variation to project
export async function addVariation(
  projectId: string,
  data: {
    number: number;
    html: string;
    generationTime?: number;
  }
) {
  return prisma.variation.create({
    data: {
      projectId,
      number: data.number,
      html: data.html,
      generationTime: data.generationTime,
    },
  });
}

// Get variation by ID
export async function getVariation(id: string) {
  return prisma.variation.findUnique({
    where: { id },
    include: {
      project: true,
    },
  });
}

// Update variation stats (for A/B testing)
export async function updateVariationStats(
  id: string,
  stats: { clicks?: number; conversions?: number; isWinner?: boolean }
) {
  return prisma.variation.update({
    where: { id },
    data: stats,
  });
}
