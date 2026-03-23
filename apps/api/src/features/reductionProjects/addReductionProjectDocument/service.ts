import type { PrismaClient } from "@repo/database";
import type {
  AddReductionProjectDocumentBody,
  AddReductionProjectDocumentResponse,
  User,
} from "@repo/types";
import { mapFileToResponse } from "../mappers.js";
import {
  ReductionProjectNotFoundError,
  InvalidStatusTransitionError,
  FileTypeLimitExceededError,
} from "../errors.js";

export const addReductionProjectDocumentService = async (
  prismaClient: PrismaClient,
  id: string,
  data: AddReductionProjectDocumentBody,
  user: User | null
): Promise<AddReductionProjectDocumentResponse> => {
  const project = await prismaClient.reductionProject.findUnique({
    where: { id: BigInt(id) },
    include: { files: true },
  });

  if (!project) {
    throw new ReductionProjectNotFoundError(id);
  }

  if (project.status !== "DRAFT") {
    throw new InvalidStatusTransitionError(
      id,
      project.status,
      "DRAFT (add document)"
    );
  }

  const typeExists = project.files.some((f) => f.fileType === data.fileType);
  if (typeExists) {
    throw new FileTypeLimitExceededError(data.fileType, id);
  }

  const file = await prismaClient.reductionProjectFile.create({
    data: {
      reductionProjectId: BigInt(id),
      fileType: data.fileType,
      fileName: data.fileName,
      fileUrl: "",
      fileSizeBytes: data.fileSizeBytes ?? null,
      mimeType: data.mimeType ?? null,
      createdById: user ? BigInt(user.id) : null,
    },
  });

  return mapFileToResponse(file);
};
