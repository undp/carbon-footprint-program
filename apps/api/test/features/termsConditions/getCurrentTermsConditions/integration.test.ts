import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { randomUUID } from "crypto";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestFile } from "@test/factories/fileFactory.js";
import type { GetCurrentTermsConditionsResponse } from "@repo/types";
import { FileStatus } from "@repo/database";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

const TERMS_CONDITIONS_KEY = "TERMS_CONDITIONS_FILE_UUID";

describe("GET /api/terms-conditions/current - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    const testUser = await getTestLoggedUser(prisma);
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Restore the seeded default (empty = "no T&C configured") and remove any
    // files created for the test so runs stay isolated from one another.
    await prisma.systemParameter.update({
      where: { key: TERMS_CONDITIONS_KEY },
      data: { value: "" },
    });
    await prisma.file.deleteMany({});
  });

  it("returns fileName null when no T&C has been configured (base seeded state)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/terms-conditions/current",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCurrentTermsConditionsResponse;
    expect(body.fileName).toBeNull();
  });

  it("returns fileName null when the configured UUID has no matching file", async () => {
    await prisma.systemParameter.update({
      where: { key: TERMS_CONDITIONS_KEY },
      data: { value: randomUUID() },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/terms-conditions/current",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCurrentTermsConditionsResponse;
    expect(body.fileName).toBeNull();
  });

  it("returns fileName null when the configured file has been soft-deleted", async () => {
    const file = await createTestFile(prisma, testUserId, {
      status: FileStatus.DELETED,
      originalName: "old-terms.pdf",
    });
    await prisma.systemParameter.update({
      where: { key: TERMS_CONDITIONS_KEY },
      data: { value: file.uuid },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/terms-conditions/current",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCurrentTermsConditionsResponse;
    expect(body.fileName).toBeNull();
  });

  it("returns the file name when the current T&C file exists and is ACTIVE", async () => {
    const file = await createTestFile(prisma, testUserId, {
      status: FileStatus.ACTIVE,
      originalName: "terms-and-conditions-v2.pdf",
    });
    await prisma.systemParameter.update({
      where: { key: TERMS_CONDITIONS_KEY },
      data: { value: file.uuid },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/terms-conditions/current",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCurrentTermsConditionsResponse;
    expect(body.fileName).toBe("terms-and-conditions-v2.pdf");
  });
});
