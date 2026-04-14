import { FC } from "react";
import { Typography } from "@mui/material";
import { Control } from "react-hook-form";
import { FormFileUpload } from "@/components/form";
import type { ReductionProjectFormValues } from "../formSchema";
import { FormSwornDeclarationField } from "@/components/form/FormSwornDeclarationField";
import { RequiredDocumentsSection } from "./RequiredDocumentsSection";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
}

export const FileUploadSection: FC<Props> = ({ control, disabled }) => {
  return (
    <>
      <Typography variant="body1" fontSize={18}>
        Documentos de respaldo
      </Typography>
      <RequiredDocumentsSection />
      <FormFileUpload
        control={control}
        name="files"
        disabled={disabled}
        required
        requiredMessage="Al menos un archivo es requerido"
      />
      <FormSwornDeclarationField
        name="sworn"
        control={control}
        disabled={disabled}
        errorMessage="Debes aceptar la declaración jurada para continuar"
        label={
          <Typography variant="body2" alignSelf="center">
            Declaro bajo juramento que toda la información proporcionada en esta
            postulación es verídica y está respaldada por documentación oficial.
            Entiendo que cualquier falsedad puede resultar en sanciones
            administrativas y la anulación del reconocimiento de reducción.
          </Typography>
        }
      />
    </>
  );
};
