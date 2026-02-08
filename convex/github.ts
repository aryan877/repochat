"use node";

import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

// ============================================================
// OCTOKIT CLIENT FACTORY
// ============================================================

function createOctokitForInstallation(installationId: number): Octokit {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error("GitHub App credentials not configured");
  }

  // Handle escaped newlines in private key
  const formattedKey = privateKey.replace(/\\n/g, "\n");

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey: formattedKey,
      installationId,
    },
  });
}

// Helper to get user's installation ID
async function getUserInstallation(
  ctx: ActionCtx,
  clerkId: string
): Promise<number> {
  const installationId = await ctx.runQuery(
    internal.githubHelpers.getUserInstallationIdInternal,
    { clerkId }
  );
  if (!installationId) {
    throw new Error("GitHub not connected. Please connect your GitHub account first.");
  }
  return installationId;
}

// ============================================================
// INTERNAL ACTIONS (for webhooks and indexing)
// ============================================================

// Get installation access token (legacy - kept for compatibility)
export const getInstallationToken = internalAction({
  args: { installationId: v.number() },
  handler: async (_, { installationId }): Promise<string> => {
    const octokit = createOctokitForInstallation(installationId);
    const auth = await octokit.auth({ type: "installation" }) as { token: string };
    return auth.token;
  },
});

// Get repository content tree (for indexing) - with pagination
export const getRepoContent = internalAction({
  args: {
    installationId: v.number(),
    owner: v.string(),
    repo: v.string(),
    branch: v.string(),
  },
  handler: async (_, { installationId, owner, repo, branch }) => {
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: "true",
    });

    return {
      tree: data.tree.map((item) => ({
        path: item.path || "",
        type: item.type || "",
        sha: item.sha || "",
        size: item.size,
      })),
      truncated: data.truncated || false,
    };
  },
});

// Get file content (internal)
export const getFileContent = internalAction({
  args: {
    installationId: v.number(),
    owner: v.string(),
    repo: v.string(),
    path: v.string(),
    ref: v.string(),
  },
  handler: async (_, { installationId, owner, repo, path, ref }) => {
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new Error(`Path ${path} is not a file`);
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return { content, sha: data.sha };
  },
});

// Get pull request details (internal)
export const getPullRequest = internalAction({
  args: {
    installationId: v.number(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
  },
  handler: async (_, { installationId, owner, repo, prNumber }) => {
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      user: { login: data.user?.login || "unknown" },
      head: { ref: data.head.ref, sha: data.head.sha },
      base: { ref: data.base.ref, sha: data.base.sha },
      html_url: data.html_url,
      additions: data.additions,
      deletions: data.deletions,
      changed_files: data.changed_files,
    };
  },
});

// Get pull request files - WITH PAGINATION
export const getPullRequestFiles = internalAction({
  args: {
    installationId: v.number(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
  },
  handler: async (_, { installationId, owner, repo, prNumber }) => {
    const octokit = createOctokitForInstallation(installationId);

    // Use pagination to get ALL files
    const files = await octokit.paginate(octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    return files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
    }));
  },
});

// Post review comment on PR (internal)
export const postReviewComment = internalAction({
  args: {
    installationId: v.number(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
    body: v.string(),
    event: v.union(
      v.literal("APPROVE"),
      v.literal("REQUEST_CHANGES"),
      v.literal("COMMENT")
    ),
  },
  handler: async (_, { installationId, owner, repo, prNumber, body, event }) => {
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body,
      event,
    });

    return { id: data.id, html_url: data.html_url };
  },
});

// Post line comment on PR (internal)
export const postLineComment = internalAction({
  args: {
    installationId: v.number(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
    body: v.string(),
    path: v.string(),
    line: v.number(),
    commitSha: v.string(),
  },
  handler: async (_, { installationId, owner, repo, prNumber, body, path, line, commitSha }) => {
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      body,
      commit_id: commitSha,
      path,
      line,
      side: "RIGHT",
    });

    return { id: data.id };
  },
});

// List installation repositories - WITH PAGINATION
export const listInstallationRepos = action({
  args: { installationId: v.number() },
  handler: async (_, { installationId }) => {
    const octokit = createOctokitForInstallation(installationId);

    // Use pagination to get ALL repos
    const repos = await octokit.paginate(octokit.apps.listReposAccessibleToInstallation, {
      per_page: 100,
    });

    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: { login: repo.owner?.login || "" },
      private: repo.private,
      default_branch: repo.default_branch,
      description: repo.description,
    }));
  },
});

// ============================================================
// PUBLIC ACTIONS (for frontend via Clerk authentication)
// ============================================================

// List pull requests - WITH PAGINATION
export const listPullRequests = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    state: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("all"))),
  },
  handler: async (ctx, { clerkId, owner, repo, state = "open" }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const prs = await octokit.paginate(
      octokit.pulls.list,
      {
        owner,
        repo,
        state,
        per_page: 100,
      },
      (response, done) => {
        if (response.data.length >= 200) {
          done();
        }
        return response.data;
      }
    );

    return prs.slice(0, 200);
  },
});

// List branches - WITH PAGINATION
export const listBranches = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, { clerkId, owner, repo }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const branches = await octokit.paginate(octokit.repos.listBranches, {
      owner,
      repo,
      per_page: 100,
    });

    return branches;
  },
});

// Get pull request (public action)
export const getPullRequestPublic = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return data;
  },
});

// Get pull request files (public) - WITH PAGINATION
export const getPullRequestFilesPublic = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const files = await octokit.paginate(octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    return files;
  },
});

// Get file content (public action)
export const getFileContentPublic = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    path: v.string(),
    ref: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, owner, repo, path, ref = "main" }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new Error(`Path ${path} is not a file`);
    }

    // Decode base64 content and return full data
    return {
      ...data,
      content: Buffer.from(data.content, "base64").toString("utf-8"),
    };
  },
});

// Post review comment (public action)
export const postReviewCommentPublic = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
    body: v.string(),
    path: v.optional(v.string()),
    line: v.optional(v.number()),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber, body, path, line }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    if (path && line) {
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      const { data } = await octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        body,
        commit_id: pr.head.sha,
        path,
        line,
        side: "RIGHT",
      });

      return data;
    } else {
      const { data } = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });

      return data;
    }
  },
});

// Create review (submit as review with approval/changes)
export const createReview = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
    body: v.string(),
    event: v.union(
      v.literal("APPROVE"),
      v.literal("REQUEST_CHANGES"),
      v.literal("COMMENT")
    ),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber, body, event }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body,
      event,
    });

    return data;
  },
});

// Merge pull request
export const mergePullRequest = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
    commitTitle: v.optional(v.string()),
    commitMessage: v.optional(v.string()),
    mergeMethod: v.optional(v.union(v.literal("merge"), v.literal("squash"), v.literal("rebase"))),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber, commitTitle, commitMessage, mergeMethod = "squash" }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      commit_title: commitTitle,
      commit_message: commitMessage,
      merge_method: mergeMethod,
    });

    return data;
  },
});

// Get repo tree (public action)
export const getRepoTree = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, owner, repo, branch = "main" }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: "true",
    });

    return data;
  },
});

// Search code — uses indexed vector search when available, falls back to GitHub API
export const searchCode = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    query: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, owner, repo, query, branch }): Promise<{
    source: "indexed" | "github";
    branch: string | null;
    totalCount: number;
    items: Array<{
      name: string;
      path: string;
      url: string;
      code?: string;
      docstring?: string;
      startLine?: number;
      endLine?: number;
      chunkType?: string;
      language?: string;
      score?: number;
    }>;
  }> => {
    const installationId = await getUserInstallation(ctx, clerkId);

    // Try indexed search first
    const fullName = `${owner}/${repo}`;
    const repoDoc = await ctx.runQuery(internal.repos.getRepoByFullName, { fullName });

    if (repoDoc && repoDoc.indexedBranches.length > 0) {
      const searchBranch = branch || repoDoc.defaultBranch;
      if (repoDoc.indexedBranches.includes(searchBranch)) {
        try {
          const chunks = await ctx.runAction(internal.indexing.searchCodeChunks, {
            repoId: repoDoc._id,
            branch: searchBranch,
            query,
            limit: 15,
          });

          return {
            source: "indexed",
            branch: searchBranch,
            totalCount: chunks.length,
            items: chunks.map((c: any) => ({
              name: c.name,
              path: c.filePath,
              url: `https://github.com/${owner}/${repo}/blob/${searchBranch}/${c.filePath}#L${c.startLine}-L${c.endLine}`,
              code: c.code.slice(0, 2000),
              docstring: c.docstring,
              startLine: c.startLine,
              endLine: c.endLine,
              chunkType: c.chunkType,
              language: c.language,
              score: c.score,
            })),
          };
        } catch (err) {
          console.error("Indexed search failed, falling back to GitHub:", err);
        }
      }
    }

    // Fall back to GitHub search
    const octokit = createOctokitForInstallation(installationId);
    const { data } = await octokit.search.code({
      q: `${query} repo:${owner}/${repo}`,
      per_page: 30,
    });

    return {
      source: "github",
      branch: branch || null,
      totalCount: data.total_count,
      items: data.items.map((item) => ({
        name: item.name,
        path: item.path,
        url: item.html_url,
      })),
    };
  },
});

// List commits on a branch
export const listCommits = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    branch: v.optional(v.string()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, { clerkId, owner, repo, branch, perPage = 15 }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: perPage,
    });

    return data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || "unknown",
      authorAvatar: c.author?.avatar_url,
      date: c.commit.author?.date || "",
      url: c.html_url,
    }));
  },
});

// Compare two commits, branches, or tags
export const compareCommits = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    base: v.string(),
    head: v.string(),
  },
  handler: async (ctx, { clerkId, owner, repo, base, head }) => {
    const installationId = await getUserInstallation(ctx, clerkId);
    const octokit = createOctokitForInstallation(installationId);

    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });

    return {
      status: data.status,
      aheadBy: data.ahead_by,
      behindBy: data.behind_by,
      totalCommits: data.total_commits,
      commits: data.commits.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name || c.author?.login || "unknown",
        date: c.commit.author?.date || "",
      })),
      files: (data.files || []).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      })),
    };
  },
});
