# AGENT.md

## What is this?
RepoChat — AI code review that understands your entire codebase, not just the diff. Built on Tambo generative UI.

## Stack
Next.js 15, React 19, Convex (DB + workflows), Clerk (auth), Tambo AI (generative UI + MCP), Octokit (GitHub App)

## Commands
```bash
npm run dev              # Next.js + Convex dev server
npx tsc --noEmit         # Type check
npx convex dev --once    # Deploy Convex functions
```

## Architecture

### Three data paths

**Chat tools (11 tools)** — Tambo tools call Convex actions. `searchCode` and `analyzePR` use indexed vector search when the branch is indexed, fall back to GitHub API when not. Other tools (getFileContent, listPRs, mergePR, etc.) always hit GitHub directly.

**Automated PR reviews** — Webhook triggers a durable Convex workflow. Fetches PR diff from GitHub, vector-searches indexed AST chunks for codebase context, generates review via DeepSeek V3.2 (OpenRouter), posts back to GitHub as a formal PR review.

**Code indexing** — Durable Convex workflow. Fetches repo tree, does incremental diff (only changed/new files), parses with Tree-sitter WASM, generates OpenAI embeddings, stores chunks in Convex vector index. Batched in groups of 5 files per workflow step.

### Workflow architecture
Both indexing and review run as `@convex-dev/workflow` durable workflows. Pattern:
1. **Launcher** (`startIndexing` / `startReview`) — creates a job/review record, calls `workflow.start()`, stores `workflowId`
2. **Workflow** (`indexingWorkflow` / `reviewWorkflow`) — defines checkpointed steps via `step.runAction()` / `step.runMutation()`, updates the job record at each stage
3. **Failure callback** (`onIndexingComplete` / `onReviewComplete`) — marks job as "failed" if workflow crashes

Retry: 3 attempts, exponential backoff (1s/2s/4s), maxParallelism 10.

### MCP integrations
Users connect their own services (Supabase, etc.) from Settings. Configs stored in Convex, loaded reactively via `useQuery`. URLs are rewritten through `/api/mcp-proxy` (a Next.js API route) to bypass CORS — the proxy buffers JSON responses and streams SSE. `mcpServers` prop on `TamboProvider` triggers auto-reconnect on change. Settings page shows real connection status via `useTamboMcpServers()` hook (connected / connecting / error).

### Generative UI
12 components the AI renders contextually (PRSummary, SecurityAlert, DiffViewer, CodeFlow, ReviewHeatmap, etc.). ReviewChecklist uses `withInteractable` for bidirectional state sync between AI and user.

## Sync triggers

| Data | Trigger | Table |
|------|---------|-------|
| AST chunks + embeddings | Push webhook (indexed branch), manual re-index, initial setup | `codeChunks` |
| File content cache | Manual import button only | `files` |
| Chat tool results | Real-time per request (no caching) | — |

These are separate systems. Push webhooks update `codeChunks` only, not `files`.

## Tree-sitter on Convex

- `web-tree-sitter@0.22.6` + `tree-sitter-wasms@0.1.13` — version-pinned for WASM format compatibility
- `require("tree-sitter-wasms/package.json")` at top of indexing.ts — static require for esbuild detection
- Use `/package.json` subpath — main entry is a native addon that crashes on Convex
- Query files in `convex/queries/` — copied from individual packages to avoid peer dep conflicts

## Don't
- Create wrapper types when Octokit/Convex types exist
- Transform API responses in Convex — return full data, shape in frontend
- Skip the MCP proxy — external MCP servers (Supabase, etc.) block browser CORS, so `/api/mcp-proxy` is required
- Use `require("tree-sitter-wasms")` directly — main entry is native addon, use `/package.json`
- Add verbose comments to Convex files
