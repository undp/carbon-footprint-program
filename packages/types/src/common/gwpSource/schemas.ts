import { z } from "zod";

export const GwpSourceSchema = z.enum(["IPCC_AR4", "IPCC_AR5", "IPCC_AR6"]);

export const GwpSourceEnum = GwpSourceSchema.enum;
