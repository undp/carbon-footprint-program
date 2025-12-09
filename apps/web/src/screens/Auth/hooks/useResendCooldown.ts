import { useCallback, useEffect, useState } from "react";

interface UseResendCooldownOptions {
  initialCooldown?: number;
  onResend?: () => void;
}

export const useResendCooldown = ({
  initialCooldown = 60,
  onResend,
}: UseResendCooldownOptions = {}) => {
  const [cooldownSeconds, setCooldownSeconds] = useState(initialCooldown);
  const [isActive, setIsActive] = useState(initialCooldown > 0);

  useEffect(() => {
    if (!isActive || cooldownSeconds <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldownSeconds, isActive]);

  const handleResend = useCallback(() => {
    if (cooldownSeconds > 0) return;

    onResend?.();
    setCooldownSeconds(60);
    setIsActive(true);
  }, [cooldownSeconds, onResend]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const canResend = cooldownSeconds <= 0;
  const timeRemaining = formatTime(cooldownSeconds);

  return {
    canResend,
    cooldownSeconds,
    timeRemaining,
    handleResend,
  };
};
