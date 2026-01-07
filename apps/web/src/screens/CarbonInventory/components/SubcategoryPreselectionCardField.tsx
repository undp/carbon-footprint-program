import { Box, Checkbox, Tooltip, Typography } from "@mui/material";
import {
  Controller,
  FieldPath,
  FieldValues,
  useFormContext,
} from "react-hook-form";

export type SubcategoryFieldSubcategory = {
  id: string | number;
  name: string;
  description?: string | null;
};

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  subcategory: SubcategoryFieldSubcategory;
  disabled?: boolean;
};

export const SubcategoryField = <T extends FieldValues>({
  name,
  subcategory,
  disabled = false,
}: Props<T>) => {
  const { control } = useFormContext<T>();

  return (
    <Controller
      name={name}
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
            <Box className={`flex ${disabled ? "opacity-80" : ""}`}>
              <Box
                className="flex flex-row items-start justify-start gap-2"
                onClick={handleClick}
                sx={{
                  cursor: disabled ? "not-allowed" : "pointer",
                  userSelect: "none",
                }}
              >
                <Box className="shrink-0">
                  <Checkbox
                    size="small"
                    checked={field.value ?? false}
                    onChange={(event) => field.onChange(event.target.checked)}
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
