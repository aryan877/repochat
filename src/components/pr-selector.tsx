"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Repository, PullRequest } from "@/lib/types";

interface PRSelectorProps {
  repositories: Repository[];
  selectedRepo?: Repository;
  onRepoChange?: (repo: Repository) => void;
  pullRequests?: PullRequest[];
  selectedPR?: PullRequest;
  onPRChange?: (pr: PullRequest) => void;
  isLoadingPRs?: boolean;
  className?: string;
}

const ChevronDownIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const GitPullRequestIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
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

export function PRSelector({
  repositories,
  selectedRepo,
  onRepoChange,
  pullRequests = [],
  selectedPR,
  onPRChange,
  isLoadingPRs = false,
  className,
}: PRSelectorProps) {
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [prDropdownOpen, setPrDropdownOpen] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Repository Selector */}
      <div className="relative">
        <label className="block text-xs text-[#525252] mb-1.5">Repository</label>
        <button
          onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#141414] border border-[#1f1f1f] rounded-lg text-sm text-[#fafafa] hover:border-[#292929] transition-colors"
        >
          <span className="truncate">
            {selectedRepo ? selectedRepo.fullName : "Select a repository"}
          </span>
          <ChevronDownIcon />
        </button>

        {repoDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setRepoDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-[#1f1f1f] rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
              {repositories.length > 0 ? (
                repositories.map((repo) => (
                  <button
                    key={repo._id}
                    onClick={() => {
                      onRepoChange?.(repo);
                      setRepoDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f1f] transition-colors",
                      selectedRepo?._id === repo._id
                        ? "text-[#fafafa] bg-[#1f1f1f]"
                        : "text-[#a3a3a3]"
                    )}
                  >
                    {repo.fullName}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-[#525252]">
                  No repositories available
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* PR Selector */}
      <div className="relative">
        <label className="block text-xs text-[#525252] mb-1.5">Pull Request</label>
        <button
          onClick={() => selectedRepo && setPrDropdownOpen(!prDropdownOpen)}
          disabled={!selectedRepo}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 bg-[#141414] border border-[#1f1f1f] rounded-lg text-sm transition-colors",
            selectedRepo
              ? "text-[#fafafa] hover:border-[#292929]"
              : "text-[#525252] cursor-not-allowed"
          )}
        >
          <span className="truncate flex items-center gap-2">
            {isLoadingPRs ? (
              <span className="text-[#525252]">Loading PRs...</span>
            ) : selectedPR ? (
              <>
                <GitPullRequestIcon className="text-[#525252] flex-shrink-0" />
                <span className="text-[#525252]">#{selectedPR.number}</span>
                <span className="truncate">{selectedPR.title}</span>
              </>
            ) : (
              "Select a pull request"
            )}
          </span>
          <ChevronDownIcon />
        </button>

        {prDropdownOpen && !isLoadingPRs && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setPrDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-[#1f1f1f] rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              {pullRequests.length > 0 ? (
                pullRequests.map((pr) => (
                  <button
                    key={pr.number}
                    onClick={() => {
                      onPRChange?.(pr);
                      setPrDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 hover:bg-[#1f1f1f] transition-colors border-b border-[#1f1f1f] last:border-b-0",
                      selectedPR?.number === pr.number ? "bg-[#1f1f1f]" : ""
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GitPullRequestIcon
                        className={cn(
                          "flex-shrink-0",
                          pr.state === "open"
                            ? "text-green-500"
                            : pr.state === "merged"
                            ? "text-purple-500"
                            : "text-red-500"
                        )}
                      />
                      <span className="text-[#525252] text-xs">#{pr.number}</span>
                      <span className="text-sm text-[#fafafa] truncate flex-1">
                        {pr.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-5 text-xs text-[#525252]">
                      <span>@{pr.author}</span>
                      <span className="text-[#a3a3a3]">+{pr.additions}</span>
                      <span className="text-[#525252]">-{pr.deletions}</span>
                      <span>{pr.changedFiles} files</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-[#525252]">
                  No open pull requests
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected PR Info */}
      {selectedPR && (
        <div className="p-3 bg-[#141414] border border-[#1f1f1f] rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitPullRequestIcon
                className={cn(
                  selectedPR.state === "open"
                    ? "text-green-500"
                    : selectedPR.state === "merged"
                    ? "text-purple-500"
                    : "text-red-500"
                )}
              />
              <span className="text-sm text-[#fafafa] font-medium">
                #{selectedPR.number}
              </span>
            </div>
            <span className="text-xs text-[#525252] capitalize">{selectedPR.state}</span>
          </div>
          <p className="mt-1.5 text-sm text-[#a3a3a3] line-clamp-2">
            {selectedPR.title}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-[#525252]">
            <span>@{selectedPR.author}</span>
            <span className="text-[#a3a3a3]">+{selectedPR.additions}</span>
            <span>-{selectedPR.deletions}</span>
            <span>{selectedPR.changedFiles} files</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PRSelector;
