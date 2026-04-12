/**
 * Access rules (authenticated requests only):
 * - Project without organization: only the creator has access.
 * - Project with organization: active org members; optional role filter.
 */

import fp from "fastify-plugin";
import type {
  FastifyPluginCallback,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import type { OrganizationRole } from "@repo/database/enums";
import { MembershipStatus } from "@repo/database/enums";
import { ReductionProjectStatus } from "@repo/types";

export type ReductionProjectIdExtractor<
  P extends Record<string, string> = Record<string, string>,
> = (request: FastifyRequest<{ Params: P }>) => string | null | undefined;

export type RequireReductionProjectAccessFunction = <
  P extends Record<string, string>,
>(
  reductionProjectIdExtractor: ReductionProjectIdExtractor<P>,
  options?: { requiredOrganizationRoles?: OrganizationRole[] }
) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

const reductionProjectAuthorizationPlugin: FastifyPluginCallback = (
  fastify
) => {
  fastify.decorate("requireReductionProjectAccess", function <
    P extends Record<string, string>,
  >(reductionProjectIdExtractor: ReductionProjectIdExtractor<P>, options?: { requiredOrganizationRoles?: OrganizationRole[] }) {
    const requiredOrganizationRoles = options?.requiredOrganizationRoles;

    return async function (
      request: FastifyRequest<{ Params: P }>,
      reply: FastifyReply
    ) {
      const log = request.log.child({
        module: "reduction-project-authorization",
      });

      const reductionProjectId = reductionProjectIdExtractor(request);

      if (!reductionProjectId) {
        log.warn(
          "Reduction project authorization check failed: reduction project ID not found"
        );
        return reply.status(400).send({
          code: "BAD_REQUEST",
          message: "Reduction project ID is required",
        });
      }

      if (!request.authUser || !request.currentUser) {
        log.warn(
          "Reduction project authorization failed: authentication required"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this reduction project",
        });
      }

      const userId = BigInt(request.currentUser.id);

      const project = await fastify.prisma.reductionProject.findFirst({
        where: {
          id: BigInt(reductionProjectId),
          status: ReductionProjectStatus.ACTIVE,
        },
        select: {
          id: true,
          status: true,
          createdById: true,
          organizationId: true,
          organization: {
            select: {
              memberships: {
                where: {
                  userId,
                  status: MembershipStatus.ACTIVE,
                },
                select: { role: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!project || project.status === ReductionProjectStatus.DELETED) {
        log.warn(
          {
            userId: request.currentUser.id,
            reductionProjectId,
          },
          "Reduction project authorization failed: project not found or deleted"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this reduction project",
        });
      }

      const membership = project.organization?.memberships?.[0];

      if (!project.organizationId && project.createdById !== userId) {
        log.warn(
          {
            userId: request.currentUser.id,
            reductionProjectId,
          },
          "Reduction project authorization failed: user is not the creator"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this reduction project",
        });
      }

      if (project.organizationId && !membership) {
        log.warn(
          {
            userId: request.currentUser.id,
            reductionProjectId,
            organizationId: project.organizationId.toString(),
          },
          "Reduction project authorization failed: user is not an org member"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this reduction project",
        });
      }

      if (
        project.organizationId &&
        membership &&
        requiredOrganizationRoles &&
        requiredOrganizationRoles.length > 0 &&
        !requiredOrganizationRoles.includes(membership.role)
      ) {
        log.warn(
          {
            userId: request.currentUser.id,
            reductionProjectId,
            userRole: membership.role,
            requiredRoles: requiredOrganizationRoles,
          },
          "Reduction project authorization failed: insufficient org permissions"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "Insufficient permissions for this organization",
        });
      }

      log.debug(
        { userId: request.currentUser.id, reductionProjectId },
        "Reduction project authorization successful"
      );
    };
  });

  fastify.log.info("Reduction project authorization plugin registered");
};

export default fp(reductionProjectAuthorizationPlugin, {
  name: "reduction-project-authorization-plugin",
  dependencies: [
    "prisma-plugin",
    "authorization-plugin",
    "user-resolve-plugin",
  ],
});
