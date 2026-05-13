# Frontend Auth Recovery

This document covers how the web app recovers when **MSAL authentication succeeds but the follow-up `GET /users/me` request fails**, leaving the user in a half-authenticated state.

For the API-side authentication providers and token validation, see [Authentication](./authentication.md).
For the role-based access control model, see [RBAC and Authorization](./rbac.md).
For the MSAL tenant and app registration setup, see [MSAL & Easy Auth Setup](../infrastructure/MSAL-EasyAuth-Setup.md).

---

## Context

The frontend has two independent sessions that must be in sync for the app to work:

1. **MSAL session** — the OAuth/OIDC session managed by `@azure/msal-browser`. Created after a successful login against Azure Entra ID.
2. **App user session** — the database user record returned by `GET /users/me`. Populated by `useInitializeUser` and the `userResolvePlugin` on the API side, then stored in the Zustand `userStore`.

These two sessions are created by separate calls. MSAL can succeed without the app user being available — for example if the API is down, returns a 5xx, the user was revoked on the backend, the network blips mid-init, or a SAS/identity-related dependency fails.

---

## Previous behavior (the risk)

Before this change, when `/users/me` failed after a successful MSAL login:

- The user remained on the protected route they were navigating to (or on the post-login destination).
- React Query held the error in cache. Subsequent navigations replayed the cached error instead of retrying.
- There was no user-facing feedback — the screen would render broken or blank, indistinguishable from a real auth bug.
- There was no way back to a clean state without manually clearing storage and reloading.
- Two entry points exhibited the same problem: the top-level `AuthProvider` mount (regular login flow), and the `requireRole` route guard (deep-link flow that bypasses React effects).

The user was effectively stranded: authenticated to Azure, unknown to the app, with no recovery path.

---

## Impact

- **UX**: blank/broken screens, no path back to Landing, and no error message.
- **Support**: indistinguishable from an actual auth misconfiguration, generating support load for transient failures.
- **Security**: leaving an MSAL session active without an app session means the next page load retries with the same broken state, never re-prompting for login.

---

## Solution

A coordinated, two-path cleanup that detects the half-authenticated state, drops the local MSAL session **without an Azure round-trip**, evicts the failed React Query cache entry, clears app state, and redirects the user back to Landing with a Spanish error snackbar.

Two recovery paths are required because the two entry points have different timing:

| Entry point          | When it runs                                  | Recovery path                                                                        |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Top-level mount      | After `AuthProvider` mounts and effects run   | `AuthContext` effect calls `handleLoginFailure`                                      |
| Deep-link navigation | In TanStack Router `beforeLoad`, before React | `requireRole` guard catches the failure, throws `redirect({ to: "/", search: ... })` |

---

## Implementation

### 1. `useInitializeUser` exposes the error state

Source: `apps/web/src/hooks/useInitializeUser.ts`

The hook now returns `isUserError` and `userError` alongside `user` and `refetchUser`. This is what allows `AuthContext` to react when `useMe` enters its error state.

```typescript
const { data: me, refetch, error, isError } = useMe(isAuthenticated);
// ...
return {
  user: me,
  refetchUser: refetch,
  isUserError: isError,
  userError: error,
};
```

### 2. `AuthProvider` handles the React-mount path

Source: `apps/web/src/contexts/AuthContext.tsx`

When the provider observes `isAuthenticated && isUserError && account`, it triggers `handleLoginFailure`, which:

1. Calls `instance.clearCache({ account })` — drops the local MSAL session **without redirecting to Azure's logout endpoint**, so the in-memory snackbar survives the navigation.
2. Removes the `userKeys.me` query so a future login attempt refetches instead of replaying the cached error.
3. Clears the Zustand `userStore`.
4. Navigates to `/`.
5. Enqueues the error snackbar: `"Ocurrió un problema al iniciar sesión"`.

A `useRef` guard (`hasHandledLoginFailureRef`) prevents the cleanup from running multiple times while React Query is still in its error state. The guard is reset when `isAuthenticated` flips to `false`, so a subsequent login attempt in the same session can be handled.

The `clearCache` call is wrapped in `try/catch`: a transient MSAL failure must not block the rest of the cleanup, otherwise the user would be stranded in a half-broken session.

### 3. `requireRole` handles the deep-link path

Source: `apps/web/src/utils/requireRole.ts`

The route guard runs in TanStack Router's `beforeLoad` — outside React, before `AuthProvider`'s effects fire. If a user opens a protected URL directly, this is the only code path that runs.

The guard wraps `queryClient.ensureQueryData` for `/users/me` in `try/catch`. On failure it:

1. Performs **best-effort cleanup**: `msalInstance.clearCache({ account })` and `queryClient.removeQueries({ queryKey: userKeys.me })`. Both are wrapped in their own `try/catch` and any error is logged — cleanup failures must never block the redirect.
2. Throws `redirect({ to: "/", search: { authError: "login_failed" } })`.

Because the guard cannot call `enqueueSnackbar` directly (no React context available), the snackbar is triggered by Landing via a query-string flag.

### 4. Landing route surfaces the error

Source: `apps/web/src/routes/index.tsx`

The Landing route now:

1. Declares a narrow `validateSearch` that accepts **only** `authError: "login_failed"` — any other query params are dropped to keep the URL contract small.
2. On mount, if `authError === "login_failed"`, shows the error snackbar.
3. Calls `navigate({ to: "/", search: {}, replace: true })` to strip the param so a browser refresh doesn't re-trigger the message.

---

## End-to-end flow

```
┌─ Path A: Regular login ─────────────────────────────────────┐
│                                                              │
│   User logs in → MSAL session created                        │
│        │                                                     │
│        ▼                                                     │
│   useInitializeUser → useMe → GET /users/me ❌ fails         │
│        │                                                     │
│        ▼                                                     │
│   AuthContext effect detects isUserError && account          │
│        │                                                     │
│        ▼                                                     │
│   handleLoginFailure:                                        │
│     • instance.clearCache({ account })                       │
│     • queryClient.removeQueries({ queryKey: userKeys.me })   │
│     • userStore.clear()                                      │
│     • navigate({ to: "/" })                                  │
│     • enqueueSnackbar("Ocurrió un problema...")              │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌─ Path B: Deep link to a protected route ────────────────────┐
│                                                              │
│   User opens /app/... directly with an existing MSAL session │
│        │                                                     │
│        ▼                                                     │
│   requireRole beforeLoad runs (outside React)                │
│        │                                                     │
│        ▼                                                     │
│   queryClient.ensureQueryData(/users/me) ❌ throws           │
│        │                                                     │
│        ▼                                                     │
│   Best-effort cleanup (clearCache + removeQueries)           │
│        │                                                     │
│        ▼                                                     │
│   throw redirect({ to: "/", search: { authError: "..."} })   │
│        │                                                     │
│        ▼                                                     │
│   Landing route reads authError, shows snackbar,             │
│   strips the param via replace: true                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Key design decisions

| Decision                                     | Reason                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `clearCache` over `logoutRedirect`           | Avoids the Azure round-trip so the in-memory snackbar survives the navigation                                         |
| Query-string flag for cross-route signaling  | The route guard runs outside React; it cannot call `enqueueSnackbar` directly, so it signals Landing via search param |
| `replace: true` when stripping `authError`   | A browser refresh must not re-fire the snackbar                                                                       |
| `useRef` guard over component state          | Avoids re-renders and survives the effect's re-runs while React Query stays in the error state                        |
| Cleanup wrapped in `try/catch` in both paths | A flaky MSAL or React Query call must not block the redirect — leaving the user stranded is worse than a noisy log    |
| Narrow `validateSearch` on Landing           | Keeps the public URL contract minimal — only the known recovery flag is accepted                                      |

---

## Edge cases covered

| Scenario                                                         | Handled by                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Regular login flow with `/users/me` failure                      | `AuthContext` effect path                                                             |
| Direct navigation to a protected route with a stale MSAL session | `requireRole` guard path                                                              |
| Re-login attempt in the same session after a failure             | Ref guard reset on `!isAuthenticated`                                                 |
| Browser refresh on `/?authError=login_failed`                    | Landing strips the param via `replace: true` after reading it once                    |
| `clearCache` itself fails                                        | Wrapped in `try/catch`; cleanup continues, redirect still fires                       |
| Account swap (MSAL account changes mid-session)                  | `account` is in the effect's dependency list, so the cleanup uses the current account |

---

## Manual verification

There is no automated coverage for these paths today (the web app's test setup is light). To verify the behavior manually:

1. **Regular login failure**: log in, then block `/users/me` in devtools (request blocking → return 500) and trigger a refetch. Expect: redirect to `/`, error snackbar, MSAL session cleared.
2. **Deep-link failure**: with the same `/users/me` block in place, navigate directly to a protected route (e.g. `/app/...`). Expect: redirect to `/?authError=login_failed`, error snackbar, URL cleaned to `/` after the param is read.
3. **No duplicate snackbar on refresh**: after the deep-link path lands on `/?authError=login_failed`, refresh before the param is stripped. The snackbar should fire once; the param should be removed.
4. **Re-login arms cleanup again**: after recovery, log out and log back in. Expect: a second failure triggers the same recovery — the ref guard has been reset.

---

## Known gaps and follow-ups

- **No automated tests**. The two paths and the Landing param handling should be covered when the web test setup grows.
- **Possible duplicate snackbar**: if both paths run for the same failure (e.g. `AuthContext` effect races with a guarded navigation), the user may see the snackbar twice. The `hasHandledLoginFailureRef` only deduplicates within `AuthContext`; it does not coordinate with the Landing param effect. Worth verifying.
- **Account-fallback asymmetry**: `requireRole` always passes `accounts[0]` to `clearCache` (could be `undefined` if the array is empty), while `AuthContext` explicitly falls back to `instance.clearCache()` with no args when `account` is null. Either form is accepted by MSAL today, but aligning them would remove an inconsistency.
- **No retry/backoff for transient `/users/me` failures**. Current behavior is "fail closed, redirect to Landing". This is intentional — a real transient failure becomes a re-login by the user — but should be revisited if the API proves unreliable in deployment.

---

## File reference

| File                                      | Role                                                       |
| ----------------------------------------- | ---------------------------------------------------------- |
| `apps/web/src/hooks/useInitializeUser.ts` | Exposes `isUserError`/`userError` from `useMe`             |
| `apps/web/src/contexts/AuthContext.tsx`   | React-mount recovery path (`handleLoginFailure` + effect)  |
| `apps/web/src/utils/requireRole.ts`       | Deep-link recovery path (guard `try/catch` + redirect)     |
| `apps/web/src/routes/index.tsx`           | Landing route reads `authError`, shows snackbar, strips it |
| `apps/web/src/stores/userStore.ts`        | Zustand store cleared during recovery                      |
| `apps/web/src/api/query/users/keys.ts`    | `userKeys.me` query key evicted during recovery            |
