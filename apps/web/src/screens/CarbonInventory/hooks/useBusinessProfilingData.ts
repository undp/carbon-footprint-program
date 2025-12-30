import { useMemo } from "react";
import {
  useCountryOrganizationSizes,
  useCountrySectors,
  useOrganizationMainActivities,
} from "@/api/query";
import { useSelectorOptions } from "@/hooks";

type Params = {
  selectedSectorId?: string;
  selectedSubsectorId?: string;
  selectedActivityId?: string;
};

export const useBusinessProfilingData = ({
  selectedSectorId,
  selectedSubsectorId,
  selectedActivityId,
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

  const result = useMemo(
    () => ({
      sectors,
      organizationSizes,
      activities,
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
      sectors,
      organizationSizes,
      activities,
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
