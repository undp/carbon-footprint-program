import {
  GetCarbonInventoryByIdResponse,
  UpdateCarbonInventoryRequest,
} from "@repo/types";
import { BusinessProfilingFormValues } from "../hooks/useBusinessProfilingForm";
import { toSafeString } from "@/utils/string";

export const mapInventoryToFormValues = (
  inventory: GetCarbonInventoryByIdResponse
): BusinessProfilingFormValues => {
  const organizationData = inventory.organizationData;

  return {
    year: toSafeString(inventory.year),
    name: toSafeString(inventory.name),
    usageMode: inventory.usageMode,
    companyName: toSafeString(
      inventory.organizationName ?? organizationData?.name
    ),
    sector: toSafeString(organizationData?.sectorId),
    subSector: toSafeString(organizationData?.subsectorId),
    companySize: toSafeString(organizationData?.sizeId),
    activity: toSafeString(organizationData?.mainActivityId),
    quantity: organizationData?.mainActivityQuantity ?? null,
  };
};

export const mapFormValuesToRequest = (
  values: BusinessProfilingFormValues
): UpdateCarbonInventoryRequest => {
  return {
    year: values.year !== "" ? Number(values.year) : undefined,
    name: values.name ?? undefined,
    usageMode: values.usageMode,
    organizationData: {
      name: values.companyName || null,
      sectorId: values.sector || null,
      subsectorId: values.subSector || null,
      sizeId: values.companySize || null,
      mainActivityId: values.activity || null,
      mainActivityQuantity: values.quantity,
    },
  };
};
