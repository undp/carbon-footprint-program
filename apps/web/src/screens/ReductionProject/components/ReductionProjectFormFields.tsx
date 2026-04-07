import { FC, useMemo } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { Control } from "react-hook-form";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { FormTextField, FormSelectField } from "@/components/form";
import type {
  GetMyOrganizationsSelectorOptionsResponse,
  GetCarbonInventoriesMinimalResponse,
  GetAllSubcategoriesResponse,
} from "@repo/types";
import type { ReductionProjectFormValues } from "../types";
import { GWP_OPTIONS } from "../constants";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
  organizations: GetMyOrganizationsSelectorOptionsResponse;
  isLoadingOrgs: boolean;
  verifiedInventories: GetCarbonInventoriesMinimalResponse;
  selectedOrganizationId: string;
  subcategories: GetAllSubcategoriesResponse;
  isLoadingSubcategories: boolean;
  hasInventorySelected: boolean;
}

export const ReductionProjectFormFields: FC<Props> = ({
  control,
  disabled,
  organizations,
  isLoadingOrgs,
  verifiedInventories,
  selectedOrganizationId,
  subcategories,
  isLoadingSubcategories,
  hasInventorySelected,
}) => {
  const organizationOptions = useMemo(
    () =>
      organizations.map((org) => ({
        label: org.name,
        value: org.id,
      })),
    [organizations]
  );

  const filteredInventories = useMemo(
    () =>
      selectedOrganizationId
        ? verifiedInventories.filter(
            (inv) => String(inv.organizationId) === selectedOrganizationId
          )
        : [],
    [verifiedInventories, selectedOrganizationId]
  );

  const inventoryOptions = useMemo(
    () =>
      filteredInventories.map((inv) => ({
        label: inv.name ?? `Inventario ${inv.year ?? inv.id}`,
        value: inv.id,
      })),
    [filteredInventories]
  );

  const subcategoryOptions = useMemo(
    () =>
      subcategories.map((sub) => ({
        label: sub.name,
        value: sub.id,
      })),
    [subcategories]
  );

  return (
    <Box className="flex flex-col gap-2">
      {/* Row 1: Name + Organization */}
      <Box className="flex flex-row gap-6">
        <Box className="flex-1">
          <FormTextField
            name="name"
            control={control}
            label="Nombre de proyecto"
            disabled={disabled}
          />
        </Box>
        <Box className="flex-1">
          <FormSelectField
            name="organizationId"
            control={control}
            label="Organización"
            options={organizationOptions}
            disabled={disabled || isLoadingOrgs}
          />
        </Box>
      </Box>

      {/* Row 2: Implementation date + Description */}
      <Box className="flex flex-row gap-6">
        <Box className="flex-1">
          <FormTextField
            name="implementationDate"
            control={control}
            label="Fecha de implementación"
            type="date"
            disabled={disabled}
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />
        </Box>
        <Box className="flex-1">
          <FormTextField
            name="description"
            control={control}
            label="Descripción del proyecto"
            multiline
            rows={4}
            disabled={disabled}
          />
        </Box>
      </Box>

      {/* Row 3: Subcategory + Carbon Inventory */}
      <Box className="flex flex-row gap-6">
        <Box className="flex-1">
          <Tooltip
            title={
              !hasInventorySelected
                ? "Seleccione un inventario de carbono verificado primero"
                : ""
            }
          >
            <span>
              <FormSelectField
                name="subcategoryId"
                control={control}
                label="Subcategoría de fuente de emisión"
                options={subcategoryOptions}
                disabled={
                  disabled || !hasInventorySelected || isLoadingSubcategories
                }
              />
            </span>
          </Tooltip>
        </Box>
        <Box className="flex-1">
          <Tooltip
            title={
              !selectedOrganizationId
                ? "Seleccione una organización primero"
                : ""
            }
          >
            <span>
              <FormSelectField
                name="carbonInventoryId"
                control={control}
                label="Inventario de carbono verificado"
                options={inventoryOptions}
                disabled={disabled || !selectedOrganizationId}
              />
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Row 4: GWP + Info banner */}
      <Box className="flex flex-row gap-6">
        <Box className="flex-1">
          <FormSelectField
            name="gwpUsed"
            control={control}
            label="Potencial de calentamiento global (PCG) utilizado"
            options={GWP_OPTIONS}
            disabled={disabled}
          />
        </Box>
        <Box className="flex flex-1 items-start pt-1">
          <Box
            className="flex items-center gap-2 rounded-lg px-4 py-3"
            sx={{ bgcolor: "rgba(76, 175, 80, 0.1)" }}
          >
            <InfoOutlineIcon sx={{ color: "success.main" }} />
            <Typography variant="body2" sx={{ color: "success.dark" }}>
              Utilizar el potencial de calentamiento global del inventario
              nacional
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
