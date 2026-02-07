"use client";

import type { messageVariants } from "@/components/tambo/message";
import {
  MessageInput,
  MessageInputContextAttachButton,
  MessageInputError,
  MessageInputFileButton,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from "@/components/tambo/message-input";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import { ThreadContainer } from "./thread-container";
import {
  ThreadContent,
  ThreadContentMessages,
} from "@/components/tambo/thread-content";
import type { Suggestion } from "@tambo-ai/react";
import {
  useTamboSuggestions,
  useTamboThread,
  useTamboGenerationStage,
  GenerationStage,
} from "@tambo-ai/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

function GenerationStageIndicator() {
  const { generationStage } = useTamboGenerationStage();

  if (!generationStage || generationStage === GenerationStage.COMPLETE || generationStage === GenerationStage.IDLE) {
    return null;
  }

  const stageMessages: Record<string, string> = {
    [GenerationStage.CHOOSING_COMPONENT]: "Thinking",
    [GenerationStage.FETCHING_CONTEXT]: "Analyzing",
    [GenerationStage.HYDRATING_COMPONENT]: "Generating",
    [GenerationStage.STREAMING_RESPONSE]: "Writing",
    [GenerationStage.ERROR]: "Error",
  };

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <div className="flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
      </div>
      <span className="text-[13px] text-muted-foreground">{stageMessages[generationStage] || "Processing"}</span>
    </div>
  );
}

function SuggestionsBar({ initialSuggestions }: { initialSuggestions: Suggestion[] }) {
  const { thread } = useTamboThread();
  const {
    suggestions: generatedSuggestions,
    accept,
    generateResult: { isPending: isGenerating }
  } = useTamboSuggestions({ maxSuggestions: 4 });

  const suggestions = React.useMemo(() => {
    if (!thread?.messages?.length || thread.messages.length <= 2) {
      return initialSuggestions;
    }
    return generatedSuggestions.length > 0 ? generatedSuggestions : initialSuggestions;
  }, [thread?.messages?.length, generatedSuggestions, initialSuggestions]);

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 pt-4">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          onClick={() => accept({ suggestion })}
          disabled={isGenerating}
          className={cn(
            "px-4 py-2 text-[13px] rounded-2xl transition-colors duration-150",
            "bg-secondary text-muted-foreground",
            "hover:bg-accent hover:text-foreground",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {suggestion.title}
        </button>
      ))}
    </div>
  );
}

export interface MessageThreadFullProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: VariantProps<typeof messageVariants>["variant"];
}

export interface MessageThreadFullExtendedProps extends MessageThreadFullProps {
  initialSuggestions?: Suggestion[];
  placeholder?: string;
}

export const MessageThreadFull = React.forwardRef<
  HTMLDivElement,
  MessageThreadFullExtendedProps
>(({ className, variant, initialSuggestions, placeholder, ...props }, ref) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { thread } = useTamboThread();

  const defaultSuggestions: Suggestion[] = [
    {
      id: "review-pr",
      title: "Review a PR",
      detailedSuggestion: "Review PR #123 on owner/repo",
      messageId: "review-pr",
    },
    {
      id: "security",
      title: "Security check",
      detailedSuggestion: "Check this PR for security vulnerabilities",
      messageId: "security",
    },
    {
      id: "explain",
      title: "Explain code",
      detailedSuggestion: "Explain how this code works",
      messageId: "explain",
    },
    {
      id: "analyze",
      title: "Analyze changes",
      detailedSuggestion: "Analyze the changes in this PR",
      messageId: "analyze",
    },
  ];

  const suggestions = initialSuggestions || defaultSuggestions;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages?.length]);

  return (
    <ThreadContainer
      ref={ref}
      disableSidebarSpacing
      className={cn("flex flex-col h-full bg-background", className)}
      {...props}
    >
      <ScrollableMessageContainer className="flex-1 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <ThreadContent variant={variant}>
            <ThreadContentMessages />
          </ThreadContent>
          <div ref={messagesEndRef} />
        </div>
      </ScrollableMessageContainer>

      <GenerationStageIndicator />

      <div className="bg-background pb-6 px-4">
        <div className="max-w-3xl mx-auto">
          <MessageInput variant="solid">
            <MessageInputTextarea
              placeholder={placeholder || "Ask about a PR, review code, or paste a GitHub link..."}
            />
            <MessageInputToolbar>
              <MessageInputFileButton />
              <MessageInputContextAttachButton />
              <MessageInputSubmitButton />
            </MessageInputToolbar>
            <MessageInputError />
          </MessageInput>

          <SuggestionsBar initialSuggestions={suggestions} />

          <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
            RepoChat can review PRs, analyze code, and take GitHub actions
          </p>
        </div>
      </div>
    </ThreadContainer>
  );
});
MessageThreadFull.displayName = "MessageThreadFull";
