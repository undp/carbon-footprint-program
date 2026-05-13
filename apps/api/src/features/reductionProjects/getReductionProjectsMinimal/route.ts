import {
  GetReductionProjectsMinimalParams,
  GetReductionProjectsMinimalParamsSchema,
  GetReductionProjectsMinimalResponseSchema,
} from "@repo/types";
import { getReductionProjectsMinimalHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getReductionProjectsMinimalRoute = defineRoute<{
  Querystring: GetReductionProjectsMinimalParams;
}>({
  method: "GET",
  path: "/minimal",
  schema: {
    tags: ["reduction-projects"],
    summary: "List reduction projects (minimal)",
    description:
      "Returns id, name, organizationId, status, and year for each accessible project.",
    querystring: GetReductionProjectsMinimalParamsSchema,
    response: {
      200: GetReductionProjectsMinimalResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getReductionProjectsMinimalHandler,
});
