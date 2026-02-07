# AGENT.md

## What is this?
RepoChat — AI code review assistant. Review PRs, analyze code, run SQL on your own database, all from chat.

## Stack
Next.js 15, Convex, Clerk, Tambo AI, MCP, Octokit

## Commands
```bash
npm run dev      # Next.js + Convex
npx tsc --noEmit # Type check
```

## Architecture

**GitHub tools** — Convex actions call Octokit, registered as Tambo tools. AI calls them to review PRs, post comments, merge, etc.

**MCP integrations** — Users connect their own services (Supabase, etc.) from Settings. Configs stored in Convex, browser connects directly to MCP servers. Fully reactive — add/remove servers without reloading.

**Generative UI** — 12 components the AI renders contextually (PRSummary, SecurityAlert, DiffViewer, CodeFlow, etc.). ReviewChecklist is an interactable — AI adds findings, user checks them off, state syncs both ways.

## Don't
- Create wrapper types when Octokit/Convex types exist
- Transform API responses in Convex (return full data)
- Route MCP through the backend — it's client-side by design
