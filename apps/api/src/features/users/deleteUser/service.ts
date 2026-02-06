import { type PrismaClient } from "@repo/database";
import { UserNotFoundError } from "../errors.js";

export const deleteUserService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<void> => {
  const userId = BigInt(id);

  const existingUser = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new UserNotFoundError(id);
  }

  await prismaClient.user.delete({
    where: { id: userId },
  });
};
