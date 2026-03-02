import { UserBaseSchema } from "../../baseSchemas/index.js";

export const UpdateUserBodySchema = UserBaseSchema.pick({
  email: true,
  countryJobPositionId: true,
  firstName: true,
  lastName: true,
  idpUserId: true,
  idpName: true,
  termsAccepted: true,
})
  .partial()
  .strict();

export const UpdateUserParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const UpdateUserResponseSchema = UserBaseSchema;
