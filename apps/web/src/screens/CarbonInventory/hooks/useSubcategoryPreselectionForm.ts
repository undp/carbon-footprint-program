import { useEffect, useMemo } from "react";
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
        values[subcategory.id] = subcategory.included;
      });
    });
    return values;
  }, [categories]);

  useEffect(() => {
    if (categories.length > 0) {
      reset(initialValues);
    }
  }, [categories, initialValues, reset]);

  return form;
};
