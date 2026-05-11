import {
  SyncCarbonInventoryLinesRequest,
  SyncCreateLineItem,
  SyncUpdateLineItem,
  SyncDeleteLineItem,
  InputTypeSchema,
} from "@repo/types";
import { EmissionCaptureFormLine } from "../types/EmissionCaptureTypes";
import { toNullableNumber } from "@/utils/number";

/**
 * Maps common fields shared between create and update requests
 */
function mapCommonFields(line: EmissionCaptureFormLine) {
  return {
    inputType: line.isManualTotalEmissions
      ? InputTypeSchema.parse("DIRECT")
      : InputTypeSchema.parse("SIMPLIFIED"),
    dimensionValue1Id: line.dimensionValue1Id,
    dimensionValue2Id: line.dimensionValue2Id,
    measurementUnitId: line.measurementUnitId,
    quantity: toNullableNumber(line.quantity),
    factorSource: line.factorSource,
    baseFactorId: line.baseFactorId ?? null,
    appliedFactorValue: toNullableNumber(line.factorValue),
    appliedFactorRateMeasurementUnitId: line.factorRateMeasurementUnitId,
    manualTotalEmissions: toNullableNumber(line.manualTotalEmissions),
    comment: line.comment,
  };
}

function getPendingFileUuids(line: EmissionCaptureFormLine): string[] {
  return (line.files ?? [])
    .filter((file) => file.isPending)
    .map((file) => file.uuid);
}

/**
 * Maps a single line to the create request format (for new lines)
 */
function mapLineToCreateRequest(
  line: EmissionCaptureFormLine
): SyncCreateLineItem {
  return {
    ...mapCommonFields(line),
    subcategoryId: line.subcategoryId,
    addFileUuids: getPendingFileUuids(line),
  };
}

/**
 * Maps a single line to the update request format (for existing lines)
 */
function mapLineToUpdateRequest(
  line: EmissionCaptureFormLine
): SyncUpdateLineItem {
  return {
    ...mapCommonFields(line),
    id: line.lineId,
    addFileUuids: getPendingFileUuids(line),
    removeFileIds: line.removedFileIds ?? [],
  };
}

/**
 * Maps a single line to the delete request format
 */
function mapLineToDeleteRequest(
  line: EmissionCaptureFormLine
): SyncDeleteLineItem {
  return {
    id: line.lineId,
  };
}

/**
 * Maps form lines to the sync request format.
 * Separates lines into create, update, and delete operations based on their state.
 */
export function mapLinesToSyncRequest(
  lines: EmissionCaptureFormLine[],
  dirtyLineIds?: Set<string>
): SyncCarbonInventoryLinesRequest {
  const create: SyncCreateLineItem[] = [];
  const update: SyncUpdateLineItem[] = [];
  const deleteItems: SyncDeleteLineItem[] = [];

  for (const line of lines) {
    // Skip new lines that were also deleted (never saved to server)
    if (line.isNew && line.isDeleted) {
      continue;
    }

    // New lines that need to be created
    if (line.isNew && !line.isDeleted) {
      create.push(mapLineToCreateRequest(line));
      continue;
    }

    // Existing lines that need to be deleted
    if (line.isDeleted && !line.isNew) {
      deleteItems.push(mapLineToDeleteRequest(line));
      continue;
    }

    // Existing lines that need to be updated (only if actually modified)
    if (!line.isNew && !line.isDeleted) {
      if (!dirtyLineIds || dirtyLineIds.has(line.id)) {
        update.push(mapLineToUpdateRequest(line));
      }
      continue;
    }
  }

  return {
    create,
    update,
    delete: deleteItems,
  };
}
