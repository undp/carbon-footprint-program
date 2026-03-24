import type { PrismaClient } from "@repo/database";
import type { ApproveReductionProjectResponse, User } from "@repo/types";
import { updateReviewedProjectStatus } from "../helpers.js";

export const approveReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<ApproveReductionProjectResponse> =>
  updateReviewedProjectStatus(prismaClient, id, "APPROVED", { status: "APPROVED" }, user);
