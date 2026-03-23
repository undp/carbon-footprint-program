import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  AddReductionProjectDocumentParams,
  AddReductionProjectDocumentBody,
} from "@repo/types";
import { addReductionProjectDocumentService } from "./service.js";

export const addReductionProjectDocumentHandler = async (
  request: FastifyRequest<{
    Params: AddReductionProjectDocumentParams;
    Body: AddReductionProjectDocumentBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { id } = request.params;
  const body = request.body;

  log.info(`Adding document to reduction project ${id}...`);
  const result = await addReductionProjectDocumentService(
    prisma,
    id,
    body,
    user
  );

  log.info(`Document added to reduction project ${id}`);
  return reply.status(201).send(result);
};
