import { useEffect } from "react";

export const useResetOnChange = <T>(
  isSettingRef: React.RefObject<boolean>,
  current: T,
  prevRef: React.RefObject<T>,
  resetFn: () => void
) => {
  useEffect(() => {
    if (isSettingRef.current) {
      prevRef.current = current;
      return;
    }
    if (current !== prevRef.current) resetFn();
    prevRef.current = current;
  }, [current, resetFn, isSettingRef, prevRef]);
};
