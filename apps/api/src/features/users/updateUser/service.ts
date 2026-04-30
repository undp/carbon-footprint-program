import { type PrismaClient, Prisma, SystemRole } from "@repo/database";
import type { UpdateUserBody, UpdateUserResponse, User } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";
import {
  EmailAlreadyInUseError,
  IdpUserIdAlreadyInUseError,
  InvalidCountryJobPositionIdError,
  UserNotFoundError,
  SelfRoleChangeError,
  LastSuperadminError,
  InsufficientPermissionsError,
  InvalidRoleTransitionError,
} from "../errors.js";
import {
  DatabaseUniqueConstraintViolationError,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";

const ALLOWED_TRANSITIONS: Record<SystemRole, SystemRole[]> = {
  [SystemRole.USER]: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
  [SystemRole.ADMIN]: [
    SystemRole.USER,
    SystemRole.ADMIN,
    SystemRole.SUPERADMIN,
  ],
  [SystemRole.SUPERADMIN]: [
    SystemRole.USER,
    SystemRole.ADMIN,
    SystemRole.SUPERADMIN,
  ],
};

export const updateUserService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateUserBody,
  actor: User | null
): Promise<UpdateUserResponse> => {
  if ("role" in data) {
    return handleAdminRoleUpdate(prismaClient, id, data.role, actor);
  }
  return handleSelfProfileUpdate(prismaClient, id, data, actor);
};

async function handleSelfProfileUpdate(
  prismaClient: PrismaClient,
  id: string,
  data: Exclude<UpdateUserBody, { role: SystemRole }>,
  actor: User | null
): Promise<UpdateUserResponse> {
  if (!actor || actor.id !== id) {
    throw new InsufficientPermissionsError();
  }

  const updateData: Prisma.UserUncheckedUpdateInput = {};

  if (data.email !== undefined) {
    updateData.email = data.email;
  }
  if (data.countryJobPositionId !== undefined) {
    updateData.countryJobPositionId =
      data.countryJobPositionId === null
        ? null
        : BigInt(data.countryJobPositionId);
  }
  if (data.firstName !== undefined) {
    updateData.firstName = data.firstName;
  }
  if (data.lastName !== undefined) {
    updateData.lastName = data.lastName;
  }
  if (data.idpUserId !== undefined) {
    updateData.idpUserId = data.idpUserId;
  }
  if (data.idpName !== undefined) {
    updateData.idpName = data.idpName ?? null;
  }
  if (data.termsAccepted !== undefined) {
    updateData.termsAccepted = data.termsAccepted;
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedById = BigInt(actor.id);
  }

  try {
    const updatedUser = await prismaClient.user.update({
      where: { id: BigInt(id) },
      data: updateData,
    });
    return mapUserToResponse(updatedUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new UserNotFoundError(id);
      }
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("idp_user_id")) {
          throw new IdpUserIdAlreadyInUseError();
        }
        if (duplicatedFields.includes("email")) {
          throw new EmailAlreadyInUseError();
        }
        throw new DatabaseUniqueConstraintViolationError();
      }
      if (error.code === "P2003") {
        throw new InvalidCountryJobPositionIdError();
      }
    }
    throw error;
  }
}

async function handleAdminRoleUpdate(
  prismaClient: PrismaClient,
  id: string,
  newRole: SystemRole,
  actor: User | null
): Promise<UpdateUserResponse> {
  if (!actor || actor.role !== SystemRole.SUPERADMIN) {
    throw new InsufficientPermissionsError();
  }

  if (actor.id === id) {
    throw new SelfRoleChangeError();
  }

  const updatedUser = await prismaClient.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, role: true },
    });

    if (!target) {
      throw new UserNotFoundError(id);
    }

    const previousRole = target.role;

    if (!ALLOWED_TRANSITIONS[previousRole].includes(newRole)) {
      throw new InvalidRoleTransitionError();
    }

    if (previousRole === newRole) {
      return tx.user.findUniqueOrThrow({ where: { id: BigInt(id) } });
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
      where: { id: BigInt(id) },
      data: {
        role: newRole,
        updatedById: BigInt(actor.id),
      },
    });

    await tx.userRoleAudit.create({
      data: {
        userId: BigInt(id),
        previousRole,
        newRole,
        changedById: BigInt(actor.id),
      },
    });

    return result;
  });

  return mapUserToResponse(updatedUser);
}
