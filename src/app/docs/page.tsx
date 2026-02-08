"use client";

import Link from "next/link";
import { useState } from "react";

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const ToolIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const ComponentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const FlowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

type Section = "overview" | "tools" | "components" | "flow";

const tools = [
  {
    name: "analyzePR",
    description: "Pulls down everything about a PR — metadata, branches, stats, and the full diff for every changed file. This is the starting point for any code review.",
    when: "You ask to review a PR, check what changed, or analyze a pull request.",
    inputs: ["owner — Who owns the repo", "repo — Repo name", "prNumber — The PR number to analyze"],
    outputs: ["PR metadata (title, author, state, branches)", "Stats (additions, deletions, file count)", "Full file list with patches"],
    rendersComponent: "PRSummary + DiffViewer",
  },
  {
    name: "getFileContent",
    description: "Reads a file straight from the repo. You can target any branch, tag, or commit — so you can compare versions or check what's on main.",
    when: "You want to see a specific file, or the AI needs context about some code.",
    inputs: ["owner, repo", "path — File path in the repo", "ref (optional) — Branch, tag, or SHA"],
    outputs: ["content — The raw file contents", "size, sha, path"],
    rendersComponent: "CodeViewer",
  },
  {
    name: "postReviewComment",
    description: "Drops an inline comment on a specific line of a PR. The AI uses this to leave targeted feedback — or you can ask it to comment on something you noticed.",
    when: "The AI finds an issue during review, or you ask it to leave a comment on a specific line.",
    inputs: ["owner, repo, prNumber", "body — Your comment (supports markdown)", "path — Which file", "line — Which line number"],
    outputs: ["id — Comment ID", "url — Link to the comment on GitHub", "createdAt"],
    rendersComponent: "None (action-only)",
  },
  {
    name: "submitReview",
    description: "Submits a formal review on GitHub — approve, request changes, or just leave a general comment. The official stamp on a PR.",
    when: "You say \"approve\", \"request changes\", or \"LGTM\" on a PR.",
    inputs: ["owner, repo, prNumber", "event — APPROVE | REQUEST_CHANGES | COMMENT", "body (optional) — Review message"],
    outputs: ["id — Review ID", "state — What you submitted", "url — Link on GitHub"],
    rendersComponent: "None (action-only)",
  },
  {
    name: "mergePR",
    description: "Merges the PR into the base branch. Supports regular merge, squash, or rebase. The AI will always double-check with you before hitting the button.",
    when: "You explicitly ask to merge, squash, or ship a PR.",
    inputs: ["owner, repo, prNumber", "mergeMethod (optional) — merge | squash | rebase"],
    outputs: ["merged — Did it work?", "sha — The merge commit", "message — Result"],
    rendersComponent: "CommitCard",
  },
  {
    name: "getRepoTree",
    description: "Returns the full directory tree of a repo — every folder and file, with sizes. Useful for getting a lay of the land before diving into specific files.",
    when: "You want to explore the project structure or see what files exist.",
    inputs: ["owner, repo", "branch (optional)"],
    outputs: ["tree[] — Path, type (file or dir), and size for each entry", "truncated — If the repo is huge"],
    rendersComponent: "FileExplorer",
  },
  {
    name: "searchCode",
    description: "Searches the entire repo for code patterns using GitHub code search. Find function definitions, API routes, specific strings — anything in the source.",
    when: "You want to find where something is used, defined, or referenced.",
    inputs: ["owner, repo", "query — What to search for"],
    outputs: ["totalCount — How many matches", "items[] — File name, path, and GitHub link for each hit"],
    rendersComponent: "CodeViewer",
  },
  {
    name: "listPullRequests",
    description: "Lists all PRs on a repo — open, closed, or everything. A quick way to see what's in flight or what landed recently.",
    when: "You ask what PRs are open, what's been merged, or just want the full list.",
    inputs: ["owner, repo", "state (optional) — open | closed | all"],
    outputs: ["pullRequests[] — Number, title, state, author, date, and link"],
    rendersComponent: "Text list / PRSummary",
  },
  {
    name: "listBranches",
    description: "Shows every branch in the repo and whether it's protected. Handy for picking which branch to look at or understanding the branching strategy.",
    when: "You want to see what branches exist or check branch protection.",
    inputs: ["owner, repo"],
    outputs: ["branches[] — Name and protected status"],
    rendersComponent: "Text list",
  },
];

const components = [
  {
    name: "PRSummary",
    description: "The big picture of a pull request — title, author, open/closed/merged state, which branches are involved, and a breakdown of what changed across files.",
    when: "Shows up whenever you ask to review or analyze a pull request.",
    nameColor: "text-blue-400",
  },
  {
    name: "SecurityAlert",
    description: "Flags dangerous code with a severity badge, the type of vulnerability, the affected snippet, and a suggested fix. Think XSS, SQL injection, exposed secrets — the stuff that keeps you up at night.",
    when: "Appears automatically when the AI spots a security issue during review.",
    nameColor: "text-red-400",
  },
  {
    name: "DiffViewer",
    description: "A clean unified diff — green for additions, red for deletions, with line numbers and the file path up top. Exactly what you'd see on GitHub, but inside the chat.",
    when: "Rendered when the AI needs to show you what changed in a file.",
    nameColor: "text-green-400",
  },
  {
    name: "RefactorCard",
    description: "Before-and-after code comparison with an explanation of why the new version is better. Great for spotting code smells and suggesting cleaner patterns.",
    when: "Pops up when the AI finds code that could be written better.",
    nameColor: "text-yellow-400",
  },
  {
    name: "CodeViewer",
    description: "Full file contents with syntax highlighting, line numbers, and language detection. Like opening a file in your editor, but right in the conversation.",
    when: "Used when you ask to see a specific file or the AI needs to show you code.",
    nameColor: "text-purple-400",
  },
  {
    name: "FileExplorer",
    description: "An expandable folder tree of the whole repository. Folders nest, files show their type, and changed files get a visual indicator.",
    when: "Appears when you want to browse the project structure or explore what's in the repo.",
    nameColor: "text-cyan-400",
  },
  {
    name: "PlanView",
    description: "A numbered checklist of steps the AI plans to take, each with a status (pending, in progress, done) and which files it touches.",
    when: "Rendered when the AI outlines a multi-step review or action plan.",
    nameColor: "text-indigo-400",
  },
  {
    name: "CommitCard",
    description: "Commit message, author, timestamp, short SHA, and a quick stat of additions vs deletions. Everything you need to know about a commit at a glance.",
    when: "Shows after a merge or when you ask about commit history.",
    nameColor: "text-emerald-400",
  },
  {
    name: "CodeExplainer",
    description: "A structured walkthrough of how code works — broken into overview, detailed explanation, potential gotchas, and best-practice tips.",
    when: "Used when you ask the AI to explain a function, file, or pattern.",
    nameColor: "text-orange-400",
  },
  {
    name: "PRStatsChart",
    description: "Bar and pie charts that visualize the PR at a glance — additions vs deletions per file, where most of the changes landed, and overall PR size.",
    when: "Automatically included after a PR analysis, or when you ask for a visual breakdown.",
    nameColor: "text-pink-400",
  },
  {
    name: "ReviewHeatmap",
    description: "A grid of tiles where each tile is a file. Bigger and redder means more changes or higher severity issues — so you can spot hotspots instantly.",
    when: "Appears after security reviews or when you ask which files need the most attention.",
    nameColor: "text-rose-400",
  },
  {
    name: "CodeFlow",
    description: "An interactive graph that maps out how files depend on each other. Nodes are files, edges are imports, and colors flag severity levels.",
    when: "Rendered when you ask about architecture, dependencies, or how files connect.",
    nameColor: "text-teal-400",
  },
  {
    name: "ReviewChecklist",
    description: "A persistent sidebar panel that tracks every finding during your review. Add items, mark them resolved, and see your progress. This is the only two-way component — the AI both reads from it and writes to it.",
    when: "Always visible in the sidebar. The AI adds findings here as it discovers issues.",
    nameColor: "text-amber-400",
  },
];

const flowSteps = [
  { step: 1, title: "Select Repository", description: "Pick a connected GitHub repo from the dropdown. RepoChat loads your repos via the GitHub App integration." },
  { step: 2, title: "Ask a Question", description: "Type a natural language request — \"Review PR #3\", \"Show me the auth file\", \"Find all API endpoints\". Tambo's AI understands the intent." },
  { step: 3, title: "Tool Execution", description: "The AI calls the appropriate GitHub tool(s) via Tambo. Tools run server-side using your GitHub credentials. No tokens are exposed to the browser." },
  { step: 4, title: "Generative UI Rendering", description: "Tambo streams back the response and renders the right component(s) — PRSummary for PR reviews, DiffViewer for diffs, SecurityAlert for vulnerabilities, etc." },
  { step: 5, title: "Interactive Review", description: "Findings are added to the ReviewChecklist sidebar. You can ask follow-up questions, request approvals, post comments, or merge — all from the chat." },
  { step: 6, title: "MCP Extensions", description: "Connect external tools (like Supabase) via MCP servers in Settings. These become available as additional tools the AI can call during your session." },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BookIcon /> },
    { id: "tools", label: "Tools", icon: <ToolIcon /> },
    { id: "components", label: "Components", icon: <ComponentIcon /> },
    { id: "flow", label: "How It Works", icon: <FlowIcon /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-secondary">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <div className="w-px h-5 bg-secondary" />
          <h1 className="text-sm font-semibold text-foreground">RepoChat Docs</h1>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">
            Powered by Tambo
          </span>
        </div>
      </header>

      <div className="flex">
        {/* Side nav */}
        <nav className="hidden md:flex flex-col w-56 border-r border-secondary p-4 gap-1 sticky top-14 h-[calc(100vh-3.5rem)]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                activeSection === item.id
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-secondary">
            <div className="px-3 py-2 text-xs text-muted-foreground/60">
              <p>9 Tools</p>
              <p>13 Components</p>
              <p>Built for Tambo Hackathon</p>
            </div>
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden sticky top-14 z-20 w-full bg-background border-b border-secondary px-4 py-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
                activeSection === item.id
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 max-w-4xl">
          {activeSection === "overview" && <OverviewSection onNavigate={setActiveSection} />}
          {activeSection === "tools" && <ToolsSection />}
          {activeSection === "components" && <ComponentsSection />}
          {activeSection === "flow" && <FlowSection />}
        </main>
      </div>
    </div>
  );
}

/* ─── Overview ─── */
function OverviewSection({ onNavigate }: { onNavigate: (s: Section) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">RepoChat Documentation</h2>
        <p className="text-muted-foreground leading-relaxed">
          RepoChat is an AI code reviewer that talks back in UI, not text. Built on{" "}
          <span className="text-foreground font-medium">Tambo&apos;s Generative UI</span>, it renders
          diffs, charts, security alerts, and file trees directly in the chat — so you review code
          without ever leaving the conversation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button onClick={() => onNavigate("tools")} className="group p-5 rounded-xl border border-secondary bg-card hover:border-muted-foreground/30 transition-all text-left">
          <div className="flex items-center gap-2 mb-2">
            <ToolIcon />
            <h3 className="text-sm font-semibold text-foreground">9 GitHub Tools</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The actions the AI can take on your behalf — fetching PRs, reading files, posting comments, approving, merging, and more.
          </p>
          <span className="inline-block mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            View tools &rarr;
          </span>
        </button>

        <button onClick={() => onNavigate("components")} className="group p-5 rounded-xl border border-secondary bg-card hover:border-muted-foreground/30 transition-all text-left">
          <div className="flex items-center gap-2 mb-2">
            <ComponentIcon />
            <h3 className="text-sm font-semibold text-foreground">13 Generative Components</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The visual building blocks the AI picks from — each one is a React component the AI streams into the chat when the context is right.
          </p>
          <span className="inline-block mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            View components &rarr;
          </span>
        </button>

        <button onClick={() => onNavigate("flow")} className="group p-5 rounded-xl border border-secondary bg-card hover:border-muted-foreground/30 transition-all text-left sm:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <FlowIcon />
            <h3 className="text-sm font-semibold text-foreground">How It Works</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The full loop — pick a repo, ask a question, watch tools fire and components render. See how everything connects.
          </p>
          <span className="inline-block mt-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            View flow &rarr;
          </span>
        </button>
      </div>

      {/* Architecture at a glance */}
      <div className="p-5 rounded-xl border border-secondary bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">Architecture at a Glance</h3>
        <div className="font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre overflow-x-auto">
{`┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Browser    │────▶│  Tambo Cloud     │────▶│  GitHub API  │
│  (Next.js)   │◀────│  (AI + Tools)    │◀────│  (via App)   │
└─────────────┘     └─────────────────┘     └──────────────┘
       │                     │
       │ Generative UI       │ Tool calls
       │ Components          │ (analyzePR, etc.)
       ▼                     ▼
┌─────────────┐     ┌─────────────────┐
│ PRSummary,  │     │  Convex Backend  │
│ DiffViewer, │     │  (DB, Webhooks,  │
│ Charts ...  │     │   Indexing)      │
└─────────────┘     └─────────────────┘`}
        </div>
      </div>

      {/* Tambo-specific features */}
      <div className="p-5 rounded-xl border border-secondary bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">Tambo SDK Features Used</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Generative UI Components", desc: "13 registered components with Zod prop schemas" },
            { label: "Tool Calling", desc: "9 tools with input/output validation via Zod" },
            { label: "Thread Management", desc: "useTamboThread, useTamboThreadList for conversations" },
            { label: "Context Helpers", desc: "Selected repo + GitHub status always available to AI" },
            { label: "Component State", desc: "Two-way ReviewChecklist — AI reads & writes state" },
            { label: "MCP Integration", desc: "Per-user MCP servers (Supabase, custom) via reactive mcpServers prop" },
            { label: "Suggestions", desc: "AI-generated follow-up suggestions after each response" },
            { label: "Generation Stages", desc: "Live status updates during tool execution" },
          ].map((item) => (
            <div key={item.label} className="flex gap-2">
              <div className="w-1 rounded-full bg-accent flex-shrink-0 mt-1" style={{ height: 32 }} />
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Tools ─── */
function ToolsSection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">GitHub Tools</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          These are the 9 things the AI can actually <em>do</em>. Each tool runs server-side through
          your GitHub credentials — the AI decides which one to call based on what you asked, fires
          it off, and feeds the result into a component. Click any tool to see the full details.
        </p>
      </div>

      <div className="space-y-3">
        {tools.map((tool) => {
          const isExpanded = expanded === tool.name;
          return (
            <div
              key={tool.name}
              className="rounded-xl border border-secondary bg-card overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : tool.name)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <code className="text-sm font-semibold text-foreground bg-accent px-2 py-0.5 rounded">
                    {tool.name}
                  </code>
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                    {tool.description.split(".")[0]}
                  </span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-secondary/50 pt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>

                  <div className="text-xs space-y-3">
                    <div>
                      <p className="text-muted-foreground/60 uppercase tracking-wider font-medium mb-1.5">When does it run?</p>
                      <p className="text-muted-foreground">{tool.when}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground/60 uppercase tracking-wider font-medium mb-1.5">Inputs</p>
                        <ul className="space-y-1">
                          {tool.inputs.map((input, i) => (
                            <li key={i} className="text-muted-foreground flex gap-1.5">
                              <span className="text-muted-foreground/40">&#8250;</span>
                              <code className="text-foreground/80">{input}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-muted-foreground/60 uppercase tracking-wider font-medium mb-1.5">Outputs</p>
                        <ul className="space-y-1">
                          {tool.outputs.map((output, i) => (
                            <li key={i} className="text-muted-foreground flex gap-1.5">
                              <span className="text-muted-foreground/40">&#8250;</span>
                              <code className="text-foreground/80">{output}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground/60 uppercase tracking-wider font-medium mb-1.5">Renders Component</p>
                      <span className="inline-block px-2 py-0.5 rounded bg-accent text-foreground/80 text-xs font-mono">
                        {tool.rendersComponent}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tool flow diagram */}
      <div className="p-5 rounded-xl border border-secondary bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">Tool Execution Flow</h3>
        <div className="font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre overflow-x-auto">
{`User message ──▶ Tambo AI ──▶ Selects tool(s) ──▶ Executes server-side
                    │                                    │
                    │              GitHub API ◀───────────┘
                    │                  │
                    ▼                  ▼
              Picks component    Returns data
                    │                  │
                    └──────┬───────────┘
                           ▼
                   Renders Generative UI
                   (streamed to browser)`}
        </div>
      </div>
    </div>
  );
}

/* ─── Components ─── */
function ComponentsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Generative UI Components</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Instead of dumping text, the AI renders actual React components into the chat.
          Each one has a Zod schema for its props — the AI generates the right props in real-time and
          Tambo streams them into the component as they come in. Here&apos;s every component and when it shows up.
        </p>
      </div>

      <div className="grid gap-3">
        {components.map((comp) => (
          <div
            key={comp.name}
            className="rounded-xl border border-secondary bg-card p-4 hover:border-muted-foreground/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className={`text-base font-bold ${comp.nameColor}`}>{comp.name}</h3>
              {comp.name === "ReviewChecklist" && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                  Interactive
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{comp.description}</p>
            <p className="text-[11px] text-muted-foreground/70">{comp.when}</p>
          </div>
        ))}
      </div>

      {/* How component selection works */}
      <div className="p-5 rounded-xl border border-secondary bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">How Component Selection Works</h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            Each component is registered with Tambo via a <code className="text-foreground/80 bg-accent px-1 rounded">TamboComponent</code> object
            that includes a <code className="text-foreground/80 bg-accent px-1 rounded">description</code> field. This description tells the AI when to use the component.
          </p>
          <p>
            When the AI decides to render a component, it generates props that match the component&apos;s Zod schema.
            Tambo validates these props at runtime and streams them to the React component incrementally.
          </p>
          <p>
            Multiple components can appear in a single response. For example, reviewing a PR might render a
            <code className="text-foreground/80 bg-accent px-1 rounded">PRSummary</code>, several
            <code className="text-foreground/80 bg-accent px-1 rounded">SecurityAlert</code> cards, and a
            <code className="text-foreground/80 bg-accent px-1 rounded">PRStatsChart</code> — all in one message.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Flow ─── */
function FlowSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">How It Works</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          End-to-end flow of a RepoChat session — from selecting a repo to getting an interactive code review.
        </p>
      </div>

      <div className="space-y-0">
        {flowSteps.map((step, i) => (
          <div key={step.step} className="flex gap-4">
            {/* Timeline */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-accent border border-secondary flex items-center justify-center text-xs font-bold text-foreground">
                {step.step}
              </div>
              {i < flowSteps.length - 1 && (
                <div className="w-px flex-1 bg-secondary my-1" />
              )}
            </div>

            {/* Content */}
            <div className="pb-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Example prompts */}
      <div className="p-5 rounded-xl border border-secondary bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">Example Prompts</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { prompt: "Review PR #3", result: "PRSummary + DiffViewer + ReviewChecklist findings" },
            { prompt: "Show me src/auth.ts", result: "CodeViewer with syntax highlighting" },
            { prompt: "What's the repo structure?", result: "FileExplorer tree view" },
            { prompt: "Find all uses of useState", result: "searchCode + CodeViewer results" },
            { prompt: "Any security issues in this PR?", result: "SecurityAlert cards + ReviewHeatmap" },
            { prompt: "Approve this PR", result: "submitReview tool → confirmation" },
            { prompt: "Show PR stats as a chart", result: "PRStatsChart with bar/pie chart" },
            { prompt: "How are the files connected?", result: "CodeFlow dependency graph" },
          ].map((example) => (
            <div key={example.prompt} className="p-3 rounded-lg bg-accent/30 border border-secondary/50">
              <p className="text-xs font-medium text-foreground mb-1">&ldquo;{example.prompt}&rdquo;</p>
              <p className="text-[11px] text-muted-foreground">&rarr; {example.result}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MCP section */}
      <div className="p-5 rounded-xl border border-secondary bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">MCP Server Integration</h3>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            RepoChat supports per-user <code className="text-foreground/80 bg-accent px-1 rounded">MCP (Model Context Protocol)</code> servers.
            You can connect external tools like Supabase from the Settings page.
          </p>
          <p>
            MCP servers are passed to Tambo via the <code className="text-foreground/80 bg-accent px-1 rounded">mcpServers</code> prop on
            <code className="text-foreground/80 bg-accent px-1 rounded">TamboProvider</code>. The prop is fully reactive — adding or
            removing a server triggers automatic reconnection with no page reload needed.
          </p>
          <p>
            Server identity is determined by <code className="text-foreground/80 bg-accent px-1 rounded">URL + transport + customHeaders</code>.
            Changing any of these values creates a new connection. Authentication is handled via
            <code className="text-foreground/80 bg-accent px-1 rounded">Authorization: Bearer &lt;token&gt;</code> in custom headers.
          </p>
        </div>
      </div>
    </div>
  );
}
