import { useMemo } from "react";
import {
  useCountryOrganizationSizes,
  useCountrySectors,
  useOrganizationMainActivities,
} from "@/api/query";
import { useJobPositions } from "@/api/query/jobPositions/useJobPositions";
import { useSelectorOptions } from "@/hooks";
import { mergeSelectedOption } from "@/utils/mergeSelectedOption";
import type { GetOrganizationByIdResponse } from "@repo/types";

type Params = {
  selectedSectorId?: string;
  selectedSubsectorId?: string;
  selectedActivityId?: string;
  /**
   * Currently-persisted catalog references on the organization. Used to merge into the
   * option list so a DELETED catalog row whose id is still referenced renders by name —
   * the public list endpoints filter to ACTIVE only, so we need this front-side union.
   */
  initialSector?: GetOrganizationByIdResponse["sector"];
  initialSubsector?: GetOrganizationByIdResponse["subsector"];
  initialMainActivity?: GetOrganizationByIdResponse["mainActivity"];
  initialOrganizationSize?: GetOrganizationByIdResponse["countryOrganizationSize"];
};

/**
 * Hook for fetching all data needed for the organization form.
 * Includes sectors, organization sizes, activities, and job positions.
 */
export const useOrganizationData = ({
  selectedSectorId,
  selectedSubsectorId,
  selectedActivityId,
  initialSector,
  initialSubsector,
  initialMainActivity,
  initialOrganizationSize,
}: Params = {}) => {
  const { data: sectors = [], isLoading: sectorsLoading } = useCountrySectors();
  const { data: organizationSizes = [], isLoading: organizationSizesLoading } =
    useCountryOrganizationSizes();
  const { data: jobPositions = [], isLoading: jobPositionsLoading } =
    useJobPositions();

  const activityFilters = useMemo(
    () => ({
      sectorId: selectedSectorId || undefined,
      subsectorId: selectedSubsectorId || undefined,
    }),
    [selectedSectorId, selectedSubsectorId]
  );

  const { data: activities = [], isLoading: activitiesLoading } =
    useOrganizationMainActivities(activityFilters);

  // Merge the persisted entity into the ACTIVE list so the dropdown still renders the
  // currently-selected option even when it has been soft-deleted on the admin side.
  const mergedSectors = useMemo(
    () => mergeSelectedOption(sectors, initialSector ?? null),
    [sectors, initialSector]
  );
  const mergedOrganizationSizes = useMemo(
    () =>
      mergeSelectedOption(organizationSizes, initialOrganizationSize ?? null),
    [organizationSizes, initialOrganizationSize]
  );
  const mergedActivities = useMemo(
    () => mergeSelectedOption(activities, initialMainActivity ?? null),
    [activities, initialMainActivity]
  );

  // Lookup the selected sector's full record (including nested subsectors) from the
  // ORIGINAL `sectors` list. The `mergedSectors` union may include the persisted sector
  // synthesised from {id, name}, which has no `subsectors` field — we only need the
  // full record here for nested subsectors, the merged list is used for rendering.
  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.id === selectedSectorId),
    [sectors, selectedSectorId]
  );

  const subsectorOptions = useMemo(() => {
    const baseSubsectors = selectedSector?.subsectors ?? [];
    // Subsector union: include the currently-persisted subsector even when it is no
    // longer ACTIVE under the selected sector. We still scope by the chosen sector
    // because rendering an unrelated subsector option would be misleading.
    if (
      !initialSubsector ||
      (initialSector && initialSector.id !== selectedSectorId)
    ) {
      return baseSubsectors;
    }
    return mergeSelectedOption(baseSubsectors, initialSubsector ?? null);
  }, [selectedSector, initialSubsector, initialSector, selectedSectorId]);

  const selectedActivity = useMemo(
    () =>
      mergedActivities.find((activity) => activity.id === selectedActivityId),
    [mergedActivities, selectedActivityId]
  );

  const sectorOptions = useSelectorOptions(mergedSectors, "name", "id");
  const subsectorSelectOptions = useSelectorOptions(
    subsectorOptions,
    "name",
    "id"
  );
  const companySizeOptions = useSelectorOptions(
    mergedOrganizationSizes,
    "name",
    "id"
  );
  const activityOptions = useSelectorOptions(mergedActivities, "name", "id");
  const jobPositionOptions = useSelectorOptions(jobPositions, "name", "id");

  return {
    // Raw data (returned post-union so consumers always see the full option list)
    sectors: mergedSectors,
    organizationSizes: mergedOrganizationSizes,
    activities: mergedActivities,
    jobPositions,
    subsectorOptions,
    // Selected items
    selectedSector,
    selectedActivity,
    // Formatted options for selectors
    sectorOptions,
    subsectorSelectOptions,
    companySizeOptions,
    activityOptions,
    jobPositionOptions,
    // Loading states
    sectorsLoading,
    organizationSizesLoading,
    activitiesLoading,
    jobPositionsLoading,
  };
};
