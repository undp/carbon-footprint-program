import { useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { CategoryWithSubcategories } from "../types";
import { useSubcategoryPreselectionSubmit } from "./useSubcategoryPreselectionSubmit";

export interface SubcategoryPreselectionFormProps {
  inventoryId: string;
  categories: CategoryWithSubcategories[];
  onSuccess?: () => void;
}

export interface SubcategoryPreselectionFormReturn {
  methods: UseFormReturn<Record<string, boolean>>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
}

export const useSubcategoryPreselectionForm = ({
  inventoryId,
  categories,
  onSuccess,
}: SubcategoryPreselectionFormProps): SubcategoryPreselectionFormReturn => {
  const initialValues = useMemo(() => {
    const values: Record<string, boolean> = {};
    categories.forEach((category: CategoryWithSubcategories) => {
      category.subcategories.forEach((subcategory) => {
        values[String(subcategory.id)] = subcategory.included;
      });
    });
    return values;
  }, [categories]);

  const methods = useForm<Record<string, boolean>>({
    values: initialValues,
  });

  const { handleSubmit } = methods;

  const { onSubmit, isSubmitting } = useSubcategoryPreselectionSubmit(
    inventoryId,
    { onSuccess }
  );

  return {
    methods,
    onSubmit: handleSubmit(onSubmit),
    isSubmitting,
  };
};
