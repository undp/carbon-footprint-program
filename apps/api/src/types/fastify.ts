import { PrismaClient } from "@repo/database";
import type {
  FastifyInstance,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
} from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { ContainerClient, BlobServiceClient } from "@azure/storage-blob";
import type { AuthService, AuthUser } from "@/auth/index.js";
import type { GetMeResponse } from "@repo/types";
import type { SystemRole, OrganizationRole } from "@repo/database/enums";
import type {
  OrganizationIdExtractorFn,
  RequireOrganizationRoleOptions,
} from "@/plugins/app/organizationAuthorizationPlugin.js";
import { RequireCarbonInventoryAccessOptions } from "@/plugins/app/carbonInventoryAuthorizationPlugin.js";
import { IdExtractor } from "@/helpers/idRequestExtractor.js";

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
     * Azure Blob Storage service client for SAS token generation.
     * Undefined when AZURE_STORAGE_ACCOUNT_NAME is not configured.
     */
    blobServiceClient?: BlobServiceClient;

    /**
     * Azure Blob Storage container client for file uploads/downloads.
     * Undefined when AZURE_STORAGE_ACCOUNT_NAME is not configured.
     */
    blobStorage?: ContainerClient;

    /**
     * Azure Storage Account name (validated at startup).
     * Undefined when AZURE_STORAGE_ACCOUNT_NAME is not configured.
     */
    storageAccountName?: string;

    /**
     * Azure Blob Storage container name.
     * Undefined when AZURE_STORAGE_CONTAINER_NAME is not configured.
     */
    storageContainerName?: string;

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
     *   onRequest: [fastify.requireAuth, fastify.requireRoles([SystemRole.ADMIN])],
     * }, handler);
     *
     * @example
     * // Multiple roles (user needs at least one)
     * fastify.get("/content", {
     *   onRequest: [fastify.requireAuth, fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])],
     * }, handler);
     */
    requireRoles: (
      allowedRoles: SystemRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    /**
     * Require user to have at least one of the specified roles within an organization.
     * Must be used after requireAuth.
     *
     * @param organizationIdExtractor - Function to extract organization ID from request
     * @param options.requiredOrganizationRoles - When omitted, any active membership grants access. Otherwise, user must have one of these roles.
     * @param options.canAdminsBypass - When true, ADMIN and SUPERADMIN system roles bypass org checks
     * @returns Hook function for organization role-based authorization
     *
     * @example
     * // Define extractor
     * const extractOrgId: OrganizationIdExtractor = async (request) =>
     *   request.params.organizationId;
     *
     * // Use in route
     * fastify.post("/organizations/:organizationId/users", {
     *   onRequest: [fastify.requireAuth],
     *   preHandler: [
     *     fastify.requireOrganizationRole(
     *       extractOrgId,
     *       { requiredOrganizationRoles: [OrganizationRole.ADMIN], canAdminsBypass: true }
     *     )
     *   ]
     * }, handler);
     */
    requireOrganizationRole: (
      organizationIdExtractor: OrganizationIdExtractorFn,
      options: RequireOrganizationRoleOptions
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    /**
     * Require user to have access to a specific carbon inventory.
     * Access is granted if the user created the inventory or has an active
     * membership in the inventory's organization.
     * Must be used after requireAuth.
     *
     * @param carbonInventoryIdExtractor - Function to extract carbon inventory ID from request
     * @returns Hook function for carbon inventory access authorization
     *
     * @example
     * ```typescript
     * import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";
     *
     * fastify.get("/:id", {
     *   onRequest: [fastify.requireAuth],
     *   preHandler: [
     *     fastify.requireCarbonInventoryAccess(idRequestExtractor)
     *   ],
     * }, handler);
     * ```
     */
    requireCarbonInventoryAccess: <P extends Record<string, string>>(
      carbonInventoryIdExtractor: IdExtractor<P>,
      options?: RequireCarbonInventoryAccessOptions
    ) => (
      request: FastifyRequest<{ Params: P }>,
      reply: FastifyReply
    ) => Promise<void>;

    /**
     * Require access to a reduction project (creator or active org member).
     */
    requireReductionProjectAccess: (options?: {
      requiredOrganizationRoles?: OrganizationRole[];
      canAdminsBypass?: boolean;
    }) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    /**
     * Authenticated user information (available after requireAuth).
     * This is the normalized user object from any auth provider.
     */
    authUser?: AuthUser | null;

    /**
     * User from the database (available after authentication and user resolution).
     * This is the full user object from the database.
     */
    currentUser?: GetMeResponse | null;
  }
  interface FastifyContextConfig {
    /** Marks a route as truly public — no authentication or credentials required. */
    allowPublicAccess?: boolean;
    /**
     * Marks a route as supporting anonymous access via an alternative credential
     * (e.g. the `x-carbon-inventory-uuid` header). The route still works for
     * authenticated users, but does not 401 when no bearer token is present —
     * the route's own preHandler is responsible for validating the alternative
     * credential and granting access.
     */
    allowAnonymousAccess?: boolean;
  }
}
