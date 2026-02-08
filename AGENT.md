# AGENT.md

## What is this?
RepoChat — AI code review assistant. Review PRs, analyze code, run SQL on your own database, all from chat.

## Stack
Next.js 15, Convex, Clerk, Tambo AI, MCP, Octokit

## Commands
```bash
npm run dev      # Next.js + Convex
npx tsc --noEmit # Type check
npx convex dev --once  # Deploy Convex functions
```

## Architecture

**GitHub tools** — Convex actions call Octokit, registered as Tambo tools. AI calls them to review PRs, post comments, merge, etc.

**MCP integrations** — Users connect their own services (Supabase, etc.) from Settings. Configs stored in Convex, browser connects directly to MCP servers. Fully reactive — add/remove servers without reloading.

**Generative UI** — 12 components the AI renders contextually (PRSummary, SecurityAlert, DiffViewer, CodeFlow, etc.). ReviewChecklist is an interactable — AI adds findings, user checks them off, state syncs both ways.

## Tree-sitter on Convex

Two packages work together:
- `web-tree-sitter@0.22.6` — the runtime engine (loads WASMs, parses code, runs queries)
- `tree-sitter-wasms@0.1.13` — pre-compiled WASM grammars for all languages

**Why not individual packages?** (`tree-sitter-javascript`, `tree-sitter-python`, etc.) They each declare `tree-sitter` as a peer dependency at conflicting versions. Convex runs `npm install` without `--legacy-peer-deps`, so it fails. `tree-sitter-wasms` bundles all grammars in one package with zero peer deps.

**Why `web-tree-sitter@0.22.6` not latest?** The WASMs in `tree-sitter-wasms` were compiled with `tree-sitter-cli@0.20.x`. The WASM binary format (`dylink` section) changed in newer versions. `0.22.6` is the newest runtime that can load 0.20.x-era WASMs.

**Static require trick:** `require("tree-sitter-wasms/package.json")` at the top of `indexing.ts` tells esbuild to mark it external. Without this, esbuild can't detect the package (it only sees dynamic `require.resolve()` calls with variables). We use `/package.json` because the main entry is a native addon that crashes in Convex's runtime.

**Query files in `convex/queries/`:** Tags.scm files copied from individual language packages. They tell tree-sitter which AST nodes are function/class/method definitions. Without them, we'd fall back to generic AST traversal which is less precise.

## Indexing Behavior

- **Full re-index** every run — old chunks deleted first via `clearBranchChunks`
- **Triggers:** push events to indexed branches, or manual
- **Skips:** node_modules, .git, .next, dist, build, lock files, .min.js
- **Per file:** fetch from GitHub API → tree-sitter parse → extract chunks → OpenAI embedding → store
- **Why slow (~7 min):** sequential GitHub API calls + sequential OpenAI API calls per chunk

## Don't
- Create wrapper types when Octokit/Convex types exist
- Transform API responses in Convex (return full data)
- Route MCP through the backend — it's client-side by design
- Add AI-style comments in Convex files (Convex convention: minimal comments)
- Use `require("tree-sitter-wasms")` directly — main entry is a native addon, use `/package.json`
