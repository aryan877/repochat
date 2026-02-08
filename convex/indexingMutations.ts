import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Create indexing job
export const createIndexingJob = internalMutation({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    triggerType: v.union(v.literal("manual"), v.literal("push"), v.literal("initial")),
    commitSha: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("indexingJobs", {
      ...args,
      status: "pending",
      startedAt: Date.now(),
    });
  },
});

// Update indexing job status
export const updateIndexingJob = internalMutation({
  args: {
    jobId: v.id("indexingJobs"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("cloning"),
        v.literal("parsing"),
        v.literal("embedding"),
        v.literal("storing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    workflowId: v.optional(v.string()),
    totalFiles: v.optional(v.number()),
    processedFiles: v.optional(v.number()),
    totalChunks: v.optional(v.number()),
    storedChunks: v.optional(v.number()),
    error: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, { jobId, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(jobId, filtered);
    }
  },
});

// Store code chunk
export const storeCodeChunk = internalMutation({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    filePath: v.string(),
    chunkType: v.union(
      v.literal("function"),
      v.literal("class"),
      v.literal("method"),
      v.literal("interface"),
      v.literal("type"),
      v.literal("variable"),
      v.literal("import"),
      v.literal("file_summary")
    ),
    name: v.string(),
    code: v.string(),
    docstring: v.string(),
    startLine: v.number(),
    endLine: v.number(),
    embedding: v.array(v.float64()),
    language: v.string(),
    fileSha: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const repoBranchKey = `${args.repoId}:${args.branch}`;

    return await ctx.db.insert("codeChunks", {
      ...args,
      repoBranchKey,
      indexedAt: Date.now(),
    });
  },
});

// Clear old chunks for a branch
export const clearBranchChunks = internalMutation({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
  },
  handler: async (ctx, { repoId, branch }) => {
    const chunks = await ctx.db
      .query("codeChunks")
      .withIndex("by_repo_branch", (q) => q.eq("repoId", repoId).eq("branch", branch))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
  },
});

// Get unique file SHAs for a branch (for incremental indexing)
export const getBranchFileShas = internalQuery({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
  },
  handler: async (ctx, { repoId, branch }) => {
    const chunks = await ctx.db
      .query("codeChunks")
      .withIndex("by_repo_branch", (q) => q.eq("repoId", repoId).eq("branch", branch))
      .collect();

    const fileMap = new Map<string, string | undefined>();
    for (const chunk of chunks) {
      if (!fileMap.has(chunk.filePath)) {
        fileMap.set(chunk.filePath, chunk.fileSha);
      }
    }
    return Array.from(fileMap.entries()).map(([filePath, fileSha]) => ({ filePath, fileSha }));
  },
});

// Delete chunks for a specific file
export const deleteFileChunks = internalMutation({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    filePath: v.string(),
  },
  handler: async (ctx, { repoId, branch, filePath }) => {
    const chunks = await ctx.db
      .query("codeChunks")
      .withIndex("by_repo_branch_file", (q) =>
        q.eq("repoId", repoId).eq("branch", branch).eq("filePath", filePath),
      )
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
    return chunks.length;
  },
});

// Get repo for internal use
export const getRepoInternal = internalQuery({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    return await ctx.db.get(repoId);
  },
});

// Get chunk by ID
export const getChunkById = internalQuery({
  args: { chunkId: v.id("codeChunks") },
  handler: async (ctx, { chunkId }) => {
    return await ctx.db.get(chunkId);
  },
});
