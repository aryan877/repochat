<p align="center">
  <img src="public/logo.svg" width="120" alt="RepoChat">
</p>

<h1 align="center">RepoChat</h1>

<p align="center">
  <b>AI code review that understands your entire codebase — not just the diff.</b>
</p>

<p align="center">
  <a href="https://tambo.co"><img src="public/Tambo-Lockup.svg" height="24" alt="Tambo" /></a>
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
| **Tambo API** | [tambo-api.aryankumar.dev](https://tambo-api.aryankumar.dev) | Self-hosted NestJS + PostgreSQL + Drizzle ORM |
| **Tambo Dashboard** | [tambo.aryankumar.dev](https://tambo.aryankumar.dev) | Self-hosted Next.js admin panel |
| **Convex** | Managed | Real-time DB + workflow engine |
| **Clerk** | Managed | OAuth + GitHub App auth |

I [forked Tambo's open-source backend](https://github.com/aryan877/tambo) and self-host it because the hosted tier hits OpenAI's strict schema limits when you throw this many components and tools at it. So I disabled `strictJsonSchema` and deployed my own instance with Docker Compose + Caddy.

---

## The Problem

Code reviews on GitHub are blind. Reviewers see a diff but have zero context about the rest of the codebase — how functions are called elsewhere, what patterns exist, whether a change breaks a convention. They review in isolation.

## The Solution

RepoChat indexes your entire codebase with Tree-sitter AST parsing and vector embeddings. When you ask it to review a PR, it pulls semantically similar code from across the repo, understands the patterns, and renders interactive UI components showing exactly what matters: security alerts, dependency graphs, severity heatmaps. Not just a wall of text.

You can also plug in your own services (Supabase, any MCP server) and query databases, manage schemas, run SQL, all from the same chat.

---

## TL;DR

```
"Review PR #42 on my-org/api"
```

The AI fetches the diff, searches the codebase for related code via vector embeddings, analyzes it with DeepSeek V3.2, then renders:

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
 │  Workflow Engine → Index + Review     │
 └──────────────────┬──────────────────┘
                    │ real-time sync
 ┌──────────────────▼──────────────────┐
 │          Next.js Frontend             │
 │                                      │
 │  Generative UI Components             │
 │  GitHub Tools · Per-user MCP          │
 │  Monaco · XTerm · XYFlow · Recharts   │
 └──────────┬───────────────┬──────────┘
            │               │
            ▼               ▼
 ┌──────────────────┐ ┌────────────────────────┐
 │  MCP Servers      │ │  Tambo API (self-host)  │
 │  Supabase, etc.   │ │  tambo-api.aryankumar   │
 │  HTTP · per-user  │ │  .dev                   │
 └──────────────────┘ │  NestJS + Postgres       │
                      │  Caddy auto-TLS          │
                      └────────────────────────┘
```

---

## Features

### Code Intelligence

Tree-sitter WASM parses files into AST chunks across these languages:

```
JS · TS · Python · Go · Rust · Java · C · C++ · C# · Ruby · Kotlin
```

Each chunk (function, class, interface, type) gets embedded as a 1536-dim vector and stored in Convex's vector index. When reviewing a PR, the AI searches for semantically similar code across the entire codebase. Not keyword matching; meaning matching.

### Generative UI

The AI picks the right component for the situation. I don't write routing logic; Tambo handles that.

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

### Per-User MCP Integrations

Each user connects their own services from Settings. Tokens stay per-user, never shared.

```
Settings → "Add Integration" → Pick Supabase → Enter project ref + token → Connect
  ↓
Browser connects directly to mcp.supabase.com (HTTP)
  ↓
AI discovers tools: execute_sql, list_tables, get_schemas...
  ↓
User: "show me my users table" → AI runs SQL → renders result
```

Works with any MCP-compatible server, not just Supabase.

### GitHub Tools

| Tool | What it does |
|---|---|
| `analyzePR` | Fetch PR metadata + full file diffs |
| `getFileContent` | Read any file from any branch |
| `postReviewComment` | Add inline comments on PR |
| `submitReview` | Approve / request changes |
| `mergePR` | Merge (always confirms first) |
| `getRepoTree` | Browse repository structure |
| `searchCode` | Search code across the repo |
| `listPullRequests` | Filter PRs by state |
| `listBranches` | Get available branches |

### Auto-Review Pipeline

GitHub webhooks trigger automatic reviews when PRs are opened or updated:

```
PR opened → webhook → fetch diff → vector search for context
  → DeepSeek V3.2 structured review → post to GitHub as PR review
```

---

## How I Use Tambo (and why it matters)

Most AI chat apps work the same way: the AI calls a tool, gets JSON back, and the developer writes a big `switch` statement to decide what UI to show. The AI has no idea what components exist. You're manually wiring everything.

Tambo does something different. I register my React components with Zod schemas and a plain-English description of when to use them. The AI model sees all of this and picks the right component itself. It then streams the props in real-time, so the UI renders live as the AI thinks.

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

No routing logic on my end. I just describe when a component should appear, and the AI figures it out.

### Context helpers: the AI already knows what you're looking at

This is probably my favorite pattern. I register context helpers that get silently injected into every message. The AI always has ambient awareness of what's happening in the app:

```tsx
// src/app/providers.tsx — these run on every single message
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

Then on the chat page, I dynamically register the selected repo:

```tsx
// src/app/chat/page.tsx
addContextHelper("selectedRepo", () => ({
  owner: "vercel",
  name: "next.js",
  defaultBranch: "canary",
}));
```

So when someone types "list open PRs", the AI doesn't ask "which repo?" It already knows. And when the user switches repos from the dropdown, the context updates reactively. Next message, different repo. Zero friction.

There's also `useTamboContextAttachment` for one-shot context: the user clicks a button, pastes a stack trace, and it gets sent with just that one message. Helpers are always-on; attachments are fire-once.

### Interactable components: the AI and user share state

Most of my components are one-directional: AI generates props, user reads. But the `ReviewChecklist` is different. It's wrapped with `withInteractable`, which gives it two-way state sync between the AI and the user:

```tsx
// src/components/review/review-checklist.tsx
const [findings, setFindings] = useTamboComponentState<Finding[]>(
  "findings", propFindings, propFindings
);

// user checks off a finding
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

The AI adds findings during a review. The user checks them off as they fix things. Later, the AI can read the checklist state back and say "you've resolved 3 of 7 findings, want me to look at the remaining ones?" That's not just rendering UI; it's shared state between a human and an AI model.

### Streaming-safe by design

Since Tambo streams props incrementally, my components get called with partial data during generation:

```
Render 1: { title: undefined, steps: undefined }   ← steps.map() would crash
Render 2: { title: "Plan", steps: undefined }
Render 3: { title: "Plan", steps: [{ ... }] }
```

Every component uses safe defaults (`steps = []`, `content = ""`, etc.) so nothing breaks mid-stream. For things like charts and dependency graphs that can't render partially, I use `useTamboStreamStatus` to wait until streaming finishes before mounting the visualization.

### Generation stages

Instead of a generic spinner, I show what the AI is actually doing:

```
Thinking → Analyzing → Generating → Writing → Complete
```

`useTamboGenerationStage` exposes the internal pipeline stages. The user sees "Analyzing" when the AI is fetching context, "Generating" when it's hydrating a component, and "Writing" when it's streaming the response.

### Per-user MCP: each user brings their own tools

Users can connect their own MCP servers from Settings (Supabase, custom APIs, anything MCP-compatible). The config is stored in Convex and loaded reactively:

```tsx
<TamboProvider mcpServers={mcpServers}>
  <TamboMcpProvider>
    {children}
  </TamboMcpProvider>
</TamboProvider>
```

The browser connects directly to the MCP server over HTTP. No backend proxy. When a user adds or removes a server, Tambo auto-connects or disconnects. The AI discovers the new tools instantly and can call them in the same conversation. Someone connects their Supabase, types "show me my users table", and the AI runs the SQL query right there in chat.

### What I use from Tambo's SDK

| What | How I use it |
|---|---|
| `TamboProvider` + `TamboMcpProvider` | Top-level setup with auth, components, tools, MCP |
| `useTamboThread` / `useTamboThreadList` / `useTamboClient` | Thread switching, history, deletion |
| `useTamboContextHelpers` + `addContextHelper` | Always-on context: selected repo, GitHub status, MCP servers |
| `useTamboContextAttachment` | One-shot context: user attaches extra info to a message |
| `useTamboSuggestions` | AI-generated follow-up suggestions after each response |
| `useTamboGenerationStage` | Real-time generation progress indicator |
| `useTamboStreamStatus` | Wait for streaming to finish before rendering charts |
| `useTamboComponentState` + `withInteractable` | Two-way state sync on ReviewChecklist |
| `useTamboThreadInput` | Input state management, image staging |
| `useTamboVoice` | Voice dictation button |
| `useTamboElicitationContext` | AI can ask the user questions mid-conversation |
| `useTamboMcpPrompt` / `PromptList` / `ResourceList` | MCP prompt and resource discovery |
| `TamboTool` | GitHub tools with Zod input/output schemas |
| `TamboComponent` | Generative components + interactable ReviewChecklist |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15, React 19, TailwindCSS v4 |
| **AI Orchestration** | Tambo Generative UI SDK ([self-hosted backend](https://tambo-api.aryankumar.dev)) |
| **Backend** | Convex (real-time DB + workflow engine) |
| **Auth** | Clerk (OAuth + GitHub App) |
| **Code Parsing** | Tree-sitter WASM (multi-language grammars) |
| **Embeddings** | OpenAI `text-embedding-3-small` (1536-dim) |
| **Code Review AI** | DeepSeek V3.2 via OpenRouter |
| **GitHub** | Octokit + GitHub App + webhooks |
| **MCP** | `@modelcontextprotocol/sdk` (HTTP transport) |
| **Code Editor** | Monaco Editor |
| **Terminal** | XTerm.js |
| **Dependency Graphs** | XYFlow (React Flow) |
| **Charts** | Recharts |
| **Rich Text** | TipTap (ProseMirror) |
| **Animations** | Framer Motion |
| **UI Primitives** | Radix UI |
| **Validation** | Zod |

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
OPENROUTER_API_KEY=               # for embeddings + reviews
GITHUB_APP_ID=                    # your GitHub App
GITHUB_PRIVATE_KEY=               # GitHub App private key
```

```bash
npx convex dev --once   # deploy backend
npm run dev             # start app
```

Then paste the system prompt from [`src/lib/constants.ts`](src/lib/constants.ts) into **Tambo Dashboard > Settings > Custom Instructions**. This is the single source of truth for the AI agent's behavior.

---

<details>
<summary><b>How the Indexing Pipeline Works</b></summary>

```
Push to indexed branch (GitHub webhook)
  → Fetch full repo tree via Octokit
  → Filter: skip node_modules, .git, dist, build, lock files, minified JS
  → Keep only supported languages (JS/TS/Python/Go/Rust/Java/C/C++/C#/Ruby/Kotlin/Bash)
  → Delete all existing chunks for that branch (full re-index, not incremental)
  → For each file:
      → Fetch content from GitHub API
      → Parse with Tree-sitter WASM grammar
      → Extract definitions using tags.scm queries (functions, classes, methods, interfaces, types)
      → Fall back to AST traversal if no query file exists for the language
      → Generate 1536-dim embedding per chunk via OpenAI text-embedding-3-small
      → Store chunk + embedding in Convex vector index
  → Mark branch as indexed
```

**Indexing triggers:** push events to already-indexed branches, or manual trigger. Each run is a **full re-index** — old chunks are deleted before new ones are stored. This ensures no stale code lingers after refactors or file deletions.

The composite key pattern (`{repoId}:{branch}`) enables efficient single-field filtering during vector search — an industry standard for multi-tenant vector databases.

</details>

<details>
<summary><b>Solving Tree-sitter on Convex: The WASM Bundling Problem</b></summary>

Running Tree-sitter in a serverless environment (Convex) required solving a non-trivial packaging problem. Here's the short version:

**The challenge:** Tree-sitter has two parts that need to work together on the server:

| Package | What it does |
|---|---|
| `web-tree-sitter` | The runtime engine — loads WASM grammars, parses code, runs queries |
| `tree-sitter-wasms` | Pre-compiled WASM binaries for 30+ languages (JS, Python, Go, etc.) |

Convex uses **esbuild** to bundle your backend code. Packages listed in `externalPackages` get installed on the server via `npm install` instead of being inlined. But esbuild can only detect packages from **static** `require()` calls with string literals — dynamic `require(variable)` is invisible to the bundler.

**What we did:**

1. **Static require for detection:** Added `require("tree-sitter-wasms/package.json")` at the top of `indexing.ts`. This is never used for its return value — it just tells esbuild "this package exists, mark it external." We use `/package.json` specifically because the main entry (`bindings/node`) is a native addon that crashes in Convex's runtime.

2. **Version matching:** `tree-sitter-wasms@0.1.13` compiles its WASMs with `tree-sitter-cli@0.20.x`. The WASM binary format changed in 0.22+, so `web-tree-sitter@0.26.x` can't load them (fails at `getDylinkMetadata`). Pinned to `web-tree-sitter@0.22.6` which is the newest version compatible with the 0.20.x WASM format.

3. **Local query files:** Tree-sitter's `tags.scm` query files enable smart extraction (find all function/class/method definitions). These ship inside individual language packages (`tree-sitter-javascript`, etc.), but those packages have conflicting peer dependencies that break `npm install` on Convex's server. Solution: copied the 10 query files into `convex/queries/` and load them with `fs.readFileSync` at runtime.

**Result:** Full AST-based code intelligence across multiple languages running on Convex's serverless runtime, with query-based definition extraction instead of naive regex or line-based chunking.

</details>

<details>
<summary><b>How AI Reviews Work</b></summary>

```
PR opened/updated (webhook)
  → Fetch PR diff + changed file contents
  → For each changed file:
    → Vector search: find top-K semantically similar code chunks
    → This gives the AI context about HOW the changed code is used elsewhere
  → Build context window: diff + relevant code + repo structure
  → DeepSeek V3.2 generates structured JSON review:
    → Findings with category, severity, line numbers, suggestions
    → CWE IDs for security issues
  → Format as GitHub PR review with inline comments
  → Post via Octokit createReview API
```

</details>

<details>
<summary><b>How Per-User MCP Works</b></summary>

```
User adds MCP server in Settings
  → Config saved to Convex (userMcpServers table)
  → providers.tsx loads via useQuery (reactive)
  → Passed as mcpServers prop to TamboProvider
  → Tambo's TamboMcpProvider connects via HTTP from browser
  → Tools auto-discovered and registered
  → AI can call them during conversation
  → Changing/removing servers auto-disconnects (identity = url+transport+headers)
```

Convex stores the config. The browser connects directly to the MCP server. No proxy, no backend relay.

</details>

---

## Project Structure

```
repochat/
├── convex/                  # Convex backend
│   ├── schema.ts            # 10 tables, vector indexes
│   ├── github.ts            # Octokit actions
│   ├── indexing.ts          # Tree-sitter + embeddings pipeline
│   ├── reviews.ts           # DeepSeek review engine
│   ├── webhooks.ts          # GitHub webhook handlers
│   ├── mcpServers.ts        # Per-user MCP CRUD
│   ├── workflowManager.ts   # Async workflow orchestration
│   └── queries/             # Tree-sitter tags.scm files
│       ├── javascript.scm   #   Bundled locally to avoid peer dep conflicts
│       ├── typescript.scm   #   with individual tree-sitter-* packages
│       └── ...
├── src/
│   ├── app/
│   │   ├── providers.tsx    # Tambo + MCP + Clerk + Convex
│   │   ├── page.tsx         # Main chat + sidebar
│   │   └── settings/        # MCP integrations UI
│   ├── components/
│   │   ├── review/          # 12 generative UI components
│   │   ├── tambo/           # Chat framework
│   │   └── code-view/       # Monaco + XTerm + file explorer
│   └── lib/
│       ├── tambo.ts         # Component registry
│       └── tools.ts         # GitHub tool definitions
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
