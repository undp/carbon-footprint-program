import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import { Prisma } from "@repo/database";
import { IS_PROD } from "@/config/environment.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";

/**
 * Derives a fallback error code from the HTTP status code so that
 * status and code stay aligned (e.g. a 404 never reports "INTERNAL_SERVER_ERROR").
 */
function getDefaultCodeForStatus(statusCode: number): string {
  const statusCodeMap: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "UNPROCESSABLE_ENTITY",
    429: "TOO_MANY_REQUESTS",
  };

  if (statusCode in statusCodeMap) return statusCodeMap[statusCode];
  if (statusCode >= 400 && statusCode < 500) return "CLIENT_ERROR";
  return "INTERNAL_SERVER_ERROR";
}

/**
 * Safety net for Prisma errors that bubble up without being caught in service code.
 * Returns a normalized result or null if the error is not a Prisma error.
 */
function handlePrismaError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
  duplicatedFields?: string[];
} | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        return {
          statusCode: 409,
          code: "DATABASE_UNIQUE_CONSTRAINT",
          message: "A record with this value already exists",
          duplicatedFields,
        };
      }
      case "P2025":
        return {
          statusCode: 404,
          code: "DATABASE_RECORD_NOT_FOUND",
          message: "Record not found",
        };
      case "P2003":
        return {
          statusCode: 409,
          code: "DATABASE_FOREIGN_KEY_CONSTRAINT",
          message: "Related record not found",
        };
      default:
        return {
          statusCode: 409,
          code: "DATABASE_CONSTRAINT_VIOLATION",
          message: "Database constraint violation",
        };
    }
  }

  if (
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return {
      statusCode: 500,
      code: "DATABASE_ERROR",
      message: "A database error occurred",
    };
  }

  return null;
}

const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "errorHandler" });

  // --- Prisma errors (safety net for uncaught DB errors) ---
  const prismaResult = handlePrismaError(error);
  if (prismaResult) {
    if (prismaResult.statusCode >= 500) {
      log.error(
        { err: error, statusCode: prismaResult.statusCode },
        "Unhandled Prisma error"
      );
    } else {
      log.warn(
        {
          code: prismaResult.code,
          statusCode: prismaResult.statusCode,
          duplicatedFields: prismaResult.duplicatedFields,
        },
        "Unhandled Prisma error"
      );
    }

    const response: ApiErrorResponse = {
      code: prismaResult.code,
      message: IS_PROD ? prismaResult.message : error.message,
    };
    return reply.status(prismaResult.statusCode).send(response);
  }

  // --- All other errors ---

  // Determine if this is a known/expected error (created via @fastify/error)
  const isKnownError = error.code && !error.code.startsWith("FST_");

  // Get status code (default to 500 for unexpected errors)
  const statusCode = error.statusCode ?? 500;

  // Log the error with appropriate level
  if (statusCode >= 500) {
    log.error({ err: error, statusCode }, "Internal server error");
  } else if (isKnownError) {
    log.info(
      { code: error.code, statusCode, message: error.message },
      "Request error"
    );
  } else {
    log.warn({ err: error, statusCode }, "Client error");
  }

  // Derive error code: use the error's own code if present,
  // otherwise derive a status-aligned fallback
  const code = error.code ?? getDefaultCodeForStatus(statusCode);

  // Forward an optional Spanish, end-user-friendly message attached on the thrown
  // error (services set this for known business-rule errors). Only forward strings
  // and only on client-error status codes — never leak internal-server-error details
  // through this field, even if a service set it accidentally.
  const userMessageCandidate = (
    error as FastifyError & { userMessage?: unknown }
  ).userMessage;
  const userMessage =
    statusCode < 500 && typeof userMessageCandidate === "string"
      ? userMessageCandidate
      : undefined;

  const response: ApiErrorResponse = {
    code,
    message:
      statusCode >= 500 && IS_PROD
        ? "An unexpected error occurred"
        : error.message,
    ...(userMessage ? { userMessage } : {}),
  };

  return reply.status(statusCode).send(response);
};

const errorHandlerPlugin = (
  fastify: FastifyInstance,
  _opts: unknown,
  done: () => void
) => {
  fastify.setErrorHandler(errorHandler);
  done();
};

export default fp(errorHandlerPlugin, {
  name: "errorHandler",
});
