import { useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import type { Methodology } from "../types";

export interface MethodologiesFormValues {
  methodologies: Methodology[];
}

const resolver: Resolver<MethodologiesFormValues> = (values) => {
  const errors: Record<string, unknown> = {};
  const methodologyErrors: Record<number, Record<string, unknown>> = {};

  values.methodologies.forEach((item, index) => {
    const fieldErrors: Record<string, unknown> = {};
    if (!item.nombre.trim()) {
      fieldErrors.nombre = { type: "required", message: "Campo obligatorio" };
    }
    if (!item.descripcion.trim()) {
      fieldErrors.descripcion = {
        type: "required",
        message: "Campo obligatorio",
      };
    }
    if (!item.normativa.trim()) {
      fieldErrors.normativa = {
        type: "required",
        message: "Campo obligatorio",
      };
    }
    if (!item.version.trim()) {
      fieldErrors.version = { type: "required", message: "Campo obligatorio" };
    }
    if (Object.keys(fieldErrors).length > 0) {
      methodologyErrors[index] = fieldErrors;
    }
  });

  if (Object.keys(methodologyErrors).length > 0) {
    errors.methodologies = methodologyErrors;
  }

  return {
    values: Object.keys(errors).length === 0 ? values : {},
    errors: Object.keys(errors).length === 0 ? {} : errors,
  };
};

export const useMethodologiesForm = (serverData: Methodology[]) => {
  const form = useForm<MethodologiesFormValues>({
    defaultValues: { methodologies: [] },
    mode: "onChange",
    resolver,
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "methodologies",
    keyName: "_rhfId",
  });

  const serverSnapshotRef = useRef<Methodology[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (serverData.length > 0 && !initialized.current) {
      serverSnapshotRef.current = serverData;
      form.reset({ methodologies: serverData });
      initialized.current = true;
    }
  }, [serverData, form]);

  return {
    form,
    fieldArray,
    serverSnapshotRef,
  };
};
