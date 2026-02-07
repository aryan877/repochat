import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserMcpServers = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("userMcpServers")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .collect();
  },
});

export const addMcpServer = mutation({
  args: {
    clerkId: v.string(),
    provider: v.string(),
    label: v.string(),
    url: v.string(),
    transport: v.union(v.literal("http"), v.literal("sse")),
    authHeader: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, provider, label, url, transport, authHeader }) => {
    return await ctx.db.insert("userMcpServers", {
      clerkId,
      provider,
      label,
      url,
      transport,
      headers: {
        Authorization: authHeader,
      },
      createdAt: Date.now(),
    });
  },
});

export const removeMcpServer = mutation({
  args: { id: v.id("userMcpServers") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
