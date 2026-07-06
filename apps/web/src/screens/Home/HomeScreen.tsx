import { FC, useMemo, useState } from "react";
import { Box } from "@mui/material";
import {
  useCarbonInventoriesMinimalData,
  useMyOrganizations,
} from "@/api/query";
import { Header, WelcomeHome } from "./components";
import { orderBy, uniq } from "lodash-es";
import { EmissionResultsContent } from "@/components";
import { HomeScreenSkeleton } from "./components/Skeletons/HomeScreenSkeleton";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  isDashboardReady,
  selectPrimaryHuella,
} from "./components/welcomeHome.config";

export const HomeScreen: FC = () => {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedCarbonInventoryId, setSelectedCarbonInventoryId] = useState<
    string | null
  >(null);

  // Fetch every huella (no status filter) so we can tell apart the dashboard-
  // ready ones from those still in progress, and derive the welcome home from
  // the rest.
  const { data: inventories = [], isLoading: isLoadingInventories } =
    useCarbonInventoriesMinimalData();
  const { data: organizations = [], isLoading: isLoadingOrganizations } =
    useMyOrganizations();

  const approvedInventories = useMemo(
    () => inventories.filter((inv) => isDashboardReady(inv.status)),
    [inventories]
  );

  const availableYears = useMemo(() => {
    const years = approvedInventories
      .filter((inv) => inv.year !== null && inv.year !== undefined)
      .map((inv) => inv.year!.toString());
    return orderBy(uniq(years), Number, "desc");
  }, [approvedInventories]);

  const effectiveYear =
    selectedYear && availableYears.includes(selectedYear)
      ? selectedYear
      : (availableYears[0] ?? "");

  const inventoriesForSelectedYear = useMemo(() => {
    if (!effectiveYear) return [];
    return approvedInventories.filter(
      (inv) => inv.year?.toString() === effectiveYear
    );
  }, [approvedInventories, effectiveYear]);

  const effectiveInventoryId =
    selectedCarbonInventoryId &&
    inventoriesForSelectedYear.some(
      (inv) => inv.id === selectedCarbonInventoryId
    )
      ? selectedCarbonInventoryId
      : (inventoriesForSelectedYear[0]?.id ?? approvedInventories[0]?.id ?? "");

  if (isLoadingInventories || isLoadingOrganizations) {
    return <HomeScreenSkeleton />;
  }

  // No huella fills the dashboard yet: welcome the user and guide them forward.
  // Shown on every login until a measurement/verification recognition is
  // approved.
  if (approvedInventories.length === 0) {
    const inProgress = inventories.filter(
      (inv) =>
        inv.status !== CarbonInventoryDisplayStatusEnum.DELETED &&
        !isDashboardReady(inv.status)
    );
    return (
      <WelcomeHome
        hasOrganization={organizations.length > 0}
        primaryHuella={selectPrimaryHuella(inProgress)}
      />
    );
  }

  return (
    <Box className="flex flex-1 flex-col gap-6">
      <Header
        availableYears={availableYears}
        inventories={inventoriesForSelectedYear}
        onYearChange={setSelectedYear}
        onCarbonInventoryChange={setSelectedCarbonInventoryId}
        selectedYear={effectiveYear}
        selectedCarbonInventory={effectiveInventoryId}
      />

      <Box className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white p-6">
        <EmissionResultsContent inventoryId={effectiveInventoryId} showBadges />
      </Box>
    </Box>
  );
};
