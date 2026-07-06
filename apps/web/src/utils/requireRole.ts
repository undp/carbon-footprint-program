import { redirect } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { queryClient } from "@/api/query/client";
import { userKeys } from "@/api/query/users/keys";
import { apiClient } from "@/api/http";
import { oidcUserManager, getValidOidcUser } from "@/auth/oidcUserManager";
import { Routes } from "@/interfaces";
import { getApiErrorCode } from "@/utils/getApiErrorMessage";
import type { GetMeResponse } from "@repo/types";

type RequireRoleOptions = {
  redirectTo: string;
};

/**
 * Creates a TanStack Router `beforeLoad` guard that checks the user's SystemRole.
 *
 * - Reads the session from the shared OIDC `UserManager` singleton (no React hooks).
 * - If the stored token is expired, attempts a silent renew before giving up, so
 *   deep-links and refreshes don't bounce a still-valid session to login.
 * - Uses `queryClient.ensureQueryData` to await user data (returns cached if available).
 * - Throws a `redirect` if the user's role is not in the allowed list.
 * - `redirectTo` must be provided to specify where to redirect unauthorized users.
 */
export function requireRole(
  allowedRoles: SystemRole[],
  { redirectTo }: RequireRoleOptions
) {
  return async () => {
    const oidcUser = await getValidOidcUser();
    if (!oidcUser) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: redirectTo });
    }

    let me: GetMeResponse;
    try {
      me = await queryClient.ensureQueryData<GetMeResponse>({
        queryKey: userKeys.me,
        queryFn: () => apiClient.get("users/me").json(),
      });
    } catch (error) {
      // Authenticated but /users/me failed. Drop the local session via
      // removeUser() (no IdP round-trip) and signal Landing to show the error
      // snackbar via the authError search params (the guard runs outside React,
      // so we can't call enqueueSnackbar directly here). We forward the API error
      // code so Landing can show specific copy (e.g. the 409
      // EMAIL_REGISTERED_UNDER_DIFFERENT_IDENTITY) instead of only the generic
      // message. Cleanup is best-effort: any failure must not block the redirect,
      // otherwise the user is stranded on the protected route.
      const authErrorCode = getApiErrorCode(error) ?? undefined;
      try {
        await oidcUserManager.removeUser();
        queryClient.removeQueries({ queryKey: userKeys.me });
      } catch (cleanupError) {
        // eslint-disable-next-line no-console
        console.error(
          "requireRole cleanup failed during /users/me recovery:",
          cleanupError
        );
      }
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: Routes.LANDING,
        search: { authError: "login_failed", authErrorCode },
      });
    }

    if (!me || !allowedRoles.includes(me.role)) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: redirectTo });
    }
  };
}
