import { createFileRoute } from "@tanstack/react-router";
import { MyOrganizationScreen } from "@/screens/MyOrganization";

export const Route = createFileRoute("/app/_shell/my-organization")({
  component: MyOrganizationScreen,
});
