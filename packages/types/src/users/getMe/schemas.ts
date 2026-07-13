import { z } from "zod";
import {
  OnboardingKeySchema,
  UserBaseSchema,
} from "../../baseSchemas/index.js";

export const GetMeResponseSchema = UserBaseSchema.extend({
  /** Onboardings the user has finished or dismissed ("don't show me again"). */
  onboardingsCompleted: z.array(OnboardingKeySchema),
}).nullable();
