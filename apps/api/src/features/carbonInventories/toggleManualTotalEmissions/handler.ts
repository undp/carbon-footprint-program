import type { FastifyReply, FastifyRequest } from "fastify";
import { toggleManualTotalEmissionsService } from "./service.js";
import type { ToggleManualTotalEmissionsRequest } from "@repo/types";
import type { ToggleManualTotalEmissionsParams } from "@repo/types";

export const toggleManualTotalEmissionsHandler = async (
  request: FastifyRequest<{
    Params: ToggleManualTotalEmissionsParams;
    Body: ToggleManualTotalEmissionsRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventorySubcategories" });
  const carbonInventoryId = BigInt(request.params.id);
  const subcategoryId = BigInt(request.params.subcategoryId);
  const { activated } = request.body;

  log.info(
    { carbonInventoryId, subcategoryId, activated },
    "Toggling manual total emissions mode..."
  );

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;

  await toggleManualTotalEmissionsService(
    prisma,
    carbonInventoryId,
    subcategoryId,
    activated,
    user
  );

  log.info(
    { carbonInventoryId, subcategoryId, activated },
    "Manual total emissions mode toggled successfully"
  );
  return reply.status(204).send();
};
