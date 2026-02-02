"use client";

import { cn } from "@/lib/utils";

export type ViewMode = "pr-review" | "code-view";

interface ModeTabsProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

const GitPullRequestIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
    <line x1="6" y1="9" x2="6" y2="21" />
  </svg>
);

const CodeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export function ModeTabs({ mode, onModeChange, className }: ModeTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-[#141414] rounded-lg", className)}>
      <button
        onClick={() => onModeChange("pr-review")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
          mode === "pr-review"
            ? "bg-[#1f1f1f] text-[#fafafa]"
            : "text-[#525252] hover:text-[#a3a3a3]"
        )}
      >
        <GitPullRequestIcon />
        <span>PR Review</span>
      </button>
      <button
        onClick={() => onModeChange("code-view")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
          mode === "code-view"
            ? "bg-[#1f1f1f] text-[#fafafa]"
            : "text-[#525252] hover:text-[#a3a3a3]"
        )}
      >
        <CodeIcon />
        <span>Code View</span>
      </button>
    </div>
  );
}

export default ModeTabs;
