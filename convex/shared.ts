"use node";

import path from "path";

export const SKIP_PATTERNS = [
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
  ".min.js",
];

export function shouldSkipPath(filePath: string): boolean {
  return SKIP_PATTERNS.some((p) => filePath.includes(p));
}

export interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

export interface FileDiffResult<T> {
  toFetch: GitHubTreeItem[];
  toDelete: T[];
  skippedCount: number;
}

export function computeFileDiff<T>(
  githubFiles: GitHubTreeItem[],
  existingItems: T[],
  getPath: (item: T) => string,
  getSha: (item: T) => string | undefined,
): FileDiffResult<T> {
  const existingByPath = new Map(
    existingItems.map((item) => [getPath(item), getSha(item)]),
  );

  const githubPaths = new Set(githubFiles.map((f) => f.path));

  const toFetch = githubFiles.filter((file) => {
    const existingSha = existingByPath.get(file.path);
    return existingSha === undefined || existingSha !== file.sha;
  });

  const toDelete = existingItems.filter((item) => !githubPaths.has(getPath(item)));

  const skippedCount = githubFiles.length - toFetch.length;

  return { toFetch, toDelete, skippedCount };
}

const LANGUAGE_EXTENSIONS: Record<string, boolean> = {
  ".js": true, ".jsx": true, ".mjs": true,
  ".ts": true, ".tsx": true,
  ".py": true,
  ".go": true,
  ".rs": true,
  ".java": true,
  ".c": true, ".h": true,
  ".cpp": true, ".cc": true, ".cxx": true, ".hpp": true,
  ".cs": true,
  ".rb": true,
  ".kt": true, ".kts": true,
  ".sh": true, ".bash": true,
};

export function isSupportedLanguage(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext in LANGUAGE_EXTENSIONS;
}
