import { FC, useCallback, useMemo, useState } from "react";
import {
  useCarbonInventoriesStore,
  CarbonInventoriesTab,
} from "./hooks/useCarbonInventoriesStore";
import {
  Box,
  Typography,
  MenuItem,
  Select,
  SelectChangeEvent,
  InputLabel,
  FormControl,
} from "@mui/material";
import { InfoButton, OrganizationSelector } from "@/components";
import { useExplanationDialog } from "@/contexts";
import {
  useCarbonInventories,
  useCarbonInventoriesMinimalData,
  useMyOrganizations,
} from "@/api/query";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import { NewInventoryDialog } from "@/components/dialogs";
import { InventoryTabs } from "./components/InventoryTabs";
import { DraftsTab } from "./components/DraftsTab";
import { InventoriesTab } from "./components/InventoriesTab";
import { VOCAB } from "@/config/vocab";
import { useCarbonInventoriesHighlight } from "./hooks/useCarbonInventoriesHighlight";
import capitalize from "lodash-es/capitalize";

const CARBON_INVENTORIES_EXPLANATION_SLUGS = {
  MAIN: "carbon-inventories",
} as const;

export const CarbonInventoriesScreen: FC = () => {
  const { openExplanationBySlug } = useExplanationDialog();
  const { activeTab, setActiveTab } = useCarbonInventoriesStore();
  useCarbonInventoriesHighlight();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("all");

  const onYearSelectChange = useCallback((event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
  }, []);

  const { data: organizations = [], isLoading: isLoadingOrganizations } =
    useMyOrganizations();

  const { data: inventories = [], isLoading: isLoadingInventories } =
    useCarbonInventories(selectedYear, selectedOrganizationId);

  const { data: minimalInventories = [], isLoading: isLoadingYears } =
    useCarbonInventoriesMinimalData();

  const availableYears = useMemo(
    () =>
      [...new Set(minimalInventories.map((inv) => inv.year))]
        .filter((year): year is number => year !== null)
        .sort((a, b) => b - a)
        .map(String),
    [minimalInventories]
  );

  const [newInventoryDialogOpen, setNewInventoryDialogOpen] = useState(false);

  const filteredInventories = useMemo(
    () =>
      inventories.filter(
        (inv) => inv.status !== CarbonInventoryDisplayStatusEnum.DELETED
      ),
    [inventories]
  );

  const draftInventories = useMemo(
    () =>
      filteredInventories.filter(
        (inv) => inv.status === CarbonInventoryDisplayStatusEnum.DRAFT
      ),
    [filteredInventories]
  );

  const huellasInventories = useMemo(
    () =>
      filteredInventories.filter(
        (inv) => inv.status !== CarbonInventoryDisplayStatusEnum.DRAFT
      ),
    [filteredInventories]
  );

  const onNewInventory = useCallback(() => {
    setNewInventoryDialogOpen(true);
  }, []);

  return (
    <>
      <Box className="flex flex-1 flex-col">
        <Box className="flex flex-col rounded-lg bg-white">
          {/* Header */}
          <Box className="flex flex-col">
            <Box className="flex flex-row items-center justify-between gap-4 px-6 py-4">
              <Box className="flex items-center gap-1">
                <Typography variant="h5" fontWeight={600}>
                  Huella {capitalize(VOCAB.organization.relationalAdjective)}
                </Typography>
                <InfoButton
                  label="Más información"
                  onClick={() =>
                    openExplanationBySlug(
                      CARBON_INVENTORIES_EXPLANATION_SLUGS.MAIN
                    )
                  }
                />
              </Box>

              {/* Container for selectors */}
              <Box className="flex gap-3">
                {/* Organization Selector */}
                <OrganizationSelector
                  organizations={organizations}
                  value={selectedOrganizationId}
                  onChange={setSelectedOrganizationId}
                  isLoading={isLoadingOrganizations}
                  showAllOption
                  showNoneOption
                />

                {/* Year Selector */}
                <FormControl sx={{ minHeight: 40, minWidth: 120 }} size="small">
                  <InputLabel id="year-select-label">Año</InputLabel>
                  <Select
                    labelId="year-select-label"
                    label="Año"
                    value={selectedYear}
                    onChange={onYearSelectChange}
                    disabled={isLoadingYears}
                  >
                    <MenuItem key="all" value="all">
                      Todos
                    </MenuItem>
                    {availableYears.map((year) => (
                      <MenuItem key={year} value={`${year}`}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Tabs */}
            <InventoryTabs
              activeTab={activeTab}
              onTabChange={(_, value) => setActiveTab(value)}
              onNewInventory={onNewInventory}
            />
          </Box>

          {/* Tab Content */}
          {activeTab === CarbonInventoriesTab.DRAFTS && (
            <DraftsTab
              darftInventories={draftInventories}
              allInventories={filteredInventories}
              isLoading={isLoadingInventories}
            />
          )}
          {activeTab === CarbonInventoriesTab.HUELLAS && (
            <InventoriesTab
              inventories={huellasInventories}
              isLoading={isLoadingInventories}
              onNewInventory={onNewInventory}
            />
          )}
        </Box>
      </Box>

      <NewInventoryDialog
        open={newInventoryDialogOpen}
        onClose={() => setNewInventoryDialogOpen(false)}
        selectedOrganizationId={
          selectedOrganizationId === "none" || selectedOrganizationId === "all"
            ? undefined
            : selectedOrganizationId
        }
      />
    </>
  );
};
