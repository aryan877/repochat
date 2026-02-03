/**
 * Shared types derived from Convex schema
 * Use these throughout the app for type safety
 */

import type { Doc, Id } from "../../convex/_generated/dataModel";

// Re-export Convex document types (matching actual schema tables)
export type User = Doc<"users">;
export type Installation = Doc<"installations">;
export type Repo = Doc<"repos">;
export type Review = Doc<"reviews">;
export type CodeChunk = Doc<"codeChunks">;
export type WebhookEvent = Doc<"webhookEvents">;
export type IndexingJob = Doc<"indexingJobs">;
export type File = Doc<"files">;
export type ImportStatus = Doc<"importStatus">;

// Re-export ID types
export type UserId = Id<"users">;
export type InstallationId = Id<"installations">;
export type RepoId = Id<"repos">;
export type FileId = Id<"files">;
export type ReviewId = Id<"reviews">;

// UI-specific types that map to Convex data
export interface Repository {
  _id: Id<"repos">;
  name: string;
  owner: string;
  fullName: string;
}

export interface PullRequest {
  number: number;
  title: string;
  author: string;
  state: "open" | "closed" | "merged";
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  createdAt: string;
}

export interface FileChange {
  filePath: string;
  additions: number;
  deletions: number;
  patch: string;
  status: "added" | "modified" | "deleted" | "renamed";
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}
