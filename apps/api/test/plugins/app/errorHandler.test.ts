import { describe, expect, it } from "vitest";
import type { FastifyError } from "fastify";
import { Prisma } from "@repo/database";

import {
  buildErrorResponse,
  getDefaultCodeForStatus,
  handlePrismaError,
} from "@/plugins/app/errorHandler.js";

// These are pure unit tests for the error handler's response shaper. `isProd` is
// passed as a parameter (the plugin injects the real IS_PROD at runtime), so we
// can assert the production info-leak suppression — a security property — for
// BOTH environments without spinning up a server. See errorHandler.ts.

/**
 * Fabricate a FastifyError-like object. The handler only reads `code`,
 * `statusCode`, `message`, and an optional structured `details`, so a plain
 * `Error` with those fields set is faithful to what Fastify passes in.
 */
const makeError = (props: {
  message?: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
}): FastifyError => {
  const err = new Error(props.message ?? "boom") as unknown as FastifyError & {
    details?: unknown;
  };
  if (props.code !== undefined) err.code = props.code;
  if (props.statusCode !== undefined) err.statusCode = props.statusCode;
  if (props.details !== undefined) err.details = props.details;
  return err;
};

describe("getDefaultCodeForStatus", () => {
  it.each([
    [400, "BAD_REQUEST"],
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [422, "UNPROCESSABLE_ENTITY"],
    [429, "TOO_MANY_REQUESTS"],
  ])("maps the mapped status %d to %s", (status, code) => {
    expect(getDefaultCodeForStatus(status)).toBe(code);
  });

  it.each([[418], [402], [451]])(
    "falls back to CLIENT_ERROR for an unmapped 4xx (%d)",
    (status) => {
      expect(getDefaultCodeForStatus(status)).toBe("CLIENT_ERROR");
    }
  );

  it.each([[500], [502], [503]])(
    "falls back to INTERNAL_SERVER_ERROR for a 5xx (%d)",
    (status) => {
      expect(getDefaultCodeForStatus(status)).toBe("INTERNAL_SERVER_ERROR");
    }
  );
});

describe("handlePrismaError", () => {
  it("maps P2002 (unique) to 409 with duplicated fields", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "test", meta: { target: ["email"] } }
    );
    expect(handlePrismaError(error)).toEqual({
      statusCode: 409,
      code: "DATABASE_UNIQUE_CONSTRAINT",
      message: "A record with this value already exists",
      duplicatedFields: ["email"],
    });
  });

  it("maps P2025 (record not found) to 404", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "test",
    });
    expect(handlePrismaError(error)).toEqual({
      statusCode: 404,
      code: "DATABASE_RECORD_NOT_FOUND",
      message: "Record not found",
    });
  });

  it("maps P2003 (foreign key) to 409", () => {
    const error = new Prisma.PrismaClientKnownRequestError("FK failed", {
      code: "P2003",
      clientVersion: "test",
    });
    expect(handlePrismaError(error)).toEqual({
      statusCode: 409,
      code: "DATABASE_FOREIGN_KEY_CONSTRAINT",
      message: "Related record not found",
    });
  });

  it("maps any other known Prisma code to a generic 409", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Some other error", {
      code: "P2011",
      clientVersion: "test",
    });
    expect(handlePrismaError(error)).toEqual({
      statusCode: 409,
      code: "DATABASE_CONSTRAINT_VIOLATION",
      message: "Database constraint violation",
    });
  });

  it.each([
    [
      "PrismaClientValidationError",
      new Prisma.PrismaClientValidationError("bad query", {
        clientVersion: "test",
      }),
    ],
    [
      "PrismaClientRustPanicError",
      new Prisma.PrismaClientRustPanicError("panic", "test"),
    ],
    [
      "PrismaClientInitializationError",
      new Prisma.PrismaClientInitializationError("init failed", "test"),
    ],
    [
      "PrismaClientUnknownRequestError",
      new Prisma.PrismaClientUnknownRequestError("unknown", {
        clientVersion: "test",
      }),
    ],
  ])("maps %s to a 500 DATABASE_ERROR", (_name, error) => {
    expect(handlePrismaError(error)).toEqual({
      statusCode: 500,
      code: "DATABASE_ERROR",
      message: "A database error occurred",
    });
  });

  it("returns null for a non-Prisma error", () => {
    expect(handlePrismaError(new Error("plain"))).toBeNull();
    expect(handlePrismaError("not even an error")).toBeNull();
    expect(handlePrismaError(null)).toBeNull();
  });
});

describe("buildErrorResponse — Prisma errors", () => {
  it("returns the real Prisma driver message in non-prod, the safe message in prod", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`email`)",
      { code: "P2002", clientVersion: "test", meta: { target: ["email"] } }
    );

    const dev = buildErrorResponse(error, { isProd: false });
    expect(dev.statusCode).toBe(409);
    expect(dev.body.code).toBe("DATABASE_UNIQUE_CONSTRAINT");
    expect(dev.body.message).toBe(error.message);
    expect(dev.log).toEqual({
      level: "warn",
      obj: {
        code: "DATABASE_UNIQUE_CONSTRAINT",
        statusCode: 409,
        duplicatedFields: ["email"],
      },
      msg: "Unhandled Prisma error",
    });

    const prod = buildErrorResponse(error, { isProd: true });
    expect(prod.statusCode).toBe(409);
    expect(prod.body.message).toBe("A record with this value already exists");
    expect(prod.body.message).not.toBe(error.message);
  });

  it("keeps `details` on a Prisma 4xx even in prod (only 5xx are suppressed)", () => {
    const error = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    }) as Prisma.PrismaClientKnownRequestError & { details?: unknown };
    error.details = { field: "email" };

    const prod = buildErrorResponse(error, { isProd: true });
    expect(prod.body.details).toEqual({ field: "email" });
  });

  it("SECURITY: a prod Prisma 5xx leaks neither the real message nor details", () => {
    const error = new Prisma.PrismaClientValidationError(
      "Invalid `prisma.user.create()`: column secret_internal does not exist",
      { clientVersion: "test" }
    ) as Prisma.PrismaClientValidationError & { details?: unknown };
    error.details = { internalStack: "…sensitive…" };

    const prod = buildErrorResponse(error as unknown as FastifyError, {
      isProd: true,
    });
    expect(prod.statusCode).toBe(500);
    expect(prod.body.code).toBe("DATABASE_ERROR");
    expect(prod.body.message).toBe("A database error occurred");
    expect(prod.body.message).not.toContain("secret_internal");
    expect(prod.body.details).toBeUndefined();
    expect(prod.log.level).toBe("error");
    expect(prod.log.obj).toMatchObject({ err: error, statusCode: 500 });

    // Non-prod surfaces both for debugging.
    const dev = buildErrorResponse(error as unknown as FastifyError, {
      isProd: false,
    });
    expect(dev.body.message).toBe(error.message);
    expect(dev.body.details).toEqual({ internalStack: "…sensitive…" });
  });
});

describe("buildErrorResponse — non-Prisma errors", () => {
  it("keeps a known application error's code and message (logged at info)", () => {
    const error = makeError({
      code: "RESOURCE_NOT_FOUND",
      statusCode: 404,
      message: "Organization with id 5 was not found.",
      details: { resource: "Organization" },
    });

    const result = buildErrorResponse(error, { isProd: true });
    expect(result.statusCode).toBe(404);
    expect(result.body.code).toBe("RESOURCE_NOT_FOUND");
    // 4xx: message is preserved even in prod.
    expect(result.body.message).toBe("Organization with id 5 was not found.");
    expect(result.body.details).toEqual({ resource: "Organization" });
    expect(result.log).toEqual({
      level: "info",
      obj: {
        code: "RESOURCE_NOT_FOUND",
        statusCode: 404,
        message: "Organization with id 5 was not found.",
      },
      msg: "Request error",
    });
  });

  it("treats an FST_-prefixed framework error as a client error (logged at warn)", () => {
    const error = makeError({
      code: "FST_ERR_VALIDATION",
      statusCode: 400,
      message: "body must have required property 'name'",
    });

    const result = buildErrorResponse(error, { isProd: false });
    expect(result.statusCode).toBe(400);
    // The error's own code is kept even though it is a framework code.
    expect(result.body.code).toBe("FST_ERR_VALIDATION");
    expect(result.body.message).toBe("body must have required property 'name'");
    expect(result.log.level).toBe("warn");
    expect(result.log.msg).toBe("Client error");
  });

  it("derives a status-aligned code when the error carries none", () => {
    const error = makeError({ statusCode: 403, message: "nope" });
    const result = buildErrorResponse(error, { isProd: true });
    expect(result.body.code).toBe("FORBIDDEN");
    expect(result.body.message).toBe("nope");
    expect(result.log.level).toBe("warn");
  });

  it("SECURITY: an uncaught 5xx (no code, no status) is masked in prod, real in dev", () => {
    const error = makeError({
      message: "TypeError: cannot read property 'id' of undefined",
      details: { trace: "…" },
    });

    const prod = buildErrorResponse(error, { isProd: true });
    expect(prod.statusCode).toBe(500);
    expect(prod.body.code).toBe("INTERNAL_SERVER_ERROR");
    expect(prod.body.message).toBe("An unexpected error occurred");
    expect(prod.body.message).not.toContain("TypeError");
    expect(prod.body.details).toBeUndefined();
    expect(prod.log).toEqual({
      level: "error",
      obj: { err: error, statusCode: 500 },
      msg: "Internal server error",
    });

    const dev = buildErrorResponse(error, { isProd: false });
    expect(dev.body.message).toBe(
      "TypeError: cannot read property 'id' of undefined"
    );
    expect(dev.body.details).toEqual({ trace: "…" });
  });

  it("ignores a non-object / array `details` payload", () => {
    const arrayDetails = makeError({
      statusCode: 400,
      message: "x",
      details: ["not", "an", "object"],
    });
    expect(
      buildErrorResponse(arrayDetails, { isProd: false }).body.details
    ).toBeUndefined();

    const primitiveDetails = makeError({
      statusCode: 400,
      message: "x",
      details: "nope",
    });
    expect(
      buildErrorResponse(primitiveDetails, { isProd: false }).body.details
    ).toBeUndefined();
  });
});
