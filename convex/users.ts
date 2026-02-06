import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create user by Clerk ID
export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, email, name, avatarUrl }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        avatarUrl,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      avatarUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get GitHub connection status for a user
export const getGitHubStatus = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return { connected: false };
    }

    if (!user.githubInstallationId) {
      return { connected: false };
    }

    const installation = await ctx.db.get(user.githubInstallationId);
    if (!installation || installation.suspendedAt) {
      return { connected: false };
    }

    return {
      connected: true,
      github: {
        username: user.githubUsername || installation.accountLogin,
        avatarUrl: user.githubAvatarUrl || installation.accountAvatarUrl,
        installationId: installation.installationId,
      },
    };
  },
});

// Get connected repos for a user
export const getConnectedRepos = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user?.githubInstallationId) {
      return [];
    }

    const repos = await ctx.db
      .query("repos")
      .withIndex("by_installation", (q) =>
        q.eq("installationId", user.githubInstallationId!)
      )
      .collect();

    return repos.map((repo) => ({
      _id: repo._id,
      name: repo.name,
      owner: repo.owner,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      isPrivate: repo.isPrivate,
      autoReview: repo.autoReview ?? false,
      lastIndexedAt: repo.lastIndexedAt,
      indexedBranches: repo.indexedBranches ?? [],
    }));
  },
});

// Link user to GitHub installation
export const linkGitHubInstallation = mutation({
  args: {
    clerkId: v.string(),
    installationId: v.number(),
    githubUsername: v.optional(v.string()),
    githubAvatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, installationId, githubUsername, githubAvatarUrl }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Find the installation record
    const installation = await ctx.db
      .query("installations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", installationId))
      .first();

    if (!installation) {
      throw new Error("Installation not found");
    }

    await ctx.db.patch(user._id, {
      githubInstallationId: installation._id,
      githubUsername: githubUsername || installation.accountLogin,
      githubAvatarUrl: githubAvatarUrl || installation.accountAvatarUrl,
      updatedAt: Date.now(),
    });
  },
});

// Unlink GitHub from user
export const unlinkGitHub = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) return;

    await ctx.db.patch(user._id, {
      githubInstallationId: undefined,
      githubUsername: undefined,
      githubAvatarUrl: undefined,
      updatedAt: Date.now(),
    });
  },
});

// Get user's installation ID (for internal use)
export const getUserInstallationId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user?.githubInstallationId) {
      return null;
    }

    const installation = await ctx.db.get(user.githubInstallationId);
    return installation?.installationId ?? null;
  },
});

// Update repo settings (auto-review, etc.)
export const updateRepoSettings = mutation({
  args: {
    repoId: v.id("repos"),
    autoReview: v.optional(v.boolean()),
    reviewDrafts: v.optional(v.boolean()),
    securityOnly: v.optional(v.boolean()),
    autoApprove: v.optional(v.boolean()),
  },
  handler: async (ctx, { repoId, autoReview, reviewDrafts, securityOnly, autoApprove }) => {
    const repo = await ctx.db.get(repoId);
    if (!repo) {
      throw new Error("Repository not found");
    }

    const updates: Record<string, boolean | undefined> = {};
    if (autoReview !== undefined) updates.autoReview = autoReview;
    if (reviewDrafts !== undefined) updates.reviewDrafts = reviewDrafts;
    if (securityOnly !== undefined) updates.securityOnly = securityOnly;
    if (autoApprove !== undefined) updates.autoApprove = autoApprove;

    await ctx.db.patch(repoId, updates);
  },
});
