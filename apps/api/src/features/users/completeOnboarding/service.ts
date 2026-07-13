import type { PrismaClient } from "@repo/database";
import type { OnboardingKey } from "@repo/types";

/**
 * Idempotently record that the current user finished or dismissed an onboarding.
 * Re-completing is a no-op that preserves the original `completedAt`.
 */
export const completeOnboardingService = async (
  prismaClient: PrismaClient,
  userId: string,
  onboardingKey: OnboardingKey
): Promise<void> => {
  await prismaClient.userOnboardingCompletion.upsert({
    where: {
      userId_onboardingKey: { userId: BigInt(userId), onboardingKey },
    },
    create: { userId: BigInt(userId), onboardingKey },
    update: {},
  });
};
