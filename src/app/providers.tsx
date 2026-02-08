"use client";

import { components } from "@/lib/tambo";
import { createGitHubTools } from "@/lib/tools";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { TamboProvider, currentTimeContextHelper } from "@tambo-ai/react";
import { TamboMcpProvider, MCPTransport } from "@tambo-ai/react/mcp";
import { ConvexReactClient, useAction, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";

// ── Selected Repo Context (persists across page navigation) ──

interface SelectedRepoCtx {
  selectedRepoName: string | null;
  setSelectedRepoName: (name: string | null) => void;
}

const SelectedRepoContext = createContext<SelectedRepoCtx>({
  selectedRepoName: null,
  setSelectedRepoName: () => {},
});

export function useSelectedRepo() {
  return useContext(SelectedRepoContext);
}

function SelectedRepoProvider({ children }: { children: ReactNode }) {
  const [selectedRepoName, setSelectedRepoNameRaw] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("repochat:selectedRepo") || null;
  });

  const setSelectedRepoName = useCallback((name: string | null) => {
    setSelectedRepoNameRaw(name);
    if (name) {
      localStorage.setItem("repochat:selectedRepo", name);
    } else {
      localStorage.removeItem("repochat:selectedRepo");
    }
  }, []);

  return (
    <SelectedRepoContext.Provider value={{ selectedRepoName, setSelectedRepoName }}>
      {children}
    </SelectedRepoContext.Provider>
  );
}

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string,
);

// System prompt defined in src/lib/constants.ts (single source of truth)
// Paste SYSTEM_PROMPT into Tambo Dashboard > Settings > Custom Instructions
// (initialMessages + availableComponents is bugged in Tambo's API)

function TamboProviderWithAuth({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const clerkId = user?.id ?? "";

  // Fetch Clerk token for Tambo authentication, refresh before expiry
  const [accessToken, setAccessToken] = useState<string | undefined>();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setAccessToken(undefined);
      return;
    }

    async function fetchToken() {
      const token = await getToken();
      setAccessToken(token || undefined);
    }

    fetchToken();

    // Clerk JWTs expire after ~60s; refresh every 50s to stay ahead
    const interval = setInterval(fetchToken, 50_000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, getToken]);

  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    clerkId ? { clerkId } : "skip",
  );

  // Load user's saved MCP server configurations
  const userMcpServers = useQuery(
    api.mcpServers.getUserMcpServers,
    clerkId ? { clerkId } : "skip",
  );

  const mcpServers = useMemo(() => {
    if (!userMcpServers || userMcpServers.length === 0) return undefined;
    return userMcpServers.map((server) => ({
      name: server.label,
      url: `${window.location.origin}/api/mcp-proxy?url=${encodeURIComponent(server.url)}`,
      transport: server.transport === "sse" ? MCPTransport.SSE : MCPTransport.HTTP,
      serverKey: server.provider,
      customHeaders: Object.fromEntries(
        Object.entries(server.headers).filter(([, v]) => v != null) as [string, string][]
      ),
    }));
  }, [userMcpServers]);

  const getPullRequest = useAction(api.github.getPullRequestPublic);
  const getPullRequestFiles = useAction(api.github.getPullRequestFilesPublic);
  const getFileContent = useAction(api.github.getFileContentPublic);
  const postReviewComment = useAction(api.github.postReviewCommentPublic);
  const createReview = useAction(api.github.createReview);
  const mergePullRequest = useAction(api.github.mergePullRequest);
  const getRepoTree = useAction(api.github.getRepoTree);
  const searchCode = useAction(api.github.searchCode);
  const listPullRequests = useAction(api.github.listPullRequests);
  const listBranches = useAction(api.github.listBranches);
  const listCommits = useAction(api.github.listCommits);
  const compareCommits = useAction(api.github.compareCommits);

  const tools = useMemo(() => {
    if (!clerkId || !githubStatus?.connected) {
      return [];
    }

    return createGitHubTools({
      clerkId,
      actions: {
        getPullRequest,
        getPullRequestFiles,
        getFileContent,
        postReviewComment,
        createReview,
        mergePullRequest,
        getRepoTree,
        searchCode,
        listPullRequests,
        listBranches,
        listCommits,
        compareCommits,
      },
    });
  }, [
    clerkId,
    githubStatus?.connected,
    getPullRequest,
    getPullRequestFiles,
    getFileContent,
    postReviewComment,
    createReview,
    mergePullRequest,
    getRepoTree,
    searchCode,
    listPullRequests,
    listBranches,
    listCommits,
    compareCommits,
  ]);

  // Gate rendering based on auth state:
  // 1. Auth still loading → show nothing (brief flash)
  // 2. User signed out → render children WITHOUT TamboProvider so pages can
  //    handle their own redirects (e.g. to /onboarding)
  // 3. Signed in but token not yet fetched → show nothing (loading)
  // 4. Signed in + token ready → render full TamboProvider tree
  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <>{children}</>;
  }

  if (!accessToken) {
    return null;
  }

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY || ""}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_API_URL}
      userToken={accessToken}
      components={components}
      tools={tools}
      mcpServers={mcpServers}
      autoGenerateThreadName={true}
      autoGenerateNameThreshold={3}
      contextHelpers={{
        currentTime: currentTimeContextHelper,
        githubStatus: () => ({
          connected: githubStatus?.connected ?? false,
          username: githubStatus?.github?.username || null,
        }),
        mcpIntegrations: () => {
          if (!userMcpServers || userMcpServers.length === 0) return null;
          return {
            count: userMcpServers.length,
            servers: userMcpServers.map((s) => s.label),
          };
        },
      }}
    >
      <TamboMcpProvider>
        {children}
      </TamboMcpProvider>
    </TamboProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SelectedRepoProvider>
          <TamboProviderWithAuth>{children}</TamboProviderWithAuth>
        </SelectedRepoProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
