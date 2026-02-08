"use client";

import { z } from "zod";
import { useTamboStreamStatus } from "@tambo-ai/react";

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

import { GitMergeIcon, ArrowIcon, GitHubIcon } from "./icons";

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
  const { streamStatus } = useTamboStreamStatus();
  const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  if (streamStatus?.isStreaming && !title) {
    return (
      <div className="rounded-xl bg-[#111111] p-5 animate-pulse">
        <div className="h-3 w-20 bg-[#1a1a1a] rounded mb-4" />
        <div className="h-5 w-72 bg-[#1a1a1a] rounded mb-4" />
        <div className="h-3 w-48 bg-[#1a1a1a] rounded mb-4" />
        <div className="flex gap-4">
          <div className="h-8 w-20 bg-[#1a1a1a] rounded" />
          <div className="h-8 w-20 bg-[#1a1a1a] rounded" />
          <div className="h-8 w-20 bg-[#1a1a1a] rounded" />
        </div>
      </div>
    );
  }

  const stateConfig: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Open" },
    closed: { bg: "bg-red-500/10", text: "text-red-400", label: "Closed" },
    merged: { bg: "bg-purple-500/10", text: "text-purple-400", label: "Merged" },
  };

  const stateStyle = stateConfig[state] || stateConfig.open;
  const totalChanges = additions + deletions;
  const addPct = totalChanges > 0 ? (additions / totalChanges) * 100 : 50;

  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-5 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">PRSummary</span>
      </div>
      {/* Header */}
      <div className="bg-[#111111] px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-xs font-mono text-[#555]">#{number}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${stateStyle.bg} ${stateStyle.text}`}>
            <GitMergeIcon />
            {stateStyle.label}
          </span>
        </div>

        <h3 className="text-[15px] font-semibold text-[#e5e5e5] leading-snug mb-3">{title}</h3>

        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e]">
          <span className="text-xs font-mono text-[#888]">{headBranch}</span>
          <ArrowIcon />
          <span className="text-xs font-mono text-[#888]">{baseBranch}</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-[#111111] px-5 py-3 flex items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-emerald-400">+{additions.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-red-400">-{deletions.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#666]">{changedFiles} {changedFiles === 1 ? "file" : "files"}</span>
          </div>
        </div>

        {/* Mini change bar */}
        <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${addPct}%` }}
          />
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="bg-[#111111] px-5 py-3">
          <p className="text-[13px] text-[#999] leading-relaxed whitespace-pre-wrap">{description}</p>
        </div>
      )}

      {/* Footer */}
      <div className="bg-[#111111] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <span className="font-medium text-[#888]">{author}</span>
          {formattedDate && (
            <>
              <span className="text-[#333]">&middot;</span>
              <span>{formattedDate}</span>
            </>
          )}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#555] hover:text-[#aaa] transition-colors"
          >
            <GitHubIcon />
            View on GitHub
          </a>
        )}
      </div>
    </div>
  );
}

export const tamboRegistration = {
  name: "PRSummary",
  description: `Render when reviewing a PR. Shows title, author, state, branches, additions/deletions, file count. After rendering, also update the ReviewChecklist interactable with findings.`,
  component: PRSummary,
  propsSchema: prSummarySchema,
};
