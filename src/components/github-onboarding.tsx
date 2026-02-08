"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, SignInButton } from "@clerk/nextjs";
import { ShaderBackground } from "./shader-background";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

type Step = "signin" | "install" | "link" | "complete";

const GitHubMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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
  const [currentStep, setCurrentStep] = useState<Step>("signin");
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get GitHub connection status
  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get available installations (ones not yet linked to a user)
  const installations = useQuery(api.repos.listInstallations);

  // Get repos for linked user
  const connectedRepos = useQuery(
    api.users.getConnectedRepos,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Mutations
  const linkInstallation = useMutation(api.users.linkGitHubInstallation);
  const unlinkGitHub = useMutation(api.users.unlinkGitHub);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  // Ensure user exists in our DB
  useEffect(() => {
    if (user?.id) {
      getOrCreateUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl,
      });
    }
  }, [user?.id, user?.primaryEmailAddress?.emailAddress, user?.fullName, user?.imageUrl, getOrCreateUser]);

  // Determine current step
  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setCurrentStep("signin");
    } else if (githubStatus?.connected) {
      setCurrentStep("complete");
      setTimeout(() => onComplete?.(), 1000);
    } else if (installations && installations.length > 0) {
      setCurrentStep("link");
    } else {
      setCurrentStep("install");
    }
  }, [isLoaded, user, githubStatus?.connected, installations, onComplete]);

  const handleInstallApp = () => {
    // Redirect to GitHub App installation page
    const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "repochat-app";
    window.location.href = `https://github.com/apps/${appSlug}/installations/new`;
  };

  const handleLinkInstallation = async (installationId: number, username: string, avatarUrl?: string) => {
    if (!user?.id) return;
    setIsLinking(true);
    setError(null);

    try {
      await linkInstallation({
        clerkId: user.id,
        installationId,
        githubUsername: username,
        githubAvatarUrl: avatarUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link installation");
    } finally {
      setIsLinking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    await unlinkGitHub({ clerkId: user.id });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <ShaderBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        {showBackButton && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <Link href="/" className="text-sm text-[#525252] hover:text-[#a3a3a3] transition-colors">
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
          {/* Step 1: Sign In */}
          {currentStep === "signin" && (
            <motion.div
              key="signin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <SignInButton mode="modal">
                <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#fafafa] text-[#0a0a0a] rounded-lg font-medium text-sm hover:bg-[#e5e5e5] transition-colors">
                  Sign in to get started
                </button>
              </SignInButton>
              <p className="text-xs text-[#525252] text-center">
                Sign in first, then connect your GitHub
              </p>
            </motion.div>
          )}

          {/* Step 2: Install GitHub App */}
          {currentStep === "install" && (
            <motion.div
              key="install"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <button
                onClick={handleInstallApp}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#fafafa] text-[#0a0a0a] rounded-lg font-medium text-sm hover:bg-[#e5e5e5] transition-colors"
              >
                <GitHubMark />
                Install GitHub App
              </button>
              <p className="text-xs text-[#525252] text-center">
                Install the RepoChat GitHub App and select repositories
              </p>

              <div className="mt-6 p-4 bg-[#141414] rounded-lg">
                <p className="text-xs text-[#a3a3a3] mb-2">After installing:</p>
                <ul className="text-xs text-[#525252] space-y-1">
                  <li>• Select which repositories to grant access</li>
                  <li>• Return here to complete setup</li>
                  <li>• Auto PR reviews will be enabled</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Step 3: Link Installation */}
          {currentStep === "link" && (
            <motion.div
              key="link"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-sm text-[#a3a3a3] text-center">
                Select a GitHub account to connect
              </p>

              <div className="space-y-2">
                {installations?.map((installation) => (
                  <button
                    key={installation._id}
                    onClick={() =>
                      handleLinkInstallation(
                        installation.installationId,
                        installation.accountLogin,
                        installation.accountAvatarUrl
                      )
                    }
                    disabled={isLinking}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[#141414] hover:bg-[#1f1f1f] rounded-lg transition-colors"
                  >
                    {installation.accountAvatarUrl ? (
                      <img
                        src={installation.accountAvatarUrl}
                        alt={installation.accountLogin}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#292929] flex items-center justify-center">
                        <GitHubMark />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="text-sm text-[#fafafa]">@{installation.accountLogin}</p>
                      <p className="text-xs text-[#525252]">
                        {installation.accountType} • {installation.repositorySelection === "all" ? "All repos" : "Selected repos"}
                      </p>
                    </div>
                    {isLinking && <Spinner />}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <div className="h-px bg-[#1f1f1f]" />

              <button
                onClick={handleInstallApp}
                className="w-full text-sm text-[#525252] hover:text-[#a3a3a3] transition-colors"
              >
                Install on another account →
              </button>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {currentStep === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                  className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#1f1f1f] flex items-center justify-center text-[#fafafa]"
                >
                  <CheckIcon />
                </motion.div>
                <h2 className="text-lg font-medium text-[#fafafa]">Connected</h2>
                <p className="text-sm text-[#525252] mt-1">
                  @{githubStatus?.github?.username}
                </p>
              </div>

              {connectedRepos && connectedRepos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[#525252]">Connected repositories:</p>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {connectedRepos.map((repo) => (
                      <div
                        key={repo._id}
                        className="flex items-center justify-between px-3 py-2 bg-[#141414] rounded-lg"
                      >
                        <span className="text-sm text-[#a3a3a3] truncate">{repo.fullName}</span>
                        {repo.autoReview && (
                          <span className="text-xs text-[#525252]">Auto-review</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Link
                  href="/"
                  className="flex-1 px-4 py-2 bg-[#fafafa] text-[#0a0a0a] rounded-lg text-sm font-medium text-center hover:bg-[#e5e5e5] transition-colors"
                >
                  Start chatting
                </Link>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-sm text-[#525252] hover:text-[#a3a3a3] transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default GitHubOnboarding;
