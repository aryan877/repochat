<p align="center">
  <img src="public/logo.svg" width="120" alt="RepoChat">
</p>

<h1 align="center">RepoChat</h1>

<p align="center">
  <b>AI code review that understands your entire codebase — not just the diff.</b>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white" alt="Next.js 15" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://tambo.co"><img src="https://img.shields.io/badge/Tambo-Generative_UI-8B5CF6" alt="Tambo" /></a>
  <a href="https://convex.dev"><img src="https://img.shields.io/badge/Convex-Realtime-EF4444?logo=convex" alt="Convex" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Per_User-10B981" alt="MCP" /></a>
  <a href="https://tree-sitter.github.io"><img src="https://img.shields.io/badge/Tree--sitter-11_Languages-F59E0B" alt="Tree-sitter" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License" /></a>
</p>

---

## The Problem

Code reviews on GitHub are blind. Reviewers see a diff but have zero context about the rest of the codebase — how functions are called elsewhere, what patterns exist, whether a change breaks a convention. They review in isolation.

## The Solution

RepoChat indexes your entire codebase with Tree-sitter AST parsing and vector embeddings. When you ask it to review a PR, it pulls semantically similar code from across your repo, understands the patterns, and renders interactive UI components showing exactly what matters — security alerts, dependency graphs, severity heatmaps — not just a wall of text.

Users can also plug in their own services (Supabase, any MCP server) and query databases, manage schemas, run SQL — all from the same chat.

---

## TL;DR

```
"Review PR #42 on my-org/api"
```

The AI fetches the diff, searches your codebase for related code via vector embeddings, analyzes everything with DeepSeek V3.2, then renders:

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
              │  Tambo Generative UI                  │
              │  Monaco · XTerm · XYFlow · Recharts   │
              │  Per-user MCP (Supabase, custom)      │
              └──────────────────────────────────────┘
```

---

## Features

### Code Intelligence

**Tree-sitter WASM** parses 11 languages into AST chunks:

```
JS · TS · Python · Go · Rust · Java · C · C++ · C# · Ruby · Kotlin
```

Each chunk (function, class, interface, type) is embedded as a 1536-dim vector and stored in Convex's vector index. When reviewing a PR, the AI searches for semantically similar code across the entire codebase — not keyword matching, meaning matching.

### Generative UI (12 Components)

The AI picks the right component for the situation. No prompt engineering needed — Tambo handles routing.

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

Each user connects their own services from Settings. Tokens stay per-user — never shared.

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

### GitHub Tools (9)

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

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15, React 19, TailwindCSS v4 |
| **AI Orchestration** | Tambo Generative UI SDK |
| **Backend** | Convex (real-time DB + workflow engine) |
| **Auth** | Clerk (OAuth + GitHub App) |
| **Code Parsing** | Tree-sitter WASM (11 language grammars) |
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

---

<details>
<summary><b>How the Indexing Pipeline Works</b></summary>

```
Push event (GitHub webhook)
  → Fetch full repo tree via Octokit
  → Download file contents (filtered by language)
  → Parse each file with Tree-sitter WASM grammar
  → Extract: functions, classes, methods, interfaces, types, imports
  → Generate 1536-dim embeddings via text-embedding-3-small
  → Store in Convex with vector index (filtered by repo+branch composite key)
```

The composite key pattern (`{repoId}:{branch}`) enables efficient single-field filtering during vector search — an industry standard for multi-tenant vector databases.

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
│   └── workflowManager.ts   # Async workflow orchestration
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
  <a href="https://tambo.co"><img src="public/Tambo-Lockup.svg" height="40" alt="Tambo" /></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://convex.dev"><img src="https://img.shields.io/badge/Convex-Backend-EF4444?style=for-the-badge" alt="Convex" /></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://clerk.com"><img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge" alt="Clerk" /></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Protocol-10B981?style=for-the-badge" alt="MCP" /></a>
</p>

---

## License

MIT
