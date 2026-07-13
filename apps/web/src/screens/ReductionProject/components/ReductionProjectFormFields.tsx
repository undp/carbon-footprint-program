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
import { REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH } from "@repo/constants";
import type {
  GetMyOrganizationsSelectorOptionsResponse,
  GetCarbonInventoriesMinimalResponse,
} from "@repo/types";
import type { ReductionProjectFormValues } from "../formSchema";
import { GWP_OPTIONS } from "../constants";
import { VOCAB } from "@/config/vocab";
import { min } from "date-fns";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
  organizations: GetMyOrganizationsSelectorOptionsResponse;
  isLoadingOrgs: boolean;
  verifiedInventories: GetCarbonInventoriesMinimalResponse;
  isLoadingInventories: boolean;
  selectedOrganizationId: string;
  subcategories: { id: string; name: string }[];
  isLoadingSubcategories: boolean;
  hasInventorySelected: boolean;
  gwpExplanationSlug?: string | null;
}

export const ReductionProjectFormFields: FC<Props> = ({
  control,
  disabled,
  organizations,
  isLoadingOrgs,
  verifiedInventories,
  isLoadingInventories,
  selectedOrganizationId,
  subcategories,
  isLoadingSubcategories,
  hasInventorySelected,
  gwpExplanationSlug,
}) => {
  const { openExplanationBySlug } = useExplanationDialog();
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
          : `Huella ${inv.year ?? inv.id}`,
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
            loading={isLoadingOrgs}
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
                  ? `No hay huellas con reconocimiento de verificación para la ${VOCAB.organization.noun.singular} seleccionada`
                  : ""
            }
          >
            <span>
              <FormSelectField
                name="carbonInventoryId"
                control={control}
                label="Huella con reconocimiento de verificación"
                options={inventoryOptions}
                loading={isLoadingInventories}
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
                ? "Seleccione una huella con reconocimiento de verificación primero"
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
                loading={isLoadingSubcategories}
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
                ? "Seleccione una huella con reconocimiento de verificación primero"
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
                    ? min([new Date(selectedInventoryYear, 11, 31), new Date()])
                    : undefined
                }
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
              onClick={() => openExplanationBySlug(gwpExplanationSlug ?? null)}
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
