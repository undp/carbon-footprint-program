import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { createTestApp } from "@test/factories/appFactory.js";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";
import { getSystemParameterIntValue } from "@/helpers/getSystemParameterIntValue.js";
import { ApplicationConfigError } from "@/errors/index.js";

const TEST_KEY = "TEST_PARAM_HELPERS";

describe("system parameter helpers", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.systemParameter.deleteMany({ where: { key: TEST_KEY } });
  });

  async function createParam(overrides: {
    value: string;
    minValue?: number | null;
    maxValue?: number | null;
  }) {
    await prisma.systemParameter.create({
      data: {
        key: TEST_KEY,
        value: overrides.value,
        description: "test",
        type: "INTEGER",
        minValue: overrides.minValue ?? null,
        maxValue: overrides.maxValue ?? null,
      },
    });
  }

  describe("getSystemParameterValue", () => {
    it("returns the stored value when the parameter exists", async () => {
      await createParam({ value: "hello" });
      expect(await getSystemParameterValue(prisma, TEST_KEY)).toBe("hello");
    });

    it("returns null when the parameter does not exist", async () => {
      expect(
        await getSystemParameterValue(prisma, "DOES_NOT_EXIST")
      ).toBeNull();
    });
  });

  describe("getSystemParameterIntValue", () => {
    it("returns the parsed integer within bounds", async () => {
      await createParam({ value: "5", minValue: 1, maxValue: 10 });
      expect(await getSystemParameterIntValue(prisma, TEST_KEY)).toBe(5);
    });

    it("returns the parsed integer when no bounds are set", async () => {
      await createParam({ value: "42", minValue: null, maxValue: null });
      expect(await getSystemParameterIntValue(prisma, TEST_KEY)).toBe(42);
    });

    it("throws when the parameter is missing", async () => {
      await expect(
        getSystemParameterIntValue(prisma, "DOES_NOT_EXIST")
      ).rejects.toThrow(ApplicationConfigError);
    });

    it("throws when the value is not an integer", async () => {
      await createParam({ value: "abc" });
      await expect(
        getSystemParameterIntValue(prisma, TEST_KEY)
      ).rejects.toThrow(ApplicationConfigError);
    });

    it("throws when the value is below the configured minimum", async () => {
      await createParam({ value: "0", minValue: 1 });
      await expect(
        getSystemParameterIntValue(prisma, TEST_KEY)
      ).rejects.toThrow(/below configured minimum/);
    });

    it("throws when the value is above the configured maximum", async () => {
      await createParam({ value: "100", maxValue: 10 });
      await expect(
        getSystemParameterIntValue(prisma, TEST_KEY)
      ).rejects.toThrow(/above configured maximum/);
    });
  });
});
