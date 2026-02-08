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

import { CopyIcon, CheckIcon } from "./icons";

const complexityConfig: Record<string, { bg: string; text: string }> = {
  easy: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  complex: { bg: "bg-red-500/10", text: "text-red-400" },
};

const impactConfig: Record<string, { bg: string; text: string }> = {
  performance: { bg: "bg-violet-500/10", text: "text-violet-400" },
  readability: { bg: "bg-blue-500/10", text: "text-blue-400" },
  maintainability: { bg: "bg-cyan-500/10", text: "text-cyan-400" },
  security: { bg: "bg-red-500/10", text: "text-red-400" },
};

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

  const cStyle = complexityConfig[complexity] || complexityConfig.medium;
  const iStyle = impact ? impactConfig[impact] : null;

  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-5 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">RefactorCard</span>
      </div>

      {/* Header */}
      <div className="bg-[#111111] px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2.5">
          {complexity && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${cStyle.bg} ${cStyle.text}`}>
              {complexity}
            </span>
          )}
          {iStyle && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${iStyle.bg} ${iStyle.text}`}>
              {impact}
            </span>
          )}
        </div>

        <h3 className="text-[14px] font-semibold text-[#e5e5e5] leading-snug mb-2">{title}</h3>
        <p className="text-[13px] text-[#999] leading-relaxed">{description}</p>
      </div>

      {/* File location */}
      <div className="bg-[#111111] px-5 py-2">
        <span className="text-[12px] font-mono text-[#666]">
          {filePath}{lineStart ? `:${lineStart}` : ""}
        </span>
      </div>

      {/* Before / After code */}
      <div className="bg-[#111111] grid md:grid-cols-2">
        {/* Before */}
        <div className="md:border-r md:border-[#1e1e1e]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#200a0a]/30">
            <span className="text-[10px] uppercase tracking-wider text-red-400/60 font-medium">Before</span>
            <button
              onClick={() => copyCode(beforeCode, setCopiedBefore)}
              className="inline-flex items-center gap-1 text-[11px] text-[#555] hover:text-[#aaa] transition-colors"
            >
              {copiedBefore ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
            </button>
          </div>
          <pre className="px-4 py-3 text-[12px] font-mono text-[#bbb] overflow-x-auto leading-relaxed bg-[#0a0a0a]/50">
            <code>{beforeCode}</code>
          </pre>
        </div>

        {/* After */}
        <div>
          <div className="flex items-center justify-between px-4 py-2 bg-[#0a2118]/30">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400/60 font-medium">After</span>
            <button
              onClick={() => copyCode(afterCode, setCopiedAfter)}
              className="inline-flex items-center gap-1 text-[11px] text-[#555] hover:text-[#aaa] transition-colors"
            >
              {copiedAfter ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
            </button>
          </div>
          <pre className="px-4 py-3 text-[12px] font-mono text-[#bbb] overflow-x-auto leading-relaxed bg-[#0a0a0a]/50">
            <code>{afterCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
