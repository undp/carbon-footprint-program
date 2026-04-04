import {
  GetReductionProjectsMinimalParamsSchema,
  GetReductionProjectsMinimalResponseSchema,
} from "@repo/types";
import type { GetReductionProjectsMinimalParams } from "@repo/types";
import { getReductionProjectsMinimalHandler } from "./handler.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getReductionProjectsMinimalRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get<{ Querystring: GetReductionProjectsMinimalParams }>(
    "/minimal",
    {
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
    },
    getReductionProjectsMinimalHandler
  );
};
