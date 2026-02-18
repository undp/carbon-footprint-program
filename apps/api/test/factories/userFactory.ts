import type { PrismaClient, User } from "@repo/database";

/**
 * Gets a pre-seeded test user by email
 */
export async function getTestLoggedUser(prisma: PrismaClient): Promise<User> {
  const idpUserId = process.env.FORCED_USER_IDP_ID_WHEN_NO_PROVIDER;
  const email = process.env.FORCED_USER_EMAIL_WHEN_NO_PROVIDER;

  if (!idpUserId || !email) {
    throw new Error(
      "Environment variable FORCED_USER_IDP_ID_WHEN_NO_PROVIDER or FORCED_USER_EMAIL_WHEN_NO_PROVIDER is not set. " +
        "Please set them to the IDP ID and email of a pre-seeded test user in the database before running tests."
    );
  }
  const user = await prisma.user.findUnique({
    where: { email, idpUserId },
  });

  if (!user) {
    throw new Error(
      `Test user with email '${email}' and IDP ID '${idpUserId}' not found in database. ` +
        "Please ensure the database is properly seeded with test users before running tests and also the environment variables properly set."
    );
  }

  return user;
}
