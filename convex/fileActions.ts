"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import JSZip from "jszip";

const GITHUB_API = "https://api.github.com";

async function githubFetch<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoChat",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

interface RepoWithConnection {
  user: { _id: Id<"users"> };
  repo: {
    _id: Id<"repos">;
    owner: string;
    name: string;
    defaultBranch: string;
  };
  connection: {
    accessToken: string;
  };
}

interface FileRecord {
  _id: Id<"files">;
  path: string;
  type: "file" | "directory";
  content?: string;
}

// Skip patterns for files/folders we don't want to import
const SKIP_PATTERNS = [
  "node_modules/", ".next/", "dist/", "build/",
  ".cache/", "coverage/", "__pycache__/", ".venv/", "venv/",
  ".git/", ".DS_Store",
];

// Binary extensions we skip content for
const BINARY_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".pdf", ".zip", ".tar", ".gz", ".rar",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".exe", ".dll", ".so", ".dylib",
];

// Max file size to store content (500KB)
const MAX_FILE_SIZE = 500000;

function shouldSkipPath(path: string): boolean {
  return SKIP_PATTERNS.some(pattern => path.includes(pattern));
}

function isBinaryFile(filename: string): boolean {
  const ext = filename.includes(".")
    ? "." + filename.split(".").pop()?.toLowerCase()
    : "";
  return BINARY_EXTENSIONS.includes(ext);
}

// Import a repository from GitHub using ZIPBALL (1 request instead of N)
export const importRepository = action({
  args: {
    clerkId: v.string(),
    repoId: v.id("repos"),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; filesImported: number }> => {
    // Get repo and connection info
    const data = await ctx.runQuery(internal.githubHelpers.getRepoWithConnection, {
      clerkId: args.clerkId,
      repoId: args.repoId,
    }) as RepoWithConnection | null;

    if (!data) {
      throw new Error("Repository not found or GitHub not connected");
    }

    const { repo, connection } = data;
    const branch = args.branch || repo.defaultBranch;

    // Create import status
    const statusId = await ctx.runMutation(internal.files.createImportStatus, {
      repoId: args.repoId,
      branch,
    }) as Id<"importStatus">;

    // Clear existing files
    await ctx.runMutation(internal.files.clearRepoFilesInternal, { repoId: args.repoId });

    // Update status to importing
    await ctx.runMutation(internal.files.updateImportStatus, {
      statusId,
      status: "importing",
    });

    try {
      // === ONE REQUEST: Download entire repo as ZIP ===
      const zipResponse = await fetch(
        `${GITHUB_API}/repos/${repo.owner}/${repo.name}/zipball/${branch}`,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "RepoChat",
          },
          redirect: "follow", // GitHub returns 302, follow it
        }
      );

      if (!zipResponse.ok) {
        throw new Error(`Failed to download repo: ${zipResponse.status}`);
      }

      const zipBuffer = await zipResponse.arrayBuffer();
      const zip = await JSZip.loadAsync(zipBuffer);

      // GitHub zip has a root folder like "owner-repo-sha/"
      // Find it and strip it from paths
      const zipFiles = Object.keys(zip.files);
      const rootFolder = zipFiles[0]?.split("/")[0] + "/";

      // Collect all files and directories
      const directories = new Set<string>();
      const files: Array<{ path: string; name: string; content?: string; size: number }> = [];

      // Process all entries in the zip
      for (const zipPath of Object.keys(zip.files)) {
        const zipEntry = zip.files[zipPath];

        // Strip the root folder from path
        const relativePath = zipPath.replace(rootFolder, "");

        if (!relativePath || relativePath === "") continue;
        if (shouldSkipPath(relativePath)) continue;

        if (zipEntry.dir) {
          // It's a directory
          const dirPath = relativePath.endsWith("/")
            ? relativePath.slice(0, -1)
            : relativePath;
          if (dirPath) directories.add(dirPath);
        } else {
          // It's a file - collect parent directories
          const parts = relativePath.split("/");
          for (let i = 1; i < parts.length; i++) {
            directories.add(parts.slice(0, i).join("/"));
          }

          const name = parts[parts.length - 1];
          const isBinary = isBinaryFile(name);

          // Get content for text files under size limit
          let content: string | undefined;
          let fileSize = 0;

          if (!isBinary) {
            try {
              const data = await zipEntry.async("string");
              fileSize = data.length;
              if (fileSize < MAX_FILE_SIZE) {
                content = data;
              }
            } catch {
              // Failed to read as string, probably binary
            }
          }

          files.push({
            path: relativePath,
            name,
            content,
            size: fileSize,
          });
        }
      }

      const totalItems = directories.size + files.length;
      await ctx.runMutation(internal.files.updateImportStatus, {
        statusId,
        status: "importing",
        totalFiles: totalItems,
        importedFiles: 0,
        progress: 0,
      });

      // Insert directories first
      for (const dirPath of directories) {
        await ctx.runMutation(internal.files.insertFile, {
          repoId: args.repoId,
          path: dirPath,
          name: dirPath.split("/").pop() || dirPath,
          type: "directory",
        });
      }

      // Insert files
      let importedCount = 0;
      for (const file of files) {
        await ctx.runMutation(internal.files.insertFile, {
          repoId: args.repoId,
          path: file.path,
          name: file.name,
          type: "file",
          content: file.content,
          size: file.size,
        });

        importedCount++;

        // Update progress every 20 files
        if (importedCount % 20 === 0) {
          await ctx.runMutation(internal.files.updateImportStatus, {
            statusId,
            status: "importing",
            importedFiles: importedCount + directories.size,
            progress: Math.round(((importedCount + directories.size) / totalItems) * 100),
          });
        }
      }

      await ctx.runMutation(internal.files.updateImportStatus, {
        statusId,
        status: "completed",
        importedFiles: totalItems,
        progress: 100,
      });

      return { success: true, filesImported: files.length };
    } catch (error) {
      await ctx.runMutation(internal.files.updateImportStatus, {
        statusId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});

// Commit changes to GitHub
export const commitChangesToGitHub = action({
  args: {
    clerkId: v.string(),
    repoId: v.id("repos"),
    message: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; commitSha?: string; commitUrl?: string; filesCommitted?: number; error?: string }> => {
    const data = await ctx.runQuery(internal.githubHelpers.getRepoWithConnection, {
      clerkId: args.clerkId,
      repoId: args.repoId,
    }) as RepoWithConnection | null;

    if (!data) {
      throw new Error("Repository not found or GitHub not connected");
    }

    const { repo, connection } = data;

    // Get dirty files
    const dirtyFiles = await ctx.runQuery(internal.files.getDirtyFilesInternal, {
      repoId: args.repoId,
    }) as FileRecord[];

    if (dirtyFiles.length === 0) {
      return { success: false, error: "No changes to commit" };
    }

    try {
      // Get latest commit SHA
      const ref = await githubFetch<{ object: { sha: string } }>(
        `/repos/${repo.owner}/${repo.name}/git/ref/heads/${repo.defaultBranch}`,
        connection.accessToken
      );
      const baseCommitSha = ref.object.sha;

      // Get base tree
      const baseCommit = await githubFetch<{ tree: { sha: string } }>(
        `/repos/${repo.owner}/${repo.name}/git/commits/${baseCommitSha}`,
        connection.accessToken
      );
      const baseTreeSha = baseCommit.tree.sha;

      // Create blobs for changed files
      const treeItems: Array<{
        path: string;
        mode: "100644";
        type: "blob";
        sha: string;
      }> = [];

      for (const file of dirtyFiles) {
        if (file.type === "directory" || !file.content) continue;

        const blob = await githubFetch<{ sha: string }>(
          `/repos/${repo.owner}/${repo.name}/git/blobs`,
          connection.accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              content: Buffer.from(file.content).toString("base64"),
              encoding: "base64",
            }),
          }
        );

        treeItems.push({
          path: file.path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        });
      }

      // Create new tree
      const newTree = await githubFetch<{ sha: string }>(
        `/repos/${repo.owner}/${repo.name}/git/trees`,
        connection.accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: treeItems,
          }),
        }
      );

      // Create commit
      const commitMessage = args.description
        ? `${args.message}\n\n${args.description}`
        : args.message;

      const newCommit = await githubFetch<{ sha: string; html_url: string }>(
        `/repos/${repo.owner}/${repo.name}/git/commits`,
        connection.accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            message: commitMessage,
            tree: newTree.sha,
            parents: [baseCommitSha],
          }),
        }
      );

      // Update branch reference
      await githubFetch<unknown>(
        `/repos/${repo.owner}/${repo.name}/git/refs/heads/${repo.defaultBranch}`,
        connection.accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({ sha: newCommit.sha }),
        }
      );

      // Mark files as clean
      await ctx.runMutation(internal.files.markFilesCleanInternal, { repoId: args.repoId });

      return {
        success: true,
        commitSha: newCommit.sha,
        commitUrl: newCommit.html_url,
        filesCommitted: dirtyFiles.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to commit: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
