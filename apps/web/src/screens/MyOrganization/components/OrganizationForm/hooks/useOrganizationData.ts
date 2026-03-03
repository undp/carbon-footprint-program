import { useMemo } from "react";
import {
  useCountryOrganizationSizes,
  useCountrySectors,
  useOrganizationMainActivities,
} from "@/api/query";
import { useJobPositions } from "@/api/query/jobPositions/useJobPositions";
import { useSelectorOptions } from "@/hooks";

type Params = {
  selectedSectorId?: string;
  selectedSubsectorId?: string;
  selectedActivityId?: string;
};

/**
 * Hook for fetching all data needed for the organization form.
 * Includes sectors, organization sizes, activities, and job positions.
 */
export const useOrganizationData = ({
  selectedSectorId,
  selectedSubsectorId,
  selectedActivityId,
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

  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.id === selectedSectorId),
    [sectors, selectedSectorId]
  );

  const subsectorOptions = useMemo(
    () => selectedSector?.subsectors ?? [],
    [selectedSector]
  );

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId),
    [activities, selectedActivityId]
  );

  const sectorOptions = useSelectorOptions(sectors, "name", "id");
  const subsectorSelectOptions = useSelectorOptions(
    subsectorOptions,
    "name",
    "id"
  );
  const companySizeOptions = useSelectorOptions(
    organizationSizes,
    "name",
    "id"
  );
  const activityOptions = useSelectorOptions(activities, "name", "id");
  const jobPositionOptions = useSelectorOptions(jobPositions, "name", "id");

  const result = useMemo(
    () => ({
      // Raw data
      sectors,
      organizationSizes,
      activities,
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
    }),
    [
      sectors,
      organizationSizes,
      activities,
      jobPositions,
      subsectorOptions,
      selectedSector,
      selectedActivity,
      sectorOptions,
      subsectorSelectOptions,
      companySizeOptions,
      activityOptions,
      jobPositionOptions,
      sectorsLoading,
      organizationSizesLoading,
      activitiesLoading,
      jobPositionsLoading,
    ]
  );

  return result;
};
