import type { User as PrismaUser } from "@repo/database";
import type { User as UserAtResponse } from "@repo/types";

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
    onboardingCompleted: user.onboardingCompleted,
    onboardingCompletedAt: user.onboardingCompletedAt
      ? user.onboardingCompletedAt.toISOString()
      : null,
    lastAccessAt: user.lastAccessAt ? user.lastAccessAt.toISOString() : null,
  };
}
