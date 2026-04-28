import { uuid, z } from "zod";
import { IdSchema } from "../zod.js";
import { SystemRole } from "@repo/database/enums";

export const SystemRoleSchema = z.enum(SystemRole);

export const UserBaseSchema = z.object({
  id: IdSchema.describe("The ID of the user"),
  uuid: uuid().describe("The UUID of the user"),
  idpUserId: z
    .string()
    .nullable()
    .describe("The ID of the user in the identity provider"),
  idpName: z.string().nullable().describe("The name of the identity provider"),
  email: z.email().nullable().describe("The email address of the user"),
  role: SystemRoleSchema.describe("The role of the user"),
  countryJobPositionId: IdSchema.nullable().describe(
    "The ID of the user's country job position"
  ),
  firstName: z.string().nullable().describe("The first name of the user"),
  lastName: z.string().nullable().describe("The last name of the user"),
  createdAt: z.iso.datetime().describe("The date the user was created"),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The date the user was last updated"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created this user"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated this user"
  ),
  termsAccepted: z
    .boolean()
    .describe("Whether the user has accepted the terms"),
  termsAcceptedAt: z.iso
    .datetime()
    .nullable()
    .describe("The date the user accepted the terms"),
  lastAccessAt: z.iso
    .datetime()
    .nullable()
    .describe("The date the user last accessed the app"),
});

export type User = z.infer<typeof UserBaseSchema>;
