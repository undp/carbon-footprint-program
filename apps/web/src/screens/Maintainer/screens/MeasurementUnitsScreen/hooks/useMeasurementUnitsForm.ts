import { useForm, useFieldArray } from "react-hook-form";
import type { MeasurementUnitForm } from "../types";

interface MeasurementUnitsFormValues {
  measurementUnits: MeasurementUnitForm[];
}

export const useMeasurementUnitsForm = () => {
  const form = useForm<MeasurementUnitsFormValues>({
    defaultValues: { measurementUnits: [] },
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "measurementUnits",
  });

  return { form, fieldArray };
};
