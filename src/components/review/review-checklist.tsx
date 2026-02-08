"use client";

import { useState } from "react";
import { z } from "zod";
import {
  useTamboComponentState,
  withInteractable,
} from "@tambo-ai/react";

const FindingSchema = z.object({
  id: z.string().describe("Unique identifier for the finding"),
  type: z.enum(["security", "refactor", "bug", "style", "performance"]).describe("Type of finding"),
  severity: z.enum(["critical", "high", "medium", "low"]).describe("Severity level"),
  title: z.string().describe("Brief title of the finding"),
  description: z.string().optional().describe("Detailed description of the finding"),
  filePath: z.string().optional().describe("File path where the issue was found"),
  lineNumber: z.number().optional().describe("Line number of the issue"),
  resolved: z.boolean().describe("Whether the issue has been resolved"),
});

export const ReviewChecklistSchema = z.object({
  prNumber: z.number().optional().describe("PR number being reviewed"),
  prTitle: z.string().optional().describe("PR title"),
  findings: z.array(FindingSchema).describe("List of findings from the review"),
  status: z.enum(["pending", "in_progress", "completed"]).optional().describe("Review status"),
});

const ReviewChecklistStateSchema = z.object({
  findings: z.array(FindingSchema).describe("Current findings state - AI adds items, user toggles resolved"),
  status: z.enum(["pending", "in_progress", "completed"]).describe("Current review status"),
});

export type Finding = z.infer<typeof FindingSchema>;
export type ReviewChecklistProps = z.infer<typeof ReviewChecklistSchema>;

const severityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/20",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const typeIcons: Record<string, string> = {
  security: "🛡",
  bug: "🐛",
  refactor: "♻",
  style: "✎",
  performance: "⚡",
};

const typeColors: Record<string, string> = {
  security: "text-red-400",
  bug: "text-orange-400",
  refactor: "text-blue-400",
  style: "text-purple-400",
  performance: "text-yellow-400",
};

function ReviewChecklistBase({
  prNumber,
  prTitle,
  findings: propFindings = [],
  status: propStatus = "pending",
}: ReviewChecklistProps) {
  const [findings, setFindings] = useTamboComponentState<Finding[]>(
    "findings",
    propFindings,
    propFindings
  );

  const [status] = useTamboComponentState<string>(
    "status",
    propStatus,
    propStatus
  );

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(["security", "bug", "performance"])
  );

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleResolved = (id: string) => {
    const updated = (findings || []).map((f) =>
      f.id === id ? { ...f, resolved: !f.resolved } : f
    );
    setFindings(updated);
  };

  const findingsArray = findings || [];
  const groupedFindings = findingsArray.reduce((acc, finding) => {
    if (!acc[finding.type]) {
      acc[finding.type] = [];
    }
    acc[finding.type].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  const resolvedCount = findingsArray.filter((f) => f.resolved).length;
  const totalCount = findingsArray.length;
  const progress = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

  const criticalCount = findingsArray.filter((f) => f.severity === "critical" && !f.resolved).length;
  const highCount = findingsArray.filter((f) => f.severity === "high" && !f.resolved).length;

  const statusLabel = status === "completed" ? "Complete" : status === "in_progress" ? "In Progress" : "Pending";

  return (
    <div className="p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm text-[#fafafa] font-medium flex items-center gap-2">
            Review Checklist
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
              status === "completed" ? "border-green-500/30 bg-green-500/10 text-green-400"
              : status === "in_progress" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
              : "border-[#292929] bg-[#141414] text-[#525252]"
            }`}>
              {statusLabel}
            </span>
          </h3>
          {prNumber && (
            <p className="text-xs text-[#525252] mt-0.5">
              #{prNumber}: {prTitle || "Untitled"}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-medium text-[#fafafa]">{resolvedCount}/{totalCount}</p>
          <p className="text-[10px] text-[#525252]">resolved</p>
        </div>
      </div>

      {/* Severity summary badges */}
      {totalCount > 0 && (criticalCount > 0 || highCount > 0) && (
        <div className="flex gap-2 mb-3">
          {criticalCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-red-400/20 bg-red-400/10 text-red-400">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-orange-400/20 bg-orange-400/10 text-orange-400">
              {highCount} high
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            progress === 100 ? "bg-green-500" : progress > 0 ? "bg-[#a3a3a3]" : "bg-transparent"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Grouped findings */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {Object.entries(groupedFindings).map(([type, typeFindings]) => {
          const isExpanded = expandedTypes.has(type);
          const unresolvedCount = typeFindings.filter((f) => !f.resolved).length;

          return (
            <div key={type} className="border border-[#1f1f1f] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleType(type)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-[#141414] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{typeIcons[type] || "•"}</span>
                  <span className={`text-sm font-medium capitalize ${typeColors[type] || "text-[#fafafa]"}`}>
                    {type}
                  </span>
                  {unresolvedCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#1f1f1f] text-[#a3a3a3] rounded-full">
                      {unresolvedCount}
                    </span>
                  )}
                </div>
                <span className="text-[#525252] text-xs">{isExpanded ? "▾" : "▸"}</span>
              </button>

              {isExpanded && (
                <div className="px-2 pb-2 space-y-1 border-t border-[#1f1f1f]">
                  {typeFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className={`flex items-start gap-2.5 p-2 rounded-md transition-colors ${
                        finding.resolved ? "opacity-50" : "hover:bg-[#141414]"
                      }`}
                    >
                      <button
                        onClick={() => toggleResolved(finding.id)}
                        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${
                          finding.resolved
                            ? "border-green-500/50 bg-green-500/20 text-green-400"
                            : "border-[#525252] hover:border-[#a3a3a3]"
                        }`}
                      >
                        {finding.resolved && "✓"}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight ${finding.resolved ? "text-[#525252] line-through" : "text-[#fafafa]"}`}>
                          {finding.title}
                        </p>
                        {finding.filePath && (
                          <p className="text-[11px] text-[#525252] truncate font-mono mt-0.5">
                            {finding.filePath}{finding.lineNumber ? `:${finding.lineNumber}` : ""}
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${severityColors[finding.severity] || "text-[#525252]"}`}>
                        {finding.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {findingsArray.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#525252] text-sm">No findings yet</p>
            <p className="text-[#3a3a3a] text-xs mt-1">Issues will appear here as the AI reviews code</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const ReviewChecklist = withInteractable(ReviewChecklistBase, {
  componentName: "ReviewChecklist",
  description: "Checklist tracking code review findings. AI adds items, user toggles resolved.",
  propsSchema: ReviewChecklistSchema,
  stateSchema: ReviewChecklistStateSchema,
});

export default ReviewChecklist;
