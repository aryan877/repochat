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

export type Finding = z.infer<typeof FindingSchema>;
export type ReviewChecklistProps = z.infer<typeof ReviewChecklistSchema>;

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
    new Set(["security", "bug"])
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

  return (
    <div className="p-4 w-full max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm text-[#fafafa] font-medium">
            Review Checklist
            <span className={`ml-2 w-2 h-2 inline-block rounded-full ${
              status === "completed" ? "bg-green-500" : status === "in_progress" ? "bg-yellow-500" : "bg-[#525252]"
            }`} />
          </h3>
          {prNumber && (
            <p className="text-xs text-[#525252]">
              #{prNumber}: {prTitle || "Untitled"}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-medium text-[#fafafa]">{resolvedCount}/{totalCount}</p>
          <p className="text-xs text-[#525252]">resolved</p>
        </div>
      </div>

      <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-500 ${progress === 100 ? "bg-green-500" : "bg-[#525252]"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {Object.entries(groupedFindings).map(([type, typeFindings]) => {
          const isExpanded = expandedTypes.has(type);
          const unresolvedCount = typeFindings.filter((f) => !f.resolved).length;

          return (
            <div key={type} className="border border-[#1f1f1f] rounded">
              <button
                onClick={() => toggleType(type)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-[#141414] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#fafafa] capitalize">{type}</span>
                  {unresolvedCount > 0 && (
                    <span className="text-xs text-[#525252]">{unresolvedCount}</span>
                  )}
                </div>
                <span className="text-[#525252]">{isExpanded ? "▼" : "▶"}</span>
              </button>

              {isExpanded && (
                <div className="p-2 space-y-2 border-t border-[#1f1f1f]">
                  {typeFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className={`flex items-start gap-3 p-2 rounded ${
                        finding.resolved ? "bg-[#141414]" : ""
                      }`}
                    >
                      <button
                        onClick={() => toggleResolved(finding.id)}
                        className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-[#525252] flex items-center justify-center text-xs"
                      >
                        {finding.resolved && "✓"}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${finding.resolved ? "text-[#525252] line-through" : "text-[#fafafa]"}`}>
                          {finding.title}
                        </p>
                        {finding.filePath && (
                          <p className="text-xs text-[#525252] truncate font-mono">
                            {finding.filePath}{finding.lineNumber && `:${finding.lineNumber}`}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[#525252] capitalize">{finding.severity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {findingsArray.length === 0 && (
          <div className="text-center py-8 text-[#525252] text-sm">
            No findings yet
          </div>
        )}
      </div>
    </div>
  );
}

export const ReviewChecklist = withInteractable(ReviewChecklistBase, {
  componentName: "ReviewChecklist",
  description: `A sidebar checklist that tracks all issues found during code review.
AI CAN and SHOULD:
- Add new findings when discovering issues in the PR
- Mark findings as resolved when the user says they fixed something
- Update the review status (pending → in_progress → completed)
- Read current findings to understand what's already been found`,
  propsSchema: ReviewChecklistSchema,
});

export default ReviewChecklist;
