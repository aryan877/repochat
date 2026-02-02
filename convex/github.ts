"use node";

import { action, internalAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const GITHUB_API = "https://api.github.com";

async function githubFetch(endpoint: string, token: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoChat",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function getToken(ctx: ActionCtx, clerkId: string): Promise<string> {
  const user = await ctx.runQuery(internal.githubHelpers.getUserByClerkId, { clerkId }) as { _id: Id<"users"> } | null;
  if (!user) throw new Error("User not found");

  const connection = await ctx.runQuery(internal.githubHelpers.getConnection, { userId: user._id }) as { accessToken: string } | null;
  if (!connection) throw new Error("GitHub not connected");

  return connection.accessToken;
}

export const getAuthenticatedUser = action({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const token = await getToken(ctx, clerkId);
    return await githubFetch("/user", token);
  },
});

export const getUserRepos = action({
  args: {
    clerkId: v.string(),
    perPage: v.optional(v.number()),
    page: v.optional(v.number()),
  },
  handler: async (ctx, { clerkId, perPage, page }) => {
    const token = await getToken(ctx, clerkId);
    const params = new URLSearchParams({
      type: "all",
      sort: "updated",
      per_page: String(perPage || 100),
      page: String(page || 1),
    });
    return await githubFetch(`/user/repos?${params}`, token);
  },
});

export const getPullRequest = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber }) => {
    const token = await getToken(ctx, clerkId);
    return await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`, token);
  },
});

export const getPullRequestFiles = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber }) => {
    const token = await getToken(ctx, clerkId);
    return await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}/files`, token);
  },
});

export const getFileContent = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    path: v.string(),
    ref: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, owner, repo, path, ref }) => {
    const token = await getToken(ctx, clerkId);
    const endpoint = ref
      ? `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
      : `/repos/${owner}/${repo}/contents/${path}`;
    const data = await githubFetch(endpoint, token);
    if (data.content) {
      data.decodedContent = Buffer.from(data.content, "base64").toString("utf-8");
    }
    return data;
  },
});

export const getRepoTree = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, owner, repo, branch }) => {
    const token = await getToken(ctx, clerkId);
    return await githubFetch(
      `/repos/${owner}/${repo}/git/trees/${branch || "main"}?recursive=1`,
      token
    );
  },
});

export const postReviewComment = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
    body: v.string(),
    path: v.string(),
    line: v.number(),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber, body, path, line }) => {
    const token = await getToken(ctx, clerkId);
    const pr = await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`, token);
    return await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}/comments`, token, {
      method: "POST",
      body: JSON.stringify({
        body,
        commit_id: pr.head.sha,
        path,
        line,
        side: "RIGHT",
      }),
    });
  },
});

export const createReview = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
    event: v.union(v.literal("APPROVE"), v.literal("REQUEST_CHANGES"), v.literal("COMMENT")),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber, event, body }) => {
    const token = await getToken(ctx, clerkId);
    return await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, token, {
      method: "POST",
      body: JSON.stringify({ event, body }),
    });
  },
});

export const mergePullRequest = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    prNumber: v.number(),
    mergeMethod: v.optional(v.union(v.literal("merge"), v.literal("squash"), v.literal("rebase"))),
  },
  handler: async (ctx, { clerkId, owner, repo, prNumber, mergeMethod }) => {
    const token = await getToken(ctx, clerkId);
    return await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}/merge`, token, {
      method: "PUT",
      body: JSON.stringify({ merge_method: mergeMethod || "squash" }),
    });
  },
});

export const searchCode = action({
  args: {
    clerkId: v.string(),
    query: v.string(),
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, { clerkId, query, owner, repo }) => {
    const token = await getToken(ctx, clerkId);
    const q = encodeURIComponent(`${query} repo:${owner}/${repo}`);
    return await githubFetch(`/search/code?q=${q}`, token);
  },
});

export const listBranches = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, { clerkId, owner, repo }) => {
    const token = await getToken(ctx, clerkId);
    return await githubFetch(`/repos/${owner}/${repo}/branches`, token);
  },
});

export const listPullRequests = action({
  args: {
    clerkId: v.string(),
    owner: v.string(),
    repo: v.string(),
    state: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("all"))),
  },
  handler: async (ctx, { clerkId, owner, repo, state }) => {
    const token = await getToken(ctx, clerkId);
    return await githubFetch(`/repos/${owner}/${repo}/pulls?state=${state || "open"}`, token);
  },
});

export const connectGitHub = action({
  args: {
    clerkId: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, { clerkId, accessToken }): Promise<{ success: boolean; username: string }> => {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoChat",
      },
    });

    if (!response.ok) {
      throw new Error("Invalid GitHub token");
    }

    const githubUser = await response.json();

    await ctx.runMutation(internal.users.storeGitHubConnection, {
      clerkId,
      githubId: githubUser.id,
      githubUsername: githubUser.login,
      githubAvatarUrl: githubUser.avatar_url,
      accessToken,
      tokenType: "bearer",
      scope: "repo,read:user",
    });

    return { success: true, username: githubUser.login };
  },
});

export const exchangeOAuthCode = internalAction({
  args: {
    code: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
  },
  handler: async (_, { code, clientId, clientSecret }) => {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await response.json();
    if (data.error) throw new Error(`OAuth error: ${data.error_description || data.error}`);
    return { accessToken: data.access_token, tokenType: data.token_type, scope: data.scope };
  },
});

export const handleOAuthCallback = action({
  args: {
    clerkId: v.string(),
    code: v.string(),
  },
  handler: async (ctx, { clerkId, code }): Promise<{ success: boolean; username: string }> => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("GitHub OAuth not configured");
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoChat",
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to get GitHub user");
    }

    const githubUser = await userResponse.json();

    await ctx.runMutation(internal.users.storeGitHubConnection, {
      clerkId,
      githubId: githubUser.id,
      githubUsername: githubUser.login,
      githubAvatarUrl: githubUser.avatar_url,
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type || "bearer",
      scope: tokenData.scope || "repo,read:user",
    });

    return { success: true, username: githubUser.login };
  },
});

export const getGitHubUserFromToken = internalAction({
  args: { accessToken: v.string() },
  handler: async (_, { accessToken }) => {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoChat",
      },
    });
    if (!response.ok) throw new Error("Failed to get GitHub user");
    return await response.json();
  },
});
