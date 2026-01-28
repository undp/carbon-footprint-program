import { PrismaClient } from "@repo/database";
import type {
  FastifyInstance,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
} from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { AuthService, AuthUser } from "@/auth/index.js";
import type { GetMeResponse } from "@repo/types";
import type { UserRole } from "@/plugins/app/authorizationPlugin.js";

/**
 * Tipo personalizado que representa una instancia de Fastify con ZodTypeProvider ya configurado.
 * Esto permite usar métodos como .get(), .post(), etc. directamente sin necesidad de llamar
 * .withTypeProvider<ZodTypeProvider>() en cada método.
 */
export type FastifyZodInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;

    /**
     * Authentication service for managing auth providers.
     */
    authService: AuthService;

    /**
     * Require authentication on a route.
     * Fails with 401 if authentication fails.
     *
     * @example
     * // Protect entire route group
     * fastify.addHook("onRequest", fastify.requireAuth);
     *
     * @example
     * // Protect individual route
     * fastify.get("/protected", { onRequest: [fastify.requireAuth] }, handler);
     */
    requireAuth: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;

    /**
     * Require user to have at least one of the specified roles.
     * Must be used after requireAuth.
     *
     * @param allowedRoles - Array of roles, user must have at least one
     * @returns Hook function for role-based authorization
     *
     * @example
     * // Single role
     * fastify.get("/admin", {
     *   onRequest: [fastify.requireAuth, fastify.requireRoles(["admin"])],
     * }, handler);
     *
     * @example
     * // Multiple roles (user needs at least one)
     * fastify.get("/content", {
     *   onRequest: [fastify.requireAuth, fastify.requireRoles(["editor", "admin"])],
     * }, handler);
     */
    requireRoles: (
      allowedRoles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    /**
     * Authenticated user information (available after requireAuth).
     * This is the normalized user object from any auth provider.
     */
    authUser: AuthUser | null;

    /**
     * User from the database (available after authentication and user resolution).
     * This is the full user object from the database.
     */
    currentUser: GetMeResponse | null;
  }
  interface FastifyContextConfig {
    /** Marks a route as public (no authentication required) */
    public?: boolean;
  }
}
