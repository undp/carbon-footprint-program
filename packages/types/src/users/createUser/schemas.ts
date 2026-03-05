import { UserBaseSchema } from "../../baseSchemas/index.js";

export const CreateUserBodySchema = UserBaseSchema.pick({
  email: true,
  countryJobPositionId: true,
  idpUserId: true,
  idpName: true,
  firstName: true,
  lastName: true,
}).strict();

export const CreateUserResponseSchema = UserBaseSchema;
