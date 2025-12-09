// src/components/auth/MuiOtpField.tsx
import React from "react";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { Box, Stack, FormHelperText, SxProps, Theme } from "@mui/material";
import { OtpSlot } from "./OtpSlot";
import { FC } from "react";

export interface OtpFieldProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  errorText?: string;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

export const OtpField: FC<OtpFieldProps> = ({
  value,
  onChange,
  onComplete,
  length = 6,
  errorText,
  disabled,
  sx,
}) => {
  const hasError = Boolean(errorText);

  return (
    <Stack spacing={1} sx={sx}>
      <OTPInput
        id="otp-input"
        name="otp"
        maxLength={length}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        containerClassName=""
        render={({ slots }) => (
          <Box display="flex" gap={2} justifyContent="center">
            {slots.map((slot, index) => (
              <React.Fragment key={index}>
                <OtpSlot {...slot} error={hasError} />
                {index === 2 && <span />}
              </React.Fragment>
            ))}
          </Box>
        )}
      />
      {errorText && (
        <FormHelperText error sx={{ textAlign: "center" }}>
          {errorText}
        </FormHelperText>
      )}
    </Stack>
  );
};
