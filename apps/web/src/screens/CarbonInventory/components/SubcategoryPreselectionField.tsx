import { Box, Checkbox, Tooltip, Typography } from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";
import { SubcategoryPreselectionMergedData } from "../types";
import { InfoButton } from "../../../components";
import { useExplanationDialog } from "../../../contexts";

export const SubcategoryPreselectionField = ({
  subcategory,
  disabled: disabledProp = false,
}: {
  subcategory: SubcategoryPreselectionMergedData[number]["subcategories"][number];
  disabled?: boolean;
}) => {
  const { openExplanation } = useExplanationDialog();
  const { control } = useFormContext();
  const editDisabled = subcategory.edited;
  const disabled = disabledProp || editDisabled;

  return (
    <Controller
      name={subcategory.id}
      control={control}
      render={({ field }) => {
        const handleClick = () => {
          if (!disabled) {
            field.onChange(!field.value);
          }
        };

        return (
          <Tooltip
            title={
              editDisabled
                ? "No se puede quitar porque tiene emisiones registradas. Elimine las emisiones primero."
                : ""
            }
            arrow
            placement="top"
          >
            <Box
              className={`flex py-4 select-none ${disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
              onClick={handleClick}
            >
              <Box className="flex flex-row items-start justify-start gap-2">
                <Box className="shrink-0 pt-[3px]">
                  <Checkbox
                    size="small"
                    checked={Boolean(field.value)}
                    disabled={disabled}
                    sx={{ padding: 0 }}
                  />
                </Box>
                <Box className="flex flex-col">
                  <Box className="flex flex-row items-center gap-2">
                    <Typography variant="body1">{subcategory.name}</Typography>
                    <InfoButton
                      label="Más información de la subcategoría"
                      onClick={(e) => {
                        e.stopPropagation();
                        openExplanation(subcategory.explanationId);
                      }}
                    />
                  </Box>
                  {subcategory.description && (
                    <Typography variant="body2" color="text.secondary">
                      {subcategory.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Tooltip>
        );
      }}
    />
  );
};
