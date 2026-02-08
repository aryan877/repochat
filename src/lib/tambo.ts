import type { TamboComponent } from "@tambo-ai/react";

import { SecurityAlert, securityAlertSchema } from "@/components/review/security-alert";
import { DiffViewer, diffViewerSchema } from "@/components/review/diff-viewer";
import { RefactorCard, refactorCardSchema } from "@/components/review/refactor-card";
import { PRSummary, prSummarySchema } from "@/components/review/pr-summary";
import { CodeViewer, codeViewerSchema } from "@/components/review/code-viewer";
import { FileExplorer, fileExplorerSchema } from "@/components/review/file-explorer";
import { PlanView, planViewSchema } from "@/components/review/plan-view";
import { CommitCard, commitCardSchema } from "@/components/review/commit-card";
import { CodeExplainer, codeExplainerSchema } from "@/components/review/code-explainer";
import { PRStatsChart, prStatsChartSchema } from "@/components/review/pr-stats-chart";
import { ReviewHeatmap, reviewHeatmapSchema } from "@/components/review/review-heatmap";
import { CodeFlow, codeFlowSchema } from "@/components/review/code-flow";


// DEBUG: test with all components — if streaming fails, reduce this list
export const components: TamboComponent[] = [
  {
    name: "PRSummary",
    description: `Render when reviewing a pull request. Shows PR metadata including title, author,
state (open/closed/merged), branches, additions/deletions count, and file changes.
TRIGGER: "Review PR #X", "What's in this PR?", "Analyze pull request"`,
    component: PRSummary,
    propsSchema: prSummarySchema,
  },
  {
    name: "SecurityAlert",
    description: `Render when finding a security vulnerability in the code. Shows severity level
(critical/high/medium/low), vulnerability type, affected code, and fix recommendation.
TRIGGER: Finding SQL injection, XSS, auth issues, secrets exposure, OWASP top 10 vulnerabilities`,
    component: SecurityAlert,
    propsSchema: securityAlertSchema,
  },
  {
    name: "DiffViewer",
    description: `Render when showing code changes/diffs. Displays unified diff format with
additions (green), deletions (red), and context lines.
TRIGGER: "Show the changes", "What was modified?", showing file patches`,
    component: DiffViewer,
    propsSchema: diffViewerSchema,
  },
  {
    name: "RefactorCard",
    description: `Render when suggesting code improvements. Shows before/after code comparison
with explanation of why the refactoring is beneficial.
TRIGGER: Code smell found, performance improvement, cleaner pattern available`,
    component: RefactorCard,
    propsSchema: refactorCardSchema,
  },
  {
    name: "CodeViewer",
    description: `Render when displaying file contents with syntax highlighting.
Shows full file or code section with line numbers.
TRIGGER: "Show me the file", "What's in auth.ts?", viewing specific code`,
    component: CodeViewer,
    propsSchema: codeViewerSchema,
  },
  {
    name: "FileExplorer",
    description: `Render when showing repository structure. Displays file tree with
folders, files, and change indicators for modified files.
TRIGGER: "Show repo structure", "What files are in this project?", navigating codebase`,
    component: FileExplorer,
    propsSchema: fileExplorerSchema,
  },
  {
    name: "PlanView",
    description: `Render when presenting a multi-step plan or task breakdown. Shows numbered
steps with status (pending/in_progress/completed) and affected files.
TRIGGER: "Here's my plan", "I'll do these steps", outlining changes to make`,
    component: PlanView,
    propsSchema: planViewSchema,
  },
  {
    name: "CommitCard",
    description: `Render when showing commit information. Displays commit message, author,
date, SHA, and change statistics.
TRIGGER: After committing changes, "Show commit", viewing commit history`,
    component: CommitCard,
    propsSchema: commitCardSchema,
  },
  {
    name: "CodeExplainer",
    description: `Render when explaining how code works. Shows structured explanation with
sections for overview, details, warnings, and tips.
TRIGGER: "Explain this function", "How does this work?", "What does this do?"`,
    component: CodeExplainer,
    propsSchema: codeExplainerSchema,
  },
  {
    name: "PRStatsChart",
    description: `Render when visualizing PR statistics as charts. Shows bar charts of per-file
additions/deletions or pie charts of change distribution across files.
TRIGGER: "Show PR stats", "Visualize the changes", "Chart the file changes", after analyzing a PR`,
    component: PRStatsChart,
    propsSchema: prStatsChartSchema,
  },
  {
    name: "ReviewHeatmap",
    description: `Render when showing which files have the most changes or issues. Displays a
visual heatmap/grid where larger, redder tiles indicate more changes or higher severity issues.
TRIGGER: "Show hotspots", "Which files changed most?", "Where are the issues?", after a security review`,
    component: ReviewHeatmap,
    propsSchema: reviewHeatmapSchema,
  },
  {
    name: "CodeFlow",
    description: `Render when visualizing code dependencies and file relationships. Shows an interactive
graph with files as nodes and import/dependency relationships as edges. Nodes are color-coded by severity.
TRIGGER: "Show code flow", "Visualize dependencies", "How are files connected?", "Show file relationships"`,
    component: CodeFlow,
    propsSchema: codeFlowSchema,
  },
];

export {
  SecurityAlert,
  DiffViewer,
  RefactorCard,
  PRSummary,
  CodeViewer,
  FileExplorer,
  PlanView,
  CommitCard,
  CodeExplainer,
  PRStatsChart,
  ReviewHeatmap,
  CodeFlow,
};
