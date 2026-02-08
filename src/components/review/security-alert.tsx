"use client";

import { useState } from "react";
import { z } from "zod";
import { useTamboStreamStatus } from "@tambo-ai/react";

export const securityAlertSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low"]).describe("Severity level of the security issue"),
  title: z.string().describe("Brief title of the security issue"),
  description: z.string().describe("Detailed description of the vulnerability"),
  filePath: z.string().describe("File path where the issue was found"),
  lineNumber: z.number().optional().describe("Line number of the issue"),
  codeSnippet: z.string().optional().describe("The vulnerable code snippet"),
  recommendation: z.string().describe("How to fix the issue"),
  cweId: z.string().optional().describe("CWE ID if applicable"),
});

export type SecurityAlertProps = z.infer<typeof securityAlertSchema>;

import { ShieldIcon, CopyIcon, CheckIcon } from "./icons";

export function SecurityAlert({
  severity = "medium",
  title = "Security Issue",
  description = "",
  filePath = "",
  lineNumber,
  codeSnippet,
  recommendation = "",
  cweId,
}: SecurityAlertProps) {
  const [copied, setCopied] = useState(false);
  const { streamStatus } = useTamboStreamStatus();

  if (streamStatus?.isStreaming && !title) {
    return (
      <div className="rounded-xl bg-[#111111] p-5 animate-pulse">
        <div className="h-3 w-16 bg-[#1a1a1a] rounded mb-4" />
        <div className="h-5 w-48 bg-[#1a1a1a] rounded mb-3" />
        <div className="h-3 w-full bg-[#1a1a1a] rounded mb-2" />
        <div className="h-3 w-3/4 bg-[#1a1a1a] rounded" />
      </div>
    );
  }

  const handleCopy = () => {
    if (codeSnippet) {
      navigator.clipboard.writeText(codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const severityConfig: Record<string, { border: string; bg: string; text: string; dot: string }> = {
    critical: { border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-400", dot: "bg-red-500" },
    high: { border: "border-orange-500/30", bg: "bg-orange-500/5", text: "text-orange-400", dot: "bg-orange-500" },
    medium: { border: "border-yellow-500/30", bg: "bg-yellow-500/5", text: "text-yellow-400", dot: "bg-yellow-500" },
    low: { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-400", dot: "bg-blue-500" },
  };

  const style = severityConfig[severity] || severityConfig.medium;

  return (
    <div className={`rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px`}>
      {/* Tool label */}
      <div className={`bg-[#161616] px-5 py-2.5`}>
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">SecurityAlert</span>
      </div>
      {/* Header */}
      <div className={`${style.bg} px-5 pt-4 pb-3`}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className={`${style.text}`}>
            <ShieldIcon />
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${style.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {severity}
            </span>
            {cweId && (
              <span className="text-[11px] font-mono text-[#555]">{cweId}</span>
            )}
          </div>
        </div>

        <h3 className="text-[14px] font-semibold text-[#e5e5e5] leading-snug mb-2">{title}</h3>
        <p className="text-[13px] text-[#999] leading-relaxed">{description}</p>
      </div>

      {/* File location */}
      <div className="bg-[#111111] px-5 py-2">
        <span className="text-[12px] font-mono text-[#666]">
          {filePath}{lineNumber ? `:${lineNumber}` : ""}
        </span>
      </div>

      {/* Code snippet */}
      {codeSnippet && (
        <div className="bg-[#111111] px-5 py-3">
          <div className="rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e1e1e]">
              <span className="text-[10px] uppercase tracking-wider text-[#444] font-medium">Vulnerable code</span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-[#555] hover:text-[#aaa] transition-colors"
              >
                {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
              </button>
            </div>
            <pre className="px-3 py-2.5 text-[12px] font-mono text-[#bbb] overflow-x-auto leading-relaxed">
              <code>{codeSnippet}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="bg-[#111111] px-5 py-3">
        <p className="text-[10px] uppercase tracking-wider text-[#444] font-medium mb-1.5">Fix</p>
        <p className="text-[13px] text-[#bbb] leading-relaxed">{recommendation}</p>
      </div>
    </div>
  );
}
