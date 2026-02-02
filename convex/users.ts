import { mutation, query, internalMutation } from "./_generated/server";
import { v, Validator } from "convex/values";
import { UserJSON } from "@clerk/backend";

// Upsert user from Clerk webhook
export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  async handler(ctx, { data }) {
    const userAttributes = {
      clerkId: data.id,
      email: data.email_addresses?.[0]?.email_address || "",
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || undefined,
      imageUrl: data.image_url || undefined,
      createdAt: Date.now(),
    };

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", data.id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: userAttributes.email,
        name: userAttributes.name,
        imageUrl: userAttributes.imageUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", userAttributes);
  },
});

// Delete user from Clerk webhook
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
      .first();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

// Get user by Clerk ID
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

// Create or update user
export const upsert = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, email, name, imageUrl }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { email, name, imageUrl });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      imageUrl,
      createdAt: Date.now(),
    });
  },
});

// Get GitHub connection status (safe - no token exposed)
export const getGitHubStatus = query({
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

    if (!connection) {
      return {
        connected: false,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      };
    }

    // Never expose the token to the client
    return {
      connected: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      github: {
        username: connection.githubUsername,
        avatarUrl: connection.githubAvatarUrl,
        scope: connection.scope,
        connectedAt: connection.connectedAt,
        lastUsedAt: connection.lastUsedAt,
      },
    };
  },
});

// Store GitHub connection (called from server-side OAuth callback)
export const storeGitHubConnection = internalMutation({
  args: {
    clerkId: v.string(),
    githubId: v.number(),
    githubUsername: v.string(),
    githubAvatarUrl: v.optional(v.string()),
    accessToken: v.string(),
    tokenType: v.string(),
    scope: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found. Please ensure Clerk webhook is configured.");
    }

    // Check for existing connection
    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        githubId: args.githubId,
        githubUsername: args.githubUsername,
        githubAvatarUrl: args.githubAvatarUrl,
        accessToken: args.accessToken,
        tokenType: args.tokenType,
        scope: args.scope,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        lastUsedAt: now,
      });

      // Log the action
      await ctx.db.insert("auditLog", {
        userId: user._id,
        action: "github_reconnect",
        details: JSON.stringify({
          githubUsername: args.githubUsername,
          scope: args.scope,
        }),
        timestamp: now,
      });

      return existing._id;
    }

    // Create new connection
    const connectionId = await ctx.db.insert("githubConnections", {
      userId: user._id,
      githubId: args.githubId,
      githubUsername: args.githubUsername,
      githubAvatarUrl: args.githubAvatarUrl,
      accessToken: args.accessToken,
      tokenType: args.tokenType,
      scope: args.scope,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      connectedAt: now,
      lastUsedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "github_connect",
      details: JSON.stringify({
        githubUsername: args.githubUsername,
        scope: args.scope,
      }),
      timestamp: now,
    });

    return connectionId;
  },
});

// Disconnect GitHub (user-initiated)
export const disconnectGitHub = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) {
      return { success: true, message: "No connection to disconnect" };
    }

    // Delete all connected repos for this connection
    const repos = await ctx.db
      .query("repos")
      .withIndex("by_connection", (q) => q.eq("connectionId", connection._id))
      .collect();

    for (const repo of repos) {
      await ctx.db.delete(repo._id);
    }

    // Delete the connection
    await ctx.db.delete(connection._id);

    // Log the action
    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "github_disconnect",
      details: JSON.stringify({
        githubUsername: connection.githubUsername,
        reposRemoved: repos.length,
      }),
      timestamp: Date.now(),
    });

    return { success: true, message: "GitHub disconnected" };
  },
});

// Get user's connected repos (safe - returns repo info, not tokens)
export const getConnectedRepos = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("repos")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Add repository to connected list
export const connectRepo = mutation({
  args: {
    clerkId: v.string(),
    githubRepoId: v.number(),
    owner: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    defaultBranch: v.string(),
    isPrivate: v.boolean(),
    permissions: v.object({
      admin: v.boolean(),
      push: v.boolean(),
      pull: v.boolean(),
      maintain: v.optional(v.boolean()),
      triage: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) {
      throw new Error("GitHub not connected");
    }

    const fullName = `${args.owner}/${args.name}`;

    // Check if already connected
    const existing = await ctx.db
      .query("repos")
      .withIndex("by_github_repo_id", (q) => q.eq("githubRepoId", args.githubRepoId))
      .first();

    if (existing && existing.userId === user._id) {
      // Update existing
      await ctx.db.patch(existing._id, {
        description: args.description,
        defaultBranch: args.defaultBranch,
        permissions: args.permissions,
        lastSyncedAt: Date.now(),
      });
      return existing._id;
    }

    const now = Date.now();

    const repoId = await ctx.db.insert("repos", {
      userId: user._id,
      connectionId: connection._id,
      githubRepoId: args.githubRepoId,
      owner: args.owner,
      name: args.name,
      fullName,
      description: args.description,
      defaultBranch: args.defaultBranch,
      isPrivate: args.isPrivate,
      permissions: args.permissions,
      connectedAt: now,
      lastSyncedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "repo_add",
      details: JSON.stringify({ fullName, isPrivate: args.isPrivate }),
      timestamp: now,
    });

    return repoId;
  },
});

// Remove repository from connected list
export const disconnectRepo = mutation({
  args: {
    clerkId: v.string(),
    repoId: v.id("repos"),
  },
  handler: async (ctx, { clerkId, repoId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const repo = await ctx.db.get(repoId);

    if (!repo || repo.userId !== user._id) {
      throw new Error("Repository not found or access denied");
    }

    await ctx.db.delete(repoId);

    // Log the action
    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "repo_remove",
      details: JSON.stringify({ fullName: repo.fullName }),
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Internal: Update last used timestamp
export const updateLastUsed = internalMutation({
  args: { connectionId: v.id("githubConnections") },
  handler: async (ctx, { connectionId }) => {
    await ctx.db.patch(connectionId, { lastUsedAt: Date.now() });
  },
});
