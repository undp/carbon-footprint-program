import { FC, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import { Link, useNavigate } from "@tanstack/react-router";
import { AuthenticationLayout } from "@/components/layout";
import { Controller, useForm } from "react-hook-form";
import { useUpdateMyProfile } from "../../api/query/users/useUpdateMyProfile";
import { useUserStore } from "../../stores/userStore";
import { useJobPositions } from "../../api/query/jobPositions";
import { enqueueSnackbar } from "notistack";
import { Routes } from "../../interfaces";
import { useAuth } from "../../contexts";

type UserFields = {
  firstName: string;
  lastName: string;
  countryJobPositionId: string;
  termsAccepted: boolean;
};

export const UserFormScreen: FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();

  const { refetchUser } = useAuth();
  const { mutateAsync: updateMyProfile, isPending } = useUpdateMyProfile();

  const { data: jobPositions } = useJobPositions();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UserFields>({
    defaultValues: {
      firstName: "",
      lastName: "",
      countryJobPositionId: "",
      termsAccepted: false,
    },
  });

  const onSubmit = useCallback(
    async (data: UserFields) => {
      try {
        await updateMyProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          countryJobPositionId: data.countryJobPositionId,
          termsAccepted: data.termsAccepted,
        });

        void refetchUser();
        enqueueSnackbar("Usuario actualizado correctamente", {
          variant: "success",
        });
        void navigate({ to: Routes.HOME });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error updating user", error);
        enqueueSnackbar("No se pudo actualizar el usuario", {
          variant: "error",
        });
      }
    },
    [updateMyProfile, refetchUser, navigate]
  );

  return (
    <AuthenticationLayout>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex w-full flex-col items-center justify-center px-10 pt-20"
      >
        <Box className="flex w-[324px] flex-col items-center gap-4">
          <Typography variant="h4" fontWeight="medium">
            Completa tus datos
          </Typography>

          <Typography variant="h6" textAlign="center" fontWeight="regular">
            Así podrás guardar tu progreso
          </Typography>

          <TextField fullWidth label="Email" disabled value={user?.email} />

          <Controller
            name="firstName"
            control={control}
            rules={{ required: "El nombre es obligatorio" }}
            disabled={isPending}
            defaultValue={user?.firstName || ""}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Nombre*"
                autoComplete="firstName"
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            )}
          />

          <Controller
            name="lastName"
            control={control}
            rules={{ required: "El apellido es obligatorio" }}
            disabled={isPending}
            defaultValue={user?.lastName || ""}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Apellido*"
                autoComplete="lastName"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            )}
          />

          {/* Select Job Title */}
          <FormControl fullWidth>
            <InputLabel>Cargo</InputLabel>

            <Controller
              name="countryJobPositionId"
              control={control}
              rules={{ required: "Selecciona un cargo" }}
              disabled={isPending}
              defaultValue={user?.countryJobPositionId || ""}
              render={({ field }) => (
                <Select {...field} label="Cargo*">
                  {jobPositions?.map((position) => (
                    <MenuItem key={position.id} value={position.id}>
                      {position.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.countryJobPositionId && (
              <Typography color="error" variant="caption">
                {errors.countryJobPositionId.message}
              </Typography>
            )}
          </FormControl>

          <Controller
            name="termsAccepted"
            control={control}
            defaultValue={user?.termsAccepted || false}
            disabled={user?.termsAccepted === true || isPending}
            rules={{ required: "Debes aceptar los términos y condiciones" }}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox {...field} checked={field.value} />}
                label={
                  <Box className="flex w-full flex-col gap-1">
                    <Typography variant="caption">
                      Acepto los{" "}
                      <Typography
                        variant="caption"
                        component={Link}
                        color="info"
                      >
                        términos y condiciones{" "}
                      </Typography>
                      y la{" "}
                      <Typography
                        variant="caption"
                        component={Link}
                        color="info"
                      >
                        política de uso de datos personales
                      </Typography>
                    </Typography>
                  </Box>
                }
              />
            )}
          />
          {errors.termsAccepted && (
            <Typography color="error" variant="caption">
              {errors.termsAccepted.message}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            loading={isPending}
          >
            Guardar
          </Button>
        </Box>
      </form>
    </AuthenticationLayout>
  );
};
