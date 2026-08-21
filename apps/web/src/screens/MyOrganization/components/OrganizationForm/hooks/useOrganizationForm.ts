import { useCallback, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { GetOrganizationByIdResponse } from "@repo/types";
import { useResetOnChange } from "@/hooks";
import { TERRITORY_LEVEL_COUNT } from "../../../constants";
import { mapOrganizationToFormValues } from "../../../mappers";
import { OrganizationFormValues } from "../../../types";

// A factory rather than a shared constant: `territoryIds` is an array, and one
// instance handed to both `useForm` and every `reset` would be shared state.
const createDefaultValues = (): OrganizationFormValues => ({
  legalName: "",
  tradeName: "",
  taxId: "",
  address: "",
  sectorId: "",
  subsectorId: "",
  secondarySubsectorId: "",
  territoryIds: Array.from({ length: TERRITORY_LEVEL_COUNT }, () => ""),
  countryOrganizationSizeId: "",
  mainActivityId: "",
  employeesCount: null,
  representativeFullName: "",
  representativeTaxId: "",
  representativePositionId: "",
  representativePhone: "",
  representativeEmail: "",
  files: [],
});

type Params = {
  organization?: GetOrganizationByIdResponse;
};

export const useOrganizationForm = ({ organization }: Params = {}) => {
  const form = useForm<OrganizationFormValues>({
    defaultValues: createDefaultValues(),
  });

  const { control, setValue, reset, clearErrors } = form;

  const selectedSectorId = useWatch({ control, name: "sectorId" });
  const selectedSubsectorId = useWatch({ control, name: "subsectorId" });
  const territoryIds = useWatch({ control, name: "territoryIds" });

  const prevSectorIdRef = useRef<string | undefined>(undefined);
  const prevSubsectorIdRef = useRef<string | undefined>(undefined);
  const isSettingFormDataRef = useRef<boolean>(true);

  // One ref per territorial level that has descendants to clear. Declared and
  // used individually rather than through an array because hooks cannot be
  // called from a loop, and indexing an array of refs reads as a ref access
  // during render.
  const prevRegionRef = useRef<string | undefined>(undefined);
  const prevProvinceRef = useRef<string | undefined>(undefined);
  const prevMunicipalityRef = useRef<string | undefined>(undefined);
  const prevMunicipalDistrictRef = useRef<string | undefined>(undefined);

  // Reset subsector and activity when sector changes
  useResetOnChange(
    isSettingFormDataRef,
    selectedSectorId,
    prevSectorIdRef,
    () => {
      setValue("subsectorId", "");
      setValue("mainActivityId", "");
      clearErrors("subsectorId");
      clearErrors("mainActivityId");
    }
  );

  // Reset activity when subsector changes
  useResetOnChange(
    isSettingFormDataRef,
    selectedSubsectorId,
    prevSubsectorIdRef,
    () => {
      setValue("mainActivityId", "");
      clearErrors("mainActivityId");
    }
  );

  // Picking a different ancestor invalidates everything below it: a municipality
  // does not belong to the newly chosen province, and leaving it selected would
  // submit an incoherent chain.
  const clearTerritoryDescendants = useCallback(
    (changedLevel: number) => {
      for (
        let level = changedLevel + 1;
        level < TERRITORY_LEVEL_COUNT;
        level++
      ) {
        setValue(`territoryIds.${level}`, "");
        clearErrors(`territoryIds.${level}`);
      }
    },
    [setValue, clearErrors]
  );

  useResetOnChange(isSettingFormDataRef, territoryIds?.[0], prevRegionRef, () =>
    clearTerritoryDescendants(0)
  );
  useResetOnChange(
    isSettingFormDataRef,
    territoryIds?.[1],
    prevProvinceRef,
    () => clearTerritoryDescendants(1)
  );
  useResetOnChange(
    isSettingFormDataRef,
    territoryIds?.[2],
    prevMunicipalityRef,
    () => clearTerritoryDescendants(2)
  );
  useResetOnChange(
    isSettingFormDataRef,
    territoryIds?.[3],
    prevMunicipalDistrictRef,
    () => clearTerritoryDescendants(3)
  );

  useEffect(() => {
    if (organization) {
      // Step 1: Set flag to prevent reset effects from firing during initialization
      isSettingFormDataRef.current = true;
      const mappedOrganization = mapOrganizationToFormValues(organization);
      reset(mappedOrganization);

      // Step 2: Align refs with the initial form values
      prevSectorIdRef.current = mappedOrganization.sectorId || undefined;
      prevSubsectorIdRef.current = mappedOrganization.subsectorId || undefined;
      const [region, province, municipality, municipalDistrict] =
        mappedOrganization.territoryIds;
      prevRegionRef.current = region || undefined;
      prevProvinceRef.current = province || undefined;
      prevMunicipalityRef.current = municipality || undefined;
      prevMunicipalDistrictRef.current = municipalDistrict || undefined;

      // Step 3: Use queueMicrotask to defer flag release until after React Hook Form
      // has propagated the reset values to all watched fields. This prevents the
      // useResetOnChange effects from triggering during form initialization, which
      // would incorrectly clear subsector/activity fields when editing an organization.
      // The microtask executes after the current call stack but before the next render,
      // ensuring form values are fully synchronized before user interactions are tracked.
      queueMicrotask(() => {
        isSettingFormDataRef.current = false;
      });
    } else {
      reset(createDefaultValues());
      prevSectorIdRef.current = undefined;
      prevSubsectorIdRef.current = undefined;
      prevRegionRef.current = undefined;
      prevProvinceRef.current = undefined;
      prevMunicipalityRef.current = undefined;
      prevMunicipalDistrictRef.current = undefined;
      isSettingFormDataRef.current = false;
    }
  }, [organization, reset]);

  return {
    ...form,
    selectedSectorId,
    selectedSubsectorId,
    territoryIds,
  };
};
