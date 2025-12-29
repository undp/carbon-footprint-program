import { Box, Checkbox, Tooltip, Typography } from "@mui/material";
import {
  Controller,
  FieldPath,
  FieldValues,
  useFormContext,
} from "react-hook-form";

export type SubcategoryFieldEmission = {
  id: string | number;
  name: string;
  description?: string;
};

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  emission: SubcategoryFieldEmission;
  disabled?: boolean;
};

export const SubcategoryField = <T extends FieldValues>({
  name,
  emission,
  disabled = false,
}: Props<T>) => {
  const { control } = useFormContext<T>();

  const content = (
    <Box className="flex flex-row gap-2 justify-start content-start">
      <Box className="flex items-start justify-start">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Checkbox
              size="small"
              checked={field.value ?? false}
              onChange={(event) => field.onChange(event.target.checked)}
              disabled={disabled}
            />
          )}
        />
      </Box>
      <Box>
        <Typography
          variant="body1"
          color={disabled ? "text.disabled" : "text.primary"}
        >
          {emission.name}
        </Typography>
        {emission.description && (
          <Typography variant="body2" color="text.secondary">
            {emission.description}
          </Typography>
        )}
      </Box>
    </Box>
  );

  if (disabled) {
    return (
      <Tooltip
        title="No se puede deseleccionar porque tiene emisiones registradas. Elimine las emisiones primero."
        arrow
        placement="top"
      >
        <Box className="flex opacity-80 cursor-not-allowed">{content}</Box>
      </Tooltip>
    );
  }

  return <Box className="flex">{content}</Box>;
};
