import fp from "fastify-plugin";
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { Prisma } from "@repo/database";
import { DataIntegrityError } from "@/errors/index.js";
import { IS_PROD } from "@/config/environment.js";

/**
 * Global error handler plugin for consistent error formatting across all routes
 * Handles Prisma errors, validation errors, and custom application errors
 */
export default fp(
  (fastify: FastifyInstance) => {
    fastify.setErrorHandler(
      (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
        // Log the error with full context including request details
        // Note: Sensitive data (passwords, tokens) are redacted by logger config
        request.log.error(
          {
            error,
            url: request.url,
            method: request.method,
            params: request.params,
            query: request.query,
            statusCode: error.statusCode,
          },
          `Request failed: ${error.message}`
        );

        // Handle Fastify validation errors (from Zod schemas)
        if (error.validation) {
          return reply.status(400).send({
            message: "Validation failed",
            error: "Bad Request",
            errors: error.validation,
          });
        }

        // Handle Prisma-specific errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // P2002: Unique constraint violation
          if (error.code === "P2002") {
            return reply.status(409).send({
              message: "A record with this value already exists",
              error: "Conflict",
            });
          }

          // P2025: Record not found during operation
          if (error.code === "P2025") {
            return reply.status(404).send({
              message: "Record not found",
              error: "Not Found",
            });
          }

          // P2003: Foreign key constraint violation
          if (error.code === "P2003") {
            return reply.status(409).send({
              message: "Related record not found",
              error: "Conflict",
            });
          }

          // Other known Prisma errors
          return reply.status(409).send({
            message: "Database constraint violation",
            error: "Conflict",
          });
        }

        // Handle DataIntegrityError
        if (error instanceof DataIntegrityError) {
          return reply.status(409).send({
            message: error.message,
            error: "Data Integrity Error",
          });
        }

        // Handle custom validation errors
        if (error.name === "ValidationError") {
          return reply.status(400).send({
            message: error.message,
            error: "Validation Error",
          });
        }

        // Handle standard HTTP errors
        if (error.statusCode && error.statusCode < 500) {
          return reply.status(error.statusCode).send({
            message: error.message,
            error: error.name || "Client Error",
          });
        }

        // Generic server error fallback (500)
        // Don't expose internal error details in production
        return reply.status(error.statusCode || 500).send({
          message: IS_PROD ? "Internal server error" : error.message,
          error: "Internal Server Error",
        });
      }
    );
  },
  { name: "error-handler-plugin" }
);
