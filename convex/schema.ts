import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (linked via Clerk)
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // GitHub connection via GitHub App installation
    githubInstallationId: v.optional(v.id("installations")),
    githubUsername: v.optional(v.string()),
    githubAvatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_github_installation", ["githubInstallationId"]),

  // GitHub App installations
  installations: defineTable({
    installationId: v.number(),
    accountId: v.number(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
    accountAvatarUrl: v.optional(v.string()),
    permissions: v.object({
      contents: v.optional(v.string()),
      pullRequests: v.optional(v.string()),
      issues: v.optional(v.string()),
      metadata: v.optional(v.string()),
    }),
    repositorySelection: v.union(v.literal("all"), v.literal("selected")),
    installedAt: v.number(),
    updatedAt: v.number(),
    suspendedAt: v.optional(v.number()),
  })
    .index("by_installation_id", ["installationId"])
    .index("by_account_login", ["accountLogin"]),

  // Repositories from GitHub App
  repos: defineTable({
    installationId: v.id("installations"),
    githubRepoId: v.number(),
    owner: v.string(),
    name: v.string(),
    fullName: v.string(),
    defaultBranch: v.string(),
    isPrivate: v.boolean(),
    indexedBranches: v.array(v.string()),
    lastIndexedAt: v.optional(v.number()),
    autoReview: v.boolean(),
    reviewDrafts: v.boolean(),
    addedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_installation", ["installationId"])
    .index("by_github_repo_id", ["githubRepoId"])
    .index("by_full_name", ["fullName"]),

  // Code chunks with vector embeddings
  codeChunks: defineTable({
    repoId: v.id("repos"),
    branch: v.string(),
    // Composite key for efficient vector search filtering (industry standard pattern)
    // Format: "{repoId}:{branch}" - allows single-field AND filtering in vector search
    repoBranchKey: v.string(),
    filePath: v.string(),
    chunkType: v.union(
      v.literal("function"),
      v.literal("class"),
      v.literal("method"),
      v.literal("interface"),
      v.literal("type"),
      v.literal("variable"),
      v.literal("import"),
      v.literal("file_summary")
    ),
    name: v.string(),
    code: v.string(),
    docstring: v.string(),
    startLine: v.number(),
    endLine: v.number(),
    embedding: v.array(v.float64()),
    language: v.string(),
    indexedAt: v.number(),
  })
    .index("by_repo", ["repoId"])
    .index("by_repo_branch", ["repoId", "branch"])
    .index("by_repo_file", ["repoId", "filePath"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["repoBranchKey"],
    }),

  // Webhook events
  webhookEvents: defineTable({
    eventType: v.string(),
    action: v.optional(v.string()),
    deliveryId: v.string(),
    installationId: v.optional(v.number()),
    repositoryId: v.optional(v.number()),
    summary: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_delivery_id", ["deliveryId"])
    .index("by_status", ["status"]),

  // Auto PR reviews
  reviews: defineTable({
    repoId: v.id("repos"),
    prNumber: v.number(),
    prTitle: v.string(),
    prAuthor: v.string(),
    prUrl: v.string(),
    baseBranch: v.string(),
    headBranch: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("reviewing"),
      v.literal("posting"),
      v.literal("completed"),
      v.literal("failed")
    ),
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
    reviewId: v.optional(v.number()),
    feedbackScore: v.optional(v.number()),
    triggeredAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_repo", ["repoId"])
    .index("by_repo_pr", ["repoId", "prNumber"])
    .index("by_status", ["status"]),

  // Indexing jobs
  indexingJobs: defineTable({
    repoId: v.id("repos"),
    branch: v.string(),
    workflowId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("cloning"),
      v.literal("parsing"),
      v.literal("embedding"),
      v.literal("storing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    totalFiles: v.optional(v.number()),
    processedFiles: v.optional(v.number()),
    totalChunks: v.optional(v.number()),
    storedChunks: v.optional(v.number()),
    triggerType: v.union(
      v.literal("manual"),
      v.literal("push"),
      v.literal("initial")
    ),
    commitSha: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_repo", ["repoId"])
    .index("by_repo_branch", ["repoId", "branch"])
    .index("by_status", ["status"]),

  // Files for WebContainer (full file content cache)
  files: defineTable({
    repoId: v.id("repos"),
    path: v.string(),
    name: v.string(),
    type: v.union(v.literal("file"), v.literal("directory")),
    content: v.optional(v.string()),
    sha: v.optional(v.string()),
    size: v.optional(v.number()),
    isDirty: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_repo", ["repoId"])
    .index("by_repo_path", ["repoId", "path"]),

  // Import status for tracking repository file imports
  importStatus: defineTable({
    repoId: v.id("repos"),
    status: v.union(
      v.literal("pending"),
      v.literal("importing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()),
    totalFiles: v.optional(v.number()),
    importedFiles: v.optional(v.number()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_repo", ["repoId"]),
});
