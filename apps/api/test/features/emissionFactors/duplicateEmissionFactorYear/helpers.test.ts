import { describe, expect, it } from "vitest";
import { Prisma } from "@repo/database";
import { toYearCopyWriteError } from "@/features/emissionFactors/duplicateEmissionFactorYear/helpers.js";

// A real unique-index collision needs a concurrent write between the copy's
// reads and its insert, which would make an integration test flaky.
describe("toYearCopyWriteError", () => {
  const knownError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError("failed", {
      code,
      clientVersion: "test",
    });

  it("turns a unique-index collision into EMISSION_FACTOR_YEAR_COPY_CONFLICT", () => {
    const error = toYearCopyWriteError(knownError("P2002"));

    expect(error).toMatchObject({
      code: "EMISSION_FACTOR_YEAR_COPY_CONFLICT",
      statusCode: 409,
    });
  });

  it("leaves any other Prisma error to the global handler", () => {
    const original = knownError("P2003");

    expect(toYearCopyWriteError(original)).toBe(original);
  });

  it("leaves a non-Prisma error as it is", () => {
    const original = new Error("boom");

    expect(toYearCopyWriteError(original)).toBe(original);
  });
});
