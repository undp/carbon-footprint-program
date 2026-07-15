import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { cleanupTestFiles } from "@test/factories/fileFactory.js";
import { uploadFixture } from "@test/factories/storageHelper.js";
import type { FastifyInstance } from "fastify";
import { FileStatus, type PrismaClient, type User } from "@repo/database";
import {
  SystemParameterKeyEnum,
  type ConfirmLegalUploadResponse,
} from "@repo/types";
import { LEGAL_TERMS_CONDITIONS_GROUP_KEY } from "@repo/constants";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";
import { DatabaseUniqueConstraintViolationError } from "@/errors/index.js";

// Exercises the legal-document confirm flow end to end (real DB + real object
// storage), which is the only path that covers persistLegalFileRecord: the
// PDF-only guard, the serializable "single current T&C" transaction, and the
// P2002 → 409 mapping. The forced test user is SUPERADMIN, so the ADMIN/
// SUPERADMIN-gated route is reachable.

const legalBlobPath = (uuid: string, originalName: string): string =>
  `LEGAL/${LEGAL_TERMS_CONDITIONS_GROUP_KEY}/${uuid}-${originalName}`;

const readTermsParam = (prisma: PrismaClient) =>
  prisma.systemParameter.findUnique({
    where: { key: SystemParameterKeyEnum.TERMS_CONDITIONS_FILE_UUID },
  });

describe("POST /api/files/legal/confirm-upload - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageDescriptor: inject("storageDescriptor"),
    });
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestFiles(prisma);
  });

  describe("Happy path", () => {
    it("persists the File and promotes it to the current Terms & Conditions", async () => {
      const uuid = "550e8400-e29b-41d4-a716-4466554400a0";
      const originalName = "terms.pdf";
      await uploadFixture(app.storage, legalBlobPath(uuid, originalName), {
        contentType: "application/pdf",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/files/legal/confirm-upload",
        payload: { uuid, originalName },
      });

      expect(response.statusCode).toBe(201);
      expect(
        (JSON.parse(response.body) as ConfirmLegalUploadResponse).uuid
      ).toBe(uuid);

      const file = await prisma.file.findUnique({ where: { uuid } });
      expect(file).not.toBeNull();
      expect(file?.mimeType).toBe("application/pdf");
      expect(file?.blobPath).toBe(legalBlobPath(uuid, originalName));
      expect(file?.createdById).toBe(testUser.id);
      expect(file?.status).toBe(FileStatus.ACTIVE);

      // The system parameter now points at the freshly persisted file.
      expect((await readTermsParam(prisma))?.value).toBe(uuid);
    });

    it("supersedes the previous ACTIVE T&C (single-current invariant)", async () => {
      const first = "550e8400-e29b-41d4-a716-4466554400b1";
      const second = "550e8400-e29b-41d4-a716-4466554400b2";
      await uploadFixture(app.storage, legalBlobPath(first, "old.pdf"), {
        contentType: "application/pdf",
      });
      await app.inject({
        method: "POST",
        url: "/api/files/legal/confirm-upload",
        payload: { uuid: first, originalName: "old.pdf" },
      });

      await uploadFixture(app.storage, legalBlobPath(second, "new.pdf"), {
        contentType: "application/pdf",
      });
      const response = await app.inject({
        method: "POST",
        url: "/api/files/legal/confirm-upload",
        payload: { uuid: second, originalName: "new.pdf" },
      });

      expect(response.statusCode).toBe(201);
      const firstFile = await prisma.file.findUnique({
        where: { uuid: first },
      });
      const secondFile = await prisma.file.findUnique({
        where: { uuid: second },
      });
      expect(firstFile?.status).toBe(FileStatus.DELETED);
      expect(secondFile?.status).toBe(FileStatus.ACTIVE);
      expect((await readTermsParam(prisma))?.value).toBe(second);
    });
  });

  describe("Error cases", () => {
    it("rejects a non-PDF upload with 400 and removes the blob", async () => {
      const uuid = "550e8400-e29b-41d4-a716-4466554400c3";
      const originalName = "not-a-pdf.pdf";
      const blobPath = legalBlobPath(uuid, originalName);
      await uploadFixture(app.storage, blobPath, { contentType: "image/png" });

      const response = await app.inject({
        method: "POST",
        url: "/api/files/legal/confirm-upload",
        payload: { uuid, originalName },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "LEGAL_UPLOAD_VALIDATION_ERROR"
      );
      // The invalid blob is deleted so bad uploads don't accumulate.
      await expect(app.storage.headObject(blobPath)).rejects.toThrow();
      // No File row was persisted.
      expect(await prisma.file.findUnique({ where: { uuid } })).toBeNull();
    });

    it("returns 404 when the blob does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/legal/confirm-upload",
        payload: {
          uuid: "550e8400-e29b-41d4-a716-4466554400d4",
          originalName: "ghost.pdf",
        },
      });

      expect(response.statusCode).toBe(404);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_NOT_FOUND"
      );
    });

    it("returns 409 when the same uuid is confirmed twice", async () => {
      const uuid = "550e8400-e29b-41d4-a716-4466554400e5";
      const originalName = "dup.pdf";
      await uploadFixture(app.storage, legalBlobPath(uuid, originalName), {
        contentType: "application/pdf",
      });

      await app.inject({
        method: "POST",
        url: "/api/files/legal/confirm-upload",
        payload: { uuid, originalName },
      });
      const response = await app.inject({
        method: "POST",
        url: "/api/files/legal/confirm-upload",
        payload: { uuid, originalName },
      });

      expect(response.statusCode).toBe(409);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        new DatabaseUniqueConstraintViolationError().code
      );
      // The failed second confirm rolled back — the first file is still ACTIVE.
      const file = await prisma.file.findUnique({ where: { uuid } });
      expect(file?.status).toBe(FileStatus.ACTIVE);
    });

    it("returns 400 when the uuid is not a valid UUID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/legal/confirm-upload",
        payload: { uuid: "not-a-uuid", originalName: "x.pdf" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });
  });
});
