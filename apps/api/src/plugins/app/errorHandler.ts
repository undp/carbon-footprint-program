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
export function getDefaultCodeForStatus(statusCode: number): string {
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
export function handlePrismaError(error: unknown): {
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

const extractErrorDetails = (
  error: unknown
): Record<string, unknown> | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = (error as { details?: unknown }).details;
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate)
  ) {
    return candidate as Record<string, unknown>;
  }
  return undefined;
};

/**
 * A structured logging directive: the level, the merged log object, and the
 * message. Kept as data (instead of logging inline) so the response-shaping
 * logic can be exercised in a pure unit test without a live request logger.
 */
interface ErrorLogDirective {
  level: "error" | "warn" | "info";
  obj: Record<string, unknown>;
  msg: string;
}

/**
 * The finished error response plus the log line the handler should emit.
 */
export interface BuiltErrorResponse {
  statusCode: number;
  body: ApiErrorResponse;
  log: ErrorLogDirective;
}

/**
 * Pure error-response shaper. Takes `isProd` as a parameter (rather than reading
 * the module-level {@link IS_PROD}) so the production info-leak suppression — a
 * security property — can be unit-tested for both environments. The Fastify
 * plugin below calls this with the real `IS_PROD` and performs the reply/log
 * side effects, so runtime behavior is unchanged.
 */
export function buildErrorResponse(
  error: FastifyError,
  { isProd }: { isProd: boolean }
): BuiltErrorResponse {
  const details = extractErrorDetails(error);

  // --- Prisma errors (safety net for uncaught DB errors) ---
  const prismaResult = handlePrismaError(error);
  if (prismaResult) {
    const log: ErrorLogDirective =
      prismaResult.statusCode >= 500
        ? {
            level: "error",
            obj: { err: error, statusCode: prismaResult.statusCode },
            msg: "Unhandled Prisma error",
          }
        : {
            level: "warn",
            obj: {
              code: prismaResult.code,
              statusCode: prismaResult.statusCode,
              duplicatedFields: prismaResult.duplicatedFields,
            },
            msg: "Unhandled Prisma error",
          };

    const body: ApiErrorResponse = {
      code: prismaResult.code,
      message: isProd ? prismaResult.message : error.message,
    };
    // Suppress structured `details` on production 5xx responses to avoid leaking
    // internal diagnostics (e.g., raw Prisma metadata) to API consumers.
    if (details && (!isProd || prismaResult.statusCode < 500)) {
      body.details = details;
    }
    return { statusCode: prismaResult.statusCode, body, log };
  }

  // --- All other errors ---

  // Determine if this is a known/expected error (created via @fastify/error)
  const isKnownError = error.code && !error.code.startsWith("FST_");

  // Get status code (default to 500 for unexpected errors)
  const statusCode = error.statusCode ?? 500;

  // Log the error with appropriate level
  let log: ErrorLogDirective;
  if (statusCode >= 500) {
    log = {
      level: "error",
      obj: { err: error, statusCode },
      msg: "Internal server error",
    };
  } else if (isKnownError) {
    log = {
      level: "info",
      obj: { code: error.code, statusCode, message: error.message },
      msg: "Request error",
    };
  } else {
    log = {
      level: "warn",
      obj: { err: error, statusCode },
      msg: "Client error",
    };
  }

  // Derive error code: use the error's own code if present,
  // otherwise derive a status-aligned fallback
  const code = error.code ?? getDefaultCodeForStatus(statusCode);

  const body: ApiErrorResponse = {
    code,
    message:
      statusCode >= 500 && isProd
        ? "An unexpected error occurred"
        : error.message,
  };
  // Suppress structured `details` on production 5xx responses to avoid leaking
  // internal diagnostics to API consumers.
  if (details && (!isProd || statusCode < 500)) {
    body.details = details;
  }

  return { statusCode, body, log };
}

const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const {
    statusCode,
    body,
    log: directive,
  } = buildErrorResponse(error, {
    isProd: IS_PROD,
  });

  const log = request.log.child({ module: "errorHandler" });
  switch (directive.level) {
    case "error":
      log.error(directive.obj, directive.msg);
      break;
    case "warn":
      log.warn(directive.obj, directive.msg);
      break;
    case "info":
      log.info(directive.obj, directive.msg);
      break;
  }

  return reply.status(statusCode).send(body);
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
