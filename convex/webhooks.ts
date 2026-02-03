"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Handle GitHub App installation
export const handleInstallation = internalAction({
  args: {
    action: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { action, payload }) => {
    const installation = payload.installation;

    if (action === "created") {
      // New installation - store it
      await ctx.runMutation(internal.repos.createInstallation, {
        installationId: installation.id,
        accountId: installation.account.id,
        accountLogin: installation.account.login,
        accountType: installation.account.type,
        accountAvatarUrl: installation.account.avatar_url,
        permissions: {
          contents: installation.permissions?.contents,
          pullRequests: installation.permissions?.pull_requests,
          issues: installation.permissions?.issues,
          metadata: installation.permissions?.metadata,
        },
        repositorySelection: installation.repository_selection,
      });

      // Add initial repositories if any
      if (payload.repositories && payload.repositories.length > 0) {
        for (const repo of payload.repositories) {
          await ctx.runMutation(internal.repos.addRepo, {
            installationId: installation.id,
            githubRepoId: repo.id,
            fullName: repo.full_name,
            isPrivate: repo.private,
          });
        }
      }
    } else if (action === "deleted") {
      // Installation removed - clean up
      await ctx.runMutation(internal.repos.deleteInstallation, {
        installationId: installation.id,
      });
    } else if (action === "suspend") {
      await ctx.runMutation(internal.repos.suspendInstallation, {
        installationId: installation.id,
      });
    } else if (action === "unsuspend") {
      await ctx.runMutation(internal.repos.unsuspendInstallation, {
        installationId: installation.id,
      });
    }
  },
});

// Handle repository added/removed from installation
export const handleInstallationRepos = internalAction({
  args: {
    action: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { action, payload }) => {
    const installationId = payload.installation.id;

    if (action === "added" && payload.repositories_added) {
      for (const repo of payload.repositories_added) {
        await ctx.runMutation(internal.repos.addRepo, {
          installationId,
          githubRepoId: repo.id,
          fullName: repo.full_name,
          isPrivate: repo.private,
        });
      }
    } else if (action === "removed" && payload.repositories_removed) {
      for (const repo of payload.repositories_removed) {
        await ctx.runMutation(internal.repos.removeRepo, {
          installationId,
          githubRepoId: repo.id,
        });
      }
    }
  },
});

// Handle push event (trigger re-indexing)
export const handlePush = internalAction({
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    const installationId = payload.installation?.id;
    const repoFullName = payload.repository?.full_name;
    const branch = payload.ref?.replace("refs/heads/", "");
    const commitSha = payload.after;

    if (!installationId || !repoFullName || !branch) {
      console.log("Missing required push data");
      return;
    }

    // Get repo from DB
    const repo = await ctx.runQuery(internal.repos.getRepoByFullName, {
      fullName: repoFullName,
    });

    if (!repo) {
      console.log(`Repo not found: ${repoFullName}`);
      return;
    }

    // Check if this branch is indexed
    if (!repo.indexedBranches.includes(branch)) {
      console.log(`Branch ${branch} not indexed for ${repoFullName}`);
      return;
    }

    // Trigger re-indexing workflow
    await ctx.runAction(internal.indexing.startIndexing, {
      repoId: repo._id,
      branch,
      triggerType: "push",
      commitSha,
    });
  },
});

// Handle pull request event (trigger review)
export const handlePullRequest = internalAction({
  args: {
    action: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { action, payload }) => {
    const installationId = payload.installation?.id;
    const repoFullName = payload.repository?.full_name;
    const pr = payload.pull_request;

    if (!installationId || !repoFullName || !pr) {
      console.log("Missing required PR data");
      return;
    }

    // Get repo from DB
    const repo = await ctx.runQuery(internal.repos.getRepoByFullName, {
      fullName: repoFullName,
    });

    if (!repo) {
      console.log(`Repo not found: ${repoFullName}`);
      return;
    }

    // Check if auto-review is enabled
    if (!repo.autoReview) {
      console.log(`Auto-review disabled for ${repoFullName}`);
      return;
    }

    // Check if we should review drafts
    if (pr.draft && !repo.reviewDrafts) {
      console.log(`Skipping draft PR for ${repoFullName}`);
      return;
    }

    // Trigger PR review
    await ctx.runAction(internal.reviews.startReview, {
      repoId: repo._id,
      installationId,
      prNumber: pr.number,
      prTitle: pr.title,
      prAuthor: pr.user.login,
      prUrl: pr.html_url,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      headSha: pr.head.sha,
    });
  },
});
