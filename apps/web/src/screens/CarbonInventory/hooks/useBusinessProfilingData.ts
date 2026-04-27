import { useMemo } from "react";
import {
  useCountryOrganizationSizes,
  useCountrySectors,
  useOrganizationMainActivities,
} from "@/api/query";
import { useSelectorOptions } from "@/hooks";
import { mergeSelectedOption } from "@/utils/mergeSelectedOption";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";

type Params = {
  selectedSectorId?: string;
  selectedSubsectorId?: string;
  selectedActivityId?: string;
  /**
   * Currently-persisted catalog references on the inventory's organization snapshot.
   * Used to merge into the option list so a DELETED catalog row whose id is still
   * referenced renders by name. The public list endpoints filter to ACTIVE only, so
   * without this front-side union the dropdown would render the persisted id with no
   * label.
   */
  initialSector?: NonNullable<
    GetCarbonInventoryByIdResponse["organizationData"]
  >["sector"];
  initialSubsector?: NonNullable<
    GetCarbonInventoryByIdResponse["organizationData"]
  >["subsector"];
  initialMainActivity?: NonNullable<
    GetCarbonInventoryByIdResponse["organizationData"]
  >["mainActivity"];
  initialOrganizationSize?: NonNullable<
    GetCarbonInventoryByIdResponse["organizationData"]
  >["size"];
};

export const useBusinessProfilingData = ({
  selectedSectorId,
  selectedSubsectorId,
  selectedActivityId,
  initialSector,
  initialSubsector,
  initialMainActivity,
  initialOrganizationSize,
}: Params) => {
  const { data: sectors = [], isLoading: sectorsLoading } = useCountrySectors();
  const { data: organizationSizes = [], isLoading: organizationSizesLoading } =
    useCountryOrganizationSizes();

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

  // Lookup the selected sector's full record (with nested subsectors) from the ORIGINAL
  // sectors list. The merged list may include the persisted sector synthesised from
  // {id, name}, which has no `subsectors` field.
  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.id === selectedSectorId),
    [sectors, selectedSectorId]
  );

  const subsectorOptions = useMemo(() => {
    const baseSubsectors = selectedSector?.subsectors ?? [];
    // Subsector union: include the currently-persisted subsector even when it is no
    // longer ACTIVE under the selected sector. Scope by the selected sector — rendering
    // an unrelated subsector option would be misleading.
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

  const result = useMemo(
    () => ({
      sectors: mergedSectors,
      organizationSizes: mergedOrganizationSizes,
      activities: mergedActivities,
      subsectorOptions,
      selectedSector,
      selectedActivity,
      sectorOptions,
      subsectorSelectOptions,
      companySizeOptions,
      activityOptions,
      sectorsLoading,
      organizationSizesLoading,
      activitiesLoading,
    }),
    [
      mergedSectors,
      mergedOrganizationSizes,
      mergedActivities,
      subsectorOptions,
      selectedSector,
      selectedActivity,
      sectorOptions,
      subsectorSelectOptions,
      companySizeOptions,
      activityOptions,
      sectorsLoading,
      organizationSizesLoading,
      activitiesLoading,
    ]
  );

  return result;
};
