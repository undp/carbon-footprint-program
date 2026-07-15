import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces";
import { userKeys } from "@/api/query/users/keys";
import { requireRole } from "./requireRole";

// Shared mock fns the `vi.mock` factories below close over. `vi.hoisted` runs
// before the mocked imports are evaluated, so the factories can reference these.
const mocks = vi.hoisted(() => ({
  // `throw redirect(...)` throws an inspectable sentinel instead of the real
  // (router-context-dependent) Redirect object, so each outcome can assert the
  // exact `{ to, search }` the guard passed.
  redirect: vi.fn((opts: unknown) => ({ __redirect: opts })),
  getValidOidcUser: vi.fn(),
  removeUser: vi.fn(),
  ensureQueryData: vi.fn(),
  removeQueries: vi.fn(),
  getApiErrorCode: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/auth/oidcUserManager", () => ({
  getValidOidcUser: mocks.getValidOidcUser,
  oidcUserManager: { removeUser: mocks.removeUser },
}));

vi.mock("@/api/query/client", () => ({
  queryClient: {
    ensureQueryData: mocks.ensureQueryData,
    removeQueries: mocks.removeQueries,
  },
}));

// The import must resolve without pulling in the real `ky` client. The queryFn
// the guard hands to ensureQueryData calls apiClient.get(...).json(), so `get`
// returns a `ky`-like object with a chainable `.json()` for the one test that
// drives ensureQueryData through to that queryFn.
vi.mock("@/api/http", () => ({
  apiClient: { get: mocks.apiGet },
}));

vi.mock("@/utils/getApiErrorMessage", () => ({
  getApiErrorCode: mocks.getApiErrorCode,
}));

const REDIRECT_TO = "/sign-in-test";

// Truthy OIDC session stand-in — the guard only checks it for truthiness, and
// getValidOidcUser is an untyped mock, so a bare object is enough.
const anOidcUser = {};

beforeEach(() => {
  // Reset call history between tests; `clearAllMocks` keeps the `redirect`
  // implementation (unlike `resetAllMocks`), so the sentinel factory survives.
  vi.clearAllMocks();
});

afterEach(() => {
  // Restore any `spyOn` (e.g. the console.error spy) to the real implementation.
  vi.restoreAllMocks();
});

describe("requireRole", () => {
  it("redirects to `redirectTo` when there is no valid OIDC session", async () => {
    mocks.getValidOidcUser.mockResolvedValue(null);

    const guard = requireRole([SystemRole.ADMIN], { redirectTo: REDIRECT_TO });

    await expect(guard()).rejects.toEqual({
      __redirect: { to: REDIRECT_TO },
    });
    // Short-circuits before touching user data.
    expect(mocks.ensureQueryData).not.toHaveBeenCalled();
  });

  it("resolves without throwing when the user's role is allowed", async () => {
    mocks.getValidOidcUser.mockResolvedValue(anOidcUser);
    mocks.ensureQueryData.mockResolvedValue({ role: SystemRole.ADMIN });

    const guard = requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
      redirectTo: REDIRECT_TO,
    });

    await expect(guard()).resolves.toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("loads user data via the queryFn (apiClient.get('users/me')) when uncached", async () => {
    mocks.getValidOidcUser.mockResolvedValue(anOidcUser);
    // Drive ensureQueryData through to the guard's own queryFn instead of
    // short-circuiting, so the queryFn → apiClient.get('users/me').json() wiring
    // is actually exercised.
    mocks.apiGet.mockReturnValue({
      json: () => Promise.resolve({ role: SystemRole.SUPERADMIN }),
    });
    mocks.ensureQueryData.mockImplementation(
      (options: { queryFn: () => Promise<unknown> }) => options.queryFn()
    );

    const guard = requireRole([SystemRole.SUPERADMIN], {
      redirectTo: REDIRECT_TO,
    });

    await expect(guard()).resolves.toBeUndefined();
    expect(mocks.apiGet).toHaveBeenCalledWith("users/me");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects to `redirectTo` when the user's role is not allowed", async () => {
    mocks.getValidOidcUser.mockResolvedValue(anOidcUser);
    mocks.ensureQueryData.mockResolvedValue({ role: SystemRole.USER });

    const guard = requireRole([SystemRole.ADMIN], { redirectTo: REDIRECT_TO });

    await expect(guard()).rejects.toEqual({
      __redirect: { to: REDIRECT_TO },
    });
  });

  it("redirects to `redirectTo` when user data resolves empty (no `me`)", async () => {
    mocks.getValidOidcUser.mockResolvedValue(anOidcUser);
    mocks.ensureQueryData.mockResolvedValue(null);

    const guard = requireRole([SystemRole.ADMIN], { redirectTo: REDIRECT_TO });

    await expect(guard()).rejects.toEqual({
      __redirect: { to: REDIRECT_TO },
    });
  });

  it("cleans up and redirects to Landing with the forwarded auth error code when /users/me fails", async () => {
    mocks.getValidOidcUser.mockResolvedValue(anOidcUser);
    mocks.ensureQueryData.mockRejectedValue(new Error("me failed"));
    mocks.removeUser.mockResolvedValue(undefined);
    mocks.getApiErrorCode.mockReturnValue(
      "EMAIL_REGISTERED_UNDER_DIFFERENT_IDENTITY"
    );

    const guard = requireRole([SystemRole.ADMIN], { redirectTo: REDIRECT_TO });

    await expect(guard()).rejects.toEqual({
      __redirect: {
        to: Routes.LANDING,
        search: {
          authError: "login_failed",
          authErrorCode: "EMAIL_REGISTERED_UNDER_DIFFERENT_IDENTITY",
        },
      },
    });
    // Best-effort local session cleanup ran.
    expect(mocks.removeUser).toHaveBeenCalledTimes(1);
    expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: userKeys.me });
  });

  it("forwards `authErrorCode: undefined` when the error carries no API code", async () => {
    mocks.getValidOidcUser.mockResolvedValue(anOidcUser);
    mocks.ensureQueryData.mockRejectedValue(new Error("me failed"));
    mocks.removeUser.mockResolvedValue(undefined);
    mocks.getApiErrorCode.mockReturnValue(null);

    const guard = requireRole([SystemRole.ADMIN], { redirectTo: REDIRECT_TO });

    await expect(guard()).rejects.toEqual({
      __redirect: {
        to: Routes.LANDING,
        search: { authError: "login_failed", authErrorCode: undefined },
      },
    });
  });

  it("still redirects (logging the failure) when best-effort cleanup itself throws", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.getValidOidcUser.mockResolvedValue(anOidcUser);
    mocks.ensureQueryData.mockRejectedValue(new Error("me failed"));
    mocks.getApiErrorCode.mockReturnValue(null);
    // Cleanup throws — must not block the redirect.
    mocks.removeUser.mockRejectedValue(new Error("cleanup boom"));

    const guard = requireRole([SystemRole.ADMIN], { redirectTo: REDIRECT_TO });

    await expect(guard()).rejects.toEqual({
      __redirect: {
        to: Routes.LANDING,
        search: { authError: "login_failed", authErrorCode: undefined },
      },
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    // removeQueries is never reached because removeUser rejected first.
    expect(mocks.removeQueries).not.toHaveBeenCalled();
  });
});
