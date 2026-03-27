import { redirect } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { queryClient } from "@/api/query/client";
import { userKeys } from "@/api/query/users/keys";
import { apiClient } from "@/api/http";
import { initializeMsal, msalInstance } from "@/auth/initializeMsal";
import { Routes } from "@/interfaces/routes";
import type { GetMeResponse } from "@repo/types";

/**
 * Creates a TanStack Router `beforeLoad` guard that checks the user's SystemRole.
 *
 * - Awaits MSAL initialization before checking accounts.
 * - Uses `msalInstance.getAllAccounts()` to check authentication without React hooks.
 * - Uses `queryClient.ensureQueryData` to await user data (returns cached if available).
 * - Throws a `redirect` if the user's role is not in the allowed list.
 * - `redirectTo` defaults to /app/home but can be overridden to keep
 *   the user within the same module (e.g. /admin).
 */
export function requireRole(
  allowedRoles: SystemRole[],
  { redirectTo = Routes.HOME }: { redirectTo?: string } = {}
) {
  return async () => {
    await initializeMsal();

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: Routes.LANDING });
    }

    const user = await queryClient.ensureQueryData<GetMeResponse>({
      queryKey: userKeys.me,
      queryFn: () => apiClient.get("users/me").json(),
    });

    if (!user || !allowedRoles.includes(user.role)) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: redirectTo });
    }
  };
}
