import {
  DeleteFileResponseSchema,
  DeleteFileParamsSchema,
  SystemRole,
  DeleteFileParams,
  DeleteFileResponse,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { deleteFileHandler } from "./handler.js";

export const deleteFileRoute: StandardRouteSignature = (fastify, options) => {
  fastify.delete<{
    Params: DeleteFileParams;
    Reply: DeleteFileResponse;
  }>(
    "/:uuid",
    {
      schema: {
        tags: ["files"],
        summary: "Soft-delete a file",
        params: DeleteFileParamsSchema,
        response: {
          200: DeleteFileResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireRoles([
          SystemRole.USER,
          SystemRole.ADMIN,
          SystemRole.SUPERADMIN,
        ]),
      ],
    },
    deleteFileHandler
  );
};
