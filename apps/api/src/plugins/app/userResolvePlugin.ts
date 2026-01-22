import fp from "fastify-plugin";
import { FastifyPluginCallback, FastifyRequest } from "fastify";
import { mapUserToResponse } from "../../features/users/mappers.js";

const userResolvePlugin: FastifyPluginCallback = (fastify, _options, done) => {
  // Find or create user on the DB with the data of the authenticated user with oid and email and attach to request

  fastify.addHook("preHandler", async function (request: FastifyRequest) {
    const log = request.log.child({ module: "user-resolve-plugin" });

    if (!request.authUser) {
      log.debug(
        "No authenticated user on request; skipping user request population"
      );
      return;
    }
    const prisma = request.server.prisma;
    const authUser = request.authUser;

    log.info(
      {
        idpUserId: authUser.idpUserId,
      },
      "Processing authenticated user"
    );

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
        },
      });

      log.info({ userId: user.id }, "New user created");
    } else {
      log.info({ userId: user.id }, "Existing user found");
    }

    // Attach the user to the request
    request.currentUser = mapUserToResponse(user);
    log.debug({ userId: user.id }, "User attached to request");
  });

  fastify.log.info("User resolve plugin registered");
  done();
};

export default fp(userResolvePlugin, {
  name: "user-resolve-plugin",
  // Depend on JWT plugin for JWKS provider
  dependencies: ["authentication-plugin"],
});
