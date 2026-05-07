import { createFileRoute } from "@tanstack/react-router";

import { UserFormScreen } from "../../../../screens/User";

export const Route = createFileRoute("/app/_shell/user/form")({
  component: () => <UserFormScreen />,
});
