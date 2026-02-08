"use client";

import { z } from "zod";
import { TamboTool } from "@tambo-ai/react";
import type { GitHubActions, GitHubToolsConfig } from "@/types/github";

export function createGitHubTools({ clerkId, actions }: GitHubToolsConfig): TamboTool[] {
  const analyzePR: TamboTool = {
    name: "analyzePR",
    description: `Analyze a GitHub pull request to review code changes.
Use this when the user wants to review a PR or asks about PR changes.
Returns PR metadata, changed files with diffs, and relevant codebase context from the indexed repository when available.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner (e.g., 'facebook')"),
      repo: z.string().describe("Repository name (e.g., 'react')"),
      prNumber: z.number().describe("Pull request number"),
    }),
    outputSchema: z.object({
      title: z.string(),
      author: z.string(),
      authorAvatar: z.string().optional(),
      state: z.string(),
      baseBranch: z.string(),
      headBranch: z.string(),
      additions: z.number(),
      deletions: z.number(),
      changedFiles: z.number(),
      createdAt: z.string(),
      url: z.string(),
      description: z.string().optional(),
      files: z.array(z.object({
        filename: z.string(),
        status: z.string(),
        additions: z.number(),
        deletions: z.number(),
        patch: z.string().optional(),
      })),
      codebaseContext: z.array(z.object({
        name: z.string(),
        path: z.string(),
        docstring: z.string(),
        code: z.string(),
        chunkType: z.string(),
      })).optional().describe("Relevant code from the indexed codebase for deeper review context"),
    }),
    tool: async ({ owner, repo, prNumber }) => {
      const pr = await actions.getPullRequest({ clerkId, owner, repo, prNumber });
      const files = await actions.getPullRequestFiles({ clerkId, owner, repo, prNumber });

      // Pull codebase context from indexed data for smarter reviews
      let codebaseContext: Array<{
        name: string; path: string; docstring: string; code: string; chunkType: string;
      }> | undefined;

      try {
        const changedPaths = files.map((f) => f.filename).join(" ");
        const contextQuery = `${pr.title} ${changedPaths}`;
        const searchResult = await actions.searchCode({
          clerkId, owner, repo, query: contextQuery, branch: pr.base.ref,
        });

        if (searchResult.source === "indexed" && searchResult.items.length > 0) {
          codebaseContext = searchResult.items.slice(0, 10).map((item) => ({
            name: item.name,
            path: item.path,
            docstring: item.docstring || "",
            code: item.code || "",
            chunkType: item.chunkType || "unknown",
          }));
        }
      } catch {
        // Indexed search unavailable — PR analysis still works without it
      }

      return {
        title: pr.title,
        author: pr.user?.login ?? "unknown",
        authorAvatar: pr.user?.avatar_url,
        state: pr.state,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        createdAt: pr.created_at,
        url: pr.html_url,
        description: pr.body,
        files: files.map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch,
        })),
        codebaseContext,
      };
    },
  };

  const getFileContent: TamboTool = {
    name: "getFileContent",
    description: `Get the content of a file from a GitHub repository.
Use this when the user wants to see a specific file or needs context about code.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      path: z.string().describe("File path within the repository"),
      ref: z.string().optional().describe("Branch, tag, or commit SHA"),
    }),
    outputSchema: z.object({
      content: z.string(),
      size: z.number(),
      sha: z.string(),
      path: z.string(),
    }),
    tool: async ({ owner, repo, path: filePath, ref }) => {
      const data = await actions.getFileContent({ clerkId, owner, repo, path: filePath, ref });

      return {
        content: data.content,
        size: data.content.length,
        sha: data.sha,
        path: filePath,
      };
    },
  };

  const postReviewComment: TamboTool = {
    name: "postReviewComment",
    description: `Post a review comment on a specific line of a pull request.
Use this when the user wants to add a comment about specific code.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      prNumber: z.number().describe("Pull request number"),
      body: z.string().describe("Comment text"),
      path: z.string().describe("File path to comment on"),
      line: z.number().describe("Line number to comment on"),
    }),
    outputSchema: z.object({
      id: z.number(),
      url: z.string(),
      createdAt: z.string(),
    }),
    tool: async ({ owner, repo, prNumber, body, path, line }) => {
      const comment = await actions.postReviewComment({
        clerkId,
        owner,
        repo,
        prNumber,
        body,
        path,
        line,
      });

      return {
        id: comment.id,
        url: comment.html_url || "",
        createdAt: comment.created_at || new Date().toISOString(),
      };
    },
  };

  const submitReview: TamboTool = {
    name: "submitReview",
    description: `Submit a review on a pull request (approve, request changes, or comment).
Use this when the user wants to approve a PR or request changes.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      prNumber: z.number().describe("Pull request number"),
      event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]).describe("Type of review"),
      body: z.string().optional().describe("Review comment"),
    }),
    outputSchema: z.object({
      id: z.number(),
      state: z.string(),
      url: z.string(),
    }),
    tool: async ({ owner, repo, prNumber, event, body }) => {
      const review = await actions.createReview({
        clerkId,
        owner,
        repo,
        prNumber,
        event,
        body: body || "",
      });

      return {
        id: review.id,
        state: event,
        url: review.html_url,
      };
    },
  };

  const mergePR: TamboTool = {
    name: "mergePR",
    description: `Merge a pull request.
Use this when the user explicitly asks to merge a PR.
ALWAYS confirm with the user before merging.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      prNumber: z.number().describe("Pull request number"),
      mergeMethod: z.enum(["merge", "squash", "rebase"]).optional().describe("Merge method"),
    }),
    outputSchema: z.object({
      merged: z.boolean(),
      sha: z.string(),
      message: z.string(),
    }),
    tool: async ({ owner, repo, prNumber, mergeMethod }) => {
      const result = await actions.mergePullRequest({
        clerkId,
        owner,
        repo,
        prNumber,
        mergeMethod,
      });

      return result;
    },
  };

  const getRepoTree: TamboTool = {
    name: "getRepoTree",
    description: `Get the file tree structure of a repository.
Use this when the user wants to explore a repository or see its structure.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      branch: z.string().optional().describe("Branch name"),
    }),
    outputSchema: z.object({
      tree: z.array(z.object({
        path: z.string(),
        type: z.string(),
        size: z.number().optional(),
      })),
      truncated: z.boolean(),
    }),
    tool: async ({ owner, repo, branch }) => {
      const data = await actions.getRepoTree({ clerkId, owner, repo, branch });

      return {
        tree: data.tree.map((item) => ({
          path: item.path,
          type: item.type === "blob" ? "file" : "directory",
          size: item.size,
        })),
        truncated: data.truncated,
      };
    },
  };

  const searchCode: TamboTool = {
    name: "searchCode",
    description: `Search for code in a repository using semantic search on indexed codebase when available, with GitHub API fallback.
Use this when the user wants to find specific code patterns, functions, or understand how something works.
When the repo is indexed, results include code snippets, descriptions, and line numbers.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      query: z.string().describe("Search query (semantic when indexed, string match on GitHub)"),
      branch: z.string().optional().describe("Branch to search (defaults to indexed/default branch)"),
    }),
    outputSchema: z.object({
      source: z.enum(["indexed", "github"]).describe("Which search backend was used"),
      totalCount: z.number(),
      items: z.array(z.object({
        name: z.string(),
        path: z.string(),
        url: z.string(),
        code: z.string().optional().describe("Code snippet (indexed only)"),
        docstring: z.string().optional().describe("Description of the code (indexed only)"),
        startLine: z.number().optional(),
        endLine: z.number().optional(),
        chunkType: z.string().optional().describe("function, class, method, etc. (indexed only)"),
        score: z.number().optional().describe("Relevance score (indexed only)"),
      })),
    }),
    tool: async ({ owner, repo, query, branch }) => {
      const data = await actions.searchCode({ clerkId, owner, repo, query, branch });

      return {
        source: data.source,
        totalCount: data.totalCount,
        items: data.items,
      };
    },
  };

  const listPullRequests: TamboTool = {
    name: "listPullRequests",
    description: `List pull requests for a repository.
Use this when the user wants to see open/closed PRs.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      state: z.enum(["open", "closed", "all"]).optional().describe("Filter by state"),
    }),
    outputSchema: z.object({
      pullRequests: z.array(z.object({
        number: z.number(),
        title: z.string(),
        state: z.string(),
        author: z.string(),
        createdAt: z.string(),
        url: z.string(),
      })),
    }),
    tool: async ({ owner, repo, state }) => {
      const prs = await actions.listPullRequests({ clerkId, owner, repo, state });

      return {
        pullRequests: prs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          author: pr.user?.login ?? "unknown",
          createdAt: pr.created_at,
          url: pr.html_url,
        })),
      };
    },
  };

  const listBranches: TamboTool = {
    name: "listBranches",
    description: `List branches in a repository.
Use this when the user wants to see available branches.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
    }),
    outputSchema: z.object({
      branches: z.array(z.object({
        name: z.string(),
        protected: z.boolean(),
      })),
    }),
    tool: async ({ owner, repo }) => {
      const branches = await actions.listBranches({ clerkId, owner, repo });

      return {
        branches: branches.map((b) => ({
          name: b.name,
          protected: b.protected,
        })),
      };
    },
  };

  const listCommits: TamboTool = {
    name: "listCommits",
    description: `List recent commits on a branch.
Use this when the user wants to see commit history or recent changes on a branch.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      branch: z.string().optional().describe("Branch name (defaults to main)"),
      perPage: z.number().optional().describe("Number of commits to return (default 15)"),
    }),
    outputSchema: z.object({
      commits: z.array(z.object({
        sha: z.string(),
        message: z.string(),
        author: z.string(),
        authorAvatar: z.string().optional(),
        date: z.string(),
        url: z.string(),
      })),
    }),
    tool: async ({ owner, repo, branch, perPage }) => {
      const commits = await actions.listCommits({ clerkId, owner, repo, branch, perPage });
      return { commits };
    },
  };

  const compareCommits: TamboTool = {
    name: "compareCommits",
    description: `Compare two branches, tags, or commits to see what changed between them.
Use this when the user wants to see differences between branches or what changed since a specific commit.`,
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      base: z.string().describe("Base branch, tag, or commit SHA"),
      head: z.string().describe("Head branch, tag, or commit SHA"),
    }),
    outputSchema: z.object({
      status: z.string(),
      aheadBy: z.number(),
      behindBy: z.number(),
      totalCommits: z.number(),
      commits: z.array(z.object({
        sha: z.string(),
        message: z.string(),
        author: z.string(),
        date: z.string(),
      })),
      files: z.array(z.object({
        filename: z.string(),
        status: z.string(),
        additions: z.number(),
        deletions: z.number(),
        patch: z.string().optional(),
      })),
    }),
    tool: async ({ owner, repo, base, head }) => {
      return await actions.compareCommits({ clerkId, owner, repo, base, head });
    },
  };

  return [
    analyzePR,
    getFileContent,
    postReviewComment,
    submitReview,
    mergePR,
    getRepoTree,
    searchCode,
    listPullRequests,
    listBranches,
    listCommits,
    compareCommits,
  ];
}

export const defaultTools: TamboTool[] = [];
