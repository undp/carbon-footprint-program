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
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { AddReductionProjectDocumentResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestReductionProject,
  createTestReductionProjectFile,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import { ReductionProjectFileType } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("POST /api/reduction-projects/:id/documents - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let organizationId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    await getTestLoggedUser(prisma);
    const org = await createTestOrganization(prisma);
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestReductionProjects(prisma);
    await cleanupTestOrganization(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestReductionProjects(prisma);
  });

  describe("Happy path", () => {
    it("should add a document and return the file metadata", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/documents`,
        payload: {
          fileType: "REDUCTION_REPORT",
          fileName: "reduction-report.pdf",
          fileSizeBytes: 102400,
          mimeType: "application/pdf",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as AddReductionProjectDocumentResponse;
      expect(body.id).toBeTruthy();
      expect(body.fileType).toBe("REDUCTION_REPORT");
      expect(body.fileName).toBe("reduction-report.pdf");
      expect(body.reductionProjectId).toBe(project.id.toString());
    });

    it("should allow all 3 different file types", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      for (const fileType of ["REDUCTION_REPORT", "VERIFICATION_REPORT", "SELF_DECLARATION"] as const) {
        const response = await app.inject({
          method: "POST",
          url: `/api/reduction-projects/${project.id}/documents`,
          payload: { fileType, fileName: `${fileType}.pdf` },
        });
        expect(response.statusCode).toBe(201);
      }

      const files = await prisma.reductionProjectFile.findMany({
        where: { reductionProjectId: project.id },
      });
      expect(files).toHaveLength(3);
    });
  });

  describe("Error cases", () => {
    it("should return 400 when a file of the same type already exists", async () => {
      const project = await createTestReductionProject(prisma, organizationId);
      await createTestReductionProjectFile(
        prisma,
        project.id,
        ReductionProjectFileType.REDUCTION_REPORT
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/documents`,
        payload: {
          fileType: "REDUCTION_REPORT",
          fileName: "duplicate.pdf",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_TYPE_LIMIT_EXCEEDED");
    });

    it("should return 422 when project is not in DRAFT status", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        status: "IN_REVIEW",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/documents`,
        payload: { fileType: "REDUCTION_REPORT", fileName: "test.pdf" },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("should return 404 when project does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects/99999999/documents",
        payload: { fileType: "REDUCTION_REPORT", fileName: "test.pdf" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 when fileName is empty", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/documents`,
        payload: { fileType: "REDUCTION_REPORT", fileName: "" },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
