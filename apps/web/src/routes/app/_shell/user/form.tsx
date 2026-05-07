import { createFileRoute } from "@tanstack/react-router";

import { RouteIds } from "@/interfaces";
import { UserFormScreen } from "@/screens/User";

export const Route = createFileRoute(RouteIds.USER_FORM)({
  component: () => <UserFormScreen />,
});
