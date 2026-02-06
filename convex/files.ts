import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

// Get all files for a repository
export const getRepoFiles = query({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    return await ctx.db
      .query("files")
      .withIndex("by_repo", (q) => q.eq("repoId", repoId))
      .collect();
  },
});

// Internal: Get all files for a repository (for smart sync)
export const getRepoFilesInternal = internalQuery({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    return await ctx.db
      .query("files")
      .withIndex("by_repo", (q) => q.eq("repoId", repoId))
      .collect();
  },
});

// Get import status for a repository
export const getImportStatus = query({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    return await ctx.db
      .query("importStatus")
      .withIndex("by_repo", (q) => q.eq("repoId", repoId))
      .first();
  },
});

// Get a specific file by path
export const getFile = query({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
  },
  handler: async (ctx, { repoId, path }) => {
    return await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) => q.eq("repoId", repoId).eq("path", path))
      .first();
  },
});

// Update a file (marks as dirty)
export const updateFile = mutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { repoId, path, content }) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) => q.eq("repoId", repoId).eq("path", path))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content,
        isDirty: true,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    throw new Error(`File not found: ${path}`);
  },
});

// Create a new file
export const createFile = mutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { repoId, path, content }) => {
    const parts = path.split("/");
    const name = parts[parts.length - 1];

    return await ctx.db.insert("files", {
      repoId,
      path,
      name,
      type: "file",
      content,
      isDirty: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Delete a file by path
export const deleteFile = mutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
  },
  handler: async (ctx, { repoId, path }) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) => q.eq("repoId", repoId).eq("path", path))
      .first();

    if (file) {
      await ctx.db.delete(file._id);
    }
  },
});

// Delete a file by ID (internal, for smart sync)
export const deleteFileById = internalMutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, { fileId }) => {
    await ctx.db.delete(fileId);
  },
});

// Internal: Create or update import status
export const upsertImportStatus = internalMutation({
  args: {
    repoId: v.id("repos"),
    status: v.union(
      v.literal("pending"),
      v.literal("importing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()),
    totalFiles: v.optional(v.number()),
    importedFiles: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { repoId, status, progress, totalFiles, importedFiles, error }) => {
    const existing = await ctx.db
      .query("importStatus")
      .withIndex("by_repo", (q) => q.eq("repoId", repoId))
      .first();

    const now = Date.now();
    const data = {
      repoId,
      status,
      progress,
      totalFiles,
      importedFiles,
      error,
      ...(status === "completed" || status === "failed" ? { completedAt: now } : {}),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("importStatus", {
      ...data,
      startedAt: now,
    });
  },
});

// Internal: Store a file during import
export const storeFile = internalMutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
    name: v.string(),
    type: v.union(v.literal("file"), v.literal("directory")),
    content: v.optional(v.string()),
    sha: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, { repoId, path, name, type, content, sha, size }) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) => q.eq("repoId", repoId).eq("path", path))
      .first();

    const now = Date.now();
    const data = {
      repoId,
      path,
      name,
      type,
      content,
      sha,
      size,
      isDirty: false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, { ...data, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("files", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Internal: Clear all files for a repo
export const clearRepoFiles = internalMutation({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_repo", (q) => q.eq("repoId", repoId))
      .collect();

    for (const file of files) {
      await ctx.db.delete(file._id);
    }
  },
});
