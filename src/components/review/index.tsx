import type { TamboComponent } from "@tambo-ai/react";

// Export all review components
export { CodeExplainer, codeExplainerSchema } from "./code-explainer";
export { CodeFlow, codeFlowSchema } from "./code-flow";
export { CodeViewer, codeViewerSchema } from "./code-viewer";
export { CommitCard, commitCardSchema } from "./commit-card";
export { DiffViewer, diffViewerSchema } from "./diff-viewer";
export { FileExplorer, fileExplorerSchema } from "./file-explorer";
export { PlanView, planViewSchema } from "./plan-view";
export { PRStatsChart, prStatsChartSchema } from "./pr-stats-chart";
export { PRSummary, prSummarySchema } from "./pr-summary";
export { RefactorCard, refactorCardSchema } from "./refactor-card";
export { ReviewChecklist, ReviewChecklistSchema } from "./review-checklist";
export { ReviewHeatmap, reviewHeatmapSchema } from "./review-heatmap";
export { SecurityAlert, securityAlertSchema } from "./security-alert";

// Collect all tamboRegistration exports into a single array
import { tamboRegistration as codeExplainerReg } from "./code-explainer";
import { tamboRegistration as codeFlowReg } from "./code-flow";
import { tamboRegistration as codeViewerReg } from "./code-viewer";
import { tamboRegistration as commitCardReg } from "./commit-card";
import { tamboRegistration as diffViewerReg } from "./diff-viewer";
import { tamboRegistration as fileExplorerReg } from "./file-explorer";
import { tamboRegistration as planViewReg } from "./plan-view";
import { tamboRegistration as prStatsChartReg } from "./pr-stats-chart";
import { tamboRegistration as prSummaryReg } from "./pr-summary";
import { tamboRegistration as refactorCardReg } from "./refactor-card";
import { tamboRegistration as reviewHeatmapReg } from "./review-heatmap";
import { tamboRegistration as securityAlertReg } from "./security-alert";
// ReviewChecklist is an interactable component (pre-placed in the side panel),
// NOT a generative component.
export const components: TamboComponent[] = [
  prSummaryReg,
  securityAlertReg,
  diffViewerReg,
  refactorCardReg,
  codeViewerReg,
  fileExplorerReg,
  planViewReg,
  commitCardReg,
  codeExplainerReg,
  prStatsChartReg,
  reviewHeatmapReg,
  codeFlowReg,
];

// Re-export types
export type { CodeExplainerProps, ExplanationSection } from "./code-explainer";
export type { CodeFlowProps } from "./code-flow";
export type { CodeViewerProps } from "./code-viewer";
export type { CommitCardProps } from "./commit-card";
export type { DiffViewerProps } from "./diff-viewer";
export type { FileExplorerProps } from "./file-explorer";
export type { PlanStep, PlanViewProps } from "./plan-view";
export type { PRStatsChartProps } from "./pr-stats-chart";
export type { PRSummaryProps } from "./pr-summary";
export type { RefactorCardProps } from "./refactor-card";
export type { Finding, ReviewChecklistProps } from "./review-checklist";
export type { ReviewHeatmapProps } from "./review-heatmap";
export type { SecurityAlertProps } from "./security-alert";
