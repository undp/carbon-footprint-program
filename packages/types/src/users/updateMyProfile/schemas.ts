import { UserBaseSchema } from "../../baseSchemas/index.js";

export const UpdateMyProfileBodySchema = UserBaseSchema.pick({
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
  .refine((data) => Object.keys(data).length >= 1, {
    message: "At least one field must be provided",
  });

export const UpdateMyProfileResponseSchema = UserBaseSchema;
