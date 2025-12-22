import { useEffect } from "react";
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

  useEffect(() => {
    if (!selectedSectorId) {
      setValue("subSector", "");
    }
  }, [selectedSectorId, setValue]);

  useEffect(() => {
    if (!selectedActivityId) {
      setValue("quantity", "");
    }
  }, [selectedActivityId, setValue]);

  useEffect(() => {
    if (existingInventory) {
      reset(mapInventoryToFormValues(existingInventory));
    }
  }, [existingInventory, reset]);

  return {
    ...form,
    selectedSectorId,
    selectedSubsectorId,
    selectedActivityId,
  };
}
