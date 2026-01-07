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
  description?: string | null;
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
    <Box className="flex flex-row items-start justify-start gap-2">
      <Box className="shrink-0">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Checkbox
              size="small"
              checked={field.value ?? false}
              onChange={(event) => field.onChange(event.target.checked)}
              disabled={disabled}
              sx={{ padding: 0 }}
            />
          )}
        />
      </Box>
      <Box className="flex flex-col">
        <Typography variant="body1">{emission.name}</Typography>
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
        title="No se puede quitar porque tiene emisiones registradas. Elimine las emisiones primero."
        arrow
        placement="top"
      >
        <Box className="flex cursor-not-allowed opacity-80">{content}</Box>
      </Tooltip>
    );
  }

  return <Box className="flex">{content}</Box>;
};
