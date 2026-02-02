"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

type Step = "connect" | "repos" | "complete";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  owner: { login: string };
  permissions?: { admin: boolean; push: boolean; pull: boolean };
}

const GitHubMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function GitHubOnboarding({ onComplete, showBackButton }: { onComplete?: () => void; showBackButton?: boolean }) {
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState<Step>("connect");
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());

  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const getUserRepos = useAction(api.github.getUserRepos);
  const connectRepo = useMutation(api.users.connectRepo);
  const disconnectGitHub = useMutation(api.users.disconnectGitHub);

  useEffect(() => {
    if (githubStatus?.connected) {
      setCurrentStep("repos");
      loadRepos();
    }
  }, [githubStatus]);

  const loadRepos = async () => {
    if (!user?.id) return;
    setIsLoadingRepos(true);
    setError(null);
    try {
      const reposData = await getUserRepos({ clerkId: user.id });
      setRepos(reposData as Repository[]);
    } catch {
      setError("Failed to load repositories");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleGitHubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      setError("GitHub OAuth not configured");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "repo read:user";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl;
  };

  const toggleRepo = (id: number) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    for (const repoId of selectedRepos) {
      const repo = repos.find((r) => r.id === repoId);
      if (repo) {
        await connectRepo({
          clerkId: user.id,
          githubRepoId: repo.id,
          owner: repo.owner.login,
          name: repo.name,
          description: repo.description ?? undefined,
          defaultBranch: repo.default_branch,
          isPrivate: repo.private,
          permissions: repo.permissions ?? { admin: false, push: false, pull: true },
        });
      }
    }

    setCurrentStep("complete");
    setTimeout(() => {
      onComplete?.();
    }, 1500);
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    await disconnectGitHub({ clerkId: user.id });
    setCurrentStep("connect");
    setRepos([]);
    setSelectedRepos(new Set());
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md"
      >
        {showBackButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Link
              href="/"
              className="text-sm text-[#525252] hover:text-[#a3a3a3] transition-colors"
            >
              ← Back to chat
            </Link>
          </motion.div>
        )}

        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl font-medium text-[#fafafa] tracking-tight"
          >
            RepoChat
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm text-[#525252] mt-1"
          >
            AI-powered code review
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === "connect" && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {!user ? (
                <>
                  <SignInButton mode="modal">
                    <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#fafafa] text-[#0a0a0a] rounded-lg font-medium text-sm hover:bg-[#e5e5e5] transition-colors duration-200">
                      Sign in to get started
                    </button>
                  </SignInButton>
                  <p className="text-xs text-[#525252] text-center">
                    Sign in first, then connect your GitHub
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGitHubLogin}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#fafafa] text-[#0a0a0a] rounded-lg font-medium text-sm hover:bg-[#e5e5e5] transition-colors duration-200"
                  >
                    <GitHubMark />
                    Connect GitHub
                  </button>
                  <p className="text-xs text-[#525252] text-center">
                    We&apos;ll request access to your repositories
                  </p>
                </>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-400 text-center"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          )}

          {currentStep === "repos" && (
            <motion.div
              key="repos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#a3a3a3]">
                    Connected as{" "}
                    <span className="text-[#fafafa]">@{githubStatus?.github?.username}</span>
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors"
                >
                  Disconnect
                </button>
              </div>

              <div className="h-px bg-[#1f1f1f]" />

              <div className="flex items-center justify-between">
                <p className="text-sm text-[#525252]">Select repositories</p>
                <button
                  onClick={loadRepos}
                  disabled={isLoadingRepos}
                  className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors flex items-center gap-1"
                >
                  {isLoadingRepos && <Spinner />}
                  Refresh
                </button>
              </div>

              {isLoadingRepos ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto space-y-1">
                  {repos.map((repo, idx) => (
                    <motion.button
                      key={repo.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => toggleRepo(repo.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-left ${
                        selectedRepos.has(repo.id)
                          ? "bg-[#1f1f1f]"
                          : "hover:bg-[#141414]"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                          selectedRepos.has(repo.id)
                            ? "bg-[#fafafa] text-[#0a0a0a]"
                            : "border border-[#292929]"
                        }`}
                      >
                        {selectedRepos.has(repo.id) && <CheckIcon />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#fafafa] truncate">
                            {repo.name}
                          </span>
                          {repo.private && (
                            <span className="text-[#525252]">
                              <LockIcon />
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-[#525252] truncate mt-0.5">
                            {repo.description}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <div className="h-px bg-[#1f1f1f]" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-[#525252]">
                  {selectedRepos.size} selected
                </span>
                <button
                  onClick={handleComplete}
                  disabled={selectedRepos.size === 0}
                  className="px-4 py-2 bg-[#fafafa] text-[#0a0a0a] rounded-lg text-sm font-medium hover:bg-[#e5e5e5] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#1f1f1f] flex items-center justify-center"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fafafa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
              <h2 className="text-lg font-medium text-[#fafafa]">Ready</h2>
              <p className="text-sm text-[#525252] mt-1">Redirecting...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default GitHubOnboarding;
