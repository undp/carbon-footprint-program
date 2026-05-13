import { getOrganizationKpisHandler } from "./handler.js";
import { GetOrganizationKpisResponseSchema } from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";

export const getOrganizationKpisRoute = defineRoute({
  method: "GET",
  path: "/kpis",
  schema: {
    tags: ["admin-organizations"],
    summary: "Get organization KPIs",
    description:
      "Get organization statistics grouped by status, accreditation, and carbon inventories",
    response: {
      200: GetOrganizationKpisResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getOrganizationKpisHandler,
});
