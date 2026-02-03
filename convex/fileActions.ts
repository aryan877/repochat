"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Extensions to include when importing
const INCLUDE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".mdx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".yml",
  ".yaml",
  ".toml",
  ".env.example",
  ".gitignore",
];

// Paths to skip
const SKIP_PATHS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "__pycache__",
  ".venv",
  "venv",
  ".cache",
  "coverage",
  ".DS_Store",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
];

function shouldIncludeFile(path: string): boolean {
  // Skip certain paths
  if (SKIP_PATHS.some((skip) => path.includes(skip))) {
    return false;
  }

  // Check if file has an included extension
  const ext = path.substring(path.lastIndexOf("."));
  return INCLUDE_EXTENSIONS.includes(ext) || path.endsWith(".example");
}

// Import a repository's files
export const importRepository = action({
  args: {
    clerkId: v.string(),
    repoId: v.id("repos"),
  },
  handler: async (ctx, { clerkId, repoId }) => {
    // Get user's installation ID
    const installationId = await ctx.runQuery(
      internal.githubHelpers.getUserInstallationIdInternal,
      { clerkId }
    );

    if (!installationId) {
      throw new Error("GitHub not connected");
    }

    // Get repo details
    const repo = await ctx.runQuery(internal.repos.getRepoInternal, { repoId });
    if (!repo) {
      throw new Error("Repository not found");
    }

    // Mark import as started
    await ctx.runMutation(internal.files.upsertImportStatus, {
      repoId,
      status: "importing",
      progress: 0,
    });

    try {
      // Get repo tree
      const tree = await ctx.runAction(internal.github.getRepoContent, {
        installationId,
        owner: repo.owner,
        repo: repo.name,
        branch: repo.defaultBranch,
      });

      // Filter files to import
      const filesToImport = tree.tree.filter(
        (item: { path: string; type: string; size?: number }) =>
          item.type === "blob" &&
          shouldIncludeFile(item.path) &&
          (item.size === undefined || item.size < 500000) // Skip files > 500KB
      );

      const totalFiles = filesToImport.length;

      await ctx.runMutation(internal.files.upsertImportStatus, {
        repoId,
        status: "importing",
        totalFiles,
        importedFiles: 0,
        progress: 0,
      });

      // Clear existing files
      await ctx.runMutation(internal.files.clearRepoFiles, { repoId });

      // Import files in batches
      let importedCount = 0;

      for (const file of filesToImport) {
        try {
          // Get file content
          const { content, sha } = await ctx.runAction(internal.github.getFileContent, {
            installationId,
            owner: repo.owner,
            repo: repo.name,
            path: file.path,
            ref: repo.defaultBranch,
          });

          // Store file
          const parts = file.path.split("/");
          const name = parts[parts.length - 1];

          await ctx.runMutation(internal.files.storeFile, {
            repoId,
            path: file.path,
            name,
            type: "file" as const,
            content,
            sha,
            size: file.size,
          });

          importedCount++;

          // Update progress every 10 files
          if (importedCount % 10 === 0 || importedCount === totalFiles) {
            const progress = Math.round((importedCount / totalFiles) * 100);
            await ctx.runMutation(internal.files.upsertImportStatus, {
              repoId,
              status: "importing",
              totalFiles,
              importedFiles: importedCount,
              progress,
            });
          }
        } catch (error) {
          console.error(`Failed to import ${file.path}:`, error);
          // Continue with other files
        }
      }

      // Mark as completed
      await ctx.runMutation(internal.files.upsertImportStatus, {
        repoId,
        status: "completed",
        totalFiles,
        importedFiles: importedCount,
        progress: 100,
      });

      return { success: true, importedFiles: importedCount };
    } catch (error) {
      await ctx.runMutation(internal.files.upsertImportStatus, {
        repoId,
        status: "failed",
        error: error instanceof Error ? error.message : "Import failed",
      });
      throw error;
    }
  },
});
