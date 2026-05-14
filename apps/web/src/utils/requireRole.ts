import { redirect } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { queryClient } from "@/api/query/client";
import { userKeys } from "@/api/query/users/keys";
import { apiClient } from "@/api/http";
import { initializeMsal, msalInstance } from "@/auth/initializeMsal";
import type { GetMeResponse } from "@repo/types";

type RequireRoleOptions = {
  redirectTo: string;
};

/**
 * Creates a TanStack Router `beforeLoad` guard that checks the user's SystemRole.
 *
 * - Awaits MSAL initialization before checking accounts.
 * - Uses `msalInstance.getAllAccounts()` to check authentication without React hooks.
 * - Uses `queryClient.ensureQueryData` to await user data (returns cached if available).
 * - Throws a `redirect` if the user's role is not in the allowed list.
 * - `redirectTo` must be provided to specify where to redirect unauthorized users.
 */
export function requireRole(
  allowedRoles: SystemRole[],
  { redirectTo }: RequireRoleOptions
) {
  return async () => {
    await initializeMsal();

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: redirectTo });
    }

    let user: GetMeResponse;
    try {
      user = await queryClient.ensureQueryData<GetMeResponse>({
        queryKey: userKeys.me,
        queryFn: () => apiClient.get("users/me").json(),
      });
    } catch {
      // Deep-link path: MSAL has an account but /users/me failed.
      // Drop the local session and signal Landing to show the error
      // snackbar via the authError search param (the guard runs outside
      // React, so we can't call enqueueSnackbar directly here).
      // Cleanup is best-effort: any failure here must not block the
      // redirect, otherwise the user is stranded on the protected route.
      try {
        await msalInstance.clearCache({ account: accounts[0] });
        queryClient.removeQueries({ queryKey: userKeys.me });
      } catch (cleanupError) {
        // eslint-disable-next-line no-console
        console.error(
          "requireRole cleanup failed during /users/me recovery:",
          cleanupError
        );
      }
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/", search: { authError: "login_failed" } });
    }

    if (!user || !allowedRoles.includes(user.role)) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: redirectTo });
    }
  };
}
