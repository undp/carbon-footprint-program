import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { useResetOnChange } from "@/hooks";
import { mapProjectToFormValues } from "../mappers";
import {
  reductionProjectFormSchema,
  defaultFormValues,
  type ReductionProjectFormValues,
} from "../formSchema";

interface Params {
  project?: GetReductionProjectByIdResponse;
}

export const useReductionProjectForm = ({ project }: Params = {}) => {
  const form = useForm<ReductionProjectFormValues>({
    defaultValues: defaultFormValues,
    mode: "onBlur",
    resolver: zodResolver(reductionProjectFormSchema),
  });

  const { control, setValue, reset, clearErrors } = form;

  const selectedOrganizationId = useWatch({ control, name: "organizationId" });
  const selectedCarbonInventoryId = useWatch({
    control,
    name: "carbonInventoryId",
  });

  const prevOrganizationIdRef = useRef<string | undefined>(undefined);
  const prevCarbonInventoryIdRef = useRef<string | undefined>(undefined);
  const isSettingFormDataRef = useRef<boolean>(true);

  // Reset inventory, subcategory, and year when organization changes
  useResetOnChange(
    isSettingFormDataRef,
    selectedOrganizationId,
    prevOrganizationIdRef,
    () => {
      setValue("carbonInventoryId", "");
      setValue("subcategoryId", "");
      setValue("year", "");
      clearErrors("carbonInventoryId");
      clearErrors("subcategoryId");
      clearErrors("year");
    }
  );

  // Reset subcategory and year when carbon inventory changes
  useResetOnChange(
    isSettingFormDataRef,
    selectedCarbonInventoryId,
    prevCarbonInventoryIdRef,
    () => {
      setValue("subcategoryId", "");
      setValue("year", "");
      clearErrors("subcategoryId");
      clearErrors("year");
    }
  );

  useEffect(() => {
    if (project) {
      isSettingFormDataRef.current = true;
      const mapped = mapProjectToFormValues(project);
      reset(mapped);

      prevOrganizationIdRef.current = mapped.organizationId || undefined;
      prevCarbonInventoryIdRef.current = mapped.carbonInventoryId || undefined;

      queueMicrotask(() => {
        isSettingFormDataRef.current = false;
      });
    } else {
      reset(defaultFormValues);
      prevOrganizationIdRef.current = undefined;
      prevCarbonInventoryIdRef.current = undefined;
      isSettingFormDataRef.current = false;
    }
  }, [project, reset]);

  return {
    ...form,
    selectedOrganizationId,
    selectedCarbonInventoryId,
  };
};
