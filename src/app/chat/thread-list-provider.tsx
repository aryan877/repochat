"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTamboClient, useTamboThreadList } from "@tambo-ai/react";

export type ThreadItem = {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
};

interface ThreadListContextValue {
  /** Merged thread list (direct-fetched + SDK cache), deduplicated. */
  threads: ThreadItem[];
  /** `true` until the first successful fetch completes. */
  isLoading: boolean;
  /** Re-fetch from both the direct API and the SDK cache. */
  refetch: () => void;
  /** Optimistically remove a thread from the local list. */
  removeThread: (threadId: string) => void;
  /** Update the local cache after a direct-fetch (e.g. from delete). */
  updateDirectThreads: (updater: (prev: ThreadItem[]) => ThreadItem[]) => void;
}

const ThreadListContext = createContext<ThreadListContextValue | null>(null);

export function useThreadList() {
  const ctx = useContext(ThreadListContext);
  if (!ctx) throw new Error("useThreadList must be used within ThreadListProvider");
  return ctx;
}

export function ThreadListProvider({ children }: { children: React.ReactNode }) {
  const client = useTamboClient();
  const threadListResult = useTamboThreadList();

  // Direct-fetched threads (bypasses SDK race condition with session tokens)
  const [directThreads, setDirectThreads] = useState<ThreadItem[] | null>(null);
  const fetchedRef = useRef(false);

  const fetchThreads = useCallback(async () => {
    if (!client.bearer) return;
    try {
      const project = await client.beta.projects.getCurrent();
      const result = await client.beta.threads.list(project.id, {});
      setDirectThreads((result.items ?? []) as ThreadItem[]);
    } catch {
      // fall back to SDK data
    }
  }, [client]);

  // Initial fetch — only once when bearer becomes available
  useEffect(() => {
    if (!client.bearer || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchThreads();
  }, [client.bearer, fetchThreads]);

  // Merge direct-fetched + SDK cache, preferring SDK (has latest state after sends)
  const sdkThreads = threadListResult.data;
  const lastStableRef = useRef<ThreadItem[]>([]);

  const threads = useMemo(() => {
    const sdkItems =
      sdkThreads && typeof sdkThreads !== "string" && sdkThreads.items
        ? (sdkThreads.items as ThreadItem[])
        : [];
    const directItems = directThreads ?? [];
    const byId = new Map<string, ThreadItem>();
    for (const t of directItems) byId.set(t.id, t);
    for (const t of sdkItems) byId.set(t.id, t);
    const merged = Array.from(byId.values());
    if (merged.length > 0) lastStableRef.current = merged;
    return lastStableRef.current;
  }, [sdkThreads, directThreads]);

  const isLoading = directThreads === null && threads.length === 0;

  const refetch = useCallback(() => {
    fetchThreads();
    threadListResult.refetch();
  }, [fetchThreads, threadListResult]);

  const removeThread = useCallback((threadId: string) => {
    setDirectThreads((prev) => prev?.filter((t) => t.id !== threadId) ?? null);
  }, []);

  const updateDirectThreads = useCallback(
    (updater: (prev: ThreadItem[]) => ThreadItem[]) => {
      setDirectThreads((prev) => updater(prev ?? []));
    },
    [],
  );

  const value = useMemo<ThreadListContextValue>(
    () => ({ threads, isLoading, refetch, removeThread, updateDirectThreads }),
    [threads, isLoading, refetch, removeThread, updateDirectThreads],
  );

  return (
    <ThreadListContext.Provider value={value}>
      {children}
    </ThreadListContext.Provider>
  );
}
