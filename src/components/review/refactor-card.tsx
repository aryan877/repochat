"use client";

import { useState } from "react";
import { z } from "zod";

export const refactorCardSchema = z.object({
  title: z.string().describe("Title of the refactoring suggestion"),
  description: z.string().describe("Why this refactoring is recommended"),
  beforeCode: z.string().describe("The original code that needs refactoring"),
  afterCode: z.string().describe("The suggested refactored code"),
  filePath: z.string().describe("File path where the code is located"),
  lineStart: z.number().optional().describe("Starting line number"),
  complexity: z.enum(["easy", "medium", "complex"]).optional().describe("Difficulty of implementing this change"),
  impact: z.enum(["performance", "readability", "maintainability", "security"]).optional().describe("Primary impact area"),
});

export type RefactorCardProps = z.infer<typeof refactorCardSchema>;

export function RefactorCard({
  title = "Refactoring Suggestion",
  description = "",
  beforeCode = "",
  afterCode = "",
  filePath = "",
  lineStart,
  complexity = "medium",
  impact,
}: RefactorCardProps) {
  const [copiedBefore, setCopiedBefore] = useState(false);
  const [copiedAfter, setCopiedAfter] = useState(false);

  const copyCode = (code: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-4 border-b border-[#1f1f1f] last:border-0">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          {complexity && (
            <span className="text-xs text-[#525252] uppercase">{complexity}</span>
          )}
          {impact && (
            <span className="text-xs text-[#525252]">{impact}</span>
          )}
        </div>
      </div>

      <h3 className="text-[#fafafa] text-sm font-medium mb-2">{title}</h3>
      <p className="text-[#a3a3a3] text-sm mb-3">{description}</p>

      <p className="text-xs text-[#525252] font-mono mb-4">
        {filePath}{lineStart && `:${lineStart}`}
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#525252] uppercase">Before</span>
            <button
              onClick={() => copyCode(beforeCode, setCopiedBefore)}
              className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors"
            >
              {copiedBefore ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="bg-[#141414] rounded p-3 text-xs font-mono text-[#a3a3a3] overflow-x-auto">
            <code>{beforeCode}</code>
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#525252] uppercase">After</span>
            <button
              onClick={() => copyCode(afterCode, setCopiedAfter)}
              className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors"
            >
              {copiedAfter ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="bg-[#141414] rounded p-3 text-xs font-mono text-[#a3a3a3] overflow-x-auto">
            <code>{afterCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
