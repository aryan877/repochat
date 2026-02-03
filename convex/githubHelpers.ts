import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// Get user's installation ID for internal use
export const getUserInstallationIdInternal = internalQuery({
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

// Get repo with installation ID
export const getRepoWithInstallation = internalQuery({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    const repo = await ctx.db.get(repoId);
    if (!repo) return null;

    const installation = await ctx.db.get(repo.installationId);
    if (!installation) return null;

    return {
      repo,
      installationId: installation.installationId,
    };
  },
});
