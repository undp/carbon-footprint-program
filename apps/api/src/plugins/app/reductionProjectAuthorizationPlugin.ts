import fp from "fastify-plugin";
import type {
  FastifyPluginCallback,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import type { OrganizationRole } from "@repo/database/enums";
import { MembershipStatus, SystemRole } from "@repo/database/enums";
import { ReductionProjectStatus } from "@repo/types";

const reductionProjectAuthorizationPlugin: FastifyPluginCallback = (
  fastify
) => {
  fastify.decorate(
    "requireReductionProjectAccess",
    function (options?: {
      requiredOrganizationRoles?: OrganizationRole[];
      canAdminsBypass?: boolean;
    }) {
      const requiredOrganizationRoles = options?.requiredOrganizationRoles;
      const canAdminsBypass = options?.canAdminsBypass;

      return async function (request: FastifyRequest, reply: FastifyReply) {
        const log = request.log.child({
          module: "reduction-project-authorization",
        });

        const reductionProjectId = (request.params as Record<string, string>)
          .id;

        /* v8 ignore next -- unreachable: every route wiring this hook supplies :id */
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

        // Bypass checks for ADMIN and SUPERADMIN system roles
        if (
          canAdminsBypass &&
          (request.currentUser.role === SystemRole.ADMIN ||
            request.currentUser.role === SystemRole.SUPERADMIN)
        ) {
          log.debug(
            {
              userId: request.currentUser.id,
              reductionProjectId,
              systemRole: request.currentUser.role,
            },
            "Reduction project authorization bypassed for admin"
          );
          return;
        }

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
            message: "You do not have access to this reduction project",
          });
        }

        log.debug(
          { userId: request.currentUser.id, reductionProjectId },
          "Reduction project authorization successful"
        );
      };
    }
  );

  fastify.log.info("Reduction project authorization plugin registered");
};

export default fp(reductionProjectAuthorizationPlugin, {
  name: "reduction-project-authorization-plugin",
  dependencies: ["authorization-plugin", "user-resolve-plugin"],
});
