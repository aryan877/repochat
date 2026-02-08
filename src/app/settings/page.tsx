"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";
import { useTamboMcpServers } from "@tambo-ai/react/mcp";

const PlugIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5" />
    <path d="M9 8V2" />
    <path d="M15 8V2" />
    <path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const MCP_TEMPLATES = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Query your Supabase database, manage tables, run SQL",
    urlTemplate: (projectRef: string) =>
      `https://mcp.supabase.com/mcp?project_ref=${projectRef}`,
    transport: "http" as const,
    fields: [
      { key: "projectRef", label: "Project Ref", placeholder: "e.g. abcdefghijklmnop" },
      { key: "accessToken", label: "Access Token", placeholder: "sbp_...", type: "password" },
    ],
  },
  {
    id: "custom",
    name: "Custom MCP Server",
    description: "Connect any MCP-compatible server",
    urlTemplate: (url: string) => url,
    transport: "http" as const,
    fields: [
      { key: "url", label: "Server URL", placeholder: "https://your-mcp-server.com/mcp" },
      { key: "accessToken", label: "Authorization Header (optional)", placeholder: "Bearer ...", type: "password" },
    ],
  },
];

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    user?.id ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/onboarding");
    } else if (isLoaded && user && githubStatus !== undefined && !githubStatus?.connected) {
      router.push("/onboarding");
    }
  }, [isLoaded, user, githubStatus, router]);

  if (!mounted || !isLoaded || !user || githubStatus === undefined) {
    return (
      <div className="min-h-screen bg-[#131314] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-[#52525b]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  return <SettingsPageInner />;
}

function SettingsPageInner() {
  const { user } = useUser();

  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const connectedRepos = useQuery(
    api.users.getConnectedRepos,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const updateRepoSettings = useMutation(api.users.updateRepoSettings);

  // MCP server management
  const userMcpServers = useQuery(
    api.mcpServers.getUserMcpServers,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const addMcpServer = useMutation(api.mcpServers.addMcpServer);
  const removeMcpServer = useMutation(api.mcpServers.removeMcpServer);
  const tamboMcpServers = useTamboMcpServers();

  const [mcpAddOpen, setMcpAddOpen] = useState(false);
  const [mcpTemplate, setMcpTemplate] = useState<string | null>(null);
  const [mcpFields, setMcpFields] = useState<Record<string, string>>({});
  const [mcpSaving, setMcpSaving] = useState(false);

  const handleAddMcpServer = useCallback(async () => {
    if (!user?.id || !mcpTemplate) return;
    const template = MCP_TEMPLATES.find((t) => t.id === mcpTemplate);
    if (!template) return;

    setMcpSaving(true);
    try {
      let url: string;
      let label: string;

      if (mcpTemplate === "supabase") {
        url = template.urlTemplate(mcpFields.projectRef || "");
        label = `Supabase (${mcpFields.projectRef?.slice(0, 8) || "project"})`;
      } else {
        url = mcpFields.url || "";
        label = new URL(url).hostname;
      }

      await addMcpServer({
        clerkId: user.id,
        provider: mcpTemplate,
        label,
        url,
        transport: template.transport,
        authHeader: mcpFields.accessToken
          ? (mcpFields.accessToken.startsWith("Bearer ") ? mcpFields.accessToken : `Bearer ${mcpFields.accessToken}`)
          : undefined,
      });

      setMcpAddOpen(false);
      setMcpTemplate(null);
      setMcpFields({});
    } catch (error) {
      console.error("Failed to add MCP server:", error);
    } finally {
      setMcpSaving(false);
    }
  }, [user?.id, mcpTemplate, mcpFields, addMcpServer]);

  const handleRemoveMcpServer = useCallback(async (id: Id<"userMcpServers">, label: string) => {
    if (!confirm(`Remove "${label}" MCP server?`)) return;

    try {
      await removeMcpServer({ id });
    } catch (error) {
      console.error("Failed to remove MCP server:", error);
    }
  }, [removeMcpServer]);

  const handleToggleAutoReview = async (repoId: Id<"repos">, currentValue: boolean) => {
    try {
      await updateRepoSettings({ repoId, autoReview: !currentValue });
    } catch (error) {
      console.error("Failed to update repo settings:", error);
    }
  };

  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "repochat-dev";

  return (
    <div className="min-h-screen bg-[#131314] text-[#e4e4e7]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-lg text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#1e1e20] transition-colors"
          >
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-xl font-medium">Settings</h1>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-medium text-[#71717a] uppercase tracking-wider mb-4">GitHub Connection</h2>
            <div className="bg-[#1e1e20] border border-[#2a2a2d] rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#2a2a2d] flex items-center justify-center">
                    <GitHubIcon />
                  </div>
                  <div>
                    <div className="font-medium">@{githubStatus?.github?.username}</div>
                    <div className="text-sm text-[#71717a]">Connected via GitHub App</div>
                  </div>
                </div>
                <a
                  href={`https://github.com/apps/${githubAppSlug}/installations/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-[#2a2a2d] hover:bg-[#3a3a3d] rounded-lg transition-colors"
                >
                  <span>Manage</span>
                  <ExternalLinkIcon />
                </a>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-[#71717a] uppercase tracking-wider">Repositories</h2>
              <a
                href={`https://github.com/apps/${githubAppSlug}/installations/new`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#2a2a2d] hover:bg-[#3a3a3d] rounded-lg transition-colors"
              >
                <span>Add repos</span>
                <ExternalLinkIcon />
              </a>
            </div>

            {connectedRepos && connectedRepos.length > 0 ? (
              <div className="space-y-2">
                {connectedRepos.map((repo) => (
                  <div
                    key={repo._id}
                    className="bg-[#1e1e20] border border-[#2a2a2d] rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#2a2a2d] flex items-center justify-center text-[#71717a]">
                          <GitHubIcon />
                        </div>
                        <div>
                          <div className="font-medium">{repo.name}</div>
                          <div className="text-xs text-[#52525b]">
                            {repo.isPrivate ? "Private" : "Public"}
                            {repo.indexedBranches && repo.indexedBranches.length > 0 && (
                              <span> · {repo.indexedBranches.length} branch{repo.indexedBranches.length !== 1 ? "es" : ""} indexed</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-sm text-[#71717a]">Auto-review PRs</span>
                          <button
                            onClick={() => handleToggleAutoReview(repo._id, repo.autoReview || false)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              repo.autoReview ? "bg-[#3b82f6]" : "bg-[#2a2a2d]"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                repo.autoReview ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </label>
                      </div>
                    </div>

                    {repo.lastIndexedAt && (
                      <div className="mt-3 pt-3 border-t border-[#2a2a2d] flex items-center justify-between">
                        <span className="text-xs text-[#52525b]">
                          Last indexed: {new Date(repo.lastIndexedAt).toLocaleDateString()}
                        </span>
                        <button className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#e4e4e7] transition-colors">
                          <RefreshIcon />
                          Re-index
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1e1e20] border border-[#2a2a2d] rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[#2a2a2d] flex items-center justify-center mx-auto mb-4">
                  <GitHubIcon />
                </div>
                <h3 className="font-medium mb-2">No repositories connected</h3>
                <p className="text-sm text-[#71717a] mb-4">
                  Connect repositories to enable code review and analysis
                </p>
                <a
                  href={`https://github.com/apps/${githubAppSlug}/installations/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#e4e4e7] text-[#131314] hover:bg-[#d4d4d7] rounded-lg transition-colors"
                >
                  <span>Connect repositories</span>
                  <ExternalLinkIcon />
                </a>
              </div>
            )}
          </section>

          {/* MCP Integrations */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-[#71717a] uppercase tracking-wider">MCP Integrations</h2>
              <button
                onClick={() => { setMcpAddOpen(!mcpAddOpen); setMcpTemplate(null); setMcpFields({}); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#2a2a2d] hover:bg-[#3a3a3d] rounded-lg transition-colors"
              >
                <span>{mcpAddOpen ? "Cancel" : "Add integration"}</span>
              </button>
            </div>

            {/* Add MCP form */}
            {mcpAddOpen && (
              <div className="bg-[#1e1e20] border border-[#2a2a2d] rounded-xl p-5 mb-4">
                {!mcpTemplate ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[#71717a] mb-3">Choose an integration:</p>
                    {MCP_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setMcpTemplate(t.id)}
                        className="w-full text-left p-4 bg-[#131314] border border-[#2a2a2d] rounded-lg hover:border-[#3a3a3d] transition-colors"
                      >
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-[#52525b] mt-0.5">{t.description}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setMcpTemplate(null); setMcpFields({}); }}
                        className="text-xs text-[#71717a] hover:text-[#e4e4e7]"
                      >
                        &larr; Back
                      </button>
                      <span className="text-sm font-medium">
                        {MCP_TEMPLATES.find((t) => t.id === mcpTemplate)?.name}
                      </span>
                    </div>

                    {MCP_TEMPLATES.find((t) => t.id === mcpTemplate)?.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs text-[#71717a] mb-1.5">{field.label}</label>
                        <input
                          type={field.type || "text"}
                          placeholder={field.placeholder}
                          value={mcpFields[field.key] || ""}
                          onChange={(e) => setMcpFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm bg-[#131314] border border-[#2a2a2d] rounded-lg text-[#e4e4e7] placeholder:text-[#52525b] focus:outline-none focus:border-[#3b82f6]"
                        />
                      </div>
                    ))}

                    <button
                      onClick={handleAddMcpServer}
                      disabled={mcpSaving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {mcpSaving ? "Connecting..." : "Connect"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Connected MCP servers */}
            {userMcpServers && userMcpServers.length > 0 ? (
              <div className="space-y-2">
                {userMcpServers.map((server) => {
                  const tamboServer = tamboMcpServers.find(
                    (s) => s.serverKey === server.provider
                  );
                  const isConnected = !!tamboServer?.client;
                  const hasError = tamboServer && "connectionError" in tamboServer && !!tamboServer.connectionError;
                  const errorMsg = hasError
                    ? (tamboServer.connectionError as Error).message
                    : null;

                  return (
                    <div
                      key={server._id}
                      className="bg-[#1e1e20] border border-[#2a2a2d] rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#2a2a2d] flex items-center justify-center text-[#71717a]">
                            <PlugIcon />
                          </div>
                          <div>
                            <div className="font-medium">{server.label}</div>
                            <div className="text-xs text-[#52525b]">
                              {server.provider} · {server.transport.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isConnected ? (
                            <span className="flex items-center gap-1.5 text-xs text-[#52525b]">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Connected
                            </span>
                          ) : hasError ? (
                            <span className="flex items-center gap-1.5 text-xs text-amber-400 max-w-[180px] truncate" title={errorMsg || undefined}>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              {errorMsg || "Connection failed"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-[#52525b]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#52525b] animate-pulse" />
                              Connecting...
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveMcpServer(server._id, server.label)}
                            className="p-1.5 text-[#52525b] hover:text-[#ef4444] transition-colors"
                            title="Remove"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !mcpAddOpen ? (
              <div className="bg-[#1e1e20] border border-[#2a2a2d] rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[#2a2a2d] flex items-center justify-center mx-auto mb-4">
                  <PlugIcon />
                </div>
                <h3 className="font-medium mb-2">No integrations connected</h3>
                <p className="text-sm text-[#71717a] mb-4">
                  Connect MCP servers to give the AI access to your databases, tools, and services
                </p>
                <button
                  onClick={() => setMcpAddOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#e4e4e7] text-[#131314] hover:bg-[#d4d4d7] rounded-lg transition-colors"
                >
                  Add your first integration
                </button>
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="text-sm font-medium text-[#71717a] uppercase tracking-wider mb-4">Auto Review Settings</h2>
            <div className="bg-[#1e1e20] border border-[#2a2a2d] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Review draft PRs</div>
                  <div className="text-sm text-[#52525b]">Run automated reviews on draft pull requests</div>
                </div>
                <button className="relative w-10 h-5 rounded-full bg-[#2a2a2d] transition-colors">
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform translate-x-0" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Security-only mode</div>
                  <div className="text-sm text-[#52525b]">Only flag security issues, skip style suggestions</div>
                </div>
                <button className="relative w-10 h-5 rounded-full bg-[#2a2a2d] transition-colors">
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform translate-x-0" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto-approve safe PRs</div>
                  <div className="text-sm text-[#52525b]">Automatically approve PRs with no issues found</div>
                </div>
                <button className="relative w-10 h-5 rounded-full bg-[#2a2a2d] transition-colors">
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform translate-x-0" />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium text-[#71717a] uppercase tracking-wider mb-4">Danger Zone</h2>
            <div className="bg-[#1e1e20] border border-[#ef4444]/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#ef4444]">Disconnect GitHub</div>
                  <div className="text-sm text-[#52525b]">Remove GitHub connection and all repo data</div>
                </div>
                <button className="px-4 py-2 text-sm border border-[#ef4444]/50 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors">
                  Disconnect
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
