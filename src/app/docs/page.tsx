"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Wrench,
  Layers,
  Zap,
  Network,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  ArrowRight,
  Menu,
  X,
  List,
  type LucideIcon,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type Section = "overview" | "flow" | "tools" | "components" | "architecture";

/* ═══════════════════════════════════════════════════════════════════════════
   NAVIGATION + TABLE OF CONTENTS CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

const SIDEBAR_NAV: {
  title: string;
  items: { id: Section; label: string; Icon: LucideIcon }[];
}[] = [
  {
    title: "Getting Started",
    items: [
      { id: "overview", label: "Overview", Icon: BookOpen },
      { id: "flow", label: "How It Works", Icon: Zap },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "tools", label: "GitHub Tools", Icon: Wrench },
      { id: "components", label: "Components", Icon: Layers },
    ],
  },
  {
    title: "Deep Dive",
    items: [
      { id: "architecture", label: "Architecture", Icon: Network },
    ],
  },
];

const SECTION_ORDER: Section[] = [
  "overview",
  "flow",
  "tools",
  "components",
  "architecture",
];

const PAGE_TOC: Record<Section, { id: string; label: string }[]> = {
  overview: [
    { id: "introduction", label: "Introduction" },
    { id: "key-concepts", label: "Key concepts" },
    { id: "architecture-glance", label: "Architecture at a glance" },
    { id: "sdk-features", label: "Tambo SDK features" },
  ],
  flow: [
    { id: "walkthrough", label: "Step by step" },
    { id: "example-prompts", label: "Example prompts" },
    { id: "mcp-integration", label: "MCP integration" },
  ],
  tools: [
    { id: "tool-reference", label: "Tool reference" },
    { id: "execution-flow", label: "Execution flow" },
  ],
  components: [
    { id: "component-list", label: "Component list" },
    { id: "selection-logic", label: "How selection works" },
  ],
  architecture: [
    { id: "data-sources", label: "Data sources" },
    { id: "data-flow", label: "Data flow paths" },
    { id: "sync-triggers", label: "When things sync" },
    { id: "durability", label: "Workflow durability" },
    { id: "pipelines", label: "Pipelines" },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONTENT DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const tools = [
  {
    name: "analyzePR",
    description:
      "Pulls down everything about a PR — metadata, branches, stats, the full diff, and relevant codebase context from the indexed repository when available.",
    when: "You ask to review a PR, check what changed, or analyze a pull request.",
    inputs: [
      "owner — Who owns the repo",
      "repo — Repo name",
      "prNumber — The PR number to analyze",
    ],
    outputs: [
      "PR metadata (title, author, state, branches)",
      "Stats (additions, deletions, file count)",
      "Full file list with patches",
      "codebaseContext — Relevant indexed code for deeper review",
    ],
    renders: "PRSummary + DiffViewer",
  },
  {
    name: "getFileContent",
    description:
      "Reads a file straight from the repo. You can target any branch, tag, or commit — so you can compare versions or check what's on main.",
    when: "You want to see a specific file, or the AI needs context about some code.",
    inputs: [
      "owner, repo",
      "path — File path in the repo",
      "ref (optional) — Branch, tag, or SHA",
    ],
    outputs: ["content — The raw file contents", "size, sha, path"],
    renders: "CodeViewer",
  },
  {
    name: "postReviewComment",
    description:
      "Drops an inline comment on a specific line of a PR. The AI uses this to leave targeted feedback.",
    when: "The AI finds an issue during review, or you ask it to comment on a specific line.",
    inputs: [
      "owner, repo, prNumber",
      "body — Your comment (supports markdown)",
      "path — Which file",
      "line — Which line number",
    ],
    outputs: [
      "id — Comment ID",
      "url — Link to the comment on GitHub",
      "createdAt",
    ],
    renders: "None (action-only)",
  },
  {
    name: "submitReview",
    description:
      'Submits a formal review on GitHub — approve, request changes, or just leave a general comment.',
    when: 'You say "approve", "request changes", or "LGTM" on a PR.',
    inputs: [
      "owner, repo, prNumber",
      "event — APPROVE | REQUEST_CHANGES | COMMENT",
      "body (optional) — Review message",
    ],
    outputs: [
      "id — Review ID",
      "state — What you submitted",
      "url — Link on GitHub",
    ],
    renders: "None (action-only)",
  },
  {
    name: "mergePR",
    description:
      "Merges the PR into the base branch. Supports regular merge, squash, or rebase.",
    when: "You explicitly ask to merge, squash, or ship a PR.",
    inputs: [
      "owner, repo, prNumber",
      "mergeMethod (optional) — merge | squash | rebase",
    ],
    outputs: [
      "merged — Did it work?",
      "sha — The merge commit",
      "message — Result",
    ],
    renders: "CommitCard",
  },
  {
    name: "getRepoTree",
    description:
      "Returns the full directory tree of a repo — every folder and file, with sizes.",
    when: "You want to explore the project structure or see what files exist.",
    inputs: ["owner, repo", "branch (optional)"],
    outputs: [
      "tree[] — Path, type (file or dir), and size for each entry",
      "truncated — If the repo is huge",
    ],
    renders: "FileExplorer",
  },
  {
    name: "searchCode",
    description:
      "Semantic search on the indexed codebase (vector search on AST chunks), with GitHub API fallback for non-indexed repos.",
    when: "You want to find where something is used, defined, or referenced.",
    inputs: [
      "owner, repo",
      "query — What to search for",
      "branch (optional)",
    ],
    outputs: [
      "source — 'indexed' or 'github'",
      "totalCount",
      "items[] — Name, path, code snippets, relevance score",
    ],
    renders: "CodeViewer",
  },
  {
    name: "listPullRequests",
    description: "Lists all PRs on a repo — open, closed, or everything.",
    when: "You ask what PRs are open, what's been merged, or just want the full list.",
    inputs: ["owner, repo", "state (optional) — open | closed | all"],
    outputs: [
      "pullRequests[] — Number, title, state, author, date, and link",
    ],
    renders: "Text list / PRSummary",
  },
  {
    name: "listBranches",
    description:
      "Shows every branch in the repo and whether it's protected.",
    when: "You want to see what branches exist or check branch protection.",
    inputs: ["owner, repo"],
    outputs: ["branches[] — Name and protected status"],
    renders: "Text list",
  },
  {
    name: "listCommits",
    description:
      "Shows recent commits on a branch — SHA, message, author, date, and a link.",
    when: "You ask about commit history, recent changes, or what's been pushed to a branch.",
    inputs: ["owner, repo", "branch (optional)", "perPage (optional)"],
    outputs: [
      "commits[] — SHA, message, author, avatar, date, and GitHub link",
    ],
    renders: "CommitCard",
  },
  {
    name: "compareCommits",
    description:
      "Compares two branches, tags, or commits and shows exactly what changed between them.",
    when: "You want to see what changed between two branches or since a specific commit.",
    inputs: [
      "owner, repo",
      "base — Branch, tag, or commit SHA to compare from",
      "head — Branch, tag, or commit SHA to compare to",
    ],
    outputs: [
      "status, aheadBy, behindBy, totalCommits",
      "commits[] — SHA, message, author, date",
      "files[] — Filename, status, additions, deletions, patch",
    ],
    renders: "DiffViewer + CommitCard",
  },
];

const components = [
  { name: "PRSummary", description: "Title, author, state, branches, and a breakdown of what changed across files.", when: "Reviewing or analyzing a pull request." },
  { name: "SecurityAlert", description: "Flags dangerous code with severity, vulnerability type, affected snippet, and suggested fix.", when: "AI spots a security issue during review." },
  { name: "DiffViewer", description: "Clean unified diff — green additions, red deletions, with line numbers.", when: "AI shows what changed in a file." },
  { name: "RefactorCard", description: "Before-and-after code comparison with an explanation of improvements.", when: "AI finds code that could be written better." },
  { name: "CodeViewer", description: "Full file contents with syntax highlighting, line numbers, and language detection.", when: "You ask to see a file or AI shows code." },
  { name: "FileExplorer", description: "Expandable folder tree of the whole repository with file type indicators.", when: "Browsing project structure." },
  { name: "PlanView", description: "Numbered checklist with status (pending, in progress, done) and affected files.", when: "AI outlines a multi-step plan." },
  { name: "CommitCard", description: "Message, author, timestamp, short SHA, and additions vs deletions.", when: "After a merge or viewing commit history." },
  { name: "CodeExplainer", description: "Structured walkthrough — overview, detailed explanation, gotchas, and tips.", when: "Explaining a function, file, or pattern." },
  { name: "PRStatsChart", description: "Bar and pie charts visualizing additions vs deletions per file.", when: "After PR analysis or on request." },
  { name: "ReviewHeatmap", description: "Grid of tiles — bigger and redder means more changes or higher severity.", when: "After security reviews or hotspot analysis." },
  { name: "CodeFlow", description: "Interactive graph mapping file dependencies. Nodes are files, edges are imports.", when: "Analyzing architecture or dependencies." },
  { name: "ReviewChecklist", description: "Persistent sidebar tracking findings. The only two-way component — AI reads and writes.", when: "Always visible. AI adds findings as it discovers issues.", interactive: true },
];

const flowSteps = [
  { step: 1, title: "Select Repository", description: "Pick a connected GitHub repo from the dropdown. RepoChat loads your repos via the GitHub App integration." },
  { step: 2, title: "Ask a Question", description: 'Type a natural language request — "Review PR #3", "Show me the auth file", "Find all API endpoints".' },
  { step: 3, title: "Tool Execution", description: "The AI calls the appropriate GitHub tool(s) via Tambo. Tools run server-side. No tokens exposed to browser." },
  { step: 4, title: "Generative UI", description: "Tambo streams back the response and renders the right component(s) — PRSummary, DiffViewer, SecurityAlert, etc." },
  { step: 5, title: "Interactive Review", description: "Findings populate the ReviewChecklist sidebar. Ask follow-ups, approve, comment, or merge — all from chat." },
  { step: 6, title: "MCP Extensions", description: "Connect external tools (Supabase, custom) via MCP servers in Settings. Available as additional AI tools." },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function getSectionLabel(id: Section) {
  for (const group of SIDEBAR_NAV) {
    const item = group.items.find((i) => i.id === id);
    if (item) return item.label;
  }
  return id;
}

function getAdjacentSections(current: Section) {
  const idx = SECTION_ORDER.indexOf(current);
  return {
    prev: idx > 0 ? SECTION_ORDER[idx - 1] : null,
    next: idx < SECTION_ORDER.length - 1 ? SECTION_ORDER[idx + 1] : null,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function Ic({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-[5px] bg-[#18181b] border border-[#27272a] text-[#d4d4d8] text-[13px] font-mono">
      {children}
    </code>
  );
}

function Anchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20">
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[20px] font-semibold text-[#fafafa] tracking-tight mb-4">
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-[14px] text-[#a1a1aa] leading-[1.7]">{children}</div>;
}

function PageNav({
  current,
  onNavigate,
}: {
  current: Section;
  onNavigate: (s: Section) => void;
}) {
  const { prev, next } = getAdjacentSections(current);
  return (
    <div className="flex items-center justify-between mt-16 pt-8 border-t border-[#1e1e22]">
      {prev ? (
        <button
          onClick={() => onNavigate(prev)}
          className="group flex items-center gap-1.5 py-3 hover:opacity-80 transition-opacity"
        >
          <ChevronLeft
            size={14}
            className="text-[#a1a1aa] group-hover:text-[#fafafa] transition-colors"
          />
          <span className="text-[14px] font-medium text-[#a1a1aa] group-hover:text-[#fafafa] transition-colors">
            {getSectionLabel(prev)}
          </span>
        </button>
      ) : (
        <div />
      )}
      {next ? (
        <button
          onClick={() => onNavigate(next)}
          className="group flex items-center gap-1.5 py-3 hover:opacity-80 transition-opacity"
        >
          <span className="text-[14px] font-medium text-[#a1a1aa] group-hover:text-[#fafafa] transition-colors">
            {getSectionLabel(next)}
          </span>
          <ChevronRight
            size={14}
            className="text-[#a1a1aa] group-hover:text-[#fafafa] transition-colors"
          />
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR CONTENT (shared between desktop sidebar and mobile overlay)
   ═══════════════════════════════════════════════════════════════════════════ */

function SidebarContent({
  activeSection,
  onNavigate,
}: {
  activeSection: Section;
  onNavigate: (s: Section) => void;
}) {
  return (
    <div className="px-4 py-6 space-y-6">
      {SIDEBAR_NAV.map((group) => (
        <div key={group.title}>
          <div className="text-[11px] font-semibold text-[#52525b] uppercase tracking-[0.08em] mb-2 px-3">
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left ${
                    isActive
                      ? "bg-[#252525] text-[#e0e0e0] font-medium"
                      : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
                  }`}
                >
                  <item.Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-[#1e1e22]">
        <div className="text-[11px] font-semibold text-[#52525b] uppercase tracking-[0.08em] mb-2 px-3">
          Links
        </div>
        <div className="space-y-0.5">
          {[
            { label: "GitHub Repo", href: "https://github.com/aryan877/repochat" },
            { label: "Tambo SDK", href: "https://tambo.co" },
            { label: "Convex Docs", href: "https://docs.convex.dev" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#71717a] hover:text-[#a1a1aa] rounded-lg hover:bg-[#18181b] transition-colors"
            >
              <ExternalLink size={14} />
              <span>{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: OVERVIEW
   ═══════════════════════════════════════════════════════════════════════════ */

function OverviewSection({
  onNavigate,
}: {
  onNavigate: (s: Section) => void;
}) {
  return (
    <div className="space-y-12">
      <Anchor id="introduction">
        <div className="mb-2">
          <span className="text-[12px] font-medium text-[#888]">
            Getting Started
          </span>
        </div>
        <h1 className="text-[32px] font-bold text-[#fafafa] tracking-tight mb-3 leading-[1.15]">
          Overview
        </h1>
        <Prose>
          <p>
            RepoChat is an AI code review assistant that renders interactive UI
            directly in the chat — diffs, security alerts, file trees, and
            charts instead of plain text. Built on{" "}
            <strong className="text-[#d4d4d8]">Tambo&apos;s Generative UI</strong>{" "}
            SDK with Convex for real-time data and GitHub App integration for
            repository access.
          </p>
        </Prose>
      </Anchor>

      <Anchor id="key-concepts">
        <H2>Key concepts</H2>
        <ul className="space-y-3">
          {[
            {
              term: "Generative UI",
              def: "Instead of returning markdown, the AI generates structured props for React components. Tambo validates and streams them in real-time.",
            },
            {
              term: "GitHub Tools",
              def: "11 server-side tools the AI calls on your behalf — analyze PRs, read files, post comments, merge, search code, and more.",
            },
            {
              term: "Code Indexing",
              def: "Tree-sitter parses your repo into AST chunks, OpenAI generates embeddings, and Convex stores them for fast vector search.",
            },
            {
              term: "Durable Workflows",
              def: "Both indexing and automated PR reviews run as checkpointed Convex workflows. Server restarts resume where they left off.",
            },
          ].map((item) => (
            <li key={item.term} className="flex gap-3">
              <span className="text-[#3f3f46] mt-1.5 select-none">&#x2022;</span>
              <div>
                <strong className="text-[#d4d4d8] text-[14px]">
                  {item.term}
                </strong>
                <span className="text-[14px] text-[#a1a1aa]">
                  {" "}
                  &mdash; {item.def}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Anchor>

      <Anchor id="architecture-glance">
        <H2>Architecture at a glance</H2>
        <div className="rounded-lg border border-[#1e1e22] bg-[#111113] p-6 overflow-x-auto">
          {/* Row 1 */}
          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
            <FlowBox label="Browser" sub="Next.js" />
            <ArrowRight size={16} className="text-[#3f3f46] flex-shrink-0" />
            <FlowBox label="Tambo Cloud" sub="AI + Tools" />
            <ArrowRight size={16} className="text-[#3f3f46] flex-shrink-0" />
            <FlowBox label="GitHub API" sub="Octokit" />
          </div>
          {/* Connector */}
          <div className="flex justify-center mb-4">
            <div className="w-px h-6 bg-[#27272a]" />
          </div>
          {/* Row 2 */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <FlowBox label="Generative UI" sub="13 Components" />
            <FlowBox label="Convex" sub="DB + Workflows" />
            <FlowBox label="Indexing" sub="Tree-sitter + AI" />
          </div>
        </div>
      </Anchor>

      <Anchor id="sdk-features">
        <H2>Tambo SDK features</H2>
        <div className="grid gap-px sm:grid-cols-2 rounded-lg border border-[#1e1e22] overflow-hidden">
          {[
            { label: "Generative UI", desc: "Registered components with Zod prop schemas" },
            { label: "Tool Calling", desc: "GitHub tools with Zod validation" },
            { label: "Thread Management", desc: "useTamboThread, useTamboThreadList" },
            { label: "Context Helpers", desc: "Selected repo always available to AI" },
            { label: "Component State", desc: "Two-way ReviewChecklist — AI reads & writes" },
            { label: "MCP Integration", desc: "Per-user MCP servers via reactive prop" },
            { label: "Suggestions", desc: "AI-generated follow-ups after each response" },
            { label: "Generation Stages", desc: "Live status updates during execution" },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`p-4 bg-[#111113] ${i % 2 === 0 ? "sm:border-r" : ""} ${i < 6 ? "border-b" : ""} border-[#1e1e22]`}
            >
              <p className="text-[13px] font-medium text-[#d4d4d8] mb-0.5">
                {item.label}
              </p>
              <p className="text-[12px] text-[#71717a]">{item.desc}</p>
            </div>
          ))}
        </div>
      </Anchor>

      <PageNav current="overview" onNavigate={onNavigate} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: HOW IT WORKS
   ═══════════════════════════════════════════════════════════════════════════ */

function FlowSection({
  onNavigate,
}: {
  onNavigate: (s: Section) => void;
}) {
  return (
    <div className="space-y-12">
      <div>
        <div className="mb-2">
          <span className="text-[12px] font-medium text-[#888]">
            Getting Started
          </span>
        </div>
        <h1 className="text-[32px] font-bold text-[#fafafa] tracking-tight mb-3 leading-[1.15]">
          How It Works
        </h1>
        <Prose>
          <p>
            End-to-end flow from selecting a repo to getting an interactive code
            review. Every step happens in the chat — no context switching.
          </p>
        </Prose>
      </div>

      <Anchor id="walkthrough">
        <H2>Step by step</H2>
        <div className="space-y-0">
          {flowSteps.map((step, i) => (
            <div key={step.step} className="flex gap-4 relative">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full border border-[#27272a] bg-[#111113] flex items-center justify-center text-[12px] font-mono text-[#71717a] relative z-10">
                  {step.step}
                </div>
                {i < flowSteps.length - 1 && (
                  <div className="w-px flex-1 bg-[#1e1e22]" />
                )}
              </div>
              <div className="pb-8 pt-0.5">
                <h3 className="text-[14px] font-semibold text-[#fafafa] mb-1">
                  {step.title}
                </h3>
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed max-w-lg">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Anchor>

      <Anchor id="example-prompts">
        <H2>Example prompts</H2>
        <div className="rounded-lg border border-[#1e1e22] divide-y divide-[#1e1e22]">
          {[
            { prompt: "Review PR #3", result: "PRSummary + DiffViewer + ReviewChecklist" },
            { prompt: "Show me src/auth.ts", result: "CodeViewer with syntax highlighting" },
            { prompt: "What's the repo structure?", result: "FileExplorer tree view" },
            { prompt: "Find all uses of useState", result: "searchCode + CodeViewer results" },
            { prompt: "Any security issues?", result: "SecurityAlert cards + ReviewHeatmap" },
            { prompt: "Approve this PR", result: "submitReview tool confirmation" },
            { prompt: "Show PR stats as a chart", result: "PRStatsChart with bar/pie chart" },
            { prompt: "How are files connected?", result: "CodeFlow dependency graph" },
          ].map((example) => (
            <div
              key={example.prompt}
              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3 bg-[#111113] first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="text-[13px] text-[#d4d4d8] font-medium sm:w-56 flex-shrink-0">
                &ldquo;{example.prompt}&rdquo;
              </span>
              <span className="text-[12px] text-[#71717a]">
                {example.result}
              </span>
            </div>
          ))}
        </div>
      </Anchor>

      <Anchor id="mcp-integration">
        <H2>MCP integration</H2>
        <Prose>
          <p className="mb-3">
            RepoChat supports per-user{" "}
            <Ic>MCP (Model Context Protocol)</Ic> servers. Connect external
            tools like Supabase from Settings.
          </p>
          <p className="mb-3">
            MCP servers are passed to Tambo via the{" "}
            <Ic>mcpServers</Ic> prop on <Ic>TamboProvider</Ic>.
            Fully reactive — adding or removing triggers automatic
            reconnection.
          </p>
          <p>
            Server identity is determined by{" "}
            <Ic>URL + transport + customHeaders</Ic>. Auth is handled
            via <Ic>Authorization: Bearer</Ic> in custom headers.
          </p>
        </Prose>
      </Anchor>

      <PageNav current="flow" onNavigate={onNavigate} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: TOOLS
   ═══════════════════════════════════════════════════════════════════════════ */

function ToolsSection({
  onNavigate,
}: {
  onNavigate: (s: Section) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-12">
      <div>
        <div className="mb-2">
          <span className="text-[12px] font-medium text-[#888]">
            Reference
          </span>
        </div>
        <h1 className="text-[32px] font-bold text-[#fafafa] tracking-tight mb-3 leading-[1.15]">
          GitHub Tools
        </h1>
        <Prose>
          <p>
            11 tools the AI calls server-side through your GitHub App
            credentials. Each one maps to a specific action. Click a tool to
            expand its details.
          </p>
        </Prose>
      </div>

      <Anchor id="tool-reference">
        <H2>Tool reference</H2>
        <div className="rounded-lg border border-[#1e1e22] divide-y divide-[#1e1e22] overflow-hidden">
          {tools.map((tool) => {
            const isOpen = expanded === tool.name;
            return (
              <div key={tool.name} className="bg-[#111113]">
                <button
                  onClick={() =>
                    setExpanded(isOpen ? null : tool.name)
                  }
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#18181b] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <code className="text-[13px] font-semibold text-[#d4d4d8] font-mono">
                      {tool.name}
                    </code>
                    <span className="text-[12px] text-[#52525b] truncate hidden sm:inline">
                      {tool.description.split(".")[0]}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 ml-2"
                  >
                    <ChevronDown
                      size={14}
                      className="text-[#52525b]"
                    />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[#1e1e22]">
                        <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                          {tool.description}
                        </p>

                        <div className="p-3 rounded-md bg-[#0a0a0a] border border-[#1e1e22]">
                          <p className="text-[11px] uppercase tracking-wider text-[#52525b] font-semibold mb-1">
                            When does it run?
                          </p>
                          <p className="text-[12px] text-[#a1a1aa]">
                            {tool.when}
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-[#52525b] font-semibold mb-2">
                              Inputs
                            </p>
                            <ul className="space-y-1">
                              {tool.inputs.map((input, i) => (
                                <li
                                  key={i}
                                  className="text-[12px] text-[#a1a1aa] flex gap-2"
                                >
                                  <span className="text-[#3f3f46] select-none">
                                    &#x203A;
                                  </span>
                                  {input}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-[#52525b] font-semibold mb-2">
                              Outputs
                            </p>
                            <ul className="space-y-1">
                              {tool.outputs.map((output, i) => (
                                <li
                                  key={i}
                                  className="text-[12px] text-[#a1a1aa] flex gap-2"
                                >
                                  <span className="text-[#3f3f46] select-none">
                                    &#x203A;
                                  </span>
                                  {output}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-[#52525b] font-semibold mb-1">
                            Renders
                          </p>
                          <Ic>{tool.renders}</Ic>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Anchor>

      <Anchor id="execution-flow">
        <H2>Execution flow</H2>
        <Prose>
          <p className="mb-4">
            Every tool follows this path from user message to rendered
            component.
          </p>
        </Prose>
        <div className="rounded-lg border border-[#1e1e22] bg-[#111113] p-5">
          <div className="flex items-center gap-3 flex-wrap">
            {[
              "User Message",
              "Tambo AI",
              "Tool Selection",
              "GitHub API",
              "Component Render",
            ].map((label, i, arr) => (
              <div key={label} className="flex items-center gap-3">
                <div className="px-3 py-2 rounded-md border border-[#27272a] bg-[#0a0a0a] text-[12px] font-medium text-[#d4d4d8] whitespace-nowrap">
                  {label}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight
                    size={14}
                    className="text-[#3f3f46] flex-shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </Anchor>

      <PageNav current="tools" onNavigate={onNavigate} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function ComponentsSection({
  onNavigate,
}: {
  onNavigate: (s: Section) => void;
}) {
  return (
    <div className="space-y-12">
      <div>
        <div className="mb-2">
          <span className="text-[12px] font-medium text-[#888]">
            Reference
          </span>
        </div>
        <h1 className="text-[32px] font-bold text-[#fafafa] tracking-tight mb-3 leading-[1.15]">
          Components
        </h1>
        <Prose>
          <p>
            13 React components the AI renders into the chat. Each has a Zod
            schema — the AI generates props in real-time and Tambo streams
            them incrementally.
          </p>
        </Prose>
      </div>

      <Anchor id="component-list">
        <H2>Component list</H2>
        <div className="grid gap-3 sm:grid-cols-2">
          {components.map((comp) => (
            <div
              key={comp.name}
              className={`rounded-lg border bg-[#111113] p-4 ${
                comp.interactive
                  ? "border-[#3a3a3a]"
                  : "border-[#1e1e22]"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <code className="text-[13px] font-semibold text-[#fafafa] font-mono">
                  {comp.name}
                </code>
                {comp.interactive && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#252525] text-[#d4d4d8] border border-[#3a3a3a] rounded">
                    Two-way
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#a1a1aa] leading-relaxed mb-1.5">
                {comp.description}
              </p>
              <p className="text-[11px] text-[#52525b]">{comp.when}</p>
            </div>
          ))}
        </div>
      </Anchor>

      <Anchor id="selection-logic">
        <H2>How selection works</H2>
        <Prose>
          <p className="mb-3">
            Each component is registered with Tambo via a{" "}
            <Ic>TamboComponent</Ic> object that includes a{" "}
            <Ic>description</Ic> field. This tells the AI when to
            use it.
          </p>
          <p className="mb-3">
            When the AI decides to render a component, it generates props
            matching the component&apos;s Zod schema. Tambo validates at runtime
            and streams props to the React component incrementally.
          </p>
          <p>
            Multiple components can appear in a single response. For example,
            a PR review might render <Ic>PRSummary</Ic>, several{" "}
            <Ic>SecurityAlert</Ic> cards, and a{" "}
            <Ic>PRStatsChart</Ic>.
          </p>
        </Prose>
      </Anchor>

      <PageNav current="components" onNavigate={onNavigate} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: ARCHITECTURE
   ═══════════════════════════════════════════════════════════════════════════ */

function ArchitectureSection({
  onNavigate,
}: {
  onNavigate: (s: Section) => void;
}) {
  return (
    <div className="space-y-12">
      <div>
        <div className="mb-2">
          <span className="text-[12px] font-medium text-[#888]">
            Deep Dive
          </span>
        </div>
        <h1 className="text-[32px] font-bold text-[#fafafa] tracking-tight mb-3 leading-[1.15]">
          Architecture
        </h1>
        <Prose>
          <p>
            Three distinct data paths for chat, reviews, and indexing — each
            with different sources and durability guarantees.
          </p>
        </Prose>
      </div>

      <Anchor id="data-sources">
        <H2>Data sources</H2>
        <div className="rounded-lg border border-[#1e1e22] divide-y divide-[#1e1e22] overflow-hidden">
          {[
            {
              use: "Chat tools (11 tools)",
              source: "Hybrid",
              detail:
                "searchCode & analyzePR use indexed AST chunks when available, GitHub API fallback",
            },
            {
              use: "Automated PR reviews",
              source: "Hybrid",
              detail:
                "GitHub API (PR files) + indexed AST chunks (vector search for context)",
            },
            {
              use: "Code indexing",
              source: "Pipeline",
              detail:
                "Fetches files, Tree-sitter AST, OpenAI embeddings, Convex vector store",
            },
          ].map((row) => (
            <div
              key={row.use}
              className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-4 bg-[#111113]"
            >
              <div className="sm:w-44 flex-shrink-0">
                <span className="text-[13px] font-medium text-[#d4d4d8]">
                  {row.use}
                </span>
              </div>
              <div className="flex-1">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-1.5 bg-[#18181b] text-[#a1a1aa] border border-[#27272a]">
                  {row.source}
                </span>
                <p className="text-[12px] text-[#71717a]">{row.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Anchor>

      <Anchor id="data-flow">
        <H2>Data flow paths</H2>
        <div className="space-y-3">
          {[
            {
              label: "Chat Tools",
              steps: [
                "GitHub API",
                "Vector Search",
                "Tambo AI",
                "Generative UI",
              ],
            },
            {
              label: "PR Reviews",
              steps: [
                "Webhook",
                "GitHub API",
                "LLM Analysis",
                "Post Review",
              ],
            },
            {
              label: "Indexing",
              steps: [
                "Webhook / Manual",
                "Fetch Files",
                "Tree-sitter",
                "Embed + Store",
              ],
            },
          ].map((path) => (
            <div key={path.label} className="flex items-center gap-3">
              <span className="w-24 flex-shrink-0 text-[12px] font-semibold text-[#d4d4d8]">
                {path.label}
              </span>
              <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                {path.steps.map((step, si, arr) => (
                  <div key={si} className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="px-2.5 py-1 rounded-md text-[11px] text-[#a1a1aa] border border-[#1e1e22] bg-[#111113]">
                      {step}
                    </span>
                    {si < arr.length - 1 && (
                      <span className="text-[#3f3f46] text-xs select-none">
                        &rarr;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Anchor>

      <Anchor id="sync-triggers">
        <H2>When things sync</H2>
        <div className="space-y-5">
          {[
            {
              label: "Indexing triggers",
              items: [
                "Manual re-index from Settings page",
                "Push webhook to indexed branch",
                "Initial setup on repo connection",
              ],
            },
            {
              label: "Review triggers",
              items: [
                "PR opened webhook (if autoReview enabled)",
                "PR synchronized webhook (new commits pushed)",
              ],
            },
            {
              label: "Chat tools",
              items: [
                "searchCode + analyzePR use indexed data when available",
                "Falls back to GitHub API in real-time when not indexed",
                "Other tools always hit GitHub directly",
              ],
            },
          ].map((group) => (
            <div key={group.label}>
              <h3 className="text-[13px] font-semibold text-[#d4d4d8] mb-2">
                {group.label}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-[13px] text-[#a1a1aa] flex gap-2"
                  >
                    <span className="text-[#3f3f46] select-none">
                      &#x2022;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Anchor>

      <Anchor id="durability">
        <H2>Workflow durability</H2>
        <Prose>
          <p className="mb-4">
            Both pipelines run as durable Convex workflows (
            <Ic>@convex-dev/workflow</Ic>). Each step is
            checkpointed — server restarts resume where they left off.
          </p>
        </Prose>
        <div className="grid gap-px sm:grid-cols-2 rounded-lg border border-[#1e1e22] overflow-hidden">
          {[
            { label: "Checkpointed steps", desc: "Each batch survives restarts" },
            { label: "Batched processing", desc: "Files in batches of 5 (under 10m timeout)" },
            { label: "Automatic retries", desc: "Exponential backoff (3 attempts)" },
            { label: "No lost progress", desc: "Failed batches don't roll back completed work" },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`p-4 bg-[#111113] ${i % 2 === 0 ? "sm:border-r" : ""} ${i < 2 ? "border-b" : ""} border-[#1e1e22]`}
            >
              <p className="text-[13px] font-medium text-[#d4d4d8] mb-0.5">
                {item.label}
              </p>
              <p className="text-[12px] text-[#71717a]">{item.desc}</p>
            </div>
          ))}
        </div>
      </Anchor>

      <Anchor id="pipelines">
        <H2>Pipelines</H2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[#1e1e22] bg-[#111113] p-5">
            <h3 className="text-[14px] font-semibold text-[#fafafa] mb-3">
              Indexing Pipeline
            </h3>
            <ol className="space-y-1.5">
              {[
                "Create indexing job record",
                "Fetch repo tree from GitHub",
                "Compute file diff (changed/deleted/unchanged)",
                "Delete stale chunks (batches of 5)",
                "Fetch content from GitHub",
                "Parse AST with Tree-sitter",
                "Generate docstrings (OpenRouter)",
                "Generate embeddings (OpenAI)",
                "Store chunks in Convex",
                "Mark branch as indexed",
              ].map((step, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-[#a1a1aa]">
                  <span className="text-[#52525b] font-mono w-5 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-[#1e1e22] bg-[#111113] p-5">
            <h3 className="text-[14px] font-semibold text-[#fafafa] mb-3">
              Review Pipeline
            </h3>
            <ol className="space-y-1.5">
              {[
                "Create review record",
                "Fetch PR files from GitHub",
                "Fetch PR description",
                "Vector search indexed chunks for context",
                "Generate review via LLM (OpenRouter)",
                "Determine event (APPROVE / REQUEST_CHANGES)",
                "Post review to GitHub",
                "Store findings + mark complete",
              ].map((step, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-[#a1a1aa]">
                  <span className="text-[#52525b] font-mono w-5 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Anchor>

      <PageNav current="architecture" onNavigate={onNavigate} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL DIAGRAM HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

function FlowBox({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-5 py-3 rounded-md border border-[#27272a] bg-[#0a0a0a] min-w-[110px]">
      <span className="text-[12px] font-medium text-[#d4d4d8]">{label}</span>
      <span className="text-[10px] text-[#52525b]">{sub}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleNavigate = (section: Section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setActiveAnchor("");
    window.scrollTo({ top: 0 });
  };

  // Scroll spy for "On this page"
  useEffect(() => {
    const toc = PAGE_TOC[activeSection];
    if (!toc || toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveAnchor(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );

    // Small delay so DOM has rendered after section change
    const timeout = setTimeout(() => {
      const elements = toc
        .map((item) => document.getElementById(item.id))
        .filter(Boolean) as HTMLElement[];
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [activeSection]);

  if (!mounted) return null;

  const toc = PAGE_TOC[activeSection];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 px-4 lg:px-6 flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#1e1e22]">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#18181b] transition-colors"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link
            href="/chat"
            className="flex items-center gap-2 text-[13px] text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="w-px h-4 bg-[#1e1e22]" />
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[#fafafa] tracking-tight">
              RepoChat
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181b] text-[#52525b] border border-[#27272a] font-medium">
              Docs
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#52525b]">
            Powered by{" "}
            <span className="text-[#71717a] font-medium">Tambo</span>
            <img src="/Octo-Icon.svg" alt="Tambo" className="h-4 w-4" />
          </span>
        </div>
      </header>

      {/* ── Mobile Sidebar Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.nav
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.15 }}
              className="fixed left-0 top-14 bottom-0 z-50 w-64 bg-[#0a0a0a] border-r border-[#1e1e22] overflow-y-auto lg:hidden"
            >
              <SidebarContent
                activeSection={activeSection}
                onNavigate={handleNavigate}
              />
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* ── Three-Column Layout ────────────────────────────────────────── */}
      <div className="flex">
        {/* Left Sidebar — Desktop */}
        <nav className="hidden lg:flex flex-col w-64 border-r border-[#1e1e22] sticky top-14 h-[calc(100vh-3.5rem)] bg-[#0a0a0a] overflow-y-auto flex-shrink-0">
          <SidebarContent
            activeSection={activeSection}
            onNavigate={handleNavigate}
          />
          <div className="mt-auto px-6 py-4 border-t border-[#1e1e22]">
            <div className="text-[11px] text-[#3f3f46]">
              Built for Tambo Hackathon
            </div>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex">
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="px-5 sm:px-8 lg:px-12 py-8 max-w-3xl"
              >
                {activeSection === "overview" && (
                  <OverviewSection onNavigate={handleNavigate} />
                )}
                {activeSection === "flow" && (
                  <FlowSection onNavigate={handleNavigate} />
                )}
                {activeSection === "tools" && (
                  <ToolsSection onNavigate={handleNavigate} />
                )}
                {activeSection === "components" && (
                  <ComponentsSection onNavigate={handleNavigate} />
                )}
                {activeSection === "architecture" && (
                  <ArchitectureSection onNavigate={handleNavigate} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Right "On this page" — Desktop only */}
          <aside className="hidden xl:block w-52 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-6">
            {toc.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <List size={14} className="text-[#52525b]" />
                  <span className="text-[12px] font-semibold text-[#52525b]">
                    On this page
                  </span>
                </div>
                <div className="space-y-0.5">
                  {toc.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const el = document.getElementById(item.id);
                        el?.scrollIntoView();
                      }}
                      className={`block w-full text-left text-[12px] px-2 py-1.5 rounded transition-colors ${
                        activeAnchor === item.id
                          ? "text-[#e0e0e0] font-medium"
                          : "text-[#52525b] hover:text-[#a1a1aa]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
