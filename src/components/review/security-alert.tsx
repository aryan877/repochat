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
      <div className="py-4 animate-pulse">
        <div className="h-3 w-16 bg-[#1f1f1f] rounded mb-3" />
        <div className="h-4 w-48 bg-[#1f1f1f] rounded mb-3" />
        <div className="h-3 w-full bg-[#1f1f1f] rounded mb-2" />
        <div className="h-3 w-3/4 bg-[#1f1f1f] rounded" />
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

  return (
    <div className="py-4 border-b border-[#1f1f1f] last:border-0">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xs text-[#525252] uppercase tracking-wide">{severity}</span>
        {cweId && <span className="text-xs text-[#525252]">{cweId}</span>}
      </div>

      <h3 className="text-[#fafafa] text-sm font-medium mb-2">{title}</h3>
      <p className="text-[#a3a3a3] text-sm mb-3">{description}</p>

      <p className="text-xs text-[#525252] font-mono mb-3">
        {filePath}{lineNumber && `:${lineNumber}`}
      </p>

      {codeSnippet && (
        <div className="relative mb-3">
          <pre
            onClick={handleCopy}
            className="bg-[#141414] rounded p-3 text-xs font-mono text-[#a3a3a3] overflow-x-auto cursor-pointer hover:bg-[#1f1f1f] transition-colors"
          >
            <code>{codeSnippet}</code>
          </pre>
          {copied && <span className="absolute top-2 right-2 text-xs text-[#525252]">Copied</span>}
        </div>
      )}

      <div>
        <p className="text-xs text-[#525252] mb-1">Recommendation</p>
        <p className="text-sm text-[#a3a3a3]">{recommendation}</p>
      </div>
    </div>
  );
}
