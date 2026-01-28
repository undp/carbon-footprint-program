import { createFileRoute } from "@tanstack/react-router";

import { Routes } from "@/interfaces/routes";
import { UserFormScreen } from "../../../screens/User";

export const Route = createFileRoute(Routes.USER_FORM)({
  component: () => <UserFormScreen />,
});
