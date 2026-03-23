import type { PrismaClient } from "@repo/database";
import type {
  AddReductionProjectReportBody,
  AddReductionProjectReportResponse,
  User,
} from "@repo/types";
import { mapReductionProjectToResponse } from "../mappers.js";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
  NegativeReductionValueError,
} from "../errors.js";

export const addReductionProjectReportService = async (
  prismaClient: PrismaClient,
  id: string,
  data: AddReductionProjectReportBody,
  user: User | null
): Promise<AddReductionProjectReportResponse> => {
  const project = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
    include: { reports: true },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  if (project.status !== "DRAFT") {
    throw new InvalidStatusTransitionError(
      id,
      project.status,
      "DRAFT (add report)"
    );
  }

  const reductionValue = data.baselineValue - data.projectValue;
  if (reductionValue < 0) {
    throw new NegativeReductionValueError(id);
  }

  await prismaClient.reductionProjectReport.upsert({
    where: {
      reductionProjectId_reductionYear: {
        reductionProjectId: BigInt(id),
        reductionYear: data.reductionYear,
      },
    },
    create: {
      reductionProjectId: BigInt(id),
      reductionYear: data.reductionYear,
      baselineValue: data.baselineValue,
      projectValue: data.projectValue,
      reductionValue,
      createdById: user ? BigInt(user.id) : null,
    },
    update: {
      baselineValue: data.baselineValue,
      projectValue: data.projectValue,
      reductionValue,
      updatedById: user ? BigInt(user.id) : null,
    },
  });

  const updated = await prismaClient.reductionProject.findUniqueOrThrow({
    where: { id: BigInt(id) },
    include: { files: true, reports: true },
  });

  return mapReductionProjectToResponse(updated);
};
