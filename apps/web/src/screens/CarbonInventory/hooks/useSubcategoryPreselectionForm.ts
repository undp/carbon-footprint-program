import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { SubcategoryPreselectionMergedData } from "../types";

export interface UseSubcategoryPreselectionFormProps {
  data: SubcategoryPreselectionMergedData;
}

export const useSubcategoryPreselectionForm = ({
  data,
}: UseSubcategoryPreselectionFormProps) => {
  const form = useForm<Record<string, boolean>>({
    defaultValues: {},
  });

  const { reset } = form;

  const initialValues = useMemo(() => {
    const values: Record<string, boolean> = {};
    data.forEach((category) => {
      category.subcategories.forEach((subcategory) => {
        values[subcategory.id] = subcategory.included;
      });
    });
    return values;
  }, [data]);

  useEffect(() => {
    if (data.length > 0) {
      reset(initialValues);
    }
  }, [data, initialValues, reset]);

  return form;
};
