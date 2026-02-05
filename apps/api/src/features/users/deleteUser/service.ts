import { type PrismaClient } from "@repo/database";

export const deleteUserService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<boolean> => {
  const userId = BigInt(id);

  // Check if the user exists
  const existingUser = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    return false;
  }

  // Delete the user
  await prismaClient.user.delete({
    where: { id: userId },
  });

  return true;
};
