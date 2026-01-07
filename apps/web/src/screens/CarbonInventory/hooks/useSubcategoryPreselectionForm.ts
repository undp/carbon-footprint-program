import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { CategoryWithSubcategories } from "../types";

export interface SubcategoryPreselectionFormProps {
  categories: CategoryWithSubcategories[];
}

export const useSubcategoryPreselectionForm = ({
  categories,
}: SubcategoryPreselectionFormProps) => {
  const form = useForm<Record<string, boolean>>({
    defaultValues: {},
  });

  const { reset } = form;

  const initialValues = useMemo(() => {
    const values: Record<string, boolean> = {};
    categories.forEach((category) => {
      category.subcategories.forEach((subcategory) => {
        values[String(subcategory.id)] = subcategory.included;
      });
    });
    return values;
  }, [categories]);

  const isSettingFormDataRef = useRef<boolean>(true);

  useEffect(() => {
    if (categories.length > 0) {
      isSettingFormDataRef.current = true;
      reset(initialValues);

      queueMicrotask(() => {
        isSettingFormDataRef.current = false;
      });
    }
  }, [categories, initialValues, reset]);

  return {
    ...form,
  };
};
