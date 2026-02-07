"use client";

import { components } from "@/lib/tambo";
import { createGitHubTools } from "@/lib/tools";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { TamboProvider, currentTimeContextHelper } from "@tambo-ai/react";
import { TamboMcpProvider, MCPTransport } from "@tambo-ai/react/mcp";
import { ConvexReactClient, useAction, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";

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

  // Fetch Clerk token for Tambo authentication
  const [accessToken, setAccessToken] = useState<string | undefined>();

  useEffect(() => {
    async function fetchToken() {
      if (isLoaded && isSignedIn) {
        const token = await getToken();
        setAccessToken(token || undefined);
      } else {
        setAccessToken(undefined);
      }
    }
    fetchToken();
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
      url: server.url,
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
  ]);

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
        <TamboProviderWithAuth>{children}</TamboProviderWithAuth>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
