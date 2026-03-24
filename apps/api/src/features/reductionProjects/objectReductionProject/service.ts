import type { PrismaClient } from "@repo/database";
import type { ObjectReductionProjectResponse, User } from "@repo/types";
import { updateReviewedProjectStatus } from "../helpers.js";

export const objectReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<ObjectReductionProjectResponse> =>
  updateReviewedProjectStatus(prismaClient, id, "OBJECTED", { status: "OBJECTED" }, user);
