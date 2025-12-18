import { useMemo } from "react";

type Option<Value extends string | number = string> = {
  label: string;
  value: Value;
};

export function useSelectorOptions<
  T,
  KLabel extends keyof T,
  KValue extends keyof T,
>(
  items: T[] | undefined,
  labelKey: KLabel,
  valueKey: KValue
): Option<T[KValue] & (string | number)>[] {
  return useMemo(
    () =>
      (items ?? []).map((item) => ({
        label: String(item[labelKey]),
        value: item[valueKey] as T[KValue] & (string | number),
      })),
    [items, labelKey, valueKey]
  );
}
