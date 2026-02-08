import type { TamboComponent } from "@tambo-ai/react";

// Export all review components
export { SecurityAlert, securityAlertSchema } from "./security-alert";
export { DiffViewer, diffViewerSchema } from "./diff-viewer";
export { RefactorCard, refactorCardSchema } from "./refactor-card";
export { PRSummary, prSummarySchema } from "./pr-summary";
export { ReviewChecklist, ReviewChecklistSchema } from "./review-checklist";
export { CodeViewer, codeViewerSchema } from "./code-viewer";
export { FileExplorer, fileExplorerSchema } from "./file-explorer";
export { PlanView, planViewSchema } from "./plan-view";
export { CommitCard, commitCardSchema } from "./commit-card";
export { CodeExplainer, codeExplainerSchema } from "./code-explainer";
export { PRStatsChart, prStatsChartSchema } from "./pr-stats-chart";
export { ReviewHeatmap, reviewHeatmapSchema } from "./review-heatmap";
export { CodeFlow, codeFlowSchema } from "./code-flow";

// Collect all tamboRegistration exports into a single array
import { tamboRegistration as prSummaryReg } from "./pr-summary";
import { tamboRegistration as securityAlertReg } from "./security-alert";
import { tamboRegistration as diffViewerReg } from "./diff-viewer";
import { tamboRegistration as refactorCardReg } from "./refactor-card";
import { tamboRegistration as codeViewerReg } from "./code-viewer";
import { tamboRegistration as fileExplorerReg } from "./file-explorer";
import { tamboRegistration as planViewReg } from "./plan-view";
import { tamboRegistration as commitCardReg } from "./commit-card";
import { tamboRegistration as codeExplainerReg } from "./code-explainer";
import { tamboRegistration as prStatsChartReg } from "./pr-stats-chart";
import { tamboRegistration as reviewHeatmapReg } from "./review-heatmap";
import { tamboRegistration as codeFlowReg } from "./code-flow";
import { tamboRegistration as reviewChecklistReg } from "./review-checklist";

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
  reviewChecklistReg,
];

// Re-export types
export type { SecurityAlertProps } from "./security-alert";
export type { DiffViewerProps } from "./diff-viewer";
export type { RefactorCardProps } from "./refactor-card";
export type { PRSummaryProps } from "./pr-summary";
export type { ReviewChecklistProps, Finding } from "./review-checklist";
export type { CodeViewerProps } from "./code-viewer";
export type { FileExplorerProps } from "./file-explorer";
export type { PlanViewProps, PlanStep } from "./plan-view";
export type { CommitCardProps } from "./commit-card";
export type { CodeExplainerProps, ExplanationSection } from "./code-explainer";
export type { PRStatsChartProps } from "./pr-stats-chart";
export type { ReviewHeatmapProps } from "./review-heatmap";
export type { CodeFlowProps } from "./code-flow";
