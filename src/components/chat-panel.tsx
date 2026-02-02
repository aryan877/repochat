"use client";

import { cn } from "@/lib/utils";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import type { Suggestion } from "@tambo-ai/react";
import type { ViewMode } from "./mode-tabs";

interface ChatPanelProps {
  mode: ViewMode;
  className?: string;
}

const PR_REVIEW_SUGGESTIONS: Suggestion[] = [
  {
    id: "pr-1",
    title: "Summarize this PR",
    detailedSuggestion: "Give me a summary of this pull request",
    messageId: "summarize-pr",
  },
  {
    id: "pr-2",
    title: "Find security issues",
    detailedSuggestion: "Check this PR for security vulnerabilities",
    messageId: "security-check",
  },
  {
    id: "pr-3",
    title: "Review code quality",
    detailedSuggestion: "Review the code quality and suggest improvements",
    messageId: "code-quality",
  },
];

const CODE_VIEW_SUGGESTIONS: Suggestion[] = [
  {
    id: "code-1",
    title: "Explain this code",
    detailedSuggestion: "Explain how this code works",
    messageId: "explain-code",
  },
  {
    id: "code-2",
    title: "Find references",
    detailedSuggestion: "Find all references to this function or variable",
    messageId: "find-refs",
  },
  {
    id: "code-3",
    title: "Show structure",
    detailedSuggestion: "Show me the structure and architecture of this codebase",
    messageId: "show-structure",
  },
];

export function ChatPanel({ mode, className }: ChatPanelProps) {
  const suggestions = mode === "pr-review" ? PR_REVIEW_SUGGESTIONS : CODE_VIEW_SUGGESTIONS;
  const placeholder =
    mode === "pr-review"
      ? "Ask about this PR, request a review, or paste a PR link..."
      : "Ask about the code, request explanations, or search for patterns...";

  return (
    <div className={cn("flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden", className)}>
      <MessageThreadFull
        initialSuggestions={suggestions}
        placeholder={placeholder}
        className="h-full"
      />
    </div>
  );
}

export default ChatPanel;
