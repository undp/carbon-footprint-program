import type { PrismaClient } from "@repo/database";
import type { GetSuggestedReductionPlanResponse } from "@repo/types";
import { fetchInventory } from "../resultsShared.js";

// TODO: implement real reduction plan logic (could be AI-generated in the future)
export const getSuggestedReductionPlanService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetSuggestedReductionPlanResponse> => {
  // Validate the inventory exists
  await fetchInventory(prismaClient, id);

  return {
    summary:
      "Reducir las emisiones de proceso y combustión, en línea con la Ley Marco de Cambio Climático y los objetivos globales del sector.",
    items: [
      "Optimizar procesos productivos para reducir emisiones directas.",
      "Mejorar la eficiencia energética en instalaciones y equipos.",
      "Aumentar el uso de energías renovables y combustibles alternativos.",
      "Reducir consumos eléctricos con equipos eficientes.",
      "Optimizar transportes internos y despachos para bajar uso de combustible.",
    ],
  };
};
