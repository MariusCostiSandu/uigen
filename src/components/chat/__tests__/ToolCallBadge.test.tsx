import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getToolLabel ---

test("str_replace_editor create returns Creating label", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("str_replace_editor str_replace returns Editing label", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("str_replace_editor insert returns Editing label", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("str_replace_editor view returns Viewing label", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing App.jsx");
});

test("str_replace_editor extracts filename from nested path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/Button.tsx" })).toBe("Creating Button.tsx");
});

test("file_manager delete returns Deleting label", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting App.jsx");
});

test("file_manager rename returns Renaming label", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/App.jsx", new_path: "/NewApp.jsx" })).toBe("Renaming App.jsx → NewApp.jsx");
});

test("unknown tool returns toolName", () => {
  expect(getToolLabel("some_other_tool", { command: "run" })).toBe("some_other_tool");
});

// --- ToolCallBadge rendering ---

test("ToolCallBadge shows label text", () => {
  const tool = {
    state: "call",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
  } as ToolInvocation;

  render(<ToolCallBadge tool={tool} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolCallBadge shows spinner when in progress", () => {
  const tool = {
    state: "call",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/App.jsx" },
  } as ToolInvocation;

  const { container } = render(<ToolCallBadge tool={tool} />);
  expect(container.querySelector(".animate-spin")).toBeTruthy();
});

test("ToolCallBadge shows green dot when done", () => {
  const tool = {
    state: "result",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/App.jsx" },
    result: "ok",
  } as ToolInvocation;

  const { container } = render(<ToolCallBadge tool={tool} />);
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows file_manager rename label", () => {
  const tool = {
    state: "result",
    toolCallId: "2",
    toolName: "file_manager",
    args: { command: "rename", path: "/OldName.tsx", new_path: "/NewName.tsx" },
    result: { success: true },
  } as ToolInvocation;

  render(<ToolCallBadge tool={tool} />);
  expect(screen.getByText("Renaming OldName.tsx → NewName.tsx")).toBeDefined();
});
