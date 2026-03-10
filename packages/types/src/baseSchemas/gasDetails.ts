import { z } from "zod";

export const GasDetailsSchema = z.object({
  CO2_FOSSIL: z.number().default(0).describe("CO2 fossil emissions"),
  CH4: z.number().default(0).describe("CH4 emissions"),
  N2O: z.number().default(0).describe("N2O emissions"),
  HFC: z.number().default(0).describe("HFC emissions"),
  PFC: z.number().default(0).describe("PFC emissions"),
  SF6: z.number().default(0).describe("SF6 emissions"),
  NF3: z.number().default(0).describe("NF3 emissions"),
});
