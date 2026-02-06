"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Extensions to include when importing
const INCLUDE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css", ".scss",
  ".html", ".md", ".mdx", ".py", ".go", ".rs", ".java", ".yml",
  ".yaml", ".toml", ".env.example", ".gitignore",
];

// Paths to skip
const SKIP_PATHS = [
  "node_modules", ".git", ".next", "dist", "build", "__pycache__",
  ".venv", "venv", ".cache", "coverage", ".DS_Store",
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
];

function shouldIncludeFile(path: string): boolean {
  if (SKIP_PATHS.some((skip) => path.includes(skip))) {
    return false;
  }
  const ext = path.substring(path.lastIndexOf("."));
  return INCLUDE_EXTENSIONS.includes(ext) || path.endsWith(".example");
}

interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

interface ExistingFile {
  _id: string;
  path: string;
  sha?: string;
}

// Import a repository's files (smart sync - only fetches changed files)
export const importRepository = action({
  args: {
    clerkId: v.string(),
    repoId: v.id("repos"),
  },
  handler: async (ctx, { clerkId, repoId }): Promise<{
    success: boolean;
    fetched: number;
    deleted: number;
    skipped: number;
    total: number;
  }> => {
    const installationId: number | null = await ctx.runQuery(
      internal.githubHelpers.getUserInstallationIdInternal,
      { clerkId }
    );

    if (!installationId) {
      throw new Error("GitHub not connected");
    }

    const repo = await ctx.runQuery(internal.repos.getRepoInternal, { repoId });
    if (!repo) {
      throw new Error("Repository not found");
    }

    await ctx.runMutation(internal.files.upsertImportStatus, {
      repoId,
      status: "importing",
      progress: 0,
    });

    try {
      // Get existing files from our DB (with their SHAs)
      const existingFiles: ExistingFile[] = await ctx.runQuery(
        internal.files.getRepoFilesInternal,
        { repoId }
      );
      const existingByPath = new Map(
        existingFiles.map((f) => [f.path, { sha: f.sha, id: f._id }])
      );

      // Get repo tree from GitHub (includes SHA for each file)
      const tree: { tree: GitHubTreeItem[]; truncated: boolean } = await ctx.runAction(
        internal.github.getRepoContent,
        {
          installationId,
          owner: repo.owner,
          repo: repo.name,
          branch: repo.defaultBranch,
        }
      );

      // Filter to files we care about
      const githubFiles = tree.tree.filter(
        (item) =>
          item.type === "blob" &&
          shouldIncludeFile(item.path) &&
          (item.size === undefined || item.size < 500000)
      );

      const githubPaths = new Set(githubFiles.map((f) => f.path));

      // Find files to add/update (SHA differs or doesn't exist)
      const filesToFetch = githubFiles.filter((file) => {
        const existing = existingByPath.get(file.path);
        return !existing || existing.sha !== file.sha;
      });

      // Find files to delete (exist in DB but not in GitHub anymore)
      const filesToDelete = existingFiles.filter((f) => !githubPaths.has(f.path));

      const totalOperations = filesToFetch.length + filesToDelete.length;
      const skippedCount = githubFiles.length - filesToFetch.length;

      // If nothing to do, mark as completed immediately
      if (totalOperations === 0) {
        await ctx.runMutation(internal.files.upsertImportStatus, {
          repoId,
          status: "completed",
          totalFiles: githubFiles.length,
          importedFiles: 0,
          progress: 100,
        });
        return {
          success: true,
          fetched: 0,
          deleted: 0,
          skipped: skippedCount,
          total: githubFiles.length,
        };
      }

      await ctx.runMutation(internal.files.upsertImportStatus, {
        repoId,
        status: "importing",
        totalFiles: totalOperations,
        importedFiles: 0,
        progress: 0,
      });

      let completedOps = 0;

      // Delete removed files
      for (const file of filesToDelete) {
        await ctx.runMutation(internal.files.deleteFileById, {
          fileId: file._id as any,
        });
        completedOps++;
      }

      // Fetch and store changed/new files
      for (const file of filesToFetch) {
        try {
          const { content, sha }: { content: string; sha: string } =
            await ctx.runAction(internal.github.getFileContent, {
              installationId,
              owner: repo.owner,
              repo: repo.name,
              path: file.path,
              ref: repo.defaultBranch,
            });

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

          completedOps++;

          if (completedOps % 10 === 0 || completedOps === totalOperations) {
            const progress = Math.round((completedOps / totalOperations) * 100);
            await ctx.runMutation(internal.files.upsertImportStatus, {
              repoId,
              status: "importing",
              totalFiles: totalOperations,
              importedFiles: completedOps,
              progress,
            });
          }
        } catch (error) {
          console.error(`Failed to import ${file.path}:`, error);
        }
      }

      await ctx.runMutation(internal.files.upsertImportStatus, {
        repoId,
        status: "completed",
        totalFiles: githubFiles.length,
        importedFiles: completedOps,
        progress: 100,
      });

      return {
        success: true,
        fetched: filesToFetch.length,
        deleted: filesToDelete.length,
        skipped: skippedCount,
        total: githubFiles.length,
      };
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
