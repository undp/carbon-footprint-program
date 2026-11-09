import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { useMaintainerStore } from "@/screens/Maintainer/hooks/useMaintainerStore";
import { EmissionFactorYearCopyScreen } from "@/screens/Maintainer/screens/EmissionFactorYearCopyScreen";

const searchSchema = z.object({
  methodologyVersionId: z.string().optional().catch(undefined),
});

// `emission-factors_` keeps this route out of the grid's: the grid renders no
// `<Outlet>`, so the copy page is a sibling under the admin layout.
export const Route = createFileRoute("/admin/emission-factors_/copy")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    await requireRole([SystemRole.SUPERADMIN], {
      redirectTo: Routes.ADMIN_DASHBOARD,
    })();
    // Edit mode lives in a store that a reload clears. Without edit mode on
    // the version the page names, there is nothing it may write: back to the
    // grid, where the admin enters edit mode again.
    const editing = useMaintainerStore.getState().editingMethodology;
    if (!editing || editing.id !== search.methodologyVersionId) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: Routes.ADMIN_EMISSION_FACTORS });
    }
  },
  component: EmissionFactorYearCopyScreen,
});
