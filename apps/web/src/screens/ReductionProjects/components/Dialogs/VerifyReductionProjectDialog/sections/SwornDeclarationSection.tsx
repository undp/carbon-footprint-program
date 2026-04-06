import { FC } from "react";
import { Control } from "react-hook-form";
import { Typography } from "@mui/material";
import { FormSwornDeclarationField } from "@/components/form";
import type { VerifyReductionProjectFormValues } from "../VerifyReductionProjectDialog";

interface SwornDeclarationSectionProps {
  control: Control<VerifyReductionProjectFormValues>;
  isLoading: boolean;
}

export const SwornDeclarationSection: FC<SwornDeclarationSectionProps> = ({
  control,
  isLoading,
}) => (
  <FormSwornDeclarationField
    name="sworn"
    control={control}
    disabled={isLoading}
    errorMessage="Debes aceptar la declaración jurada para continuar"
    label={
      <Typography variant="body2">
        Declaro bajo juramento que toda la información proporcionada en esta
        postulación es verídica y está respaldada por documentación oficial.
        Entiendo que cualquier falsedad puede resultar en sanciones
        administrativas y la anulación del reconocimiento de reducción.
      </Typography>
    }
  />
);
