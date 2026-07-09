import type { PrismaClient, User } from "@repo/database";
import { SystemRole } from "@repo/database/enums";
import { randomUUID } from "crypto";

/**
 * Gets a pre-seeded test user by email
 */
export async function getTestLoggedUser(prisma: PrismaClient): Promise<User> {
  const idpUserId = process.env.FORCED_USER_IDP_ID;
  const email = process.env.FORCED_USER_EMAIL;

  if (!idpUserId || !email) {
    throw new Error(
      "Environment variable FORCED_USER_IDP_ID or FORCED_USER_EMAIL is not set. " +
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

/**
 * Creates a test user with specified overrides
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides?: Partial<User>
): Promise<User> {
  const randomId = randomUUID();
  const defaultEmail = `test-user-${randomId}@example.com`;
  const defaultIdpUserId = `test-idp-${randomId}`;

  return await prisma.user.create({
    data: {
      email: defaultEmail,
      idpUserId: defaultIdpUserId,
      role: SystemRole.USER,
      firstName: "Test",
      lastName: "User",
      ...overrides,
    },
  });
}

/**
 * Cleans up test users created by createTestUser
 */
export async function cleanupTestUsers(prisma: PrismaClient): Promise<void> {
  // Delete users created for testing (exclude the main test user)
  const mainTestUserEmail = process.env.FORCED_USER_EMAIL;
  if (!mainTestUserEmail) {
    throw new Error(
      "Environment variable FORCED_USER_EMAIL is not set. " +
        "Please set it to the email of the main test user in the database before running tests."
    );
  }
  await prisma.user.deleteMany({
    where: {
      email: {
        not: mainTestUserEmail,
      },
      idpUserId: {
        startsWith: "test-idp-",
      },
    },
  });
}
