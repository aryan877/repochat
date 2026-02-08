import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator, type RunResult } from "@convex-dev/workpool";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { workflow } from "./workflowManager";

export const reviewWorkflow = workflow.define({
  args: {
    repoId: v.id("repos"),
    installationId: v.number(),
    prNumber: v.number(),
    prTitle: v.string(),
    prAuthor: v.string(),
    prUrl: v.string(),
    baseBranch: v.string(),
    headBranch: v.string(),
    reviewId: v.id("reviews"),
    owner: v.string(),
    repoName: v.string(),
  },
  handler: async (step, args) => {
    const {
      repoId,
      installationId,
      prNumber,
      prTitle,
      baseBranch,
      reviewId,
      owner,
      repoName,
    } = args;

    // Step 1: Update status to analyzing
    await step.runMutation(internal.reviewsMutations.updateReview, {
      reviewId,
      status: "analyzing" as const,
    });

    // Step 2: Fetch PR data (files, description, codebase context)
    const { files, prBody, codebaseContext } = await step.runAction(
      internal.reviews.fetchPRData,
      {
        installationId,
        owner,
        repoName,
        prNumber,
        prTitle,
        repoId,
        baseBranch,
      },
    );

    // Step 3: Update status to reviewing
    await step.runMutation(internal.reviewsMutations.updateReview, {
      reviewId,
      status: "reviewing" as const,
    });

    // Step 4: Generate review and post to GitHub
    const result = await step.runAction(
      internal.reviews.generateAndPostReview,
      {
        installationId,
        owner,
        repoName,
        prNumber,
        prTitle,
        prBody: prBody ?? undefined,
        files,
        codebaseContext,
        reviewId,
      },
    );

    // Step 5: Mark complete
    await step.runMutation(internal.reviewsMutations.updateReview, {
      reviewId,
      githubReviewId: result.githubReviewId,
      status: "completed" as const,
      completedAt: Date.now(),
    });
  },
});

/** Completion callback — marks review as failed if the workflow errors. */
export const onReviewComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.any(),
  },
  handler: async (ctx, args) => {
    const { reviewId } = args.context as { reviewId: string };
    const result = args.result as RunResult;
    if (result.kind === "failed" || result.kind === "canceled") {
      const errorMsg =
        result.kind === "failed"
          ? result.error
          : "Workflow canceled";
      await ctx.db.patch(reviewId as any, {
        status: "failed",
        error: errorMsg,
        completedAt: Date.now(),
      });
    }
  },
});
