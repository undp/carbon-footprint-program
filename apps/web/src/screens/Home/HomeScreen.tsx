import { FC, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import { useCarbonInventories } from "../../api/query";
import { Header, NoneCarbonInventoriesSection } from "./components";
import { filter, map, orderBy, uniq } from "lodash-es";
import {
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum,
} from "@repo/types";
import { EmissionResultsContent } from "@/components";
import { NoneVerifyCarbonInventories } from "./components/NoneVerifyCarbonInventories";

export const HomeScreen: FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedCarbonInventoryId, setSelectedCarbonInventoryId] =
    useState<string>("");

  const {
    data: inventories = [],
    isLoading: isLoadingInventories,
    refetch: refetchInventories,
  } = useCarbonInventories();

  const filteredByStatusInventories = useMemo(() => {
    const statusOrder: Partial<Record<CarbonInventoryDisplayStatus, number>> = {
      VERIFICATION_APPROVED: 0,
      CALCULATION_APPROVED: 1,
    };

    const filtered = filter(inventories, ({ status }) =>
      (
        [
          CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
          CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
        ] as CarbonInventoryDisplayStatus[]
      ).includes(status)
    );

    return orderBy(
      filtered,
      [({ status }) => statusOrder[status], ({ year }) => Number(year)],
      ["asc", "desc"]
    );
  }, [inventories]);

  const availableYears = useMemo(() => {
    const years = map(
      filter(filteredByStatusInventories, (inv) => inv.year != null),
      (inv) => inv.year!.toString()
    );
    return orderBy(uniq(years), Number, "desc");
  }, [filteredByStatusInventories]);

  useEffect(() => {
    void refetchInventories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveYear = availableYears.includes(selectedYear)
    ? selectedYear
    : (availableYears[0] ?? "");

  const effectiveInventoryId = filteredByStatusInventories.some(
    (inv) => inv.id === selectedCarbonInventoryId
  )
    ? selectedCarbonInventoryId
    : (filteredByStatusInventories[0]?.id ?? "");

  if (!isLoadingInventories && inventories.length === 0) {
    return (
      <Box className="flex flex-1 flex-col gap-6">
        <NoneCarbonInventoriesSection />
      </Box>
    );
  }

  if (!isLoadingInventories && filteredByStatusInventories.length === 0) {
    return (
      <Box className="flex flex-1 flex-col gap-6">
        <NoneVerifyCarbonInventories />
      </Box>
    );
  }

  return (
    <Box className="flex flex-1 flex-col gap-6">
      <Header
        availableYears={availableYears}
        inventories={filteredByStatusInventories}
        onYearChange={setSelectedYear}
        onCarbonInventoryChange={setSelectedCarbonInventoryId}
        isLoadingInventories={isLoadingInventories}
        selectedYear={effectiveYear}
        selectedCarbonInventory={effectiveInventoryId}
      />
      {effectiveInventoryId && (
        <Box className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white p-6">
          <EmissionResultsContent
            inventoryId={effectiveInventoryId}
            showBadges
          />
        </Box>
      )}
    </Box>
  );
};
