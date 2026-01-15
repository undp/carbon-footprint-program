import type { Prisma } from "@repo/database";

export type LineWithInputs = Prisma.CarbonInventoryLineGetPayload<{
  include: {
    inputs: {
      where: { isActive: true };
      take: 1;
    };
  };
}>;

/**
 * Ensures there is only one DIRECT line per subcategory by marking duplicates as DELETED.
 * Returns the most recent DIRECT line or undefined if none exists.
 */
export const cleanupDirectLines = async (
  tx: Prisma.TransactionClient,
  lines: LineWithInputs[],
  deletedStatusId: bigint
) => {
  const allDirectLines = lines.filter(
    (l) => l.inputs[0]?.inputType === "DIRECT"
  );
  if (allDirectLines.length > 1) {
    // Find the most recent DIRECT line (by id or createdAt)
    const sortedDirectLines = [...allDirectLines].sort((a, b) =>
      Number(b.id - a.id)
    );
    const [mostRecent, ...toDelete] = sortedDirectLines;

    if (toDelete.length > 0) {
      await tx.carbonInventoryLine.updateMany({
        where: { id: { in: toDelete.map((l) => l.id) } },
        data: { statusId: deletedStatusId },
      });
    }
    return mostRecent;
  }
  return allDirectLines[0];
};
