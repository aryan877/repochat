import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create installation record
export const createInstallation = internalMutation({
  args: {
    installationId: v.number(),
    accountId: v.number(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
    accountAvatarUrl: v.optional(v.string()),
    permissions: v.object({
      contents: v.optional(v.string()),
      pullRequests: v.optional(v.string()),
      issues: v.optional(v.string()),
      metadata: v.optional(v.string()),
    }),
    repositorySelection: v.union(v.literal("all"), v.literal("selected")),
  },
  handler: async (ctx, args) => {
    // Check if installation already exists
    const existing = await ctx.db
      .query("installations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("installations", {
      ...args,
      installedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Delete installation and all associated data
export const deleteInstallation = internalMutation({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) => {
    const installation = await ctx.db
      .query("installations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", installationId))
      .first();

    if (!installation) return;

    // Delete all repos
    const repos = await ctx.db
      .query("repos")
      .withIndex("by_installation", (q) => q.eq("installationId", installation._id))
      .collect();

    for (const repo of repos) {
      // Delete code chunks
      const chunks = await ctx.db
        .query("codeChunks")
        .withIndex("by_repo", (q) => q.eq("repoId", repo._id))
        .collect();
      for (const chunk of chunks) {
        await ctx.db.delete(chunk._id);
      }

      // Delete reviews
      const reviews = await ctx.db
        .query("reviews")
        .withIndex("by_repo", (q) => q.eq("repoId", repo._id))
        .collect();
      for (const review of reviews) {
        await ctx.db.delete(review._id);
      }

      // Delete indexing jobs
      const jobs = await ctx.db
        .query("indexingJobs")
        .withIndex("by_repo", (q) => q.eq("repoId", repo._id))
        .collect();
      for (const job of jobs) {
        await ctx.db.delete(job._id);
      }

      await ctx.db.delete(repo._id);
    }

    await ctx.db.delete(installation._id);
  },
});

// Suspend installation
export const suspendInstallation = internalMutation({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) => {
    const installation = await ctx.db
      .query("installations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", installationId))
      .first();

    if (installation) {
      await ctx.db.patch(installation._id, {
        suspendedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Unsuspend installation
export const unsuspendInstallation = internalMutation({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) => {
    const installation = await ctx.db
      .query("installations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", installationId))
      .first();

    if (installation) {
      await ctx.db.patch(installation._id, {
        suspendedAt: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

// Add repo to installation
export const addRepo = internalMutation({
  args: {
    installationId: v.number(),
    githubRepoId: v.number(),
    fullName: v.string(),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, { installationId, githubRepoId, fullName, isPrivate }) => {
    // Get installation
    const installation = await ctx.db
      .query("installations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", installationId))
      .first();

    if (!installation) {
      throw new Error(`Installation ${installationId} not found`);
    }

    // Check if repo already exists
    const existing = await ctx.db
      .query("repos")
      .withIndex("by_github_repo_id", (q) => q.eq("githubRepoId", githubRepoId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Parse owner/name from fullName
    const [owner, name] = fullName.split("/");

    return await ctx.db.insert("repos", {
      installationId: installation._id,
      githubRepoId,
      owner,
      name,
      fullName,
      defaultBranch: "main", // Will be updated on first index
      isPrivate,
      indexedBranches: [],
      autoReview: true, // Enable auto-review by default
      reviewDrafts: false,
      addedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Remove repo from installation
export const removeRepo = internalMutation({
  args: {
    installationId: v.number(),
    githubRepoId: v.number(),
  },
  handler: async (ctx, { githubRepoId }) => {
    const repo = await ctx.db
      .query("repos")
      .withIndex("by_github_repo_id", (q) => q.eq("githubRepoId", githubRepoId))
      .first();

    if (!repo) return;

    // Delete associated data
    const chunks = await ctx.db
      .query("codeChunks")
      .withIndex("by_repo", (q) => q.eq("repoId", repo._id))
      .collect();
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_repo", (q) => q.eq("repoId", repo._id))
      .collect();
    for (const review of reviews) {
      await ctx.db.delete(review._id);
    }

    const jobs = await ctx.db
      .query("indexingJobs")
      .withIndex("by_repo", (q) => q.eq("repoId", repo._id))
      .collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }

    await ctx.db.delete(repo._id);
  },
});

// Get repo by full name
export const getRepoByFullName = internalQuery({
  args: { fullName: v.string() },
  handler: async (ctx, { fullName }) => {
    return await ctx.db
      .query("repos")
      .withIndex("by_full_name", (q) => q.eq("fullName", fullName))
      .first();
  },
});

// Get repo by ID (public query)
export const getRepo = query({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    return await ctx.db.get(repoId);
  },
});

// Get repo by ID (internal query for actions)
export const getRepoInternal = internalQuery({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    return await ctx.db.get(repoId);
  },
});

// List all installations
export const listInstallations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("installations").collect();
  },
});

// List repos for installation
export const listRepos = query({
  args: { installationId: v.id("installations") },
  handler: async (ctx, { installationId }) => {
    return await ctx.db
      .query("repos")
      .withIndex("by_installation", (q) => q.eq("installationId", installationId))
      .collect();
  },
});

// Update repo settings
export const updateRepoSettings = mutation({
  args: {
    repoId: v.id("repos"),
    autoReview: v.optional(v.boolean()),
    reviewDrafts: v.optional(v.boolean()),
  },
  handler: async (ctx, { repoId, autoReview, reviewDrafts }) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (autoReview !== undefined) updates.autoReview = autoReview;
    if (reviewDrafts !== undefined) updates.reviewDrafts = reviewDrafts;

    await ctx.db.patch(repoId, updates);
  },
});

// Mark branch as indexed
export const markBranchIndexed = internalMutation({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
  },
  handler: async (ctx, { repoId, branch }) => {
    const repo = await ctx.db.get(repoId);
    if (!repo) return;

    const indexedBranches = repo.indexedBranches.includes(branch)
      ? repo.indexedBranches
      : [...repo.indexedBranches, branch];

    await ctx.db.patch(repoId, {
      indexedBranches,
      lastIndexedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get installation by ID
export const getInstallation = internalQuery({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) => {
    return await ctx.db
      .query("installations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", installationId))
      .first();
  },
});

// Get installation ID for a repo
export const getRepoInstallationId = internalQuery({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    const repo = await ctx.db.get(repoId);
    if (!repo) return null;

    const installation = await ctx.db.get(repo.installationId);
    return installation?.installationId ?? null;
  },
});
