import { FC } from "react";
import { Control, Controller } from "react-hook-form";
import { Box, Typography, Checkbox, FormControlLabel } from "@mui/material";
import { FormTextField } from "@/components/form/FormTextField";
import { AddReductionProjectFormData } from "../types";

type ReportedInitiativeSectionProps = {
  control: Control<AddReductionProjectFormData>;
};

export const ReportedInitiativeSection: FC<ReportedInitiativeSectionProps> = ({
  control,
}) => {
  return (
    <Box className="flex flex-col gap-4">
      <Typography sx={{ fontSize: 16, color: "text.primary" }}>
        Reportado en otra iniciativa
      </Typography>

      <Controller
        name="reportedInOtherInitiative"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox checked={field.value} onChange={field.onChange} />
            }
            label="Este proyecto se ha reportado en otra iniciativa o en la meta nacional como mitigación del NDC"
            sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { pt: 0 } }}
          />
        )}
      />

      <FormTextField
        name="otherInitiativeDescription"
        control={control}
        label="Descripción de la otra iniciativa o NDC"
        placeholder="Ingresa la descripción"
        multiline
        rows={5}
        inputProps={{ maxLength: 1000 }}
      />
    </Box>
  );
};
