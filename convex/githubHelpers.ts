import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

export const getConnection = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const updateLastUsed = internalMutation({
  args: { connectionId: v.id("githubConnections") },
  handler: async (ctx, { connectionId }) => {
    await ctx.db.patch(connectionId, { lastUsedAt: Date.now() });
  },
});

// Get repo by ID with user verification
export const getRepoById = internalQuery({
  args: {
    userId: v.id("users"),
    repoId: v.id("repos"),
  },
  handler: async (ctx, { userId, repoId }) => {
    const repo = await ctx.db.get(repoId);
    if (!repo || repo.userId !== userId) {
      return null;
    }
    return repo;
  },
});

// Get connection by clerkId (combines user lookup + connection lookup)
export const getConnectionByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) return null;

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return connection;
  },
});

// Get user and repo info for file operations
export const getRepoWithConnection = internalQuery({
  args: {
    clerkId: v.string(),
    repoId: v.id("repos"),
  },
  handler: async (ctx, { clerkId, repoId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) return null;

    const repo = await ctx.db.get(repoId);
    if (!repo || repo.userId !== user._id) {
      return null;
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) return null;

    return {
      user,
      repo,
      connection,
    };
  },
});
