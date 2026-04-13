import { FC, useMemo } from "react";
import { Box, Tooltip } from "@mui/material";
import { Control, useWatch } from "react-hook-form";
import {
  FormTextField,
  FormSelectField,
  FormDateField,
} from "@/components/form";
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";
import { useSelectorOptions } from "@/hooks/useSelectorOptions";
import { REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH } from "@repo/types";
import type {
  GetMyOrganizationsSelectorOptionsResponse,
  GetCarbonInventoriesMinimalResponse,
} from "@repo/types";
import type { ReductionProjectFormValues } from "../types";
import { GWP_OPTIONS } from "../constants";
import { VOCAB } from "@/config/vocab";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
  organizations: GetMyOrganizationsSelectorOptionsResponse;
  isLoadingOrgs: boolean;
  verifiedInventories: GetCarbonInventoriesMinimalResponse;
  selectedOrganizationId: string;
  subcategories: { id: string; name: string }[];
  isLoadingSubcategories: boolean;
  hasInventorySelected: boolean;
  gwpExplanationId?: string | null;
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
  gwpExplanationId,
}) => {
  const { openExplanation } = useExplanationDialog();
  const organizationOptions = useSelectorOptions(organizations, "name", "id");
  const selectedInventoryYear = useWatch({ control, name: "year" });

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
        label: inv.name
          ? inv.year
            ? `${inv.name} (${inv.year})`
            : inv.name
          : `Inventario ${inv.year ?? inv.id}`,
        value: inv.id,
      })),
    [filteredInventories]
  );

  const subcategoryOptions = useSelectorOptions(subcategories, "name", "id");

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
            required
          />
        </Box>
        <Box className="flex-1">
          <FormSelectField
            name="organizationId"
            control={control}
            label="Organización"
            options={organizationOptions}
            disabled={disabled || isLoadingOrgs}
            required
          />
        </Box>
      </Box>

      {/* Row 2: Subcategory + Carbon Inventory */}
      <Box className="flex flex-row gap-6">
        <Box className="flex-1">
          <Tooltip
            title={
              !selectedOrganizationId
                ? "Seleccione una organización primero"
                : inventoryOptions.length === 0
                  ? `No hay huellas con sello de verificación para la ${VOCAB.organization.noun.singular} seleccionada`
                  : ""
            }
          >
            <span>
              <FormSelectField
                name="carbonInventoryId"
                control={control}
                label="Inventario de carbono verificado"
                options={inventoryOptions}
                disabled={
                  disabled ||
                  !selectedOrganizationId ||
                  inventoryOptions.length === 0
                }
                required
              />
            </span>
          </Tooltip>
        </Box>
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
                required
              />
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Row 3: Implementation date + Description */}
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
              <FormDateField
                name="implementationDate"
                control={control}
                label="Fecha de implementación"
                disabled={disabled || !hasInventorySelected}
                maxDate={
                  selectedInventoryYear &&
                  Number.isFinite(selectedInventoryYear)
                    ? new Date(selectedInventoryYear, 11, 31)
                    : undefined
                }
                required
              />
            </span>
          </Tooltip>
        </Box>
        <Box className="flex flex-1 flex-row items-start gap-1">
          {/* TODO: move info button logic to the select field */}
          <Box className="flex-1">
            <FormSelectField
              name="gwpUsed"
              control={control}
              label="Potencial de calentamiento global (PCG) utilizado"
              options={GWP_OPTIONS}
              disabled={disabled}
            />
          </Box>
          <Box className="mt-4">
            <InfoButton
              label="Más información"
              onClick={() => openExplanation(gwpExplanationId ?? null)}
            />
          </Box>
        </Box>
      </Box>

      {/* Row 4: GWP + Info banner */}
      <Box className="flex flex-row gap-6">
        <Box className="flex-1">
          <FormTextField
            name="description"
            control={control}
            label="Descripción del proyecto"
            multiline
            rows={4}
            disabled={disabled}
            required
            slotProps={{
              htmlInput: {
                maxLength: REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH,
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};
