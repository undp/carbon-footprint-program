import { type PrismaClient, SystemRole } from "@repo/database";
import type { UpdateUserRoleResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";
import {
  InvalidRoleTransitionError,
  LastSuperadminError,
  SelfRoleChangeError,
  UserNotFoundError,
} from "../errors.js";
import { ALLOWED_ROLE_TRANSITIONS } from "./helpers.js";

export const updateUserRoleService = async (
  prismaClient: PrismaClient,
  targetUserId: string,
  newRole: SystemRole,
  actorUserId: string
): Promise<UpdateUserRoleResponse> => {
  if (actorUserId === targetUserId) {
    throw new SelfRoleChangeError();
  }

  const updatedUser = await prismaClient.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: BigInt(targetUserId) },
      select: { id: true, role: true },
    });

    if (!target) {
      throw new UserNotFoundError(targetUserId);
    }

    const previousRole = target.role;

    if (!ALLOWED_ROLE_TRANSITIONS[previousRole].includes(newRole)) {
      throw new InvalidRoleTransitionError();
    }

    if (previousRole === newRole) {
      return tx.user.findUniqueOrThrow({
        where: { id: BigInt(targetUserId) },
      });
    }

    if (
      previousRole === SystemRole.SUPERADMIN &&
      newRole !== SystemRole.SUPERADMIN
    ) {
      const superadminCount = await tx.user.count({
        where: { role: SystemRole.SUPERADMIN },
      });
      if (superadminCount <= 1) {
        throw new LastSuperadminError();
      }
    }

    const result = await tx.user.update({
      where: { id: BigInt(targetUserId) },
      data: {
        role: newRole,
        updatedById: BigInt(actorUserId),
      },
    });

    await tx.userRoleAudit.create({
      data: {
        userId: BigInt(targetUserId),
        previousRole,
        newRole,
        changedById: BigInt(actorUserId),
      },
    });

    return result;
  });

  return mapUserToResponse(updatedUser);
};
