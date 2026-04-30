import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { GetCarbonInventoryByIdResponse, UsageMode } from "@repo/types";
import { mapInventoryToFormValues } from "../utils/businessProfilingTransformers";
import { useResetOnChange } from "@/hooks";

export type BusinessProfilingFormValues = {
  year: string;
  name: string;
  companyName: string;
  sector: string;
  subSector: string;
  companySize: string;
  activity: string;
  usageMode: UsageMode;
  quantity: number | null;
};

type Params = {
  existingInventory?: GetCarbonInventoryByIdResponse;
};

const defaultValues: BusinessProfilingFormValues = {
  year: "",
  name: "",
  companyName: "",
  sector: "",
  subSector: "",
  companySize: "",
  activity: "",
  usageMode: "EXPERT",
  quantity: null,
};

export const useBusinessProfilingForm = ({ existingInventory }: Params) => {
  const form = useForm<BusinessProfilingFormValues>({
    defaultValues,
  });

  const { control, setValue, reset, clearErrors } = form;

  const selectedSectorId = useWatch({ control, name: "sector" });
  const selectedSubsectorId = useWatch({ control, name: "subSector" });
  const selectedActivityId = useWatch({ control, name: "activity" });

  const prevSectorIdRef = useRef<string | undefined>(undefined);
  const prevSubsectorIdRef = useRef<string | undefined>(undefined);
  const prevActivityIdRef = useRef<string | undefined>(undefined);
  const isSettingFormDataRef = useRef<boolean>(true);

  useResetOnChange(
    isSettingFormDataRef,
    selectedSectorId,
    prevSectorIdRef,
    () => {
      setValue("subSector", "");
      setValue("activity", "");
      setValue("quantity", null);
      clearErrors("quantity");
    }
  );

  useResetOnChange(
    isSettingFormDataRef,
    selectedSubsectorId,
    prevSubsectorIdRef,
    () => {
      setValue("activity", "");
      setValue("quantity", null);
      clearErrors("quantity");
    }
  );

  useResetOnChange(
    isSettingFormDataRef,
    selectedActivityId,
    prevActivityIdRef,
    () => {
      setValue("quantity", null);
      clearErrors("quantity");
    }
  );

  useEffect(() => {
    if (existingInventory) {
      isSettingFormDataRef.current = true;
      const mappedInventory = mapInventoryToFormValues(existingInventory);
      reset(mappedInventory);

      // Keeps refs aligned with initial values before enabling effects
      prevSectorIdRef.current = mappedInventory.sector || undefined;
      prevSubsectorIdRef.current = mappedInventory.subSector || undefined;
      prevActivityIdRef.current = mappedInventory.activity || undefined;

      // Releases effects after React Hook Form propagates the values
      queueMicrotask(() => {
        isSettingFormDataRef.current = false;
      });
    } else {
      prevSectorIdRef.current = undefined;
      prevSubsectorIdRef.current = undefined;
      prevActivityIdRef.current = undefined;
      isSettingFormDataRef.current = false;
    }
  }, [existingInventory, reset]);

  return {
    ...form,
    selectedSectorId,
    selectedSubsectorId,
    selectedActivityId,
  };
};
