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

export function CommitCard({
  sha,
  message,
  author,
  authorAvatar,
  date,
  additions,
  deletions,
  filesChanged,
  url,
  verified,
}: CommitCardProps) {
  const shortSha = sha.slice(0, 7);
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const [title, ...bodyLines] = message.split("\n");
  const body = bodyLines.filter((l) => l.trim()).join("\n");

  return (
    <div className="py-4 border-b border-[#1f1f1f] last:border-0">
      <div className="flex items-baseline gap-2 mb-2">
        <code className="text-xs font-mono text-[#a3a3a3]">{shortSha}</code>
        {verified && <span className="text-xs text-[#525252]">verified</span>}
      </div>

      <h3 className="text-[#fafafa] text-sm font-medium mb-1">{title}</h3>
      {body && (
        <p className="text-sm text-[#a3a3a3] mb-3 whitespace-pre-wrap">{body}</p>
      )}

      <div className="flex gap-6 text-xs mb-3">
        <span className="text-[#a3a3a3]">+{additions}</span>
        <span className="text-[#a3a3a3]">-{deletions}</span>
        <span className="text-[#525252]">{filesChanged} files</span>
      </div>

      <div className="flex items-center justify-between text-xs text-[#525252]">
        <div className="flex items-center gap-2">
          {authorAvatar && (
            <img
              src={authorAvatar}
              alt={author}
              className="w-4 h-4 rounded-full"
            />
          )}
          <span>{author}</span>
        </div>
        <span>{formattedDate}</span>
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors mt-2 inline-block"
        >
          View on GitHub
        </a>
      )}
    </div>
  );
}

export default CommitCard;
