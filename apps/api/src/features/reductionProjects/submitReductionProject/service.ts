import type { PrismaClient } from "@repo/database";
import type {
  SubmitReductionProjectResponse,
  User,
} from "@repo/types";
import { mapReductionProjectToResponse } from "../mappers.js";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
  IncompleteProjectError,
  MissingRequiredDocumentsError,
} from "../errors.js";

const REQUIRED_FILE_TYPES = [
  "REDUCTION_REPORT",
  "VERIFICATION_REPORT",
  "SELF_DECLARATION",
] as const;

export const submitReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<SubmitReductionProjectResponse> => {
  const project = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
    include: { files: true, reports: true },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  if (project.status !== "DRAFT") {
    throw new InvalidStatusTransitionError(id, project.status, "IN_REVIEW");
  }

  // Validate required fields
  const missingFields: string[] = [];
  if (!project.name) missingFields.push("name");
  if (!project.implementationDate) missingFields.push("implementationDate");
  if (!project.subcategoryId) missingFields.push("subcategoryId");
  if (!project.selectedGases || project.selectedGases.length === 0)
    missingFields.push("selectedGases");
  if (project.reportedInOtherInitiative && !project.otherInitiativeDescription)
    missingFields.push("otherInitiativeDescription");

  if (missingFields.length > 0) {
    throw new IncompleteProjectError(id, missingFields.join(", "));
  }

  // Validate at least one report
  if (project.reports.length === 0) {
    throw new IncompleteProjectError(id, "reports (at least one required)");
  }

  // Validate required document types
  const existingFileTypes = new Set(project.files.map((f) => f.fileType));
  const missingDocTypes = REQUIRED_FILE_TYPES.filter(
    (t) => !existingFileTypes.has(t)
  );
  if (missingDocTypes.length > 0) {
    throw new MissingRequiredDocumentsError(id, missingDocTypes.join(", "));
  }

  const updated = await prismaClient.$transaction(async (tx) => {
    // Check if a submission subject already exists (re-submission after rejection)
    const existingJoin =
      await tx.submissionSubjectReductionProject.findUnique({
        where: { reductionProjectId: BigInt(id) },
      });

    let subjectId: bigint;

    if (existingJoin) {
      subjectId = existingJoin.subjectId;
    } else {
      const submissionSubject = await tx.submissionSubject.create({
        data: {
          createdById: user ? BigInt(user.id) : null,
        },
      });

      await tx.submissionSubjectReductionProject.create({
        data: {
          subjectId: submissionSubject.id,
          reductionProjectId: BigInt(id),
        },
      });

      subjectId = submissionSubject.id;
    }

    await tx.submission.create({
      data: {
        subjectId,
        type: "REDUCTION_PLAN_VERIFICATION",
        status: "PENDING",
        createdById: user ? BigInt(user.id) : null,
      },
    });

    return tx.reductionProject.update({
      where: { id: BigInt(id) },
      data: {
        status: "IN_REVIEW",
        updatedById: user ? BigInt(user.id) : null,
      },
      include: { files: true, reports: true },
    });
  });

  return mapReductionProjectToResponse(updated);
};
