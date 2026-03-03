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
  .strict()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "At least one field must be provided with a defined value",
  });

export const UpdateUserParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const UpdateUserResponseSchema = UserBaseSchema;
