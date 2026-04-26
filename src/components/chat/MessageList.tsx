"use client";

import { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallBadge } from "./ToolCallBadge";

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-5 shadow-md shadow-blue-200">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <p className="text-neutral-800 font-semibold text-base mb-1.5">Generate React components with AI</p>
        <p className="text-neutral-400 text-sm max-w-[260px] leading-relaxed">Describe what you want to build and I'll write the code</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-5">
      <div className="space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id || message.content}
            className={cn(
              "flex items-end gap-2.5",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 mb-0.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center shadow-sm">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            )}

            <div className={cn(
              "flex flex-col gap-1 max-w-[82%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-200"
                  : "bg-white text-neutral-800 border border-neutral-100 rounded-bl-sm shadow-sm"
              )}>
                {message.parts ? (
                  <>
                    {message.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case "text":
                          return message.role === "user" ? (
                            <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                          ) : (
                            <MarkdownRenderer
                              key={partIndex}
                              content={part.text}
                              className="prose-sm"
                            />
                          );
                        case "reasoning":
                          return (
                            <div key={partIndex} className="mt-2.5 px-3 py-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide block mb-1">Thinking</span>
                              <span className="text-xs text-neutral-500 leading-relaxed">{part.reasoning}</span>
                            </div>
                          );
                        case "tool-invocation":
                          return <ToolCallBadge key={partIndex} tool={part.toolInvocation} />;
                        case "source":
                          return (
                            <div key={partIndex} className="mt-2 text-xs text-neutral-400">
                              Source: {JSON.stringify(part.source)}
                            </div>
                          );
                        case "step-start":
                          return partIndex > 0 ? <hr key={partIndex} className="my-3 border-neutral-100" /> : null;
                        default:
                          return null;
                      }
                    })}
                    {isLoading &&
                      message.role === "assistant" &&
                      messages.indexOf(message) === messages.length - 1 && (
                        <div className="flex items-center gap-1.5 mt-2 text-neutral-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Generating…</span>
                        </div>
                      )}
                  </>
                ) : message.content ? (
                  message.role === "user" ? (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  ) : (
                    <MarkdownRenderer content={message.content} className="prose-sm" />
                  )
                ) : isLoading &&
                  message.role === "assistant" &&
                  messages.indexOf(message) === messages.length - 1 ? (
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Generating…</span>
                  </div>
                ) : null}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 mb-0.5">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}