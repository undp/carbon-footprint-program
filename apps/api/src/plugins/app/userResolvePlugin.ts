import fp from "fastify-plugin";
import { FastifyPluginCallback, FastifyRequest } from "fastify";
import { mapUserToResponse } from "../../features/users/mappers.js";
import { EmailRegisteredUnderDifferentIdentityError } from "../../features/users/errors.js";
import { getDuplicatedFieldsFromP2002Error } from "../../errors/index.js";
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
          if (
            createError instanceof Prisma.PrismaClientKnownRequestError &&
            createError.code === "P2002"
          ) {
            const duplicatedFields =
              getDuplicatedFieldsFromP2002Error(createError);

            // An `email` collision means this email already belongs to a DIFFERENT
            // identity (a row with another idpUserId) — e.g. signing in via a new
            // auth provider against a DB that already has this email. Identity is
            // keyed on idpUserId and we don't link one email across IdP identities,
            // so fail loud with a clear 409. (The old blanket re-read masked this
            // as a misleading 404: it looked up the — nonexistent — new idpUserId
            // and hit findUniqueOrThrow's P2025.)
            if (duplicatedFields.includes("email")) {
              log.warn(
                { idpUserId: authUser.idpUserId, duplicatedFields },
                "Email already registered under a different identity"
              );
              throw new EmailRegisteredUnderDifferentIdentityError();
            }

            // Otherwise the collision is on idpUserId: a concurrent request on the
            // same brand-new user's first login (e.g. GET /users/me racing
            // POST /carbon-inventories/:id/claim) created the row between our
            // findUnique and create. Treat it as "already created" and re-read the
            // winner's row instead of failing the request.
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
