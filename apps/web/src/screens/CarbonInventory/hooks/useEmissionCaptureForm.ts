import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  EmissionCaptureFormValues,
  EmissionCaptureMergedData,
} from "../types/EmissionCaptureTypes";
import { SubcategoryWithLines } from "../types/EmissionCaptureTypes";

type Params = {
  data: EmissionCaptureMergedData;
};

const defaultValues: EmissionCaptureFormValues = {
  subcategories: {},
};

export const useEmissionCaptureForm = ({ data }: Params) => {
  const form = useForm<EmissionCaptureFormValues>({
    defaultValues,
    mode: "onChange",
  });

  const { reset } = form;

  useEffect(() => {
    const formData: EmissionCaptureFormValues = {
      subcategories: {},
    };

    data.forEach((category) => {
      category.subcategories.forEach((subcategory: SubcategoryWithLines) => {
        formData.subcategories[subcategory.id] = {
          lines: subcategory.lines,
        };
      });
    });

    reset(formData);
  }, [data, reset]);

  return form;
};
