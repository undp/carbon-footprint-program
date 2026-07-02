import fp from "fastify-plugin";
import { FastifyPluginCallback, FastifyRequest } from "fastify";
import { mapUserToResponse } from "../../features/users/mappers.js";
import { Prisma } from "@repo/database";

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
        try {
          user = await prisma.user.create({
            data: {
              idpUserId: authUser.idpUserId,
              email: authUser.email,
              idpName: authUser.idpName,
              // No role set → DB default (USER). Never JIT-provision an admin.
              updatedAt: null,
            },
          });

          log.info({ userId: user.id }, "New user created");
        } catch (createError) {
          // A concurrent request on the same brand-new user's first login (e.g.
          // GET /users/me racing POST /carbon-inventories/:id/claim) may have
          // created the row between our findUnique and create. The unique
          // constraint on idpUserId surfaces that as P2002 — treat it as "already
          // created" and re-read the winner's row instead of failing the request.
          if (
            createError instanceof Prisma.PrismaClientKnownRequestError &&
            createError.code === "P2002"
          ) {
            log.info(
              { idpUserId: authUser.idpUserId },
              "User created concurrently; re-reading existing row"
            );
            user = await prisma.user.findUniqueOrThrow({
              where: { idpUserId: authUser.idpUserId },
            });
          } else {
            throw createError;
          }
        }
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
