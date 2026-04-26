import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { useAuth } from "../use-auth";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (input: unknown) => mockCreateProject(input),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "proj-123" });
});

describe("useAuth", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("calls signInAction with provided credentials", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("returns the result from signInAction", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuth());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("does not navigate or create projects on failure", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    test("sets isLoading to true while the action is in flight", async () => {
      let resolveSignIn!: (v: { success: boolean }) => void;
      mockSignInAction.mockReturnValueOnce(
        new Promise<{ success: boolean }>((resolve) => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignIn({ success: false }); });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => { await result.current.signIn("test@example.com", "password123"); })
      ).rejects.toThrow("Network error");

      expect(result.current.isLoading).toBe(false);
    });

    describe("post sign-in routing", () => {
      test("migrates anonymous work into a new project and redirects", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue({
          messages: [{ role: "user", content: "make a button" }],
          fileSystemData: { "/App.jsx": "export default () => <button/>" },
        });
        mockCreateProject.mockResolvedValue({ id: "anon-proj" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: "user", content: "make a button" }],
            data: { "/App.jsx": "export default () => <button/>" },
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalledOnce();
        expect(mockGetProjects).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/anon-proj");
      });

      test("skips anon migration when messages array is empty", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: { "/": {} } });
        mockGetProjects.mockResolvedValue([{ id: "existing-proj" }]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockClearAnonWork).not.toHaveBeenCalled();
        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-proj");
      });

      test("redirects to the most recent project when there is no anonymous work", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([{ id: "recent-proj" }, { id: "older-proj" }]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/recent-proj");
      });

      test("creates a blank project and redirects when user has no existing projects", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "new-proj" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
        expect(mockPush).toHaveBeenCalledWith("/new-proj");
      });
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with provided credentials", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    });

    test("returns the result from signUpAction", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });
      const { result } = renderHook(() => useAuth());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    });

    test("does not navigate or create projects on failure", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    test("sets isLoading to true while the action is in flight", async () => {
      let resolveSignUp!: (v: { success: boolean }) => void;
      mockSignUpAction.mockReturnValueOnce(
        new Promise<{ success: boolean }>((resolve) => { resolveSignUp = resolve; })
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signUp("new@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignUp({ success: false }); });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Server error"));
      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => { await result.current.signUp("new@example.com", "password123"); })
      ).rejects.toThrow("Server error");

      expect(result.current.isLoading).toBe(false);
    });

    describe("post sign-up routing", () => {
      test("migrates anonymous work into a new project and redirects", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue({
          messages: [{ role: "user", content: "create a form" }],
          fileSystemData: { "/App.jsx": "<Form/>" },
        });
        mockCreateProject.mockResolvedValue({ id: "anon-signup-proj" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: "user", content: "create a form" }],
            data: { "/App.jsx": "<Form/>" },
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalledOnce();
        expect(mockGetProjects).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/anon-signup-proj");
      });

      test("redirects to the most recent project when there is no anonymous work", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([{ id: "user-proj-1" }, { id: "user-proj-2" }]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/user-proj-1");
      });

      test("creates a blank project and redirects when user has no existing projects", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "fresh-proj" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
        expect(mockPush).toHaveBeenCalledWith("/fresh-proj");
      });
    });
  });
});
