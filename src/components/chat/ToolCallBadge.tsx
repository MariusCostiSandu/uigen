"use client";

import { Loader2 } from "lucide-react";
import type { UIToolInvocation } from "ai";

function basename(path: string): string {
  return path.split("/").pop() || path;
}

export function getToolLabel(toolName: string, args: unknown): string {
  if (toolName === "str_replace_editor") {
    const { command, path } = (args ?? {}) as { command?: string; path?: string };
    const name = basename(path ?? "");
    switch (command) {
      case "create":     return `Creating ${name}`;
      case "str_replace":
      case "insert":     return `Editing ${name}`;
      case "view":       return `Viewing ${name}`;
      default:           return name ? `Editing ${name}` : toolName;
    }
  }

  if (toolName === "file_manager") {
    const { command, path, new_path } = (args ?? {}) as {
      command?: string;
      path?: string;
      new_path?: string;
    };
    const name = basename(path ?? "");
    if (command === "delete") return `Deleting ${name}`;
    if (command === "rename" && new_path) return `Renaming ${name} → ${basename(new_path)}`;
  }

  return toolName;
}

interface ToolCallBadgeProps {
  tool: UIToolInvocation<any>;
}

export function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  const label = getToolLabel(tool.toolName, tool.args);
  const done = tool.state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
