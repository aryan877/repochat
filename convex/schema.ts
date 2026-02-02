import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users with GitHub connection
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // GitHub connections (secure token storage - separate from user for security)
  githubConnections: defineTable({
    userId: v.id("users"),
    // GitHub user info
    githubId: v.number(),
    githubUsername: v.string(),
    githubAvatarUrl: v.optional(v.string()),
    // Token info (encrypted server-side, never sent to client)
    accessToken: v.string(),
    tokenType: v.string(),
    scope: v.string(), // Comma-separated scopes
    // Metadata
    connectedAt: v.number(),
    lastUsedAt: v.number(),
    // Token refresh (for OAuth apps with refresh tokens)
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_github_id", ["githubId"]),

  // Connected repositories (user explicitly granted access)
  repos: defineTable({
    userId: v.id("users"),
    connectionId: v.id("githubConnections"),
    // Repo info
    githubRepoId: v.number(),
    owner: v.string(),
    name: v.string(),
    fullName: v.string(), // "owner/name"
    description: v.optional(v.string()),
    defaultBranch: v.string(),
    isPrivate: v.boolean(),
    // Access level
    permissions: v.object({
      admin: v.boolean(),
      push: v.boolean(),
      pull: v.boolean(),
      maintain: v.optional(v.boolean()),
      triage: v.optional(v.boolean()),
    }),
    // Timestamps
    connectedAt: v.number(),
    lastSyncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_connection", ["connectionId"])
    .index("by_full_name", ["fullName"])
    .index("by_github_repo_id", ["githubRepoId"]),

  // PR Reviews
  reviews: defineTable({
    userId: v.id("users"),
    repoId: v.id("repos"),
    prNumber: v.number(),
    prTitle: v.string(),
    prUrl: v.string(),
    prAuthor: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    summary: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_repo", ["repoId"])
    .index("by_pr", ["repoId", "prNumber"]),

  // Review findings/issues
  findings: defineTable({
    reviewId: v.id("reviews"),
    type: v.union(
      v.literal("security"),
      v.literal("bug"),
      v.literal("performance"),
      v.literal("code_quality"),
      v.literal("test_coverage"),
      v.literal("documentation")
    ),
    severity: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    title: v.string(),
    description: v.string(),
    filePath: v.string(),
    lineStart: v.optional(v.number()),
    lineEnd: v.optional(v.number()),
    suggestion: v.optional(v.string()),
    resolved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_review", ["reviewId"])
    .index("by_resolved", ["reviewId", "resolved"]),

  // GitHub comments posted
  comments: defineTable({
    reviewId: v.id("reviews"),
    findingId: v.optional(v.id("findings")),
    githubCommentId: v.optional(v.number()),
    body: v.string(),
    filePath: v.optional(v.string()),
    line: v.optional(v.number()),
    postedAt: v.number(),
  }).index("by_review", ["reviewId"]),

  // Audit log for security
  auditLog: defineTable({
    userId: v.id("users"),
    action: v.string(), // "github_connect", "github_disconnect", "repo_add", "repo_remove", "api_call"
    details: v.string(), // JSON string with action details
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // Imported repository files (stored in Convex, synced to WebContainer)
  files: defineTable({
    repoId: v.id("repos"),
    path: v.string(), // e.g., "src/App.tsx"
    name: v.string(), // e.g., "App.tsx"
    type: v.union(v.literal("file"), v.literal("directory")),
    content: v.optional(v.string()), // File content (null for directories)
    sha: v.optional(v.string()), // GitHub blob SHA for tracking changes
    size: v.optional(v.number()),
    // Change tracking
    isDirty: v.boolean(), // Modified locally but not committed
    originalContent: v.optional(v.string()), // Original content before edits
    // Metadata
    importedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_repo", ["repoId"])
    .index("by_repo_path", ["repoId", "path"])
    .index("by_repo_dirty", ["repoId", "isDirty"]),

  // Import status for tracking background jobs
  importStatus: defineTable({
    repoId: v.id("repos"),
    status: v.union(
      v.literal("pending"),
      v.literal("importing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()), // 0-100
    totalFiles: v.optional(v.number()),
    importedFiles: v.optional(v.number()),
    error: v.optional(v.string()),
    branch: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_repo", ["repoId"])
    .index("by_status", ["status"]),

  // Proposed changes (diffs ready to commit)
  proposedChanges: defineTable({
    repoId: v.id("repos"),
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("committed"),
      v.literal("discarded")
    ),
    // Changes summary
    filesChanged: v.number(),
    additions: v.number(),
    deletions: v.number(),
    // Commit info (if committed)
    commitSha: v.optional(v.string()),
    commitUrl: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    committedAt: v.optional(v.number()),
  })
    .index("by_repo", ["repoId"])
    .index("by_user", ["userId"])
    .index("by_status", ["repoId", "status"]),
});
