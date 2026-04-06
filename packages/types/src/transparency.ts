import { z } from "zod";

export const TransparencyCompanySchema = z
  .object({
    companyName: z.string().describe("The name of the company"),
    sectorName: z.string().nullable().describe("The sector/rubro name"),
    subsectorName: z
      .string()
      .nullable()
      .describe("The subsector/sub-rubro name"),
    recognitions: z
      .object({
        measurement: z
          .boolean()
          .describe("Whether the company has a measurement diploma"),
        verification: z
          .boolean()
          .describe("Whether the company has a verification seal"),
        reduction: z
          .boolean()
          .describe("Whether the company has a reduction seal"),
      })
      .describe("Recognition seals granted to the company"),
    years: z
      .array(z.number().int())
      .describe("Years for which the company has inventories"),
  })
  .strict();

export const GetTransparencyDataResponseSchema = z.array(
  TransparencyCompanySchema
);

export type TransparencyCompany = z.infer<typeof TransparencyCompanySchema>;
export type GetTransparencyDataResponse = z.infer<
  typeof GetTransparencyDataResponseSchema
>;
