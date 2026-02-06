/**
 * Convex Types
 *
 * Re-exports Convex document and ID types for type-safe database operations.
 * These types are derived directly from the Convex schema.
 *
 * ============================================================================
 * DATA FLOW OVERVIEW
 * ============================================================================
 *
 * GitHub API → Convex (persistence) → UI Components
 *
 * 1. GITHUB WEBHOOKS → CONVEX
 *    - GitHub sends webhook events (push, PR opened, etc.)
 *    - Webhook handler stores event in `webhookEvents` table
 *    - Background jobs process events and update related tables
 *
 * 2. GITHUB API → CONVEX (on-demand)
 *    - User requests data (list PRs, get file content)
 *    - Convex action calls GitHub API with user's installation token
 *    - Response cached/stored in Convex for fast subsequent access
 *
 * 3. CONVEX → UI (real-time)
 *    - Components use `useQuery` hooks for reactive data
 *    - Changes in Convex automatically push to connected clients
 *    - No polling needed - it's real-time via WebSocket
 *
 * ============================================================================
 * SYNC PATTERNS
 * ============================================================================
 *
 * REPOS TABLE:
 *   - Initial sync: When user installs GitHub App, repos are fetched and stored
 *   - Updates: Webhook events trigger repo metadata refresh
 *   - UI always reads from Convex, never directly from GitHub
 *
 * FILES TABLE:
 *   - Populated via "Import Repository" action
 *   - Fetches all files from GitHub, stores content in Convex
 *   - Enables offline browsing and WebContainer mounting
 *   - Re-import overwrites existing files
 *
 * REVIEWS TABLE:
 *   - Created when AI generates a review
 *   - Stores AI findings, comments, and status
 *   - Posted to GitHub when user approves
 *
 * CODE CHUNKS TABLE:
 *   - Created during repository indexing
 *   - Files are split into semantic chunks for AI context
 *   - Used for RAG (Retrieval Augmented Generation)
 *
 * ============================================================================
 */

import type { Doc, Id } from "../../convex/_generated/dataModel";

// ============================================================================
// Document Types
// ============================================================================

/**
 * User document - represents an authenticated user.
 *
 * FLOW: Clerk Auth → Convex
 * - Created on first sign-in via Clerk webhook or first API call
 * - Linked to Clerk via `clerkId` field
 * - Updated when user profile changes in Clerk
 */
export type User = Doc<"users">;

/**
 * GitHub App installation - tracks where the app is installed.
 *
 * FLOW: GitHub App Install → Webhook → Convex
 * - Created when user installs the GitHub App on their account/org
 * - Contains installation ID needed for API authentication
 * - Deleted when user uninstalls the app
 */
export type Installation = Doc<"installations">;

/**
 * Repository document - a GitHub repository the user has access to.
 *
 * FLOW: GitHub API → Convex (on install) → UI
 * - Fetched from GitHub when app is installed
 * - Updated via webhooks (renamed, transferred, visibility changed)
 * - Contains settings like autoReview, securityOnly
 *
 * SYNC: Updated on webhook events, not continuously polled
 */
export type Repo = Doc<"repos">;

/**
 * Review document - an AI-generated code review for a PR.
 *
 * FLOW: PR Webhook → AI Analysis → Convex → GitHub (on approval)
 * - Created when PR opened/updated triggers review
 * - AI analyzes diff and generates findings
 * - Stored in Convex, user can edit before posting
 * - Posted to GitHub as PR review when approved
 */
export type Review = Doc<"reviews">;

/**
 * Code chunk document - an indexed piece of code for semantic search.
 *
 * FLOW: Import → Chunking → Embedding → Convex
 * - Created during repository indexing job
 * - Files split into semantic chunks (functions, classes, etc.)
 * - Embeddings generated for vector search
 * - Used to find relevant context for AI reviews
 */
export type CodeChunk = Doc<"codeChunks">;

/**
 * Webhook event document - a received GitHub webhook event.
 *
 * FLOW: GitHub → Webhook Endpoint → Convex
 * - Raw webhook payload stored for processing
 * - Processed async by background jobs
 * - Kept for debugging and audit trail
 */
export type WebhookEvent = Doc<"webhookEvents">;

/**
 * Indexing job document - tracks repository indexing progress.
 *
 * FLOW: User triggers → Background job → Progress updates → Completion
 * - Created when user starts indexing
 * - Updated as files are processed
 * - Contains progress %, current file, errors
 * - UI polls/subscribes for real-time progress
 */
export type IndexingJob = Doc<"indexingJobs">;

/**
 * File document - a file from an imported repository.
 *
 * FLOW: GitHub API → Convex → WebContainer → Monaco Editor
 * - Fetched from GitHub during import
 * - Stored in Convex with full content
 * - Mounted to WebContainer for live preview
 * - Displayed in Monaco editor for viewing
 *
 * SYNC: Snapshot at import time, not auto-synced with GitHub
 * To get latest: re-import the repository
 */
export type File = Doc<"files">;

/**
 * Import status document - tracks repository file import progress.
 *
 * FLOW: Import action → Progress updates → UI
 * - Created when import starts
 * - Updated with file count and progress %
 * - UI shows progress bar based on this
 * - Marked complete or failed when done
 */
export type ImportStatus = Doc<"importStatus">;

// ============================================================================
// ID Types
// ============================================================================

/** Unique identifier for a user document */
export type UserId = Id<"users">;

/** Unique identifier for an installation document */
export type InstallationId = Id<"installations">;

/** Unique identifier for a repository document */
export type RepoId = Id<"repos">;

/** Unique identifier for a file document */
export type FileId = Id<"files">;

/** Unique identifier for a review document */
export type ReviewId = Id<"reviews">;
