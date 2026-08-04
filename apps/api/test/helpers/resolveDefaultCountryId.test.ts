import { describe, it, expect } from "vitest";
import type { PrismaClient } from "@repo/database";
import { resolveDefaultCountryId } from "@/helpers/resolveDefaultCountryId.js";
import { ApplicationConfigError } from "@/errors/index.js";

/** Minimal stub exposing just the `country.findFirst` the helper calls. */
function fakeClient(
  result: { id: bigint } | null
): Pick<PrismaClient, "country"> {
  return {
    country: {
      findFirst: () => Promise.resolve(result),
    },
  } as unknown as Pick<PrismaClient, "country">;
}

describe("resolveDefaultCountryId", () => {
  it("returns the id of the first country", async () => {
    const id = await resolveDefaultCountryId(fakeClient({ id: 7n }));
    expect(id).toBe(7n);
  });

  it("throws ApplicationConfigError when no country is seeded", async () => {
    await expect(resolveDefaultCountryId(fakeClient(null))).rejects.toThrow(
      ApplicationConfigError
    );
  });
});
