"use client";

import type { messageVariants } from "@/components/tambo/message";
import {
  MessageInput,
  MessageInputError,
  MessageInputFileButton,
  MessageInputMcpConfigButton,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from "@/components/tambo/message-input";
import {
  MessageSuggestions,
  MessageSuggestionsList,
} from "@/components/tambo/message-suggestions";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import { ThreadContainer } from "./thread-container";
import {
  ThreadContent,
  ThreadContentMessages,
} from "@/components/tambo/thread-content";
import type { Suggestion } from "@tambo-ai/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * Props for the MessageThreadFull component
 */
export interface MessageThreadFullProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Controls the visual styling of messages in the thread.
   * Possible values include: "default", "compact", etc.
   * These values are defined in messageVariants from "@/components/tambo/message".
   * @example variant="compact"
   */
  variant?: VariantProps<typeof messageVariants>["variant"];
}

/**
 * Props for the MessageThreadFull component
 */
export interface MessageThreadFullExtendedProps extends MessageThreadFullProps {
  /**
   * Suggestions to display when thread is empty.
   * If not provided, uses default PR review suggestions.
   */
  initialSuggestions?: Suggestion[];
  /**
   * Placeholder text for the input textarea.
   */
  placeholder?: string;
}

/**
 * A full-screen chat thread component with input and suggestions.
 * Simplified version without sidebar - sidebar is handled by parent layout.
 */
export const MessageThreadFull = React.forwardRef<
  HTMLDivElement,
  MessageThreadFullExtendedProps
>(({ className, variant, initialSuggestions, placeholder, ...props }, ref) => {
  const defaultSuggestions: Suggestion[] = [
    {
      id: "suggestion-1",
      title: "Review a PR",
      detailedSuggestion: "Review PR #123 on owner/repo",
      messageId: "review-pr",
    },
    {
      id: "suggestion-2",
      title: "Find code",
      detailedSuggestion: "Search for authentication logic in the codebase",
      messageId: "find-code",
    },
    {
      id: "suggestion-3",
      title: "Explain code",
      detailedSuggestion: "Explain how the API routes work",
      messageId: "explain-code",
    },
  ];

  const suggestions = initialSuggestions || defaultSuggestions;

  return (
    <ThreadContainer
      ref={ref}
      disableSidebarSpacing
      className={className}
      {...props}
    >
      <ScrollableMessageContainer className="p-4">
        <ThreadContent variant={variant}>
          <ThreadContentMessages />
        </ThreadContent>
      </ScrollableMessageContainer>

      {/* Message input */}
      <div className="px-4 pb-4">
        <MessageInput>
          <MessageInputTextarea placeholder={placeholder || "Ask about a PR or paste a link..."} />
          <MessageInputToolbar>
            <MessageInputFileButton className="rounded-full" />
            <MessageInputMcpConfigButton className="rounded-full" />
            <MessageInputSubmitButton className="rounded-full" />
          </MessageInputToolbar>
          <MessageInputError />
        </MessageInput>

        {/* Suggestions */}
        <MessageSuggestions initialSuggestions={suggestions}>
          <MessageSuggestionsList className="mt-3" />
        </MessageSuggestions>
      </div>
    </ThreadContainer>
  );
});
MessageThreadFull.displayName = "MessageThreadFull";
