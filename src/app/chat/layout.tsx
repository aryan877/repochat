"use client";

import { ThreadListProvider } from "./thread-list-provider";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ThreadListProvider>{children}</ThreadListProvider>;
}
