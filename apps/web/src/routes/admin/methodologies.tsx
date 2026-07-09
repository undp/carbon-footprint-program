import { createFileRoute } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { Routes } from "@/interfaces/routes";
import { requireRole } from "@/utils/requireRole";
import { MethodologiesMaintainerScreen } from "@/screens/Maintainer/screens/MethodologiesMaintainerScreen";

export const Route = createFileRoute("/admin/methodologies")({
  beforeLoad: requireRole([SystemRole.SUPERADMIN], {
    redirectTo: Routes.ADMIN_DASHBOARD,
  }),
  component: () => <MethodologiesMaintainerScreen />,
});
