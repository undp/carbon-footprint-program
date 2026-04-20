import fp from "fastify-plugin";
import { FastifyPluginCallback, FastifyRequest } from "fastify";
import { mapUserToResponse } from "../../features/users/mappers.js";
import { authService } from "../../auth/index.js";
import { SystemRole } from "@repo/database";
import { IS_PROD } from "../../config/environment.js";

const userResolvePlugin: FastifyPluginCallback = (fastify, _options, done) => {
  // Find or create user on the DB with the data of the authenticated user with oid and email and attach to request

  fastify.addHook("preHandler", async function (request: FastifyRequest) {
    const log = request.log.child({ module: "user-resolve-plugin" });

    if (!authService.isEnabled()) {
      log.debug("AUTH_PROVIDER was not set; skipping user resolution");

      return;
    }

    if (!request.authUser) {
      log.debug(
        "No authenticated user on request; skipping user request population"
      );
      return;
    }
    const prisma = request.server.prisma;
    const authUser = request.authUser;

    log.debug(
      {
        idpUserId: authUser.idpUserId,
      },
      "Processing authenticated user"
    );

    try {
      // Find existing user by idpUserId
      let user = await prisma.user.findUnique({
        where: { idpUserId: authUser.idpUserId },
      });

      // If not found, create new user
      if (!user) {
        log.info(
          { idpUserId: authUser.idpUserId },
          "User not found; creating new user"
        );
        user = await prisma.user.create({
          data: {
            idpUserId: authUser.idpUserId,
            email: authUser.email,
            idpName: authUser.idpName,
            role: IS_PROD ? SystemRole.USER : SystemRole.SUPERADMIN, // In local, create users as ADMIN for easier testing
            updatedAt: null,
          },
        });

        log.info({ userId: user.id }, "New user created");
      } else {
        log.debug({ userId: user.id }, "Existing user found");
      }

      // Attach the user to the request
      request.currentUser = mapUserToResponse(user);
      log.debug({ userId: user.id }, "User attached to request");
    } catch (error) {
      log.error(
        { error, idpUserId: authUser.idpUserId },
        "Failed to resolve user"
      );
      throw error; // Re-throw to trigger error handler
    }
  });

  fastify.log.info("User resolve plugin registered");
  done();
};

export default fp(userResolvePlugin, {
  name: "user-resolve-plugin",
  // Depend on JWT plugin for JWKS provider
  dependencies: ["authentication-plugin"],
});
