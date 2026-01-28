import {
  SyncCarbonInventoryLinesRequest,
  SyncCreateLineItem,
  SyncUpdateLineItem,
  SyncDeleteLineItem,
} from "@repo/types";
import { EmissionCaptureFormLine } from "../types/EmissionCaptureTypes";

/**
 * Maps common fields shared between create and update requests
 */
function mapCommonFields(line: EmissionCaptureFormLine) {
  return {
    dimensionValue1Id: line.dimensionValue1Id,
    dimensionValue2Id: line.dimensionValue2Id,
    measurementUnitId: line.measurementUnitId,
    quantity: line.quantity != null ? Number(line.quantity) : null,
    factorSource: line.factorSource,
    baseFactorId: line.baseFactorId ?? null,
    appliedFactorValue:
      line.factorValue != null ? Number(line.factorValue) : null,
    appliedFactorRateMeasurementUnitId: line.factorRateMeasurementUnitId,
    manualTotalEmissions:
      line.manualTotalEmissions != null
        ? Number(line.manualTotalEmissions)
        : null,
    comment: line.comment,
  };
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
  lines: EmissionCaptureFormLine[]
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

    // Existing lines that need to be updated
    if (!line.isNew && !line.isDeleted) {
      update.push(mapLineToUpdateRequest(line));
      continue;
    }
  }

  return {
    create,
    update,
    delete: deleteItems,
  };
}
