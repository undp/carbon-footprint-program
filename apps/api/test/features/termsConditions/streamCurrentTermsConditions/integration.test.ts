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
import { resolveCurrentTermsConditionsBlob } from "@/features/termsConditions/streamCurrentTermsConditions/service.js";
import { FileStatus } from "@repo/database";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

const TERMS_CONDITIONS_KEY = "TERMS_CONDITIONS_FILE_UUID";

describe("GET /api/terms-conditions/file - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    // No storageDescriptor: this endpoint's success path streams bytes from
    // object storage, which is out of scope here (see note below). The
    // throwing storage adapter installed by default is never exercised
    // because every case below is resolved (404) before `storage` is touched.
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
    await prisma.systemParameter.update({
      where: { key: TERMS_CONDITIONS_KEY },
      data: { value: "" },
    });
    await prisma.file.deleteMany({});
  });

  describe("Not-found branches (no storage access)", () => {
    it("returns 404 when no T&C has been configured (base seeded state)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/terms-conditions/file",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_NOT_FOUND");
    });

    it("returns 404 when the configured UUID has no matching file", async () => {
      await prisma.systemParameter.update({
        where: { key: TERMS_CONDITIONS_KEY },
        data: { value: randomUUID() },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/terms-conditions/file",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_NOT_FOUND");
    });

    it("returns 404 when the configured file has been soft-deleted", async () => {
      const file = await createTestFile(prisma, testUserId, {
        status: FileStatus.DELETED,
      });
      await prisma.systemParameter.update({
        where: { key: TERMS_CONDITIONS_KEY },
        data: { value: file.uuid },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/terms-conditions/file",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_NOT_FOUND");
    });
  });

  // The "file found" success path additionally streams the object from
  // storage (`storage.streamObject`), which needs a real backend (Azurite/
  // MinIO via a storageDescriptor) wired through the storage-provider test
  // legs. Exercising that here would either require real storage (out of
  // scope for this feature's assignment) or hit the intentionally-loud
  // throwing test adapter. Instead, the resolver that feeds the handler is
  // covered directly and fully (both branches of both `if`s in
  // `resolveCurrentTermsConditionsBlob`) below, without touching storage.
  describe("resolveCurrentTermsConditionsBlob (service-level, no storage)", () => {
    it("returns null when no fileUuid is configured", async () => {
      const result = await resolveCurrentTermsConditionsBlob(prisma);
      expect(result).toBeNull();
    });

    it("returns the file coordinates when a current T&C file exists", async () => {
      const file = await createTestFile(prisma, testUserId, {
        status: FileStatus.ACTIVE,
        originalName: "terms.pdf",
        mimeType: "application/pdf",
        blobPath: "legal/terms.pdf",
      });
      await prisma.systemParameter.update({
        where: { key: TERMS_CONDITIONS_KEY },
        data: { value: file.uuid },
      });

      const result = await resolveCurrentTermsConditionsBlob(prisma);

      expect(result).toEqual({
        blobPath: "legal/terms.pdf",
        mimeType: "application/pdf",
        originalName: "terms.pdf",
      });
    });
  });
});
