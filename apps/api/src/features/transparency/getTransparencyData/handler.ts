import type { FastifyReply, FastifyRequest } from "fastify";
import { getTransparencyDataService } from "./service.js";

export const getTransparencyDataHandler = async (
  request: FastifyRequest<{ Querystring: { year?: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "transparency" });
  log.info("Getting transparency data...");

  const prisma = request.server.prisma;
  const year = request.query.year
    ? parseInt(request.query.year, 10)
    : undefined;

  const data = await getTransparencyDataService(prisma, year);

  log.info(`Transparency data found: ${data.length} organizations`);
  return reply.status(200).send(data);
};
