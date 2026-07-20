import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { OnboardingKeys } from "@repo/types";
import { useMergeOnboardingCompletionsOnLogin } from "./useMergeOnboardingCompletionsOnLogin";

// Stable mock identities the hoisted factories below can close over.
const {
  useAuthMock,
  useMeMock,
  postMock,
  invalidateMock,
  readLocalMock,
  clearLocalMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useMeMock: vi.fn(),
  postMock: vi.fn(),
  invalidateMock: vi.fn(),
  readLocalMock: vi.fn(),
  clearLocalMock: vi.fn(),
}));

vi.mock("react-oidc-context", () => ({ useAuth: useAuthMock }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateMock }),
}));
vi.mock("@/api/http", () => ({ apiClient: { post: postMock } }));
vi.mock("@/api/query", () => ({
  useMe: useMeMock,
  onboardingCompletePath: (key: string) =>
    `users/me/onboardings/${key}/complete`,
}));
vi.mock("@/utils/onboardingCompletionStorage", () => ({
  readLocalCompletions: readLocalMock,
  clearLocalKeys: clearLocalMock,
}));

const PUSHED = OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE; // POST will resolve
const REJECTED = OnboardingKeys.WELCOME_HOME; // POST will reject

const setup = (opts: {
  isAuthenticated: boolean;
  meSuccess?: boolean;
  onboardingsCompleted?: string[];
  local?: string[];
}) => {
  useAuthMock.mockReturnValue({ isAuthenticated: opts.isAuthenticated });
  useMeMock.mockReturnValue({
    isSuccess: opts.meSuccess ?? true,
    data: { onboardingsCompleted: opts.onboardingsCompleted ?? [] },
  });
  readLocalMock.mockReturnValue(new Set(opts.local ?? []));
};

beforeEach(() => {
  vi.clearAllMocks();
  invalidateMock.mockResolvedValue(undefined);
});

describe("useMergeOnboardingCompletionsOnLogin", () => {
  it("does nothing while anonymous", () => {
    setup({ isAuthenticated: false, local: [PUSHED] });

    renderHook(() => useMergeOnboardingCompletionsOnLogin());

    expect(postMock).not.toHaveBeenCalled();
    expect(clearLocalMock).not.toHaveBeenCalled();
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("prunes keys already in the DB without POSTing", async () => {
    setup({
      isAuthenticated: true,
      onboardingsCompleted: [PUSHED],
      local: [PUSHED],
    });

    renderHook(() => useMergeOnboardingCompletionsOnLogin());

    await waitFor(() => expect(clearLocalMock).toHaveBeenCalled());
    expect(postMock).not.toHaveBeenCalled();
    expect(clearLocalMock).toHaveBeenCalledWith([PUSHED]);
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("pushes local-only keys, prunes only the fulfilled ones, and invalidates /me once", async () => {
    postMock.mockImplementation((url: string) =>
      url.includes(PUSHED)
        ? Promise.resolve()
        : Promise.reject(new Error("500 — e.g. a rolled-back API"))
    );
    setup({
      isAuthenticated: true,
      onboardingsCompleted: [],
      local: [PUSHED, REJECTED],
    });

    renderHook(() => useMergeOnboardingCompletionsOnLogin());

    await waitFor(() => expect(clearLocalMock).toHaveBeenCalled());
    expect(postMock).toHaveBeenCalledTimes(2);
    // The fulfilled key is pruned; the rejected one stays local for next login.
    expect(clearLocalMock).toHaveBeenCalledWith([PUSHED]);
    expect(invalidateMock).toHaveBeenCalledTimes(1);
  });
});
