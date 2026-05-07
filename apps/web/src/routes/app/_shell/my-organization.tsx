import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";
import { MyOrganizationScreen } from "@/screens/MyOrganization";

export const Route = createFileRoute(RouteIds.MY_ORGANIZATION)({
  component: MyOrganizationScreen,
});
