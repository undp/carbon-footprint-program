import type { FastifyZodInstance } from "@/types/fastify.js";
import { createReductionProjectRoute } from "@/features/reductionProjects/createReductionProject/route.js";
import { getAllReductionProjectsRoute } from "@/features/reductionProjects/getAllReductionProjects/route.js";
import { getReductionProjectByIdRoute } from "@/features/reductionProjects/getReductionProjectById/route.js";
import { updateReductionProjectRoute } from "@/features/reductionProjects/updateReductionProject/route.js";
import { submitReductionProjectRoute } from "@/features/reductionProjects/submitReductionProject/route.js";
import { approveReductionProjectRoute } from "@/features/reductionProjects/approveReductionProject/route.js";
import { rejectReductionProjectRoute } from "@/features/reductionProjects/rejectReductionProject/route.js";
import { reopenReductionProjectRoute } from "@/features/reductionProjects/reopenReductionProject/route.js";
import { getAllSealApplicationsRoute } from "@/features/reductionProjects/getAllSealApplications/route.js";
import { addReductionProjectReportRoute } from "@/features/reductionProjects/addReductionProjectReport/route.js";
import { addReductionProjectDocumentRoute } from "@/features/reductionProjects/addReductionProjectDocument/route.js";
import { objectReductionProjectRoute } from "@/features/reductionProjects/objectReductionProject/route.js";
import { deleteReductionProjectRoute } from "@/features/reductionProjects/deleteReductionProject/route.js";
import { copyReductionProjectRoute } from "@/features/reductionProjects/copyReductionProject/route.js";

export default function reductionProjectsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);

  // CRUD
  createReductionProjectRoute(fastify);
  getAllReductionProjectsRoute(fastify);
  getReductionProjectByIdRoute(fastify);
  updateReductionProjectRoute(fastify);

  // Sub-resources
  addReductionProjectReportRoute(fastify);
  addReductionProjectDocumentRoute(fastify);

  // CRUD - Delete
  deleteReductionProjectRoute(fastify);

  // Submission & Review Workflow
  submitReductionProjectRoute(fastify);
  approveReductionProjectRoute(fastify);
  rejectReductionProjectRoute(fastify);
  reopenReductionProjectRoute(fastify);
  objectReductionProjectRoute(fastify);

  // Copy
  copyReductionProjectRoute(fastify);

  // Seal Applications
  getAllSealApplicationsRoute(fastify);
}
