import { FC, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  SelectChangeEvent,
} from "@mui/material";
import {
  CarbonInventoryDisplayStatusEnum,
  type GetCarbonInventoriesMinimalResponse,
  type GetMyOrganizationsSelectorOptionsResponse,
} from "@repo/types";
import { OrganizationSelector } from "@/components";
import { VOCAB } from "@/config/vocab";
import capitalize from "lodash-es/capitalize";

interface ReductionPlanHeaderProps {
  organizations: GetMyOrganizationsSelectorOptionsResponse;
  inventories: GetCarbonInventoriesMinimalResponse;
  selectedOrganizationId?: string;
  selectedCarbonInventory?: string;
  onOrganizationChange: (organizationId: string) => void;
  onCarbonInventoryChange: (inventoryId: string) => void;
}

export const ReductionPlanHeader: FC<ReductionPlanHeaderProps> = ({
  organizations,
  inventories,
  selectedOrganizationId,
  selectedCarbonInventory,
  onOrganizationChange,
  onCarbonInventoryChange,
}) => {
  const onCarbonInventorySelectChange = useCallback(
    (event: SelectChangeEvent) => {
      onCarbonInventoryChange(event.target.value);
    },
    [onCarbonInventoryChange]
  );

  const selectedInventoryName =
    inventories.find((inv) => inv.id === selectedCarbonInventory)?.name ?? "";

  const { drafts, published } = useMemo(() => {
    const drafts: GetCarbonInventoriesMinimalResponse = [];
    const published: GetCarbonInventoriesMinimalResponse = [];
    for (const inv of inventories) {
      if (inv.status === CarbonInventoryDisplayStatusEnum.DRAFT) {
        drafts.push(inv);
      } else {
        published.push(inv);
      }
    }
    return { drafts, published };
  }, [inventories]);

  return (
    <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white p-4">
      <Typography variant="h5" fontWeight={600} noWrap maxWidth="30dvw">
        {selectedInventoryName || "Plan de reducción"}
      </Typography>
      <Box className="flex shrink-0 flex-row gap-4">
        <OrganizationSelector
          organizations={organizations}
          value={selectedOrganizationId ?? ""}
          onChange={onOrganizationChange}
          label={capitalize(VOCAB.organization.noun.singular)}
          showNoneOption
        />
        <FormControl
          sx={{ minHeight: 40, minWidth: 216, maxWidth: "10dvw" }}
          size="small"
        >
          <InputLabel id="reduction-inventory-select-label">Huella</InputLabel>
          <Select
            labelId="reduction-inventory-select-label"
            label="Huella"
            value={selectedCarbonInventory ?? ""}
            onChange={onCarbonInventorySelectChange}
            disabled={inventories.length === 0}
          >
            {drafts.length > 0 && [
              <ListSubheader key="header-drafts">Borradores</ListSubheader>,
              ...drafts.map(({ id, name, year }) => (
                <MenuItem key={id} value={id}>
                  {name ?? "Huella sin nombre"}
                  {year != null ? ` (${year})` : ""}
                </MenuItem>
              )),
            ]}
            {published.length > 0 && [
              <ListSubheader key="header-published">
                Autodeclaradas
              </ListSubheader>,
              ...published.map(({ id, name, year }) => (
                <MenuItem key={id} value={id}>
                  {name}
                  {year != null ? ` (${year})` : ""}
                </MenuItem>
              )),
            ]}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
