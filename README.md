<p align="center">
  <img src="public/logo.svg" width="120" alt="RepoChat">
</p>

<h1 align="center">RepoChat</h1>

<p align="center">
  <b>AI code review that understands your entire codebase — not just the diff.</b>
</p>

<p align="center">
  <a href="https://tambo.co"><img src="public/Tambo-Lockup.svg" height="24" alt="Built with Tambo" /></a>
  &nbsp;
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white" alt="Next.js 15" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://convex.dev"><img src="https://img.shields.io/badge/Convex-Realtime-EF4444" alt="Convex" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Per_User-10B981" alt="MCP" /></a>
  <a href="https://tree-sitter.github.io"><img src="https://img.shields.io/badge/Tree--sitter-11_Languages-F59E0B" alt="Tree-sitter" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License" /></a>
</p>

---

## Live Deployments

| Service | URL | Stack |
|---|---|---|
| **RepoChat** | [repochat.aryankumar.dev](https://repochat.aryankumar.dev) | Vercel + Next.js 15 |
| **Tambo API** | [tambo-api.aryankumar.dev](https://tambo-api.aryankumar.dev) | Self-hosted NestJS + PostgreSQL + Drizzle ORM |
| **Tambo Dashboard** | [tambo.aryankumar.dev](https://tambo.aryankumar.dev) | Self-hosted Next.js admin panel |
| **Convex** | Managed | Real-time DB + workflow engine |
| **Clerk** | Managed | OAuth + GitHub App auth |

I [forked Tambo's open-source backend](https://github.com/aryan877/tambo) and self-host it because the hosted tier hits OpenAI's strict schema limits when you throw 12 components and 11 tools at it. Disabled `strictJsonSchema` and deployed my own instance with Docker Compose + Caddy.

---

## The Problem

Code reviews on GitHub are blind. Reviewers see a diff but have zero context about the rest of the codebase — how functions are called elsewhere, what patterns exist, whether a change breaks a convention. They review in isolation.

## What RepoChat Does

RepoChat indexes your entire codebase with Tree-sitter AST parsing and vector embeddings. When you review a PR — whether through chat or automated webhooks — it pulls semantically similar code from across the repo and understands the patterns. The AI renders interactive UI components showing exactly what matters: security alerts, dependency graphs, severity heatmaps. Not a wall of text.

You can also plug in your own services (Supabase, any MCP server) and query databases, manage schemas, run SQL — all from the same chat.

---

## TL;DR

```
"Review PR #42 on my-org/api"
```

The AI fetches the diff, searches the indexed codebase for related code via vector embeddings, analyzes it with DeepSeek V3.2, then renders:

- A `PRSummary` card with metadata
- `SecurityAlert` components for vulnerabilities (with CWE IDs)
- An interactive `CodeFlow` dependency graph
- A `ReviewHeatmap` showing severity across files
- A `ReviewChecklist` you can check off as you fix things

All posted back to GitHub as a proper PR review with inline comments.

---

## Architecture

```
       ┌──────────────────────────────────┐
       │         GitHub (Octokit)          │
       │   PRs · Files · Webhooks · Tree   │
       └────────────┬─────────────────────┘
                    │
 ┌──────────────────▼──────────────────┐
 │            Convex Backend            │
 │                                      │
 │  Tree-sitter WASM → AST Chunks       │
 │  OpenAI Embeddings → 1536-dim Vec    │
 │  DeepSeek V3.2 → AI Code Reviews     │
 │  Durable Workflows → Index + Review  │
 │  Vector Search → Semantic Code Search │
 └──────────────────┬──────────────────┘
                    │ real-time sync
 ┌──────────────────▼──────────────────┐
 │          Next.js Frontend             │
 │                                      │
 │  Tambo Generative UI (12 components) │
 │  11 GitHub Tools · Per-user MCP      │
 │  Monaco · XTerm · XYFlow · Recharts  │
 └──────────┬───────────────┬──────────┘
            │               │
            ▼               ▼
 ┌──────────────────┐ ┌────────────────────────┐
 │  MCP Servers      │ │  Tambo API (self-host)  │
 │  Supabase, etc.   │ │  tambo-api.aryankumar   │
 │  Proxied via API  │ │  .dev                   │
 └──────────────────┘ │  NestJS + Postgres       │
                      │  Caddy auto-TLS          │
                      └────────────────────────┘
```

---

## How I Use Tambo

This is the core of the project. Tambo isn't a bolt-on — it's the entire AI orchestration layer.

### The AI picks the UI, not me

I register React components with Zod schemas and a description of when to use them. The AI sees all of it and picks the right component itself, streaming props in real-time.

```tsx
// src/lib/tambo.ts
{
  name: "SecurityAlert",
  description: `Render when finding a security vulnerability...
    TRIGGER: SQL injection, XSS, auth issues, OWASP top 10`,
  component: SecurityAlert,
  propsSchema: securityAlertSchema, // Zod schema — AI sees the shape
}
```

No routing logic. No switch statement. 12 components, and the AI figures out which one to render.

### Context helpers: the AI already knows what you're looking at

Context helpers get silently injected into every message. The AI always has ambient awareness:

```tsx
// src/app/providers.tsx
contextHelpers={{
  currentTime: currentTimeContextHelper,
  githubStatus: () => ({
    connected: true,
    username: "aryan877",
  }),
  mcpIntegrations: () => ({
    count: 1,
    servers: ["Supabase Production"],
  }),
}}
```

On the chat page, the selected repo is registered dynamically:

```tsx
addContextHelper("selectedRepo", () => ({
  owner: "vercel",
  name: "next.js",
  defaultBranch: "canary",
}));
```

When someone types "list open PRs", the AI doesn't ask "which repo?" — it already knows. Switch repos from the dropdown, next message uses the new context. Zero friction.

There's also `useTamboContextAttachment` for one-shot context: paste a stack trace and it goes with just that one message. Helpers are always-on; attachments are fire-once.

### Interactable components: AI and user share state

Most components are read-only. But `ReviewChecklist` is different — it's wrapped with `withInteractable`, which gives it two-way state sync:

```tsx
const [findings, setFindings] = useTamboComponentState<Finding[]>(
  "findings", propFindings, propFindings
);

const toggleResolved = (id: string) => {
  setFindings(findings.map(f =>
    f.id === id ? { ...f, resolved: !f.resolved } : f
  ));
};

export const ReviewChecklist = withInteractable(ReviewChecklistBase, {
  componentName: "ReviewChecklist",
  stateSchema: ReviewChecklistStateSchema,
});
```

The AI adds findings during a review. You check them off as you fix things. Later, the AI reads the state back and says "you've resolved 3 of 7 findings, want me to look at the remaining ones?" That's shared state between a human and a model.

### Streaming-safe by design

Tambo streams props incrementally, so components get called with partial data:

```
Render 1: { title: undefined, steps: undefined }   ← steps.map() would crash
Render 2: { title: "Plan", steps: undefined }
Render 3: { title: "Plan", steps: [{ ... }] }
```

Every component uses safe defaults (`steps = []`, `content = ""`) so nothing breaks mid-stream. Charts and dependency graphs wait for `useTamboStreamStatus` to report completion before mounting.

### Per-user MCP: each user brings their own tools

Users connect MCP servers from Settings. The config is stored in Convex and loaded reactively:

```tsx
<TamboProvider mcpServers={mcpServers}>
  <TamboMcpProvider>
    {children}
  </TamboMcpProvider>
</TamboProvider>
```

Requests are routed through a same-origin Next.js API proxy (`/api/mcp-proxy`) to avoid CORS restrictions from endpoints like Supabase MCP. Add or remove a server and Tambo auto-connects or disconnects. The AI discovers new tools instantly. Someone connects their Supabase, types "show me my users table", and the AI runs the SQL query right there in chat.

### Generation stages

Instead of a generic spinner, users see what the AI is actually doing:

```
Thinking → Analyzing → Generating → Writing → Complete
```

`useTamboGenerationStage` exposes the internal pipeline. "Analyzing" when fetching context, "Generating" when hydrating a component, "Writing" when streaming.

### What I use from the SDK

| What | How |
|---|---|
| `TamboProvider` + `TamboMcpProvider` | Top-level setup with auth, components, tools, MCP |
| `useTamboThread` / `useTamboThreadList` / `useTamboClient` | Thread switching, history, deletion |
| `useTamboContextHelpers` + `addContextHelper` | Always-on context: selected repo, GitHub status, MCP servers |
| `useTamboContextAttachment` | One-shot context for user-attached data |
| `useTamboSuggestions` | AI-generated follow-up suggestions |
| `useTamboGenerationStage` | Real-time progress indicator |
| `useTamboStreamStatus` | Wait for streaming before rendering charts |
| `useTamboComponentState` + `withInteractable` | Two-way state sync on ReviewChecklist |
| `useTamboThreadInput` | Input state, image staging |
| `useTamboVoice` | Voice dictation |
| `useTamboElicitationContext` | AI asks questions mid-conversation |
| `useTamboMcpServers` / `PromptList` / `ResourceList` | MCP prompt and resource discovery |
| `TamboTool` | 11 GitHub tools with Zod input/output schemas |
| `TamboComponent` | 12 generative components |

---

## Features

### Code Intelligence

Tree-sitter WASM parses files into AST chunks across 11 languages:

```
JS · TS · Python · Go · Rust · Java · C · C++ · C# · Ruby · Kotlin
```

Each chunk (function, class, interface, type) gets embedded as a 1536-dim vector. When reviewing a PR or searching code, the AI searches for semantically similar code across the entire codebase. Not keyword matching — meaning matching.

### Generative UI Components

| What happened | What renders |
|---|---|
| PR analyzed | `PRSummary` — metadata, author, branch info |
| Vulnerability found | `SecurityAlert` — CWE ID, severity, fix suggestion |
| Code needs refactoring | `RefactorCard` — before/after with explanation |
| File changes reviewed | `DiffViewer` — unified diff with syntax colors |
| Architecture question | `CodeFlow` — interactive dependency graph (XYFlow) |
| Stats requested | `PRStatsChart` — bar + pie charts (Recharts) |
| Multiple issues found | `ReviewHeatmap` — severity grid across files |
| Review in progress | `ReviewChecklist` — bidirectional: AI adds, you check off |
| File content needed | `CodeViewer` — Monaco-powered syntax highlighting |
| Repo browsing | `FileExplorer` — tree view of repository |
| Planning | `PlanView` — multi-step task breakdown |
| Explanation needed | `CodeExplainer` — annotated walkthrough |

### GitHub Tools

| Tool | What it does |
|---|---|
| `analyzePR` | PR metadata + diffs + indexed codebase context for deeper reviews |
| `searchCode` | Semantic vector search on indexed codebase, GitHub API fallback |
| `getFileContent` | Read any file from any branch |
| `postReviewComment` | Inline comments on PR lines |
| `submitReview` | Approve / request changes |
| `mergePR` | Merge with confirmation |
| `getRepoTree` | Browse repository structure |
| `listPullRequests` | Filter PRs by state |
| `listBranches` | Available branches |
| `listCommits` | Recent commit history |
| `compareCommits` | Diff between branches, tags, or SHAs |

### Auto-Review Pipeline

GitHub webhooks trigger automatic reviews when PRs are opened or updated. Runs as a durable Convex workflow with checkpointing and automatic retries:

```
PR opened → webhook → durable workflow starts
  → fetch diff + PR details from GitHub
  → vector search indexed AST chunks for codebase context
  → DeepSeek V3.2 generates structured review
  → post to GitHub as formal PR review
  → each step checkpointed, retries on failure
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15, React 19, TailwindCSS v4 |
| **AI Orchestration** | Tambo Generative UI SDK ([self-hosted backend](https://tambo-api.aryankumar.dev)) |
| **Backend** | Convex (real-time DB + durable workflows) |
| **Auth** | Clerk (OAuth + GitHub App) |
| **Code Parsing** | Tree-sitter WASM (11 language grammars) |
| **Embeddings** | OpenAI `text-embedding-3-small` (1536-dim) |
| **Code Review AI** | DeepSeek V3.2 via OpenRouter |
| **GitHub** | Octokit + GitHub App + webhooks |
| **MCP** | `@modelcontextprotocol/sdk` (HTTP transport, per-user) |
| **Code Editor** | Monaco Editor |
| **Terminal** | XTerm.js |
| **Dependency Graphs** | XYFlow (React Flow) |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **UI Primitives** | Radix UI |

---

## Getting Started

```bash
git clone https://github.com/your-username/repochat.git
cd repochat
npm install --legacy-peer-deps
```

Set up environment variables:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_TAMBO_API_KEY=        # from tambo.co/dashboard
NEXT_PUBLIC_CONVEX_URL=           # from npx convex dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= # from clerk.com
CLERK_SECRET_KEY=
OPENROUTER_API_KEY=               # for reviews + docstrings
OPENAI_API_KEY=                   # for embeddings
GITHUB_APP_ID=                    # your GitHub App
GITHUB_PRIVATE_KEY=               # GitHub App private key
```

```bash
npx convex dev --once   # deploy backend
npm run dev             # start app
```

Then paste the system prompt from [`src/lib/constants.ts`](src/lib/constants.ts) into **Tambo Dashboard > Settings > Custom Instructions**.

---

<details>
<summary><b>How the Indexing Pipeline Works</b></summary>

Runs as a durable Convex workflow (`@convex-dev/workflow`) with automatic retries and checkpointing. Each step survives server restarts.

```
Push to indexed branch (GitHub webhook) or manual trigger
  → Create indexing job record
  → Fetch full repo tree via Octokit
  → Compute incremental diff against existing indexed files
    (only process changed/new files, skip unchanged, delete stale)
  → For each batch of 5 files (checkpointed):
      → Fetch content from GitHub API
      → Parse with Tree-sitter WASM grammar
      → Extract definitions using tags.scm queries
      → Generate docstrings via OpenRouter
      → Generate 1536-dim embeddings via OpenAI
      → Store chunks + embeddings in Convex vector index
  → Mark branch as indexed
```

Incremental indexing means only changed files get re-processed. The composite key pattern (`{repoId}:{branch}`) enables efficient filtering during vector search.

</details>

<details>
<summary><b>How AI Reviews Work</b></summary>

Also a durable workflow with retry logic. Both automated (webhook) and chat-initiated reviews use the same indexed codebase.

```
PR opened/updated (webhook) or user asks in chat
  → Fetch PR diff + changed file list
  → Vector search: find semantically similar code chunks from the index
    (gives the AI context about HOW the changed code fits into the codebase)
  → Build context: diff + related code + PR description
  → DeepSeek V3.2 generates structured JSON review:
    → Findings with category, severity, line numbers, suggestions
    → CWE IDs for security issues
  → Format as GitHub PR review with inline comments
  → Post via Octokit createReview API
  → Each step checkpointed with exponential backoff retries
```

</details>

<details>
<summary><b>How Per-User MCP Works</b></summary>

```
User adds MCP server in Settings
  → Config saved to Convex (userMcpServers table)
  → providers.tsx loads via useQuery (reactive)
  → URLs rewritten to /api/mcp-proxy?url=<encoded target>
  → Passed as mcpServers prop to TamboProvider
  → Tambo's TamboMcpProvider connects via StreamableHTTP
  → Next.js API route proxies requests server-side (bypasses CORS)
  → Tools auto-discovered and registered
  → AI can call them during conversation
  → Changing/removing servers auto-disconnects
```

Convex stores the config. Browser sends requests to a same-origin Next.js API proxy (`/api/mcp-proxy`), which forwards them server-side to the real MCP endpoint. This avoids CORS issues with endpoints like Supabase MCP that don't return `Access-Control-Allow-Origin` for browser origins. JSON responses are buffered; SSE streams are piped through.

</details>

<details>
<summary><b>Tree-sitter on Convex: The WASM Problem</b></summary>

Running Tree-sitter serverless required solving a packaging problem.

| Package | Role |
|---|---|
| `web-tree-sitter@0.22.6` | Runtime engine — loads WASMs, parses code, runs queries |
| `tree-sitter-wasms@0.1.13` | Pre-compiled WASM binaries for 30+ languages |

**Version pinning:** The WASMs were compiled with `tree-sitter-cli@0.20.x`. The binary format changed in 0.22+. `web-tree-sitter@0.22.6` is the newest runtime that can load 0.20.x-era WASMs.

**Static require trick:** `require("tree-sitter-wasms/package.json")` tells esbuild to mark it external. We use `/package.json` because the main entry is a native addon that crashes in Convex's runtime.

**Local query files:** `tags.scm` files in `convex/queries/` copied from individual language packages. Using the packages directly causes peer dep conflicts on Convex's server.

</details>

---

## Project Structure

```
repochat/
├── convex/                     # Convex backend
│   ├── schema.ts               # 10 tables, vector indexes
│   ├── github.ts               # Octokit actions (public + internal)
│   ├── indexing.ts             # Tree-sitter + embeddings + vector search
│   ├── indexingWorkflow.ts     # Durable indexing workflow
│   ├── reviews.ts              # PR review generation + posting
│   ├── reviewWorkflow.ts      # Durable review workflow
│   ├── workflowManager.ts     # Retry config, parallelism
│   ├── webhooks.ts             # GitHub webhook handlers
│   ├── mcpServers.ts           # Per-user MCP CRUD
│   └── queries/                # Tree-sitter tags.scm files
├── src/
│   ├── app/
│   │   ├── providers.tsx       # Tambo + MCP + Clerk + Convex
│   │   ├── api/mcp-proxy/      # CORS proxy for MCP servers
│   │   ├── chat/               # Main chat interface
│   │   ├── settings/           # MCP integrations + repo config
│   │   └── docs/               # Documentation page
│   ├── components/
│   │   ├── review/             # 12 generative UI components
│   │   ├── tambo/              # Chat framework
│   │   └── code-view/          # Monaco + XTerm + file explorer
│   └── lib/
│       ├── tambo.ts            # Component registry
│       └── tools.ts            # 11 GitHub tool definitions
└── package.json
```

---

## Built With

<p align="center">
  <a href="https://tambo.co"><img src="public/Tambo-Lockup.svg" height="44" alt="Tambo" /></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://convex.dev"><img src="public/logos/convex.svg" height="36" alt="Convex" /></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://clerk.com"><img src="public/logos/clerk.svg" height="32" alt="Clerk" /></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://react.dev"><img src="public/logos/react.svg" height="32" alt="React" /></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://nextjs.org"><img src="public/logos/nextjs.svg" height="32" alt="Next.js" /></a>
</p>

---

## License

MIT
