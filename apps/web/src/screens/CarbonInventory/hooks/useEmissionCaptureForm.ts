import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  EmissionCaptureFormValues,
  EmissionCaptureMergedData,
  EmissionCaptureFormLine,
} from "../types/EmissionCaptureTypes";
import { SubcategoryWithLines } from "../types/EmissionCaptureTypes";

type Params = {
  data: EmissionCaptureMergedData;
};

const defaultValues: EmissionCaptureFormValues = {
  subcategories: {},
};

// apps/web/src/screens/CarbonInventory/hooks/useEmissionCaptureForm.ts

export const useEmissionCaptureForm = ({ data }: Params) => {
  const form = useForm<EmissionCaptureFormValues>({
    defaultValues,
    mode: "onChange",
  });

  const { reset, getValues, resetField, setValue } = form; // 1. Extraemos getValues y resetField

  useEffect(() => {
    const formData: EmissionCaptureFormValues = {
      subcategories: {},
    };

    const subcategoriesToForceSync: string[] = [];

    data.forEach((category) => {
      category.subcategories.forEach((subcategory: SubcategoryWithLines) => {
        const linesRecord = subcategory.lines.reduce((acc, line) => {
          acc[line.id] = line;
          return acc;
        }, {} as Record<string, EmissionCaptureFormLine>);
        
        formData.subcategories[subcategory.id] = {
          lines: linesRecord,
          isTotalManualEmissionsMode: subcategory.isTotalManualEmissionsMode,
        };

        // 3.2 Detect if the mode changed OR if it's dirty (touched by user)
        const isModeDirty =
          !!form.formState.dirtyFields.subcategories?.[subcategory.id]
            ?.isTotalManualEmissionsMode;

        if (isModeDirty)
          subcategoriesToForceSync.push(subcategory.id);
      });
    });

    // 4. Primero, aplicamos el reset global
    reset(formData, { keepDirtyValues: true, keepErrors: true });

    // 5. Para las subcategorías que cambiaron de modo, usamos un "martillo" más fuerte
    subcategoriesToForceSync.forEach((id) => {
      // Usamos setValue para forzar el valor de la base de datos de toda la subcategoría
      // pero con shouldDirty: false para que RHF limpie el estado de "editado"
      setValue(`subcategories.${id}`, formData.subcategories[id], {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });

      // Y luego resetField sobre la subcategoría completa para limpiar dirtyFields internamente
      resetField(`subcategories.${id}`, {
        defaultValue: formData.subcategories[id],
      });
    });
  }, [data, reset, getValues, resetField, setValue, form.formState.dirtyFields]); // 6. Añadimos las dependencias

  return form;
};
