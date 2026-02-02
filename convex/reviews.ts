import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get reviews for a user
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
  },
});

// Get review by ID with findings
export const getWithFindings = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }) => {
    const review = await ctx.db.get(reviewId);
    if (!review) return null;

    const findings = await ctx.db
      .query("findings")
      .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
      .collect();

    return { ...review, findings };
  },
});

// Create a new review
export const create = mutation({
  args: {
    userId: v.id("users"),
    repoId: v.id("repos"),
    prNumber: v.number(),
    prTitle: v.string(),
    prUrl: v.string(),
    prAuthor: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reviews", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Update review status
export const updateStatus = mutation({
  args: {
    reviewId: v.id("reviews"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, { reviewId, status, summary }) => {
    const updates: Record<string, unknown> = { status };
    if (summary) updates.summary = summary;
    if (status === "completed") updates.completedAt = Date.now();

    await ctx.db.patch(reviewId, updates);
  },
});

// Add a finding to a review
export const addFinding = mutation({
  args: {
    reviewId: v.id("reviews"),
    type: v.union(
      v.literal("security"),
      v.literal("bug"),
      v.literal("performance"),
      v.literal("code_quality"),
      v.literal("test_coverage"),
      v.literal("documentation")
    ),
    severity: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    title: v.string(),
    description: v.string(),
    filePath: v.string(),
    lineStart: v.optional(v.number()),
    lineEnd: v.optional(v.number()),
    suggestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("findings", {
      ...args,
      resolved: false,
      createdAt: Date.now(),
    });
  },
});

// Mark finding as resolved
export const resolveFinding = mutation({
  args: { findingId: v.id("findings") },
  handler: async (ctx, { findingId }) => {
    await ctx.db.patch(findingId, { resolved: true });
  },
});

// Get unresolved findings count for a review
export const getUnresolvedCount = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }) => {
    const findings = await ctx.db
      .query("findings")
      .withIndex("by_resolved", (q) =>
        q.eq("reviewId", reviewId).eq("resolved", false)
      )
      .collect();

    return findings.length;
  },
});

// Record a posted comment
export const addComment = mutation({
  args: {
    reviewId: v.id("reviews"),
    findingId: v.optional(v.id("findings")),
    githubCommentId: v.optional(v.number()),
    body: v.string(),
    filePath: v.optional(v.string()),
    line: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("comments", {
      ...args,
      postedAt: Date.now(),
    });
  },
});
