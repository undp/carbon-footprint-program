import { beforeEach, describe, expect, it } from "vitest";
import type { GetMeResponse } from "@repo/types";
import { useUserStore } from "./userStore";

// A fully-typed GetMeResponse fixture. The store treats it opaquely (it only
// stores/returns the reference), so the field values are representative, not
// asserted — `role` is a SystemRole string literal, avoiding a @repo/database
// import that apps/web doesn't depend on.
const buildUser = (): NonNullable<GetMeResponse> => ({
  id: "1",
  uuid: "00000000-0000-0000-0000-000000000000",
  idpUserId: null,
  idpName: null,
  email: "ada@example.cl",
  role: "USER",
  countryJobPositionId: null,
  firstName: "Ada",
  lastName: "Lovelace",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: null,
  createdById: null,
  updatedById: null,
  termsAccepted: true,
  termsAcceptedAt: null,
  lastAccessAt: null,
  onboardingsCompleted: [],
});

// The store is a module singleton; reset to its initial shape before each test
// so cases don't leak into each other.
beforeEach(() => {
  useUserStore.setState({ user: null, isLoading: false, error: null });
});

describe("useUserStore", () => {
  it("starts empty", () => {
    const state = useUserStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("setUser stores the user and clears any prior error", () => {
    useUserStore.setState({ error: new Error("stale") });
    const user = buildUser();

    useUserStore.getState().setUser(user);

    expect(useUserStore.getState().user).toBe(user);
    expect(useUserStore.getState().error).toBeNull();
  });

  it("setUser(null) clears the user", () => {
    useUserStore.getState().setUser(buildUser());

    useUserStore.getState().setUser(null);

    expect(useUserStore.getState().user).toBeNull();
  });

  it("setLoading toggles the loading flag", () => {
    useUserStore.getState().setLoading(true);
    expect(useUserStore.getState().isLoading).toBe(true);

    useUserStore.getState().setLoading(false);
    expect(useUserStore.getState().isLoading).toBe(false);
  });

  it("setError stores the error and stops loading", () => {
    useUserStore.setState({ isLoading: true });
    const error = new Error("boom");

    useUserStore.getState().setError(error);

    expect(useUserStore.getState().error).toBe(error);
    expect(useUserStore.getState().isLoading).toBe(false);
  });

  it("setError(null) clears the error", () => {
    useUserStore.getState().setError(new Error("boom"));

    useUserStore.getState().setError(null);

    expect(useUserStore.getState().error).toBeNull();
  });

  it("clear resets user, loading and error", () => {
    useUserStore.setState({
      user: buildUser(),
      isLoading: true,
      error: new Error("boom"),
    });

    useUserStore.getState().clear();

    expect(useUserStore.getState()).toMatchObject({
      user: null,
      isLoading: false,
      error: null,
    });
  });
});
