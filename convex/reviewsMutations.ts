import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

// Create a review record
export const createReview = internalMutation({
  args: {
    repoId: v.id("repos"),
    prNumber: v.number(),
    prTitle: v.string(),
    prAuthor: v.string(),
    prUrl: v.string(),
    baseBranch: v.string(),
    headBranch: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing review
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_repo_pr", (q) => q.eq("repoId", args.repoId).eq("prNumber", args.prNumber))
      .first();

    if (existing) {
      // Update existing review
      await ctx.db.patch(existing._id, {
        ...args,
        status: "pending",
        triggeredAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("reviews", {
      ...args,
      status: "pending",
      triggeredAt: Date.now(),
    });
  },
});

// Update review status
export const updateReview = internalMutation({
  args: {
    reviewId: v.id("reviews"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("analyzing"),
        v.literal("reviewing"),
        v.literal("posting"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    workflowId: v.optional(v.string()),
    summary: v.optional(v.string()),
    findings: v.optional(
      v.array(
        v.object({
          type: v.string(),
          severity: v.string(),
          title: v.string(),
          description: v.string(),
          filePath: v.string(),
          line: v.optional(v.number()),
          suggestion: v.optional(v.string()),
        })
      )
    ),
    summaryCommentId: v.optional(v.number()),
    githubReviewId: v.optional(v.number()),
    error: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, { reviewId, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(reviewId, filtered);
    }
  },
});

// Get review by ID
export const getReview = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }) => {
    return await ctx.db.get(reviewId);
  },
});

// List reviews for a repo
export const listRepoReviews = query({
  args: { repoId: v.id("repos") },
  handler: async (ctx, { repoId }) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_repo", (q) => q.eq("repoId", repoId))
      .order("desc")
      .take(50);
  },
});

// Get review for specific PR
export const getReviewForPR = internalQuery({
  args: {
    repoId: v.id("repos"),
    prNumber: v.number(),
  },
  handler: async (ctx, { repoId, prNumber }) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_repo_pr", (q) => q.eq("repoId", repoId).eq("prNumber", prNumber))
      .first();
  },
});
