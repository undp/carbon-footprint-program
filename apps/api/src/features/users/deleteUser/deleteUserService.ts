import { type PrismaClient } from "@repo/database";

export const deleteUserService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<boolean> => {
  // Check if the user exists
  const existingUser = await prismaClient.user.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingUser) {
    return false;
  }

  // Delete the user
  await prismaClient.user.delete({
    where: { id: BigInt(id) },
  });

  return true;
};
