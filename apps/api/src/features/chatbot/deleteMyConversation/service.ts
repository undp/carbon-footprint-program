import type { PrismaClient } from "@repo/database";

export const deleteConversationsForUser = async (
  prisma: PrismaClient,
  userId: bigint
): Promise<void> => {
  await prisma.chatbotChatConversation.deleteMany({
    where: { userId },
  });
};

export const deleteConversationsForSession = async (
  prisma: PrismaClient,
  sessionId: string
): Promise<void> => {
  await prisma.chatbotChatConversation.deleteMany({
    where: { sessionId },
  });
};
