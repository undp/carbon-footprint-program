import { FC, useMemo, useState } from "react";
import { Box } from "@mui/material";
import {
  useCarbonInventoriesMinimalData,
  useMyOrganizations,
  useUpdateMyProfile,
} from "@/api/query";
import { Header, WelcomeHome } from "./components";
import { orderBy, uniq } from "lodash-es";
import { EmissionResultsContent } from "@/components";
import { HomeScreenSkeleton } from "./components/Skeletons/HomeScreenSkeleton";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import { useUserStore } from "@/stores/userStore";
import { isDashboardReady } from "./components/welcomeHome.config";

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

  // Whether the user has explicitly finished the onboarding (persisted on their
  // profile). Populated by useInitializeUser → useMe into the store.
  const onboardingCompleted = useUserStore(
    (state) => state.user?.onboardingCompleted ?? false
  );
  const { mutate: completeOnboarding, isPending: isFinishing } =
    useUpdateMyProfile();

  const approvedInventories = useMemo(
    () => inventories.filter(isDashboardReady),
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

  // A dashboard-ready huella exists ⇒ the guided flow is 100% complete.
  const allStepsDone = approvedInventories.length > 0;

  // Show the guided welcome home until the flow is complete AND the user has
  // explicitly finished it (persisted on their profile so it doesn't reappear
  // on another device). Only then reveal the emissions dashboard.
  if (!(allStepsDone && onboardingCompleted)) {
    // Prefer an accredited organization: with several memberships the steps
    // should reflect the one furthest along, not an arbitrary first row.
    const primaryOrg =
      organizations.find((org) => org.isAccredited) ?? organizations[0];
    return (
      <WelcomeHome
        hasOrganization={organizations.length > 0}
        orgAccredited={primaryOrg?.isAccredited ?? false}
        inscriptionStatus={primaryOrg?.lastSubmissionStatus ?? null}
        hasHuella={inventories.length > 0}
        hasHuellaWithOrg={inventories.some(
          (inv) => inv.organizationId !== null
        )}
        hasAssociatedDraft={inventories.some(
          (inv) =>
            inv.status === CarbonInventoryDisplayStatusEnum.DRAFT &&
            inv.organizationId !== null
        )}
        isComplete={allStepsDone}
        onFinish={() => completeOnboarding({ onboardingCompleted: true })}
        isFinishing={isFinishing}
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
