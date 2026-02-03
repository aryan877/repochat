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
  },
  handler: async (ctx, args) => {
    // Create composite key for efficient vector search filtering
    // This is the industry-standard pattern for multi-field filtering in vector DBs
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
