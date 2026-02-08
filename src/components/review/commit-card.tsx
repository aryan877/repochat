"use client";

import { z } from "zod";

export const commitCardSchema = z.object({
  sha: z.string().describe("Commit SHA"),
  message: z.string().describe("Commit message"),
  author: z.string().describe("Commit author name"),
  authorAvatar: z.string().optional().describe("Author avatar URL"),
  date: z.string().describe("Commit date (ISO string)"),
  additions: z.number().describe("Lines added"),
  deletions: z.number().describe("Lines deleted"),
  filesChanged: z.number().describe("Number of files changed"),
  url: z.string().optional().describe("GitHub URL for the commit"),
  verified: z.boolean().optional().describe("Whether commit is GPG verified"),
});

export type CommitCardProps = z.infer<typeof commitCardSchema>;

import { GitCommitIcon, GitHubIcon, VerifiedIcon } from "./icons";

export function CommitCard({
  sha = "",
  message = "",
  author = "unknown",
  authorAvatar,
  date = "",
  additions = 0,
  deletions = 0,
  filesChanged = 0,
  url,
  verified,
}: CommitCardProps) {
  const shortSha = sha.slice(0, 7);
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const [title, ...bodyLines] = message.split("\n");
  const body = bodyLines.filter((l) => l.trim()).join("\n");
  const totalChanges = additions + deletions;
  const addPct = totalChanges > 0 ? (additions / totalChanges) * 100 : 50;

  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-5 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">CommitCard</span>
      </div>

      {/* Header */}
      <div className="bg-[#111111] px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="text-[#666]">
            <GitCommitIcon />
          </div>
          <code className="text-xs font-mono text-[#888] bg-[#0a0a0a] px-2 py-0.5 rounded border border-[#1e1e1e]">{shortSha}</code>
          {verified && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
              <VerifiedIcon /> Verified
            </span>
          )}
        </div>

        <h3 className="text-[14px] font-semibold text-[#e5e5e5] leading-snug mb-1">{title}</h3>
        {body && (
          <p className="text-[13px] text-[#999] leading-relaxed whitespace-pre-wrap mt-2">{body}</p>
        )}
      </div>

      {/* Stats bar */}
      <div className="bg-[#111111] px-5 py-3 flex items-center gap-5">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-emerald-400">+{additions.toLocaleString()}</span>
          <span className="text-sm font-semibold text-red-400">-{deletions.toLocaleString()}</span>
          <span className="text-xs text-[#666]">{filesChanged} {filesChanged === 1 ? "file" : "files"}</span>
        </div>
        <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${addPct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#111111] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#555]">
          {authorAvatar && (
            <img src={authorAvatar} alt={author} className="w-4 h-4 rounded-full" />
          )}
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

export default CommitCard;

export const tamboRegistration = {
  name: "CommitCard",
  description: `Render when showing commit information. Displays commit message, author,
date, SHA, and change statistics.
TRIGGER: After committing changes, "Show commit", viewing commit history`,
  component: CommitCard,
  propsSchema: commitCardSchema,
};
