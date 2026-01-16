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

    const currentValues = getValues(); // 2. Obtenemos valores actuales antes del reset
    const subcategoriesToForceSync: string[] = [];

    data.forEach((category) => {
      category.subcategories.forEach((subcategory: SubcategoryWithLines) => {
        const linesRecord: Record<string, EmissionCaptureFormLine> = {};
        subcategory.lines.forEach((line) => {
          linesRecord[line.lineId] = { ...line };
        });

        formData.subcategories[subcategory.id] = {
          lines: linesRecord,
          isTotalManualEmissionsMode: subcategory.isTotalManualEmissionsMode,
        };

        // 3. Detectamos si el modo cambió comparando la DB con el estado actual del formulario
        const currentMode =
          currentValues.subcategories?.[subcategory.id]
            ?.isTotalManualEmissionsMode;
        if (
          currentMode !== undefined &&
          currentMode !== subcategory.isTotalManualEmissionsMode
        ) {
          subcategoriesToForceSync.push(subcategory.id);
        }
      });
    });

    // 4. Primero, aplicamos el reset global
    reset(formData, { keepDirtyValues: true, keepErrors: true });

    // 5. Para las subcategorías que cambiaron de modo, usamos un "martillo" más fuerte
    subcategoriesToForceSync.forEach((id) => {
      // Usamos setValue para forzar el valor de la base de datos (fila 218)
      // pero con shouldDirty: false para que RHF deje de considerar esta rama como "editada"
      setValue(`subcategories.${id}.lines`, formData.subcategories[id].lines, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });

      // Y luego resetField para asegurar que el estado interno de dirtyFields se limpie
      resetField(`subcategories.${id}.lines`, {
        defaultValue: formData.subcategories[id].lines,
      });
    });
  }, [data, reset, getValues, resetField, setValue]); // 6. Añadimos las dependencias

  return form;
};
