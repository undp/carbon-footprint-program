import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";
import { useResetOnChange } from "@/hooks";
import { mapOrganizationToFormValues } from "../../../transformers";

const defaultValues: CreateOrganizationBody = {
  legalName: "",
  tradeName: "",
  taxId: "",
  address: "",
  sectorId: "",
  subsectorId: "",
  countryOrganizationSizeId: "",
  mainActivityId: "",
  employeesCount: null,
  representativeFullName: "",
  representativeTaxId: "",
  representativePositionId: "",
  representativePhone: "",
  representativeEmail: "",
};

type Params = {
  organization?: GetOrganizationByIdResponse;
};

export const useOrganizationForm = ({ organization }: Params = {}) => {
  const form = useForm<CreateOrganizationBody>({
    defaultValues,
  });

  const { control, setValue, reset, clearErrors } = form;

  const selectedSectorId = useWatch({ control, name: "sectorId" });
  const selectedSubsectorId = useWatch({ control, name: "subsectorId" });

  const prevSectorIdRef = useRef<string | undefined>(undefined);
  const prevSubsectorIdRef = useRef<string | undefined>(undefined);
  const isSettingFormDataRef = useRef<boolean>(true);

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

  useEffect(() => {
    if (organization) {
      // Step 1: Set flag to prevent reset effects from firing during initialization
      isSettingFormDataRef.current = true;
      const mappedOrganization = mapOrganizationToFormValues(organization);
      reset(mappedOrganization);

      // Step 2: Align refs with the initial form values
      prevSectorIdRef.current = mappedOrganization.sectorId || undefined;
      prevSubsectorIdRef.current = mappedOrganization.subsectorId || undefined;

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
      prevSectorIdRef.current = undefined;
      prevSubsectorIdRef.current = undefined;
      isSettingFormDataRef.current = false;
    }
  }, [organization, reset]);

  return {
    ...form,
    selectedSectorId,
    selectedSubsectorId,
  };
};
