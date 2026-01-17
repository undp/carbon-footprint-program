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

        // 1 Detect if the mode changed OR if it's dirty (touched by user)
        const isModeDirty =
          !!form.formState.dirtyFields.subcategories?.[subcategory.id]
            ?.isTotalManualEmissionsMode;

        if (isModeDirty)
          subcategoriesToForceSync.push(subcategory.id);
      });
    });

    // 2. first, we apply the global reset to match the database state keeping user changes
    reset(formData, { keepDirtyValues: true, keepErrors: true });

    // 3. for the subcategories that changed mode, we use a stronger hammer to force the value of the database
    subcategoriesToForceSync.forEach((id) => {
      // we use setValue to force the value of the database of the entire subcategory
      // but with shouldDirty: false to clean the state of "edited"
      setValue(`subcategories.${id}`, formData.subcategories[id], {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });

      // then resetField on the entire subcategory to clean dirtyFields internally
      resetField(`subcategories.${id}`, {
        defaultValue: formData.subcategories[id],
      });
    });
  }, [data, reset, getValues, resetField, setValue, form.formState.dirtyFields]);

  return form;
};
