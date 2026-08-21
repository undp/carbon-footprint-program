import { type PrismaClient, TerritoryLevel } from "@repo/database";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForPrimitiveDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * One node of the territorial hierarchy. `level` is declared per node instead of
 * being inferred from the nesting depth, so a branch may skip a level when the
 * official catalog does (a municipality whose province has no planning region,
 * say) without the seeder having to guess.
 */
type TerritoryNode = {
  name: string;
  level: TerritoryLevel;
  children?: TerritoryNode[] | undefined;
};

const TerritoryNodeSchema: z.ZodType<TerritoryNode> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    level: z.enum(TerritoryLevel),
    children: z.array(TerritoryNodeSchema).optional(),
  })
);

const TerritoryDataSchema = z.array(TerritoryNodeSchema);

/** Key of the `(parentId, level, name)` uniqueness constraint on `territory`. */
const territoryKey = (
  parentId: bigint | null,
  level: TerritoryLevel,
  name: string
) => `${parentId?.toString() ?? "root"}|${level}|${name}`;

/**
 * Rejects two siblings sharing a level and a name, which the unique constraint
 * would reject anyway — but here the error names the offending parent.
 */
const validateSiblings = (nodes: TerritoryNode[], parentName: string): void => {
  checkForPrimitiveDuplicates(
    nodes.map((node) => `${node.level}|${node.name}`),
    `territory children of '${parentName}'`
  );
  for (const node of nodes) {
    if (node.children) validateSiblings(node.children, node.name);
  }
};

const countNodes = (nodes: TerritoryNode[]): number =>
  nodes.reduce((total, node) => total + 1 + countNodes(node.children ?? []), 0);

export async function seedTerritories(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding territories...");

  // The migration loads this catalog, because `seed.ts` skips entirely once a
  // country exists and an already-populated deployment would never receive it by
  // seeding. This path stays for a database created without migrations, and
  // checks before reading the file so the common case costs one count.
  const existing = await prisma.territory.count();
  if (existing > 0) {
    console.log(`✓ Territories already present (${existing}) — skipping`);
    return;
  }

  const territoriesData = TerritoryDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "territories.json", dataset),
        "utf-8"
      )
    )
  );

  validateSiblings(territoriesData, "<root>");

  // Written depth by depth: a child needs its parent's generated id, and
  // `createMany` does not return ids. Two queries per depth (one write, one
  // read-back) keeps this linear in the depth of the hierarchy rather than in
  // the number of nodes — the official catalog reaches five levels and tens of
  // thousands of rows.
  let pending = territoriesData.map((node) => ({
    node,
    parentId: null as bigint | null,
  }));

  while (pending.length > 0) {
    await prisma.territory.createMany({
      data: pending.map(({ node, parentId }) => ({
        name: node.name,
        level: node.level,
        parentId,
        updatedAt: null,
      })),
      skipDuplicates: true,
    });

    const parentIds = [...new Set(pending.map(({ parentId }) => parentId))];
    const nonRootParentIds = parentIds.filter(
      (parentId): parentId is bigint => parentId !== null
    );
    const rows = await prisma.territory.findMany({
      where: {
        OR: [
          ...(parentIds.includes(null) ? [{ parentId: null }] : []),
          ...(nonRootParentIds.length > 0
            ? [{ parentId: { in: nonRootParentIds } }]
            : []),
        ],
      },
      select: { id: true, name: true, level: true, parentId: true },
    });
    const idByKey = new Map(
      rows.map((row) => [
        territoryKey(row.parentId, row.level, row.name),
        row.id,
      ])
    );

    pending = pending.flatMap(({ node, parentId }) => {
      const id = idByKey.get(territoryKey(parentId, node.level, node.name));
      if (!id)
        throw new Error(
          `Territory '${node.name}' (${node.level}) was not persisted for dataset ${dataset}`
        );
      return (node.children ?? []).map((child) => ({
        node: child,
        parentId: id,
      }));
    });
  }

  // Every node is verified as it is written (the read-back above throws when one
  // is missing), so there is no global count check here: the table may also hold
  // rows this file does not describe.
  console.log(
    `✓ Seeded ${countNodes(territoriesData)} territories for dataset ${dataset}`
  );
}
