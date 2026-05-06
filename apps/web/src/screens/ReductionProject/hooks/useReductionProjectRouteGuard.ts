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
 * Behavior when guarding:
 * - read fails (e.g. 403) → redirect to the projects list (the details screen
 *   would also fail).
 * - read ok but server says no edit → redirect to the details (view) screen.
 */
export function useReductionProjectRouteGuard(projectId: string | undefined) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { canAccess, canEdit, isReady } = useReductionProjectAccess(projectId);

  const mustNavigateAway = !!projectId && isReady && !canEdit;

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
