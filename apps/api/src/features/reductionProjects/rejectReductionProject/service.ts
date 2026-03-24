import type { PrismaClient } from "@repo/database";
import type {
  RejectReductionProjectBody,
  RejectReductionProjectResponse,
  User,
} from "@repo/types";
import { updateReviewedProjectStatus } from "../helpers.js";

export const rejectReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  data: RejectReductionProjectBody,
  user: User | null
): Promise<RejectReductionProjectResponse> =>
  updateReviewedProjectStatus(
    prismaClient,
    id,
    "REJECTED",
    { status: "REJECTED", reviewComments: data.reviewComments },
    user
  );
