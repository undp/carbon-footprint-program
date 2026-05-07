import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { Routes } from "@/interfaces";
import { useReductionProjectAccess } from "@/hooks";

/**
 * Route guard for reduction project edit screens.
 *
 * Pass `projectId` only when guarding (e.g. edit mode). In create mode the
 * caller should pass `undefined` so the hook is a no-op.
 *
 * Pass `enabled=false` to suppress the guard temporarily — e.g. while the
 * form is submitting or right after a successful save, since the mutation
 * invalidates the access query and a status transition (REVIEWED→SUBMITTED)
 * would otherwise trip the redirect+snackbar before the screen unmounts.
 *
 * Behavior when guarding:
 * - read fails (e.g. 403) → redirect to the projects list (the details screen
 *   would also fail).
 * - read ok but server says no edit → redirect to the details (view) screen.
 */
export function useReductionProjectRouteGuard(
  projectId: string | undefined,
  enabled: boolean = true
) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { canAccess, canEdit, isReady } = useReductionProjectAccess(projectId);

  const mustNavigateAway = enabled && !!projectId && isReady && !canEdit;

  useEffect(() => {
    if (!mustNavigateAway || !projectId) return;
    if (!canAccess) {
      void navigate({ to: Routes.REDUCTION_PROJECTS, replace: true });
      enqueueSnackbar("No tienes acceso a este proyecto", { variant: "info" });
      return;
    }
    void navigate({
      to: Routes.REDUCTION_PROJECT_DETAILS,
      params: { id: projectId },
      replace: true,
    });
    enqueueSnackbar("No puedes editar este proyecto", { variant: "info" });
  }, [mustNavigateAway, canAccess, projectId, navigate, enqueueSnackbar]);

  return { isReady, mustNavigateAway, canEdit, canAccess };
}
