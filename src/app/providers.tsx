"use client";

import { ClerkProvider, useUser } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useAction } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { TamboProvider } from "@tambo-ai/react";
import { components } from "@/lib/tambo";
import { createGitHubTools } from "@/lib/tools";
import { api } from "../../convex/_generated/api";
import { ReactNode, useMemo, useState, useEffect } from "react";
import { useQuery } from "convex/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

const systemPrompt = `You are RepoChat, an AI-powered code review assistant with Generative UI.

## YOUR CAPABILITIES

You can help users:
1. Review pull requests on GitHub
2. Analyze code for security issues, bugs, and improvements
3. Post comments on PRs
4. Approve or request changes on PRs
5. Merge PRs (always confirm first)
6. Browse and understand repository code

## GENERATIVE COMPONENTS

| Situation | Component |
|-----------|-----------|
| Security vulnerability found | SecurityAlert |
| Code needs refactoring | RefactorCard |
| Show file changes/diff | DiffViewer |
| PR overview | PRSummary |
| Show file content | CodeViewer |
| Show repo structure | FileExplorer |
| Explain code | CodeExplainer |
| Show commit info | CommitCard |
| Multi-step plan | PlanView |

## TOOLS AVAILABLE

You have access to GitHub tools that securely access the user's repositories:
- **analyzePR** - Get full PR details and file changes
- **getFileContent** - Read file contents
- **postReviewComment** - Add inline comments
- **submitReview** - Approve/request changes
- **mergePR** - Merge PRs (confirm first!)
- **getRepoTree** - View repo structure
- **searchCode** - Search for code
- **listPullRequests** - List PRs
- **listBranches** - List branches

## RULES

1. ALWAYS render appropriate components for findings
2. Multiple issues? Render multiple components
3. Keep text brief - let components show the details
4. When asked to merge, CONFIRM with the user first
5. Be helpful and thorough in code reviews`;

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
    clerkId ? { clerkId } : "skip"
  );

  const getPullRequest = useAction(api.github.getPullRequest);
  const getPullRequestFiles = useAction(api.github.getPullRequestFiles);
  const getFileContent = useAction(api.github.getFileContent);
  const postReviewComment = useAction(api.github.postReviewComment);
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

  const enhancedSystemPrompt = githubStatus?.connected
    ? `${systemPrompt}

## CONNECTED

GitHub connected as @${githubStatus.github?.username}. Tools are ready to use.`
    : `${systemPrompt}

## NOT CONNECTED

GitHub is not connected. Ask the user to connect their GitHub account first.`;

  const welcomeMessage = githubStatus?.connected
    ? `**Welcome back to RepoChat**

GitHub connected as **@${githubStatus.github?.username}**.

**What I can do:**
- Review PRs — \`Review PR #123 on owner/repo\`
- Search code — \`Find useState in repo\`
- Post comments — \`Add a comment about the bug\`
- Approve & merge — \`Approve and merge PR #45\`

What would you like me to help with?`
    : `**Welcome to RepoChat**

AI-powered code review assistant.

**Connect GitHub** to get started. Once connected, I can:
- Review pull requests
- Analyze code for issues
- Post inline comments
- Approve and merge PRs

Click **Connect GitHub** in the sidebar to begin.`;

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY || ""}
      userToken={accessToken}
      components={components}
      tools={tools}
      initialMessages={[
        {
          id: "system",
          role: "system",
          content: [{ type: "text", text: enhancedSystemPrompt }],
          createdAt: new Date().toISOString(),
          componentState: {},
        },
        {
          id: "welcome",
          role: "assistant",
          content: [{ type: "text", text: welcomeMessage }],
          createdAt: new Date().toISOString(),
          componentState: {},
        },
      ]}
    >
      {children}
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
