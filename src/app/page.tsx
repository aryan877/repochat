"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { ModeTabs, type ViewMode } from "@/components/mode-tabs";
import { ContentPanel } from "@/components/content-panel";
import { ChatPanel } from "@/components/chat-panel";
import { WebContainerProvider } from "@/contexts/webcontainer-context";
import type { Repository, PullRequest, FileChange, FileTreeNode } from "@/lib/types";

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const PlusIcon = () => (
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
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
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronIcon = () => (
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

const Spinner = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <svg
      className="animate-spin w-6 h-6 text-[#525252]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.2"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export default function Home() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Mode state
  const [mode, setMode] = useState<ViewMode>("pr-review");

  // Repository state - using proper Convex types
  const [selectedRepo, setSelectedRepo] = useState<Repository | undefined>();
  const [selectedPR, setSelectedPR] = useState<PullRequest | undefined>();
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoadingPRs, setIsLoadingPRs] = useState(false);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);

  // Code view state
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | undefined>();

  // Convex queries and actions
  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const connectedRepos = useQuery(
    api.users.getConnectedRepos,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const listPullRequests = useAction(api.github.listPullRequests);
  const getPullRequestFiles = useAction(api.github.getPullRequestFilesPublic);
  const importRepository = useAction(api.fileActions.importRepository);

  // Import state
  const [isImporting, setIsImporting] = useState(false);

  // Get import status for selected repo - using proper Id type
  const importStatus = useQuery(
    api.files.getImportStatus,
    selectedRepo?._id ? { repoId: selectedRepo._id } : "skip"
  );

  // Get files for code view mode
  const repoFiles = useQuery(
    api.files.getRepoFiles,
    selectedRepo?._id && mode === "code-view" ? { repoId: selectedRepo._id } : "skip"
  );

  // Build file tree from Convex files
  useEffect(() => {
    if (!repoFiles || repoFiles.length === 0) {
      setFileTree([]);
      return;
    }

    // Build tree structure from flat file list
    const buildTree = (files: typeof repoFiles): FileTreeNode[] => {
      const root: FileTreeNode[] = [];
      const pathMap = new Map<string, FileTreeNode>();

      // Sort files to ensure directories come before their contents
      const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

      for (const file of sortedFiles) {
        const parts = file.path.split("/");
        let currentPath = "";

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLast = i === parts.length - 1;
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (!pathMap.has(currentPath)) {
            const node: FileTreeNode = {
              name: part,
              path: currentPath,
              type: isLast ? file.type : "directory",
              children: isLast && file.type === "file" ? undefined : [],
            };

            pathMap.set(currentPath, node);

            if (parentPath) {
              const parent = pathMap.get(parentPath);
              if (parent?.children) {
                parent.children.push(node);
              }
            } else {
              root.push(node);
            }
          }
        }
      }

      return root;
    };

    setFileTree(buildTree(repoFiles));
  }, [repoFiles]);

  // Handle importing a repo when switching to Code View mode
  const handleImportRepo = useCallback(async () => {
    if (!selectedRepo?._id || !user?.id || isImporting) return;

    // Check if already imported
    if (importStatus?.status === "completed") return;

    setIsImporting(true);
    try {
      await importRepository({
        clerkId: user.id,
        repoId: selectedRepo._id,
      });
    } catch (error) {
      console.error("Failed to import repository:", error);
    } finally {
      setIsImporting(false);
    }
  }, [selectedRepo?._id, user?.id, isImporting, importStatus?.status, importRepository]);

  // Auto-import when switching to code-view mode with a selected repo
  useEffect(() => {
    if (mode === "code-view" && selectedRepo && !importStatus && !isImporting) {
      handleImportRepo();
    }
  }, [mode, selectedRepo, importStatus, isImporting, handleImportRepo]);

  // Convert connected repos to Repository type
  const repositories: Repository[] =
    connectedRepos?.map((repo) => ({
      _id: repo._id,
      name: repo.name,
      owner: repo.owner,
      fullName: repo.fullName,
    })) || [];

  // Redirect to onboarding if not signed in or GitHub not connected
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/onboarding");
    } else if (
      isLoaded &&
      user &&
      githubStatus !== undefined &&
      !githubStatus?.connected
    ) {
      router.push("/onboarding");
    }
  }, [isLoaded, user, githubStatus, router]);

  // Fetch PRs when repo changes
  const fetchPullRequests = useCallback(
    async (repo: Repository) => {
      if (!user?.id) return;

      setIsLoadingPRs(true);
      setPullRequests([]);
      setSelectedPR(undefined);
      setFileChanges([]);

      try {
        const prs = await listPullRequests({
          clerkId: user.id,
          owner: repo.owner,
          repo: repo.name,
          state: "open",
        });

        const mappedPRs: PullRequest[] = prs.map(
          (pr) => ({
            number: pr.number,
            title: pr.title,
            author: pr.user?.login || "unknown",
            state: pr.merged_at ? "merged" : (pr.state as "open" | "closed"),
            additions: pr.additions ?? undefined,
            deletions: pr.deletions ?? undefined,
            changedFiles: pr.changed_files ?? undefined,
            createdAt: pr.created_at,
          })
        );

        setPullRequests(mappedPRs);
      } catch (error) {
        console.error("Failed to fetch PRs:", error);
      } finally {
        setIsLoadingPRs(false);
      }
    },
    [user?.id, listPullRequests]
  );

  // Fetch file changes when PR is selected
  const fetchFileChanges = useCallback(
    async (repo: Repository, pr: PullRequest) => {
      if (!user?.id) return;

      try {
        const files = await getPullRequestFiles({
          clerkId: user.id,
          owner: repo.owner,
          repo: repo.name,
          prNumber: pr.number,
        });

        const mappedFiles: FileChange[] = files.map(
          (file: {
            filename: string;
            additions: number;
            deletions: number;
            patch?: string;
            status: string;
          }) => ({
            filePath: file.filename,
            additions: file.additions,
            deletions: file.deletions,
            patch: file.patch || "",
            status: file.status as "added" | "modified" | "deleted" | "renamed",
          })
        );

        setFileChanges(mappedFiles);
      } catch (error) {
        console.error("Failed to fetch file changes:", error);
      }
    },
    [user?.id, getPullRequestFiles]
  );

  // Handle repo selection
  const handleRepoChange = useCallback(
    (repo: Repository) => {
      setSelectedRepo(repo);
      setSelectedFile(undefined);
      fetchPullRequests(repo);
    },
    [fetchPullRequests]
  );

  // Handle PR selection
  const handlePRChange = useCallback(
    (pr: PullRequest) => {
      setSelectedPR(pr);
      if (selectedRepo) {
        fetchFileChanges(selectedRepo, pr);
      }
    },
    [selectedRepo, fetchFileChanges]
  );

  // Handle file selection in code view
  const handleFileSelect = useCallback(
    (path: string) => {
      const file = repoFiles?.find(
        (f: { path: string; type: string; content?: string }) =>
          f.path === path && f.type === "file"
      );
      if (file && file.content) {
        setSelectedFile({ path: file.path, content: file.content });
      }
    },
    [repoFiles]
  );

  // Show loading while checking auth status
  if (
    !isLoaded ||
    !user ||
    githubStatus === undefined ||
    !githubStatus?.connected
  ) {
    return <Spinner />;
  }

  // Render main content wrapped with WebContainerProvider when in code-view mode
  const mainContent = (
    <div className="flex-1 flex overflow-hidden">
      <ContentPanel
        mode={mode}
        repositories={repositories}
        selectedRepo={selectedRepo}
        onRepoChange={handleRepoChange}
        pullRequests={pullRequests}
        selectedPR={selectedPR}
        onPRChange={handlePRChange}
        isLoadingPRs={isLoadingPRs}
        fileChanges={fileChanges}
        fileTree={fileTree}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        importStatus={importStatus}
        isImporting={isImporting}
      />
      <ChatPanel mode={mode} />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#fafafa]">
      {/* Left Sidebar - Navigation */}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-64 flex flex-col bg-[#0a0a0a] border-r border-[#1f1f1f]"
      >
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-medium">RepoChat</span>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </div>

        <div className="px-3 mb-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#fafafa] bg-[#1f1f1f] hover:bg-[#292929] rounded-lg transition-colors">
            <PlusIcon />
            New chat
          </button>
        </div>

        <div className="px-3 mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-[#141414] rounded-lg pl-9 pr-3 py-2 text-sm text-[#fafafa] placeholder-[#525252] focus:outline-none focus:bg-[#1f1f1f] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <div className="mb-6">
            <button className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors">
              <span>Recent</span>
              <ChevronIcon />
            </button>
            <div className="mt-1 space-y-0.5">
              <button className="w-full text-left px-2 py-1.5 text-sm text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#141414] rounded transition-colors truncate">
                New conversation
              </button>
            </div>
          </div>

          <div>
            <button className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors">
              <span>Repositories</span>
              <ChevronIcon />
            </button>
            <div className="mt-1 space-y-0.5">
              {connectedRepos?.map((repo) => (
                <button
                  key={repo._id}
                  onClick={() =>
                    handleRepoChange({
                      _id: repo._id,
                      name: repo.name,
                      owner: repo.owner,
                      fullName: repo.fullName,
                    })
                  }
                  className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${
                    selectedRepo?._id === repo._id
                      ? "text-[#fafafa] bg-[#1f1f1f]"
                      : "text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#141414]"
                  }`}
                >
                  {repo.name}
                </button>
              ))}
              {(!connectedRepos || connectedRepos.length === 0) && (
                <p className="px-2 py-1.5 text-xs text-[#525252]">
                  No repositories connected
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-[#1f1f1f]">
          <Link
            href="/onboarding"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#141414] rounded-lg transition-colors"
          >
            <GitHubIcon />
            <span className="truncate">@{githubStatus?.github?.username}</span>
          </Link>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-[#0a0a0a]">
        {/* Header with Mode Tabs */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
          <ModeTabs mode={mode} onModeChange={setMode} />

          <div className="flex items-center gap-3 text-xs text-[#525252]">
            {selectedRepo && (
              <span className="px-2 py-1 bg-[#141414] rounded">
                {selectedRepo.fullName}
              </span>
            )}
            {selectedPR && (
              <span className="px-2 py-1 bg-[#141414] rounded">
                PR #{selectedPR.number}
              </span>
            )}
            {mode === "code-view" && importStatus && (
              <span className="px-2 py-1 bg-[#141414] rounded">
                {importStatus.status === "importing"
                  ? `Importing... ${importStatus.progress || 0}%`
                  : importStatus.status === "completed"
                  ? "Synced"
                  : importStatus.status}
              </span>
            )}
          </div>
        </header>

        {/* Split View: Content Panel + Chat Panel */}
        {mode === "code-view" && selectedRepo?._id ? (
          <WebContainerProvider repoId={selectedRepo._id} enabled={importStatus?.status === "completed"}>
            {mainContent}
          </WebContainerProvider>
        ) : (
          mainContent
        )}
      </main>
    </div>
  );
}
