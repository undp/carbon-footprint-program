import { useMemo } from "react";

type Option<Value extends string | number = string> = {
  label: string;
  value: Value;
};

export function useSelectorOptions<
  KLabel extends keyof T,
  KValue extends keyof T,
  T extends Record<KLabel, unknown> & Record<KValue, string | number>,
>(
  items: T[] | undefined,
  labelKey: KLabel,
  valueKey: KValue
): Option<T[KValue]>[] {
  return useMemo(
    () =>
      (items ?? []).map((item) => ({
        label: String(item[labelKey]),
        value: item[valueKey],
      })),
    [items, labelKey, valueKey]
  );
}
