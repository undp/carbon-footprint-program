import { createFileRoute } from "@tanstack/react-router";
import { Routes } from "@/interfaces/routes";
import { MyOrganizationScreen } from "@/screens/MyOrganization";

export const Route = createFileRoute(Routes.MY_ORGANIZATION)({
  component: MyOrganizationScreen,
});
