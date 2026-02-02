import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

// =============================================================================
// QUERIES
// =============================================================================

// Get all files for a repository
export const getRepoFiles = query({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_repo", (q) => q.eq("repoId", args.repoId))
      .collect();
  },
});

// Get a single file by path
export const getFile = query({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) =>
        q.eq("repoId", args.repoId).eq("path", args.path)
      )
      .first();
  },
});

// Get all dirty (modified) files for a repository
export const getDirtyFiles = query({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_repo_dirty", (q) =>
        q.eq("repoId", args.repoId).eq("isDirty", true)
      )
      .collect();
  },
});

// Get import status for a repository
export const getImportStatus = query({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("importStatus")
      .withIndex("by_repo", (q) => q.eq("repoId", args.repoId))
      .order("desc")
      .first();
  },
});

// Get file tree structure for UI
export const getFileTree = query({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_repo", (q) => q.eq("repoId", args.repoId))
      .collect();

    interface TreeNode {
      name: string;
      path: string;
      type: "file" | "directory";
      children?: TreeNode[];
      isDirty?: boolean;
    }

    const tree: TreeNode[] = [];
    const pathMap = new Map<string, TreeNode>();

    // Sort by path depth
    const sorted = [...files].sort(
      (a, b) => a.path.split("/").length - b.path.split("/").length
    );

    for (const file of sorted) {
      const node: TreeNode = {
        name: file.name,
        path: file.path,
        type: file.type,
        isDirty: file.isDirty,
      };

      if (file.type === "directory") {
        node.children = [];
      }

      const parentPath = file.path.split("/").slice(0, -1).join("/");

      if (parentPath && pathMap.has(parentPath)) {
        pathMap.get(parentPath)!.children?.push(node);
      } else {
        tree.push(node);
      }

      pathMap.set(file.path, node);
    }

    return tree;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

// Update file content (marks as dirty)
export const updateFile = mutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) =>
        q.eq("repoId", args.repoId).eq("path", args.path)
      )
      .first();

    if (!file) {
      throw new Error(`File not found: ${args.path}`);
    }

    const originalContent = file.isDirty ? file.originalContent : file.content;

    await ctx.db.patch(file._id, {
      content: args.content,
      isDirty: true,
      originalContent,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Create a new file
export const createFile = mutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) =>
        q.eq("repoId", args.repoId).eq("path", args.path)
      )
      .first();

    if (existing) {
      throw new Error(`File already exists: ${args.path}`);
    }

    const name = args.path.split("/").pop() || args.path;
    const now = Date.now();

    // Ensure parent directories exist
    const parts = args.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/");
      const dirExists = await ctx.db
        .query("files")
        .withIndex("by_repo_path", (q) =>
          q.eq("repoId", args.repoId).eq("path", dirPath)
        )
        .first();

      if (!dirExists) {
        await ctx.db.insert("files", {
          repoId: args.repoId,
          path: dirPath,
          name: parts[i - 1],
          type: "directory",
          isDirty: true,
          importedAt: now,
          updatedAt: now,
        });
      }
    }

    await ctx.db.insert("files", {
      repoId: args.repoId,
      path: args.path,
      name,
      type: "file",
      content: args.content,
      isDirty: true,
      size: args.content.length,
      importedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Delete a file
export const deleteFile = mutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) =>
        q.eq("repoId", args.repoId).eq("path", args.path)
      )
      .first();

    if (!file) {
      throw new Error(`File not found: ${args.path}`);
    }

    // If directory, delete all children
    if (file.type === "directory") {
      const allFiles = await ctx.db
        .query("files")
        .withIndex("by_repo", (q) => q.eq("repoId", args.repoId))
        .collect();

      for (const child of allFiles) {
        if (child.path.startsWith(args.path + "/")) {
          await ctx.db.delete(child._id);
        }
      }
    }

    await ctx.db.delete(file._id);
    return { success: true };
  },
});

// Discard changes to a file
export const discardFileChanges = mutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_repo_path", (q) =>
        q.eq("repoId", args.repoId).eq("path", args.path)
      )
      .first();

    if (!file || !file.isDirty) {
      return { success: true };
    }

    await ctx.db.patch(file._id, {
      content: file.originalContent,
      isDirty: false,
      originalContent: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Discard all changes
export const discardAllChanges = mutation({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    const dirtyFiles = await ctx.db
      .query("files")
      .withIndex("by_repo_dirty", (q) =>
        q.eq("repoId", args.repoId).eq("isDirty", true)
      )
      .collect();

    for (const file of dirtyFiles) {
      if (file.originalContent !== undefined) {
        await ctx.db.patch(file._id, {
          content: file.originalContent,
          isDirty: false,
          originalContent: undefined,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.delete(file._id);
      }
    }

    return { success: true, filesReverted: dirtyFiles.length };
  },
});

// Clear all files for a repository
export const clearRepoFiles = mutation({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_repo", (q) => q.eq("repoId", args.repoId))
      .collect();

    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    return { success: true, filesDeleted: files.length };
  },
});

// Mark files as clean after commit
export const markFilesClean = mutation({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    const dirtyFiles = await ctx.db
      .query("files")
      .withIndex("by_repo_dirty", (q) =>
        q.eq("repoId", args.repoId).eq("isDirty", true)
      )
      .collect();

    for (const file of dirtyFiles) {
      await ctx.db.patch(file._id, {
        isDirty: false,
        originalContent: undefined,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// =============================================================================
// INTERNAL MUTATIONS (for import process)
// =============================================================================

export const createImportStatus = internalMutation({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("importStatus", {
      repoId: args.repoId,
      status: "pending",
      branch: args.branch,
      startedAt: Date.now(),
    });
  },
});

export const updateImportStatus = internalMutation({
  args: {
    statusId: v.id("importStatus"),
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
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };

    if (args.progress !== undefined) updates.progress = args.progress;
    if (args.totalFiles !== undefined) updates.totalFiles = args.totalFiles;
    if (args.importedFiles !== undefined) updates.importedFiles = args.importedFiles;
    if (args.error !== undefined) updates.error = args.error;
    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.statusId, updates);
  },
});

export const insertFile = internalMutation({
  args: {
    repoId: v.id("repos"),
    path: v.string(),
    name: v.string(),
    type: v.union(v.literal("file"), v.literal("directory")),
    content: v.optional(v.string()),
    sha: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("files", {
      repoId: args.repoId,
      path: args.path,
      name: args.name,
      type: args.type,
      content: args.content,
      sha: args.sha,
      size: args.size,
      isDirty: false,
      importedAt: now,
      updatedAt: now,
    });
  },
});

export const clearRepoFilesInternal = internalMutation({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_repo", (q) => q.eq("repoId", args.repoId))
      .collect();

    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    return { filesDeleted: files.length };
  },
});

export const getDirtyFilesInternal = internalQuery({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_repo_dirty", (q) =>
        q.eq("repoId", args.repoId).eq("isDirty", true)
      )
      .collect();
  },
});

export const markFilesCleanInternal = internalMutation({
  args: {
    repoId: v.id("repos"),
  },
  handler: async (ctx, args) => {
    const dirtyFiles = await ctx.db
      .query("files")
      .withIndex("by_repo_dirty", (q) =>
        q.eq("repoId", args.repoId).eq("isDirty", true)
      )
      .collect();

    for (const file of dirtyFiles) {
      await ctx.db.patch(file._id, {
        isDirty: false,
        originalContent: undefined,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
