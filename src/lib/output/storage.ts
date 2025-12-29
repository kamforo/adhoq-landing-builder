import { promises as fs } from 'fs';
import path from 'path';
import type { GenerationResult, ParsedLandingPage } from '@/types';

const DEFAULT_OUTPUT_DIR = './output';

/**
 * Get the output directory path
 */
export function getOutputDir(): string {
  return process.env.OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
}

/**
 * Ensure the output directory exists
 */
export async function ensureOutputDir(subDir?: string): Promise<string> {
  const baseDir = getOutputDir();
  const fullPath = subDir ? path.join(baseDir, subDir) : baseDir;

  await fs.mkdir(fullPath, { recursive: true });
  return fullPath;
}

/**
 * Save a generated landing page to the filesystem
 */
export async function saveVariation(
  variation: GenerationResult,
  projectName: string
): Promise<string> {
  const outputDir = await ensureOutputDir(projectName);
  const variationDir = path.join(outputDir, `variation-${variation.variationNumber}`);

  await fs.mkdir(variationDir, { recursive: true });

  // Save HTML file
  const htmlPath = path.join(variationDir, 'index.html');
  await fs.writeFile(htmlPath, variation.html, 'utf-8');

  // Save changes log
  if (variation.changes.length > 0) {
    const changesPath = path.join(variationDir, 'changes.json');
    await fs.writeFile(changesPath, JSON.stringify(variation.changes, null, 2), 'utf-8');
  }

  // Create assets directory
  const assetsDir = path.join(variationDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  // Save assets that have content
  for (const asset of variation.assets) {
    if (asset.content) {
      const assetPath = path.join(assetsDir, asset.newPath);
      const assetDir = path.dirname(assetPath);
      await fs.mkdir(assetDir, { recursive: true });

      if (typeof asset.content === 'string') {
        await fs.writeFile(assetPath, Buffer.from(asset.content, 'base64'));
      } else {
        await fs.writeFile(assetPath, asset.content);
      }
    }
  }

  return variationDir;
}

/**
 * Save all variations for a project
 */
export async function saveAllVariations(
  variations: GenerationResult[],
  sourcePage: ParsedLandingPage,
  projectName?: string
): Promise<string> {
  const name = projectName || sanitizeProjectName(sourcePage.title) || 'landing-page';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fullProjectName = `${name}-${timestamp}`;

  const outputDir = await ensureOutputDir(fullProjectName);

  // Save each variation
  for (const variation of variations) {
    await saveVariation(variation, fullProjectName);
  }

  // Save project metadata
  const metadata = {
    projectName: fullProjectName,
    sourceUrl: sourcePage.sourceUrl,
    sourceFileName: sourcePage.sourceFileName,
    title: sourcePage.title,
    generatedAt: new Date().toISOString(),
    variationCount: variations.length,
    variations: variations.map((v) => ({
      id: v.id,
      number: v.variationNumber,
      changesCount: v.changes.length,
    })),
  };

  const metadataPath = path.join(outputDir, 'project.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  // Create a README
  const readme = generateProjectReadme(sourcePage, variations);
  const readmePath = path.join(outputDir, 'README.md');
  await fs.writeFile(readmePath, readme, 'utf-8');

  return outputDir;
}

/**
 * List all saved projects
 */
export async function listProjects(): Promise<string[]> {
  const outputDir = getOutputDir();

  try {
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Load a saved project
 */
export async function loadProject(projectName: string): Promise<{
  metadata: Record<string, unknown>;
  variations: Array<{ number: number; html: string }>;
} | null> {
  const outputDir = getOutputDir();
  const projectDir = path.join(outputDir, projectName);

  try {
    // Load metadata
    const metadataPath = path.join(projectDir, 'project.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Load variations
    const entries = await fs.readdir(projectDir, { withFileTypes: true });
    const variationDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith('variation-'))
      .map((e) => e.name);

    const variations: Array<{ number: number; html: string }> = [];

    for (const varDir of variationDirs) {
      const htmlPath = path.join(projectDir, varDir, 'index.html');
      const html = await fs.readFile(htmlPath, 'utf-8');
      const number = parseInt(varDir.replace('variation-', ''));
      variations.push({ number, html });
    }

    return { metadata, variations };
  } catch {
    return null;
  }
}

/**
 * Delete a saved project
 */
export async function deleteProject(projectName: string): Promise<boolean> {
  const outputDir = getOutputDir();
  const projectDir = path.join(outputDir, projectName);

  try {
    await fs.rm(projectDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize a project name for use as a directory name
 */
function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Generate a README for a saved project
 */
function generateProjectReadme(
  sourcePage: ParsedLandingPage,
  variations: GenerationResult[]
): string {
  return `# ${sourcePage.title || 'Landing Page Variations'}

Generated by Adhoq Landing Page Builder

## Source

${sourcePage.sourceUrl ? `- URL: ${sourcePage.sourceUrl}` : ''}
${sourcePage.sourceFileName ? `- File: ${sourcePage.sourceFileName}` : ''}

## Variations

${variations.map((v) => `
### Variation ${v.variationNumber}

- Generated: ${v.generatedAt}
- Changes: ${v.changes.length}

Location: \`variation-${v.variationNumber}/index.html\`
`).join('\n')}

## Usage

1. Copy the desired variation folder to your web server
2. Update any placeholder images with your actual images
3. Review and update links as needed
4. Test thoroughly before going live

---

Generated on: ${new Date().toISOString()}
`;
}
