import { MethodologyVersionStatus, PrismaClient } from "@repo/database";

export const restoreMethodologies = async (prisma: PrismaClient) => {
  await prisma.methodologyVersion.deleteMany({
    where: { name: { startsWith: "Test - " } },
  });
  const initialMethodology = await prisma.methodologyVersion.findFirst();
  await prisma.methodologyVersion.update({
    where: {
      id: initialMethodology!.id,
    },
    data: {
      status: MethodologyVersionStatus.PUBLISHED,
    },
  });
};
