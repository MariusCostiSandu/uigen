// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ set: mockCookieSet })),
}));

const { createSession } = await import("../auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  mockCookieSet.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("sets the auth-token cookie", async () => {
  await createSession("user-1", "test@example.com");
  expect(mockCookieSet).toHaveBeenCalledOnce();
  expect(mockCookieSet.mock.calls[0][0]).toBe("auth-token");
});

test("JWT payload contains userId and email", async () => {
  await createSession("user-1", "test@example.com");
  const token = mockCookieSet.mock.calls[0][1];
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("test@example.com");
});

test("cookie is httpOnly with lax sameSite and root path", async () => {
  await createSession("user-1", "test@example.com");
  const options = mockCookieSet.mock.calls[0][2];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("cookie expires approximately 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const expires: Date = mockCookieSet.mock.calls[0][2].expires;
  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
});

test("cookie secure is false outside production", async () => {
  await createSession("user-1", "test@example.com");
  expect(mockCookieSet.mock.calls[0][2].secure).toBe(false);
});

test("cookie secure is true in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  await createSession("user-1", "test@example.com");
  expect(mockCookieSet.mock.calls[0][2].secure).toBe(true);
});
