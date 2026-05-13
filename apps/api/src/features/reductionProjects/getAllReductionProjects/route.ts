import { getAllReductionProjectsHandler } from "./handler.js";
import {
  GetAllReductionProjectsQuery,
  GetAllReductionProjectsQuerySchema,
  GetAllReductionProjectsResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";

export const getAllReductionProjectsRoute = defineRoute<{
  Querystring: GetAllReductionProjectsQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["reduction-projects"],
    summary: "List reduction projects",
    description:
      "Returns reduction projects the user can access, newest first.",
    querystring: GetAllReductionProjectsQuerySchema,
    response: {
      200: GetAllReductionProjectsResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllReductionProjectsHandler,
});
