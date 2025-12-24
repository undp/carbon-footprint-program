import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CarbonInventory, UsageMode } from "@repo/types";
import { mapInventoryToFormValues } from "../utils/businessProfilingTransformers";

export type BusinessProfilingFormValues = {
  year: string;
  companyName: string;
  sector: string;
  subSector: string;
  companySize: string;
  activity: string;
  usageMode: UsageMode;
  quantity: string;
};

type Params = {
  existingInventory?: CarbonInventory;
};

const defaultValues: BusinessProfilingFormValues = {
  year: "",
  companyName: "",
  sector: "",
  subSector: "",
  companySize: "",
  activity: "",
  usageMode: "EXPERT",
  quantity: "",
};

export function useBusinessProfilingForm({ existingInventory }: Params) {
  const form = useForm<BusinessProfilingFormValues>({
    defaultValues,
  });

  const { control, setValue, reset } = form;

  const selectedSectorId = useWatch({ control, name: "sector" });
  const selectedSubsectorId = useWatch({ control, name: "subSector" });
  const selectedActivityId = useWatch({ control, name: "activity" });

  const prevSectorIdRef = useRef<string | undefined>(undefined);
  const prevSubsectorIdRef = useRef<string | undefined>(undefined);
  const isSettingFormDataRef = useRef<boolean>(true);

  useEffect(() => {
    if (isSettingFormDataRef.current) {
      prevSectorIdRef.current = selectedSectorId;
      isSettingFormDataRef.current = false;
      return;
    }

    if (selectedSectorId !== prevSectorIdRef.current) {
      setValue("subSector", "");
      setValue("activity", "");
      setValue("quantity", "");
    }
    prevSectorIdRef.current = selectedSectorId;
  }, [selectedSectorId, setValue]);

  useEffect(() => {
    if (isSettingFormDataRef.current) {
      prevSubsectorIdRef.current = selectedSubsectorId;
      return;
    }

    if (selectedSubsectorId !== prevSubsectorIdRef.current) {
      setValue("activity", "");
      setValue("quantity", "");
    }
    prevSubsectorIdRef.current = selectedSubsectorId;
  }, [selectedSubsectorId, setValue]);

  useEffect(() => {
    if (!selectedActivityId) {
      setValue("quantity", "");
    }
  }, [selectedActivityId, setValue]);

  useEffect(() => {
    if (existingInventory) {
      isSettingFormDataRef.current = true;
      const mappedInventory = mapInventoryToFormValues(existingInventory);
      reset(mappedInventory);
    } else {
      isSettingFormDataRef.current = false;
    }
  }, [existingInventory, reset]);

  return {
    ...form,
    selectedSectorId,
    selectedSubsectorId,
    selectedActivityId,
  };
}
