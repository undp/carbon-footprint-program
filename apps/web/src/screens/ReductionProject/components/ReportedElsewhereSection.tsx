import { FC } from "react";
import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { Control, Controller, useWatch } from "react-hook-form";
import { FormTextField } from "@/components/form";
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";
import {
  REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH,
  type ExplanationSlug,
} from "@repo/constants";
import type { ReductionProjectFormValues } from "../formSchema";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
  reportedElsewhereExplanationSlug?: ExplanationSlug | null;
}

export const ReportedElsewhereSection: FC<Props> = ({
  control,
  disabled,
  reportedElsewhereExplanationSlug,
}) => {
  const reportedElsewhere = useWatch({ control, name: "reportedElsewhere" });
  const { openExplanationBySlug } = useExplanationDialog();

  return (
    <Box className="flex-1">
      <Box className="mb-4 flex items-center gap-1">
        <Typography variant="body1" fontSize={18}>
          Reportado en otra iniciativa
        </Typography>
        <InfoButton
          label="Más información"
          onClick={() =>
            openExplanationBySlug(reportedElsewhereExplanationSlug ?? null)
          }
        />
      </Box>
      <Controller
        name="reportedElsewhere"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox
                checked={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            }
            label={
              <Typography variant="body2" alignSelf="center">
                Este proyecto se ha reportado en otra iniciativa o en la meta
                nacional como mitigación del NDC
              </Typography>
            }
            sx={{ alignItems: "flex-start", mb: 2 }}
          />
        )}
      />
      <FormTextField
        name="reportedElsewhereDescription"
        control={control}
        label="Descripción de la otra iniciativa o NDC"
        placeholder="Ingresa la descripción"
        multiline
        rows={4}
        disabled={disabled || !reportedElsewhere}
        slotProps={{
          htmlInput: { maxLength: REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH },
        }}
      />
    </Box>
  );
};
