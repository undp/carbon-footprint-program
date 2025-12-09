import { FC, useCallback } from "react";
import { z } from "zod";
import { Box, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { AuthenticationLayout } from "@/components/layout";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OtpField } from "./components/OtpField";
import { useResendCooldown } from "./hooks/useResendCooldown";

const otpSchema = z.object({
  otp: z.string().length(6, "El código debe tener 6 dígitos"),
});

type OtpFormValues = z.infer<typeof otpSchema>;

interface Props {
  onSubmit?: (data: OtpFormValues) => void;
  onResend?: () => void;
  onTryAnotherWay?: () => void;
  onModifyEmail?: () => void;
}

export const OtpScreen: FC<Props> = ({
  onSubmit,
  onResend,
  onTryAnotherWay,
  onModifyEmail,
}) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const { canResend, timeRemaining, handleResend } = useResendCooldown({
    initialCooldown: 60,
    onResend,
  });

  const handleOtpComplete = useCallback(
    (_completedOtp: string) => {
      void handleSubmit((data) => {
        onSubmit?.(data);
      })();
    },
    [handleSubmit, onSubmit]
  );

  return (
    <AuthenticationLayout>
      <Box className="flex flex-col pt-20 px-10 gap-6 w-full justify-center items-center">
        <Typography variant="h4" fontWeight="medium">
          Ingresa el código
        </Typography>

        <Typography
          sx={{ maxWidth: 364 }}
          variant="h6"
          textAlign="center"
          fontWeight="regular"
        >
          Te enviamos un código de verificación a [nombre@correo.com]{" "}
          {onModifyEmail && (
            <Typography
              variant="h6"
              fontWeight="regular"
              component={Link}
              color="info"
              onClick={onModifyEmail}
            >
              modificar
            </Typography>
          )}
        </Typography>

        <Box className="flex flex-row gap-2 justify-center">
          <Controller
            name="otp"
            control={control}
            render={({ field }) => (
              <OtpField
                value={field.value}
                onChange={field.onChange}
                onComplete={handleOtpComplete}
                length={6}
                errorText={errors.otp?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </Box>

        <Typography
          variant="subtitle1"
          color={canResend ? "info" : "grey"}
          sx={{
            cursor: canResend ? "pointer" : "default",
          }}
          onClick={canResend ? handleResend : undefined}
        >
          {canResend
            ? "Volver a enviar código"
            : `Volver a enviar código (${timeRemaining})`}
        </Typography>

        {onTryAnotherWay && (
          <Typography
            variant="subtitle1"
            component={Link}
            color="info"
            onClick={onTryAnotherWay}
          >
            Probar de otra manera
          </Typography>
        )}
      </Box>
    </AuthenticationLayout>
  );
};
