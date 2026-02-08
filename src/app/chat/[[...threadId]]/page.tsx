"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLottie } from "lottie-react";

// Import the animation data
import arrowAnimation from "@/arrow-animation.json";
import { useRouter, useParams } from "next/navigation";
import { useSelectedRepo } from "@/app/providers";
import { SignedIn, UserButton, useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { CodeView } from "@/components/code-view";
import { ReviewChecklist } from "@/components/review/review-checklist";
import type { Suggestion } from "@tambo-ai/react";
import {
  useTamboThread,
  useTamboClient,
  useTamboContextHelpers,
} from "@tambo-ai/react";
import { useThreadList } from "../thread-list-provider";
import type { Id } from "../../../../convex/_generated/dataModel";
type ViewMode = "chat" | "code";

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const MenuIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const XIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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

const MessageIcon = () => (
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ChevronDownIcon = () => (
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
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CodeIcon = () => (
  <svg
    width="16"
    height="16"
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

const ChatIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const Spinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <svg
        className="animate-spin w-5 h-5 text-muted-foreground"
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
  </div>
);

const INITIAL_SUGGESTIONS: Suggestion[] = [
  {
    id: "pr-review",
    title: "Review a PR",
    detailedSuggestion: "Review PR #123 on owner/repo",
    messageId: "review-pr",
  },
  {
    id: "security-check",
    title: "Security check",
    detailedSuggestion: "Check this PR for security vulnerabilities",
    messageId: "security",
  },
  {
    id: "explain-code",
    title: "Explain code",
    detailedSuggestion: "Explain how this code works",
    messageId: "explain",
  },
];

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center bg-secondary rounded-lg p-0.5">
      <button
        onClick={() => onChange("chat")}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          mode === "chat"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground/80"
        }`}
      >
        <ChatIcon />
        <span className="hidden sm:inline">Chat</span>
      </button>
      <button
        onClick={() => onChange("code")}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          mode === "code"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground/80"
        }`}
      >
        <CodeIcon />
        <span className="hidden sm:inline">Code</span>
      </button>
    </div>
  );
}

// Arrow animation component using useLottie hook
const ArrowAnimation = () => {
  const options = {
    animationData: arrowAnimation,
    loop: true,
  };

  const { View } = useLottie(options);

  return <div className="w-[280px]" style={{ opacity: 0.35, filter: "brightness(1.5)" }}>{View}</div>;
};

export default function ChatPage() {
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    user?.id ? { clerkId: user.id } : "skip",
  );

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (
    !mounted ||
    !isLoaded ||
    !isSignedIn ||
    !user ||
    githubStatus === undefined ||
    !githubStatus?.connected
  ) {
    return <Spinner />;
  }

  return <ChatPageInner />;
}

function ChatPageInner() {
  const router = useRouter();
  const params = useParams<{ threadId?: string[] }>();
  const urlThreadId = params.threadId?.[0];

  const { user } = useUser();
  const { selectedRepoName: selectedRepo, setSelectedRepoName } = useSelectedRepo();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<ViewMode>("chat");
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [deletedThreadIds, setDeletedThreadIds] = useState<Set<string>>(
    new Set(),
  );

  // Resizable checklist panel state
  const CHECKLIST_MIN = 240;
  const CHECKLIST_MAX = 500;
  const CHECKLIST_DEFAULT = 320;
  const [checklistWidth, setChecklistWidth] = useState(() => {
    if (typeof window === "undefined") return CHECKLIST_DEFAULT;
    const saved = localStorage.getItem("repochat-checklist-width");
    return saved ? Math.min(CHECKLIST_MAX, Math.max(CHECKLIST_MIN, Number(saved))) : CHECKLIST_DEFAULT;
  });
  const [isChecklistResizing, setIsChecklistResizing] = useState(false);
  const checklistRef = useRef<HTMLElement>(null);

  const handleChecklistResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsChecklistResizing(true);
  }, []);

  useEffect(() => {
    if (!isChecklistResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (checklistRef.current) {
        const rect = checklistRef.current.getBoundingClientRect();
        // Resize from left edge: width = right edge - mouse x
        const newWidth = rect.right - e.clientX;
        const clamped = Math.min(CHECKLIST_MAX, Math.max(CHECKLIST_MIN, newWidth));
        setChecklistWidth(clamped);
      }
    };
    const handleMouseUp = () => {
      setIsChecklistResizing(false);
      localStorage.setItem("repochat-checklist-width", String(checklistWidth));
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isChecklistResizing, checklistWidth]);

  // Resizable sidebar state
  const SIDEBAR_MIN = 200;
  const SIDEBAR_MAX = 400;
  const SIDEBAR_DEFAULT = 256;
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT;
    const saved = localStorage.getItem("repochat-sidebar-width");
    return saved ? Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Number(saved))) : SIDEBAR_DEFAULT;
  });
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const handleSidebarResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsSidebarResizing(true);
  }, []);

  useEffect(() => {
    if (!isSidebarResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const clamped = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, newWidth));
        setSidebarWidth(clamped);
      }
    };
    const handleMouseUp = () => {
      setIsSidebarResizing(false);
      localStorage.setItem("repochat-sidebar-width", String(sidebarWidth));
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSidebarResizing, sidebarWidth]);

  // Tambo thread management
  const { currentThreadId, switchCurrentThread, startNewThread } =
    useTamboThread();
  const client = useTamboClient();
  const { addContextHelper } = useTamboContextHelpers();

  // Thread list lives in layout-level context (survives page remounts)
  const { threads: mergedThreads, isLoading: threadsLoading, refetch: refetchThreads, removeThread } = useThreadList();

  // Track whether we initiated the navigation (to avoid loops)
  const navigatingRef = useRef(false);

  // Helper to build navigation paths
  const buildPath = useCallback(
    (base: string) => base,
    [],
  );

  // Sync URL → Tambo: if URL has a threadId, switch to it
  useEffect(() => {
    if (!urlThreadId || urlThreadId === currentThreadId) return;

    navigatingRef.current = true;
    (async () => {
      try {
        await switchCurrentThread(urlThreadId);
      } catch {
        // Dead thread — hide it and go back
        setDeletedThreadIds((prev) => new Set(prev).add(urlThreadId));
        router.replace(buildPath("/chat"));
      } finally {
        navigatingRef.current = false;
      }
    })();
  }, [urlThreadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync Tambo → URL: when a new thread gets created (first message sent),
  // update the URL to include the thread ID
  useEffect(() => {
    if (navigatingRef.current) return;
    if (!currentThreadId || currentThreadId === "placeholder") {
      if (urlThreadId) router.replace(buildPath("/chat"));
      return;
    }
    if (currentThreadId !== urlThreadId) {
      router.replace(buildPath(`/chat/${currentThreadId}`));
    }
  }, [currentThreadId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredThreads = useMemo(() => {
    if (mergedThreads.length === 0) return [];
    const seen = new Set<string>();
    const list = mergedThreads.filter((t) => {
      if (deletedThreadIds.has(t.id) || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    if (!threadSearch.trim()) return list;
    const query = threadSearch.toLowerCase();
    return list.filter((t) =>
      (t.name || "New conversation").toLowerCase().includes(query),
    );
  }, [mergedThreads, threadSearch, deletedThreadIds]);

  const handleNewThread = useCallback(() => {
    startNewThread();
    router.push(buildPath("/chat"));
    setSidebarOpen(false);
  }, [startNewThread, router, buildPath]);

  const handleSwitchThread = useCallback(
    async (threadId: string) => {
      router.push(buildPath(`/chat/${threadId}`));
      setSidebarOpen(false);
    },
    [router, buildPath],
  );

  const handleDeleteThread = useCallback(
    async (e: React.MouseEvent, threadId: string) => {
      e.stopPropagation();
      if (!confirm("Delete this conversation?")) return;

      setDeletedThreadIds((prev) => new Set(prev).add(threadId));

      // If we're viewing this thread, go to a new chat
      if (currentThreadId === threadId) {
        startNewThread();
        router.replace(buildPath("/chat"));
      }

      try {
        await client.beta.threads.delete(threadId);
      } catch {
        // already gone
      }
      removeThread(threadId);
      refetchThreads();
    },
    [
      client,
      currentThreadId,
      startNewThread,
      removeThread,
      refetchThreads,
      router,
      buildPath,
    ],
  );

  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const connectedRepos = useQuery(
    api.users.getConnectedRepos,
    user?.id ? { clerkId: user.id } : "skip",
  );

  // Derive selectedRepoId from the URL param + connectedRepos
  const selectedRepoId = useMemo(() => {
    if (!selectedRepo || !connectedRepos) return null;
    const repo = connectedRepos.find((r) => r.name === selectedRepo);
    return repo?._id ?? null;
  }, [selectedRepo, connectedRepos]) as Id<"repos"> | null;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Register selected repo as always-on context for the AI
  useEffect(() => {
    addContextHelper("selectedRepo", () => {
      if (!selectedRepo || !connectedRepos) return null;
      const repo = connectedRepos.find((r) => r.name === selectedRepo);
      if (!repo) return null;
      return {
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
      };
    });
  }, [selectedRepo, connectedRepos, addContextHelper]);

  const handleRepoSelect = (
    repo: { _id: Id<"repos">; name: string } | null,
  ) => {
    setSelectedRepoName(repo?.name ?? null);
    setRepoDropdownOpen(false);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-backdrop z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`
        fixed inset-y-0 left-0 z-50 bg-background border-r border-secondary
        transform transition-transform duration-200 ease-out flex flex-col
        md:relative md:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        ${isSidebarResizing ? "select-none" : ""}
      `}
        style={{ width: sidebarWidth }}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-secondary flex-shrink-0">
          <span className="text-sm font-medium">RepoChat</span>
          <div className="flex items-center gap-2">
            <SignedIn>
              <UserButton appearance={{ elements: { avatarBox: "w-6 h-6" } }} />
            </SignedIn>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground md:hidden"
            >
              <XIcon />
            </button>
          </div>
        </div>

        <div className="p-3 flex-shrink-0">
          <button
            onClick={handleNewThread}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-secondary rounded-lg hover:bg-accent transition-colors"
          >
            <PlusIcon />
            New chat
          </button>
        </div>

        <div className="px-3 pb-2 flex-shrink-0">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search chats..."
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-card border border-secondary rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 min-h-0">
          <div className="px-2 py-2 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            Recent
          </div>
          <div className="space-y-0.5">
            {threadsLoading ? (
              <div className="space-y-1 px-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-card rounded animate-pulse" />
                ))}
              </div>
            ) : filteredThreads.length > 0 ? (
              filteredThreads.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSwitchThread(t.id)}
                  className={`group w-full flex items-center gap-2 px-2 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                    t.id === currentThreadId
                      ? "text-foreground bg-card"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <MessageIcon />
                  <span className="truncate flex-1">
                    {t.name || "New conversation"}
                  </span>
                  <button
                    onClick={(e) => handleDeleteThread(e, t.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground/50 hover:text-red-400 transition-all flex-shrink-0"
                    title="Delete thread"
                  >
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
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              ))
            ) : threadSearch ? (
              <p className="px-2 py-3 text-xs text-muted-foreground/50 text-center">
                No chats match &ldquo;{threadSearch}&rdquo;
              </p>
            ) : (
              <button
                onClick={handleNewThread}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground bg-card rounded-lg hover:bg-secondary transition-colors"
              >
                <MessageIcon />
                <span className="truncate">New conversation</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-secondary bg-background flex-shrink-0">
          <Link
            href="/settings"
            className="w-full flex items-center gap-2.5 px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-card rounded-lg transition-colors"
          >
            <SettingsIcon />
            <span>Settings</span>
          </Link>
          <div className="flex items-center gap-2.5 px-2 py-2 mt-1 text-sm text-muted-foreground/60">
            <GitHubIcon />
            <span className="truncate">@{githubStatus?.github?.username}</span>
          </div>
        </div>

        {/* Sidebar resize handle — desktop only */}
        <div
          onMouseDown={handleSidebarResizeDown}
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hidden md:flex items-center justify-center hover:bg-secondary transition-colors ${
            isSidebarResizing ? "bg-accent" : ""
          }`}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="absolute top-0 left-0 right-0 z-20 h-14 px-3 sm:px-4 flex items-center justify-between gap-2 bg-background/70 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground md:hidden flex-shrink-0"
            >
              <MenuIcon />
            </button>

            <div className="relative min-w-0">
              <button
                onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-card rounded-lg hover:bg-secondary transition-colors max-w-[200px]"
              >
                <GitHubIcon />
                <span className="truncate">
                  {selectedRepo || "Select repo"}
                </span>
                <ChevronDownIcon />
              </button>

              {repoDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setRepoDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-secondary rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-secondary">
                      <input
                        type="text"
                        placeholder="Search repos..."
                        className="w-full px-3 py-2 text-sm bg-background border border-secondary rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <button
                        onClick={() => handleRepoSelect(null)}
                        className="w-full px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        All repositories
                      </button>
                      {connectedRepos?.map((repo) => (
                        <button
                          key={repo._id}
                          onClick={() =>
                            handleRepoSelect({ _id: repo._id, name: repo.name })
                          }
                          className="w-full px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-2"
                        >
                          <span className="truncate">{repo.name}</span>
                          {repo.autoReview && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">
                              auto
                            </span>
                          )}
                        </button>
                      ))}
                      {(!connectedRepos || connectedRepos.length === 0) && (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground/60">
                          No repos connected
                          <Link
                            href="/settings"
                            className="block mt-1 text-muted-foreground hover:text-foreground"
                          >
                            Add repos in settings
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle mode={mode} onChange={setMode} />
            <Link
              href="/docs"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title="Documentation"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="hidden sm:inline">Docs</span>
            </Link>
          </div>
        </header>

        {/* Chat view — always mounted, hidden when code mode active */}
        <div className={mode === "chat" ? "flex-1 flex flex-col overflow-hidden min-h-0" : "hidden"}>
          {selectedRepo ? (
            <div className="flex flex-1 pt-14 overflow-hidden">
              <MessageThreadFull
                initialSuggestions={INITIAL_SUGGESTIONS}
                placeholder={`Ask about ${selectedRepo}...`}
                className="flex-1 min-w-0"
              />
              <aside
                ref={checklistRef}
                className={`hidden lg:block relative border-l border-secondary bg-background overflow-y-auto ${isChecklistResizing ? "select-none" : ""}`}
                style={{ width: checklistWidth }}
              >
                {/* Checklist resize handle — left edge */}
                <div
                  onMouseDown={handleChecklistResizeDown}
                  className={`absolute top-0 left-0 w-1.5 h-full cursor-col-resize flex items-center justify-center hover:bg-secondary transition-colors z-10 ${
                    isChecklistResizing ? "bg-accent" : ""
                  }`}
                />
                <ReviewChecklist findings={[]} status="pending" />
              </aside>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center pt-14 relative">
              {/* Animated arrow pointing to repo dropdown */}
              <div className="absolute top-16 left-6 pointer-events-none">
                <ArrowAnimation />
              </div>

              <div className="text-center max-w-md px-6 relative">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto block text-muted-foreground/40 mb-4"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Select a Repository
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a repository from the dropdown above to start
                  chatting.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Code view — always mounted, hidden when chat mode active */}
        <div className={mode === "code" ? "flex-1 pt-14 flex flex-col overflow-hidden" : "hidden"}>
          <CodeView repoId={selectedRepoId} repoName={selectedRepo} />
        </div>
      </main>
    </div>
  );
}
