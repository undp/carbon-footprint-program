import { Box, Checkbox, Tooltip, Typography } from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";
import { SubcategoryPreselectionMergedData } from "../types";

export const SubcategoryPreselectionField = ({
  subcategory,
}: {
  subcategory: SubcategoryPreselectionMergedData[number]["subcategories"][number];
}) => {
  const { control } = useFormContext();
  const disabled = subcategory.edited;

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
              disabled
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
                <Box className="shrink-0">
                  <Checkbox
                    size="small"
                    checked={Boolean(field.value)}
                    disabled={disabled}
                    sx={{ padding: 0 }}
                  />
                </Box>
                <Box className="flex flex-col">
                  <Typography variant="body1">{subcategory.name}</Typography>
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
