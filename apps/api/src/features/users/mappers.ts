import type { User } from "@repo/database";
import type { User as UserAtResponse } from "@repo/types";

export function mapUserToResponse(user: User): UserAtResponse {
  return {
    id: user.id.toString(),
    uuid: user.uuid,
    email: user.email,
    countryJobPositionId: user.countryJobPositionId.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    createdById: user.createdById?.toString() ?? null,
    updatedById: user.updatedById?.toString() ?? null,
  };
}
