import { z } from "zod";
import type {
  UpdateMyProfileBodySchema,
  UpdateMyProfileResponseSchema,
} from "./schemas.ts";

export type UpdateMyProfileBody = z.infer<typeof UpdateMyProfileBodySchema>;

export type UpdateMyProfileResponse = z.infer<
  typeof UpdateMyProfileResponseSchema
>;
