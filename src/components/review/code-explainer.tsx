"use client";

import { z } from "zod";

const ExplanationSectionSchema = z.object({
  title: z.string().describe("Section title"),
  content: z.string().describe("Explanation content"),
  type: z.enum(["overview", "detail", "warning", "tip"]).optional().describe("Section type"),
  codeSnippet: z.string().optional().describe("Related code snippet"),
});

export const codeExplainerSchema = z.object({
  title: z.string().describe("Title of what's being explained"),
  filePath: z.string().optional().describe("File path being explained"),
  lineRange: z.string().optional().describe("Line range (e.g., '10-25')"),
  summary: z.string().describe("Brief summary of the code"),
  sections: z.array(ExplanationSectionSchema).describe("Detailed explanation sections"),
  relatedConcepts: z.array(z.string()).optional().describe("Related programming concepts"),
});

export type ExplanationSection = z.infer<typeof ExplanationSectionSchema>;
export type CodeExplainerProps = z.infer<typeof codeExplainerSchema>;

const sectionTypeConfig: Record<string, { icon: string; border: string; bg: string; text: string }> = {
  overview: { icon: "O", border: "border-blue-500/20", bg: "bg-blue-500/5", text: "text-blue-400" },
  detail: { icon: "D", border: "border-[#1e1e1e]", bg: "bg-transparent", text: "text-[#666]" },
  warning: { icon: "!", border: "border-yellow-500/20", bg: "bg-yellow-500/5", text: "text-yellow-400" },
  tip: { icon: "*", border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-emerald-400" },
};

export function CodeExplainer({
  title = "",
  filePath,
  lineRange,
  summary = "",
  sections = [],
  relatedConcepts,
}: CodeExplainerProps) {
  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-5 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">CodeExplainer</span>
      </div>

      {/* Header */}
      <div className="bg-[#111111] px-5 pt-4 pb-3">
        <h3 className="text-[14px] font-semibold text-[#e5e5e5] leading-snug mb-1">{title}</h3>
        {(filePath || lineRange) && (
          <p className="text-[12px] text-[#666] font-mono mb-2">
            {filePath}{lineRange && ` : ${lineRange}`}
          </p>
        )}
        <p className="text-[13px] text-[#999] leading-relaxed">{summary}</p>
      </div>

      {/* Sections */}
      <div className="bg-[#111111]">
        {sections.map((section, idx) => {
          const config = sectionTypeConfig[section.type || "detail"];

          return (
            <div key={idx} className={`px-5 py-3 ${idx > 0 ? "" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${config.border} ${config.bg} ${config.text}`}>
                  {config.icon}
                </span>
                <h4 className="text-[13px] font-medium text-[#e5e5e5]">{section.title}</h4>
              </div>
              <p className="text-[13px] text-[#999] leading-relaxed whitespace-pre-wrap">{section.content}</p>

              {section.codeSnippet && (
                <div className="mt-2.5 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] overflow-hidden">
                  <pre className="px-3 py-2.5 text-[12px] font-mono text-[#bbb] overflow-x-auto leading-relaxed">
                    <code>{section.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Related concepts */}
      {relatedConcepts && relatedConcepts.length > 0 && (
        <div className="bg-[#111111] px-5 py-3">
          <p className="text-[10px] uppercase tracking-wider text-[#444] font-medium mb-2">Related</p>
          <div className="flex flex-wrap gap-1.5">
            {relatedConcepts.map((concept) => (
              <span
                key={concept}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] text-[#888] bg-[#1a1a1a] border border-[#252525]"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CodeExplainer;
