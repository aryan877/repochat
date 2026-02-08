import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator, type RunResult } from "@convex-dev/workpool";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { workflow } from "./workflowManager";

const BATCH_SIZE = 5;

export const indexingWorkflow = workflow.define({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    triggerType: v.union(
      v.literal("manual"),
      v.literal("push"),
      v.literal("initial"),
    ),
    commitSha: v.optional(v.string()),
    jobId: v.id("indexingJobs"),
    installationId: v.number(),
    owner: v.string(),
    repoName: v.string(),
  },
  handler: async (step, args) => {
    const {
      repoId,
      branch,
      jobId,
      installationId,
      owner,
      repoName,
    } = args;

    // Step 1: Update status to cloning
    await step.runMutation(internal.indexingMutations.updateIndexingJob, {
      jobId,
      status: "cloning" as const,
    });

    // Step 2: Fetch tree + diff (retried automatically by workflow manager)
    const { toFetch, toDelete, skippedCount } = await step.runAction(
      internal.indexing.fetchRepoTreeAndDiff,
      { repoId, branch, installationId, owner, repoName },
    );

    // Step 3: Update status to parsing
    await step.runMutation(internal.indexingMutations.updateIndexingJob, {
      jobId,
      status: "parsing" as const,
      totalFiles: toFetch.length + toDelete.length,
      processedFiles: 0,
    });

    // Step 4: Delete stale files in batches
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      await step.runAction(internal.indexing.deleteStaleBatch, {
        repoId,
        branch,
        filePaths: batch.map((f: { filePath: string }) => f.filePath),
      });
    }

    // Step 5: Process changed files in batches (each batch checkpointed + retried)
    await step.runMutation(internal.indexingMutations.updateIndexingJob, {
      jobId,
      status: "embedding" as const,
    });

    let processedTotal = 0;
    let chunkTotal = 0;

    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      const batch = toFetch.slice(i, i + BATCH_SIZE);
      const result = await step.runAction(
        internal.indexing.processFileBatch,
        {
          repoId,
          branch,
          installationId,
          owner,
          repoName,
          files: batch,
          jobId,
        },
      );

      processedTotal += result.processedCount;
      chunkTotal += result.chunkCount;

      await step.runMutation(internal.indexingMutations.updateIndexingJob, {
        jobId,
        processedFiles: processedTotal,
        totalChunks: chunkTotal,
        storedChunks: chunkTotal,
      });
    }

    // Step 6: Mark complete
    await step.runMutation(internal.repos.markBranchIndexed, {
      repoId,
      branch,
    });
    await step.runMutation(internal.indexingMutations.updateIndexingJob, {
      jobId,
      status: "completed" as const,
      completedAt: Date.now(),
    });
  },
});

/** Completion callback — marks job as failed if the workflow errors. */
export const onIndexingComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId } = args.context as { jobId: string };
    const result = args.result as RunResult;
    if (result.kind === "failed" || result.kind === "canceled") {
      const errorMsg =
        result.kind === "failed"
          ? result.error
          : "Workflow canceled";
      await ctx.db.patch(jobId as any, {
        status: "failed",
        error: errorMsg,
        completedAt: Date.now(),
      });
    }
  },
});
