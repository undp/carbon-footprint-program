import type { User as PrismaUser } from "@repo/database";
import {
  type User as UserAtResponse,
  type OnboardingKey,
  OnboardingKeySchema,
} from "@repo/types";

export function mapUserToResponse(user: PrismaUser): UserAtResponse {
  return {
    id: user.id.toString(),
    uuid: user.uuid,
    idpUserId: user.idpUserId,
    idpName: user.idpName,
    email: user.email,
    role: user.role,
    countryJobPositionId: user.countryJobPositionId?.toString() ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt?.toISOString() ?? null,
    createdById: user.createdById?.toString() ?? null,
    updatedById: user.updatedById?.toString() ?? null,
    termsAccepted: user.termsAccepted ?? null,
    termsAcceptedAt: user.termsAcceptedAt
      ? user.termsAcceptedAt.toISOString()
      : null,
    lastAccessAt: user.lastAccessAt ? user.lastAccessAt.toISOString() : null,
  };
}

/**
 * Derive the list of onboardings the user has resolved from their completion
 * rows. Unknown keys (e.g. a retired onboarding still stored) are dropped so a
 * stale row can never break the `me` contract.
 */
export function mapOnboardingsCompleted(
  completions: { onboardingKey: string }[]
): OnboardingKey[] {
  return completions
    .map((completion) =>
      OnboardingKeySchema.safeParse(completion.onboardingKey)
    )
    .filter((result) => result.success)
    .map((result) => result.data);
}
