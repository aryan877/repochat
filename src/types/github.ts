/**
 * GitHub API Types
 *
 * Uses Octokit's types with Pick<> to match what our Convex layer returns.
 * This keeps types in sync with GitHub's API while only including fields we use.
 *
 * DATA FLOW:
 *   Octokit (full response) → Convex (picks fields) → Frontend (typed)
 */

import type { Endpoints } from "@octokit/types";

// =============================================================================
// Base Octokit Types (for reference/Pick)
// =============================================================================

type OctokitPR =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
type OctokitPRList =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"][number];
type OctokitPRFile =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"]["response"]["data"][number];
type OctokitFileContent = Extract<
  Endpoints["GET /repos/{owner}/{repo}/contents/{path}"]["response"]["data"],
  { type: "file" }
>;
type OctokitTree =
  Endpoints["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"]["response"]["data"];
type OctokitBranch =
  Endpoints["GET /repos/{owner}/{repo}/branches"]["response"]["data"][number];
type OctokitReview =
  Endpoints["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"]["response"]["data"];
type OctokitComment =
  Endpoints["POST /repos/{owner}/{repo}/pulls/{pull_number}/comments"]["response"]["data"];
type OctokitMerge =
  Endpoints["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"]["response"]["data"];
type OctokitSearch = Endpoints["GET /search/code"]["response"]["data"];

// =============================================================================
// Convex Response Types (what our backend actually returns)
// =============================================================================

/** PR detail - returned by getPullRequestPublic */
export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: OctokitPR["state"];
  user: { login: string; avatar_url?: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  html_url: string;
  created_at: string;
  additions: number;
  deletions: number;
  changed_files: number;
}

/** PR list item - returned by listPullRequests (list endpoint doesn't include additions/deletions) */
export interface GitHubPRListItem {
  number: number;
  title: string;
  state: string;
  user: { login: string };
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

/** PR file - returned by getPullRequestFilesPublic */
export interface GitHubPRFile {
  filename: string;
  status: OctokitPRFile["status"];
  additions: number;
  deletions: number;
  patch?: string;
}

/** File content - returned by getFileContentPublic */
export interface GitHubFileContent {
  content: string;
  sha: string;
}

/** Repo tree - returned by getRepoTree */
export interface GitHubRepoTree {
  tree: Array<{
    path: string;
    type: string;
    sha: string;
    size?: number;
  }>;
  truncated: boolean;
}

/** Branch - returned by listBranches */
export interface GitHubBranch {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

/** Review - returned by createReview */
export interface GitHubReview {
  id: number;
  html_url: string;
}

/** Line comment - returned by postReviewCommentPublic */
export interface GitHubLineComment {
  id: number;
  html_url: string;
  created_at: string;
}

/** Merge result - returned by mergePullRequest */
export interface GitHubMergeResult {
  sha: string;
  merged: boolean;
  message: string;
}

/** Search result - returned by searchCode (indexed or GitHub fallback) */
export interface CodeSearchResult {
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
}

/** Commit list item - returned by listCommits */
export interface GitHubCommitItem {
  sha: string;
  message: string;
  author: string;
  authorAvatar?: string;
  date: string;
  url: string;
}

/** Compare result - returned by compareCommits */
export interface GitHubCompareResult {
  status: string;
  aheadBy: number;
  behindBy: number;
  totalCommits: number;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  files: Array<{
    filename: string;
    status: string | undefined;
    additions: number;
    deletions: number;
    patch: string | undefined;
  }>;
}

// =============================================================================
// Tool Interfaces
// =============================================================================

/** GitHub operations interface - matches Convex action signatures */
export interface GitHubActions {
  getPullRequest: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    prNumber: number;
  }) => Promise<GitHubPullRequest>;

  getPullRequestFiles: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    prNumber: number;
  }) => Promise<GitHubPRFile[]>;

  getFileContent: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    path: string;
    ref?: string;
  }) => Promise<GitHubFileContent>;

  postReviewComment: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    prNumber: number;
    body: string;
    path?: string;
    line?: number;
  }) => Promise<GitHubLineComment>;

  createReview: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    prNumber: number;
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
    body: string;
  }) => Promise<GitHubReview>;

  mergePullRequest: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    prNumber: number;
    mergeMethod?: "merge" | "squash" | "rebase";
  }) => Promise<GitHubMergeResult>;

  getRepoTree: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    branch?: string;
  }) => Promise<GitHubRepoTree>;

  searchCode: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    query: string;
    branch?: string;
  }) => Promise<CodeSearchResult>;

  listPullRequests: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
  }) => Promise<OctokitPRList[]>;

  listBranches: (args: {
    clerkId: string;
    owner: string;
    repo: string;
  }) => Promise<GitHubBranch[]>;

  listCommits: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    branch?: string;
    perPage?: number;
  }) => Promise<GitHubCommitItem[]>;

  compareCommits: (args: {
    clerkId: string;
    owner: string;
    repo: string;
    base: string;
    head: string;
  }) => Promise<GitHubCompareResult>;
}

/** Config for createGitHubTools */
export interface GitHubToolsConfig {
  clerkId: string;
  actions: GitHubActions;
}

// Re-export base types if needed elsewhere
export type {
  OctokitBranch,
  OctokitComment,
  OctokitFileContent,
  OctokitMerge,
  OctokitPR,
  OctokitPRFile,
  OctokitPRList,
  OctokitReview,
  OctokitSearch,
  OctokitTree,
};
