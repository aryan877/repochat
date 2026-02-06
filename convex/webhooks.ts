"use node";

/**
 * GitHub Webhook Handlers
 *
 * Payloads are typed using @octokit/webhooks-types.
 * Signature verification happens in http.ts before these handlers are called.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type {
  InstallationCreatedEvent,
  InstallationDeletedEvent,
  InstallationSuspendEvent,
  InstallationUnsuspendEvent,
  InstallationRepositoriesAddedEvent,
  InstallationRepositoriesRemovedEvent,
  PushEvent,
  PullRequestOpenedEvent,
  PullRequestSynchronizeEvent,
} from "@octokit/webhooks-types";

type InstallationEvent =
  | InstallationCreatedEvent
  | InstallationDeletedEvent
  | InstallationSuspendEvent
  | InstallationUnsuspendEvent;

export const handleInstallation = internalAction({
  args: {
    action: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { action, payload }) => {
    const event = payload as InstallationEvent;
    const installation = event.installation;

    if (action === "created") {
      const createdEvent = payload as InstallationCreatedEvent;
      await ctx.runMutation(internal.repos.createInstallation, {
        installationId: installation.id,
        accountId: installation.account.id,
        accountLogin: installation.account.login,
        accountType: installation.account.type as "User" | "Organization",
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
      if (createdEvent.repositories && createdEvent.repositories.length > 0) {
        for (const repo of createdEvent.repositories) {
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

export const handleInstallationRepos = internalAction({
  args: {
    action: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { action, payload }) => {
    if (action === "added") {
      const event = payload as InstallationRepositoriesAddedEvent;
      const installationId = event.installation.id;

      for (const repo of event.repositories_added) {
        await ctx.runMutation(internal.repos.addRepo, {
          installationId,
          githubRepoId: repo.id,
          fullName: repo.full_name,
          isPrivate: repo.private,
        });
      }
    } else if (action === "removed") {
      const event = payload as InstallationRepositoriesRemovedEvent;
      const installationId = event.installation.id;

      for (const repo of event.repositories_removed) {
        await ctx.runMutation(internal.repos.removeRepo, {
          installationId,
          githubRepoId: repo.id,
        });
      }
    }
  },
});

export const handlePush = internalAction({
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    const event = payload as PushEvent;

    const installationId = event.installation?.id;
    const repoFullName = event.repository.full_name;
    const branch = event.ref.replace("refs/heads/", "");
    const commitSha = event.after;

    if (!installationId) {
      console.log("Missing installation ID in push event");
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

type PullRequestEvent = PullRequestOpenedEvent | PullRequestSynchronizeEvent;

export const handlePullRequest = internalAction({
  args: {
    action: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { action: _action, payload }) => {
    const event = payload as PullRequestEvent;

    const installationId = event.installation?.id;
    const repoFullName = event.repository.full_name;
    const pr = event.pull_request;

    if (!installationId) {
      console.log("Missing installation ID in PR event");
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
      prAuthor: pr.user?.login ?? "unknown",
      prUrl: pr.html_url,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      headSha: pr.head.sha,
    });
  },
});
