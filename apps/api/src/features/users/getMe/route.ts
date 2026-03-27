import type { FastifyZodInstance } from "@/types/fastify.js";
import { getMeHandler } from "./handler.js";
import { GetMeResponse, GetMeResponseSchema, SystemRole } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getMeRoute = (fastify: FastifyZodInstance) => {
  fastify.get<{
    Reply: GetMeResponse;
  }>(
    "/me",
    {
      schema: {
        tags: ["users"],
        summary: "Get the current authenticated user",
        description: "Retrieve the details of the currently authenticated user",
        response: {
          200: GetMeResponseSchema,
          400: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireRoles([
          SystemRole.USER,
          SystemRole.ADMIN,
          SystemRole.SUPERADMIN,
        ]),
      ],
    },

    getMeHandler
  );
};
