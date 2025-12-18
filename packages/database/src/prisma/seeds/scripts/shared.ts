import { z } from "zod";
import { type Prisma } from "../../../index.js";

type RoleData = Pick<Prisma.roleCreateInput, "name" | "description">[];

export const RoleDataSchema: z.ZodType<RoleData> = z.array(
  z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  })
);
