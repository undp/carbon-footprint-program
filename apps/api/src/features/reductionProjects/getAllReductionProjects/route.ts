import { getAllReductionProjectsHandler } from "./handler.js";
import {
  GetAllReductionProjectsQuerySchema,
  GetAllReductionProjectsResponseSchema,
} from "@repo/types";
import type { GetAllReductionProjectsQuery } from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllReductionProjectsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Querystring: GetAllReductionProjectsQuery }>(
    "/",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllReductionProjectsHandler
  );
};
