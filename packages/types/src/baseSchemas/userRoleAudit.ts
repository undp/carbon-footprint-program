import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SystemRoleSchema } from "./user.js";

export const UserRoleAuditBaseSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  previousRole: SystemRoleSchema,
  newRole: SystemRoleSchema,
  changedById: IdSchema,
  createdAt: z.iso.datetime(),
  changedBy: z.object({
    id: IdSchema,
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
  }),
});

export type UserRoleAuditBase = z.infer<typeof UserRoleAuditBaseSchema>;
