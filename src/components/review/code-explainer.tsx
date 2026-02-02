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

export function CodeExplainer({
  title,
  filePath,
  lineRange,
  summary,
  sections,
  relatedConcepts,
}: CodeExplainerProps) {
  return (
    <div className="my-3">
      <div className="py-3 border-b border-[#1f1f1f]">
        <h3 className="text-[#fafafa] text-sm font-medium mb-1">{title}</h3>
        {(filePath || lineRange) && (
          <p className="text-xs text-[#525252] font-mono mb-2">
            {filePath}{lineRange && ` : ${lineRange}`}
          </p>
        )}
        <p className="text-sm text-[#a3a3a3]">{summary}</p>
      </div>

      <div className="py-3 space-y-4">
        {sections.map((section, idx) => {
          const typeLabel = section.type === "warning" ? "⚠" : section.type === "tip" ? "→" : "";

          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center gap-2">
                {typeLabel && <span className="text-[#525252]">{typeLabel}</span>}
                <h4 className="text-sm text-[#fafafa]">{section.title}</h4>
              </div>
              <p className="text-sm text-[#a3a3a3] whitespace-pre-wrap">{section.content}</p>

              {section.codeSnippet && (
                <pre className="bg-[#141414] rounded p-3 text-xs font-mono text-[#a3a3a3] overflow-x-auto">
                  <code>{section.codeSnippet}</code>
                </pre>
              )}
            </div>
          );
        })}
      </div>

      {relatedConcepts && relatedConcepts.length > 0 && (
        <div className="py-2 border-t border-[#1f1f1f]">
          <p className="text-xs text-[#525252] mb-2">Related</p>
          <div className="flex flex-wrap gap-2">
            {relatedConcepts.map((concept) => (
              <span
                key={concept}
                className="text-xs text-[#a3a3a3]"
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
