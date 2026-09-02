import {
  SyncCarbonInventoryLinesRequest,
  SyncCreateLineItem,
  SyncUpdateLineItem,
  SyncDeleteLineItem,
  FactorSelectionType,
  InputTypeSchema,
  type FactorSelection,
  type UpdateFactorSelection,
} from "@repo/types";
import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";
import { EmissionCaptureFormLine } from "../types/EmissionCaptureTypes";
import { toNullableNumber } from "@/utils/number";

/**
 * Translates a form line into the factor variant the API expects, or null while
 * the line is still incomplete.
 *
 * A catalog selection deliberately sends only its canonical factor ID and the
 * unit it wants the value in. The value, source and year the editor displays are
 * for the user's benefit; the API re-reads all three from the catalog row, so
 * sending them would be at best redundant and at worst a way to persist a number
 * the catalog does not agree with.
 */
function mapFactorSelection(
  line: EmissionCaptureFormLine
): FactorSelection | null {
  if (line.isManualTotalEmissions) {
    const totalEmissions = toNullableNumber(line.manualTotalEmissions);
    return totalEmissions === null
      ? null
      : { type: FactorSelectionType.DIRECT, totalEmissions };
  }

  const isCustomFactor =
    !!line.factorSource && CUSTOM_FACTOR_SOURCES.includes(line.factorSource);

  if (isCustomFactor) {
    const value = toNullableNumber(line.factorValue);
    if (value === null || line.factorRateMeasurementUnitId === null)
      return null;
    return {
      type: FactorSelectionType.CUSTOM,
      source: line.factorSource!,
      value,
      rateMeasurementUnitId: line.factorRateMeasurementUnitId,
    };
  }

  if (line.baseFactorId === null || line.factorRateMeasurementUnitId === null) {
    return null;
  }

  return {
    type: FactorSelectionType.CATALOG,
    emissionFactorId: line.baseFactorId,
    appliedRateMeasurementUnitId: line.factorRateMeasurementUnitId,
  };
}

/**
 * True when the line still carries exactly the factor the server last sent, so
 * the save has nothing to restate.
 *
 * The comparison is deliberately strict: a false "changed" only costs a
 * redundant catalog selection, while a false "unchanged" would keep a snapshot
 * the user had actually replaced.
 */
function isFactorUnchanged(line: EmissionCaptureFormLine): boolean {
  const loaded = line.loadedFactor;
  if (!loaded) return false;

  // Nothing was stored, so there is no snapshot worth keeping and the line
  // should go through the normal mapping.
  if (
    loaded.factorValue === null ||
    loaded.factorRateMeasurementUnitId === null
  )
    return false;

  return (
    line.emissionFactorId === loaded.emissionFactorId &&
    line.factorSource === loaded.factorSource &&
    toNullableNumber(line.factorValue) === loaded.factorValue &&
    line.factorRateMeasurementUnitId === loaded.factorRateMeasurementUnitId
  );
}

/**
 * The factor an update declares.
 *
 * A line whose factor the user never touched says so, instead of restating a
 * selection. That keeps its stored snapshot exactly as it is — which is the
 * only correct answer for a line saved before the snapshot carried a catalog
 * id, and the reason an edit elsewhere in the inventory no longer depends on
 * the catalog row still being there.
 */
function mapUpdateFactorSelection(
  line: EmissionCaptureFormLine
): UpdateFactorSelection | null {
  if (!line.isManualTotalEmissions && isFactorUnchanged(line)) {
    return { type: FactorSelectionType.UNCHANGED };
  }
  return mapFactorSelection(line);
}

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
    // A create has nothing stored, so it always states its factor in full.
    factorSelection: mapFactorSelection(line),
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
    factorSelection: mapUpdateFactorSelection(line),
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
    // Skip malformed/partial line objects that lack an id. RHF reconciliation
    // (`reset(..., { keepDirtyValues: true })`) can reconstruct an id-less
    // object (e.g. `{ quantity: null }`) when a dirty cell path is reapplied
    // onto a lines record whose line was dropped by the manual-mode toggle.
    // Such an object is not a real line: it would otherwise be classified as an
    // update and serialized with an undefined `id`, which the sync endpoint
    // rejects.
    if (!line.lineId) {
      continue;
    }

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
