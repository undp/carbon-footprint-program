import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import { IS_PROD } from "@/config/environment.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "errorHandler" });

  // Determine if this is a known/expected error (created via @fastify/error)
  const isKnownError = error.code && !error.code.startsWith("FST_");

  // Get status code (default to 500 for unexpected errors)
  const statusCode = error.statusCode ?? 500;

  // Log the error
  if (statusCode >= 500) {
    // Server errors - log full details
    log.error({ err: error, statusCode }, "Internal server error");
  } else if (isKnownError) {
    // Known business errors - log at info level
    log.info(
      { code: error.code, statusCode, message: error.message },
      "Request error"
    );
  } else {
    // Other client errors - log at warn level
    log.warn({ err: error, statusCode }, "Client error");
  }

  // Build response
  const response: ApiErrorResponse = {
    code: error.code ?? "INTERNAL_SERVER_ERROR",
    message:
      statusCode >= 500 && IS_PROD
        ? "An unexpected error occurred"
        : error.message,
  };

  return reply.status(statusCode).send(response);
};

const errorHandlerPlugin = (fastify: FastifyInstance) => {
  fastify.setErrorHandler(errorHandler);
};

export default fp(errorHandlerPlugin, {
  name: "errorHandler",
});
