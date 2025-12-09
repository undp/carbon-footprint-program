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
import { Link } from "@tanstack/react-router";
import { AuthenticationLayout } from "@/components/layout";
import { Controller, useForm } from "react-hook-form";

type SignUpValues = {
  email: string;
  name: string;
  jobTitle: string;
  termsAccepted: boolean;
};

export const SignUpScreen: FC = () => {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignUpValues>({
    defaultValues: {
      email: "",
      name: "",
      jobTitle: "",
      termsAccepted: false,
    },
  });

  const onSubmit = useCallback((data: SignUpValues) => {
    console.log("Form Data:", data);
  }, []);

  return (
    <AuthenticationLayout>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col pt-20 px-10 w-full justify-center items-center"
      >
        <Box className="flex flex-col gap-6 w-[324px] items-center">
          <Typography variant="h4" fontWeight="medium">
            Completa tus datos
          </Typography>

          <Typography variant="h6" textAlign="center" fontWeight="regular">
            Así podrás guardar tu progreso
          </Typography>

          {/* Email */}
          <Controller
            name="email"
            control={control}
            rules={{ required: "El correo es obligatorio" }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />

          <Controller
            name="name"
            control={control}
            rules={{ required: "El nombre es obligatorio" }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Nombre"
                autoComplete="name"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />

          {/* Select Job Title */}
          <FormControl fullWidth>
            <InputLabel>Cargo</InputLabel>

            <Controller
              name="jobTitle"
              control={control}
              rules={{ required: "Selecciona un cargo" }}
              render={({ field }) => (
                <Select {...field} label="Cargo">
                  <MenuItem value="Gerente General">Gerente General</MenuItem>
                  <MenuItem value="Gerente de Proyectos">
                    Gerente de Proyectos
                  </MenuItem>
                  <MenuItem value="Ingeniero de Software">
                    Ingeniero de Software
                  </MenuItem>
                  <MenuItem value="Analista de Datos">
                    Analista de Datos
                  </MenuItem>
                </Select>
              )}
            />
            {errors.jobTitle && (
              <Typography color="error" variant="caption">
                {errors.jobTitle.message}
              </Typography>
            )}
          </FormControl>

          <Controller
            name="termsAccepted"
            control={control}
            rules={{ required: "Debes aceptar los términos y condiciones" }}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox {...field} checked={field.value} />}
                label={
                  <Box className="flex flex-col gap-1 w-full">
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

          <Button type="submit" variant="contained" fullWidth>
            Crear Cuenta
          </Button>
        </Box>
      </form>
    </AuthenticationLayout>
  );
};
