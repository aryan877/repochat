import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Store incoming webhook event
export const storeWebhookEvent = internalMutation({
  args: {
    eventType: v.string(),
    action: v.optional(v.string()),
    deliveryId: v.string(),
    installationId: v.optional(v.number()),
    repositoryId: v.optional(v.number()),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate delivery
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_delivery_id", (q) => q.eq("deliveryId", args.deliveryId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("webhookEvents", {
      ...args,
      status: "pending",
      receivedAt: Date.now(),
    });
  },
});

// Update webhook event status
export const updateWebhookStatus = internalMutation({
  args: {
    deliveryId: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { deliveryId, status, error }) => {
    const event = await ctx.db
      .query("webhookEvents")
      .withIndex("by_delivery_id", (q) => q.eq("deliveryId", deliveryId))
      .first();

    if (event) {
      await ctx.db.patch(event._id, {
        status,
        error,
        processedAt: Date.now(),
      });
    }
  },
});
