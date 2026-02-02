"use client";

import { z } from "zod";

export const prSummarySchema = z.object({
  title: z.string().describe("PR title"),
  number: z.number().describe("PR number"),
  author: z.string().describe("PR author username"),
  authorAvatar: z.string().optional().describe("Author avatar URL"),
  state: z.enum(["open", "closed", "merged"]).describe("PR state"),
  baseBranch: z.string().describe("Base branch name"),
  headBranch: z.string().describe("Head branch name"),
  additions: z.number().describe("Total lines added"),
  deletions: z.number().describe("Total lines deleted"),
  changedFiles: z.number().describe("Number of files changed"),
  createdAt: z.string().describe("When the PR was created"),
  url: z.string().describe("URL to the PR"),
  description: z.string().optional().describe("PR description/body"),
});

export type PRSummaryProps = z.infer<typeof prSummarySchema>;

export function PRSummary({
  title = "Pull Request",
  number = 0,
  author = "unknown",
  state = "open",
  baseBranch = "main",
  headBranch = "feature",
  additions = 0,
  deletions = 0,
  changedFiles = 0,
  createdAt = "",
  url = "",
  description,
}: PRSummaryProps) {
  const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString() : "";

  return (
    <div className="py-4">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xs text-[#525252]">#{number}</span>
        <span className="text-xs text-[#525252]">{state}</span>
      </div>

      <h3 className="text-[#fafafa] text-sm font-medium mb-2">{title}</h3>

      <p className="text-xs text-[#525252] font-mono mb-3">
        {headBranch} → {baseBranch}
      </p>

      <div className="flex gap-6 text-xs mb-3">
        <span className="text-[#a3a3a3]">+{additions}</span>
        <span className="text-[#a3a3a3]">-{deletions}</span>
        <span className="text-[#525252]">{changedFiles} files</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-[#525252] mb-3">
        <span>{author}</span>
        {formattedDate && <span>{formattedDate}</span>}
      </div>

      {description && (
        <p className="text-sm text-[#a3a3a3] whitespace-pre-wrap">{description}</p>
      )}

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors mt-3 inline-block"
        >
          View on GitHub
        </a>
      )}
    </div>
  );
}
