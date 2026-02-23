import { FC, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import {
  Box,
  Typography,
  Button,
  Divider,
  Alert,
  Checkbox,
  FormControlLabel,
  TextField,
} from "@mui/material";
import { InfoOutlined, Save, ArrowBack } from "@mui/icons-material";
import { FormTextField } from "@/components/form/FormTextField";
import { FormSelectField } from "@/components/form/FormSelectField";
import { InfoButton } from "@/components/InfoButton";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces";

type AddReductionProjectFormData = {
  projectName: string;
  branch: string;
  implementationDate: string;
  emissionSubcategory: string;
  projectDescription: string;
  pcg: string;
  reportedInOtherInitiative: boolean;
  includedInNDC: boolean;
  reductionYear: string;
  baselineValue: number;
  projectValue: number;
  carbonLeakage: number;
  removals: number;
  totalReduction: number;
};

// Mock data - will be replaced with API calls
const mockBranches = [
  { value: "1", label: "Planta Tiltil" },
  { value: "2", label: "Planta Santiago" },
  { value: "3", label: "Oficina Central" },
];

const mockSubcategories = [
  { value: "1", label: "Combustión estacionaria" },
  { value: "2", label: "Transporte" },
  { value: "3", label: "Energía eléctrica" },
];

const mockPCGOptions = [
  { value: "AR5", label: "AR5 (2014)" },
  { value: "AR4", label: "AR4 (2007)" },
  { value: "SAR", label: "SAR (1996)" },
];

const currentYear = new Date().getFullYear();
const mockYears = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

const organizationInfo = {
  legalName: "CEMENTERA DEL VALLE",
  rut: "76.458.320-1",
  legalRepresentative: "Rodrigo Ignacio Paredes Valdés",
};

export const AddReductionProjectScreen: FC = () => {
  const navigate = useNavigate();

  const { control, handleSubmit, watch } = useForm<AddReductionProjectFormData>(
    {
      defaultValues: {
        projectName: "",
        branch: "",
        implementationDate: "",
        emissionSubcategory: "",
        projectDescription: "",
        pcg: "",
        reportedInOtherInitiative: false,
        includedInNDC: false,
        reductionYear: "",
        baselineValue: 0,
        projectValue: 0,
        carbonLeakage: 0,
        removals: 0,
        totalReduction: 0,
      },
    }
  );

  const baselineValue = watch("baselineValue");
  const projectValue = watch("projectValue");
  const carbonLeakage = watch("carbonLeakage");
  const removals = watch("removals");

  // Calculate total reduction automatically with NaN protection
  const calculatedReduction = useMemo(() => {
    const baseline = Number(baselineValue) || 0;
    const project = Number(projectValue) || 0;
    const leakage = Number(carbonLeakage) || 0;
    const removal = Number(removals) || 0;
    return baseline - project - leakage + removal;
  }, [baselineValue, projectValue, carbonLeakage, removals]);

  const handleSaveDraft = () => {
    console.log("Save draft");
    // TODO: Implement save draft functionality
  };

  const handleBack = () => {
    navigate({ to: Routes.REDUCTION_PROJECTS });
  };

  const handleFormSubmit = (data: AddReductionProjectFormData) => {
    console.log("Submit form", data);
    // TODO: Implement form submission
  };

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <Box className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            startIcon={<ArrowBack />}
            sx={{ color: "text.primary" }}
          >
            Volver
          </Button>
          <Typography variant="h5" sx={{ color: "text.primary" }}>
            Postulación Sello Reducción
          </Typography>
        </Box>

        {/* Main Content */}
        <Box className="mx-auto w-full max-w-[1230px]">
          <Box
            className="flex flex-col gap-4 overflow-y-auto rounded-lg bg-white p-4"
            sx={{ backdropFilter: "blur(5px)" }}
          >
          {/* Title and Save Draft Button */}
          <Box className="flex h-10 items-center justify-between">
            <Box className="flex items-center gap-2">
              <Typography variant="body1" sx={{ fontSize: 18 }}>
                Identificación de proyecto de Reducción
              </Typography>
              <InfoButton label="Información sobre identificación de proyecto" />
            </Box>
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={handleSaveDraft}
              sx={{ textTransform: "uppercase", fontSize: 12, fontWeight: 500 }}
            >
              Guardar Borrador
            </Button>
          </Box>

          {/* Organization Information */}
          <Box className="flex flex-col gap-4">
            <Box className="flex gap-4 rounded bg-[rgba(65,64,70,0.03)] p-4 text-base">
              <Typography sx={{ fontWeight: 600, width: 240 }}>
                Razón social
              </Typography>
              <Typography>{organizationInfo.legalName}</Typography>
            </Box>
            <Box className="flex gap-4 rounded bg-[rgba(65,64,70,0.03)] p-4 text-base">
              <Typography sx={{ fontWeight: 600, width: 240 }}>
                RUT/RUC
              </Typography>
              <Typography>{organizationInfo.rut}</Typography>
            </Box>
            <Box className="flex gap-4 rounded bg-[rgba(65,64,70,0.03)] p-4 text-base">
              <Typography sx={{ fontWeight: 600, width: 240 }}>
                Nombre del representante legal
              </Typography>
              <Typography>{organizationInfo.legalRepresentative}</Typography>
            </Box>
            <Divider sx={{ opacity: 0.2 }} />
          </Box>

          {/* Project Identification Form */}
          <Box className="flex flex-col gap-10">
            {/* Row 1: Project Name and Branch */}
            <Box className="flex gap-6">
              <FormTextField
                name="projectName"
                control={control}
                label="Nombre del proyecto"
                placeholder="Ingresa el nombre del proyecto"
                required
              />
              <FormSelectField
                name="branch"
                control={control}
                label="Sede/sucursal/establecimiento"
                options={mockBranches}
                required
              />
            </Box>

            {/* Row 2: Implementation Date and Emission Subcategory */}
            <Box className="flex gap-6">
              <Box className="flex flex-col gap-6" sx={{ width: 587 }}>
                <FormTextField
                  name="implementationDate"
                  control={control}
                  label="Fecha de implementación"
                  placeholder="dd-mm-yyyy"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <FormSelectField
                  name="emissionSubcategory"
                  control={control}
                  label="Subcategoría de fuente de emisión"
                  options={mockSubcategories}
                  required
                />
              </Box>
              <FormTextField
                name="projectDescription"
                control={control}
                label="Descripción del proyecto"
                placeholder="Ingresa la descripción"
                multiline
                rows={5}
                sx={{ width: 220 }}
                required
              />
            </Box>

            {/* Row 3: PCG Selection and Info Banner */}
            <Box className="flex flex-col gap-6">
              <Box className="flex gap-6">
                <FormSelectField
                  name="pcg"
                  control={control}
                  label="Potencial de calentamiento global (PCG) utilizado"
                  options={mockPCGOptions}
                  sx={{ width: 220 }}
                  required
                />
                <Alert
                  icon={false}
                  severity="info"
                  sx={{
                    width: 589,
                    background:
                      "linear-gradient(90deg, rgba(86,245,141,0.2) 0%, rgba(99,228,207,0.2) 100%)",
                    color: "text.primary",
                    border: "none",
                    "& .MuiAlert-message": {
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    },
                  }}
                >
                  Utilizar el potencial de calentamiento global del inventario
                  nacional
                </Alert>
              </Box>

              {/* Checkboxes */}
              <Box className="flex gap-6">
                <Controller
                  name="reportedInOtherInitiative"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label="Se ha reportado en otra iniciativa"
                    />
                  )}
                />
                <Controller
                  name="includedInNDC"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label="Se ha incorporado en meta nacional como mitigación del NDC"
                    />
                  )}
                />
              </Box>
            </Box>
          </Box>

          {/* Reduction Report Section */}
          <Box className="flex flex-col gap-4">
            <Divider sx={{ opacity: 0.2 }} />
            <Box className="flex h-10 items-center justify-between">
              <Typography variant="body1" sx={{ fontSize: 18 }}>
                Reporte de reducciones/remociones - [Nombre Proyecto]
              </Typography>
              <Alert
                icon={<InfoOutlined />}
                severity="info"
                sx={{
                  height: 40,
                  bgcolor: "rgba(2,136,209,0.1)",
                  color: "#01579b",
                  "& .MuiAlert-icon": {
                    color: "#01579b",
                  },
                }}
              >
                Todos los valores que se ingresan deben ser en Valor Absoluto
              </Alert>
            </Box>

            {/* Summary Table */}
            <Box
              className="overflow-hidden rounded border"
              sx={{ borderColor: "divider" }}
            >
              <Box className="flex">
                {[
                  "Año reducción relativo",
                  "Año reducción absoluto",
                  "Línea base tCO₂e",
                  "Proyecto tCO₂e",
                  "Fugas de carbono tCO₂e",
                  "Remociones tCO₂e",
                  "Reducción/Remoción tCO₂e",
                ].map((header, index) => (
                  <Box
                    key={index}
                    className="flex flex-1 items-center justify-center border-b bg-[rgba(65,64,70,0.03)] px-4 py-4"
                    sx={{ borderColor: "divider", minHeight: 56 }}
                  >
                    <Typography
                      sx={{ fontWeight: 500, fontSize: 16, textAlign: "center" }}
                    >
                      {header}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box className="flex bg-white">
                {["-", "-", "-", "-", "-", "-", "-"].map((value, index) => (
                  <Box
                    key={index}
                    className="flex flex-1 items-center justify-center border-b p-4"
                    sx={{ borderColor: "divider", minHeight: 72 }}
                  >
                    <Typography sx={{ textAlign: "center" }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Input Table */}
            <Box
              className="overflow-hidden rounded border"
              sx={{ borderColor: "divider" }}
            >
              <Box className="flex">
                <Box className="flex flex-1 flex-col">
                  <Box
                    className="flex items-center gap-2 border-b bg-[rgba(65,64,70,0.03)] px-2"
                    sx={{ borderColor: "divider", height: 40 }}
                  >
                    <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
                      Año de reducción
                    </Typography>
                    <InfoButton label="Seleccione el año de reducción" />
                  </Box>
                  <Box
                    className="flex items-center justify-center border-b bg-white p-4"
                    sx={{ borderColor: "divider" }}
                  >
                    <FormSelectField
                      name="reductionYear"
                      control={control}
                      label="Año"
                      options={mockYears}
                      required
                      size="small"
                    />
                  </Box>
                </Box>
                <Box className="flex flex-1 flex-col">
                  <Box
                    className="flex items-center gap-2 border-b bg-[rgba(65,64,70,0.03)] px-2"
                    sx={{ borderColor: "divider", height: 40 }}
                  >
                    <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
                      Línea base
                    </Typography>
                    <InfoButton label="Ingrese el valor de línea base" />
                  </Box>
                  <Box
                    className="flex items-center justify-center border-b bg-white p-4"
                    sx={{ borderColor: "divider" }}
                  >
                    <FormTextField
                      name="baselineValue"
                      control={control}
                      label="tCO₂e"
                      type="number"
                      required
                      size="small"
                      sx={{ width: 220 }}
                    />
                  </Box>
                </Box>
                <Box className="flex flex-1 flex-col">
                  <Box
                    className="flex items-center gap-2 border-b bg-[rgba(65,64,70,0.03)] px-2"
                    sx={{ borderColor: "divider", height: 40 }}
                  >
                    <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
                      Proyecto
                    </Typography>
                    <InfoButton label="Ingrese el valor del proyecto" />
                  </Box>
                  <Box
                    className="flex items-center justify-center border-b bg-white p-4"
                    sx={{ borderColor: "divider" }}
                  >
                    <FormTextField
                      name="projectValue"
                      control={control}
                      label="tCO₂e"
                      type="number"
                      required
                      size="small"
                      sx={{ width: 220 }}
                    />
                  </Box>
                </Box>
                <Box className="flex flex-1 flex-col">
                  <Box
                    className="flex items-center gap-2 border-b bg-[rgba(65,64,70,0.03)] px-2"
                    sx={{ borderColor: "divider", height: 40 }}
                  >
                    <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
                      Fugas de carbono
                    </Typography>
                    <InfoButton label="Ingrese el valor de fugas de carbono" />
                  </Box>
                  <Box
                    className="flex items-center justify-center border-b bg-white p-4"
                    sx={{ borderColor: "divider" }}
                  >
                    <FormTextField
                      name="carbonLeakage"
                      control={control}
                      label="tCO₂e"
                      type="number"
                      required
                      size="small"
                      sx={{ width: 220 }}
                    />
                  </Box>
                </Box>
                <Box className="flex flex-1 flex-col">
                  <Box
                    className="flex items-center gap-2 border-b bg-[rgba(65,64,70,0.03)] px-2"
                    sx={{ borderColor: "divider", height: 40 }}
                  >
                    <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
                      Remociones
                    </Typography>
                    <InfoButton label="Ingrese el valor de remociones" />
                  </Box>
                  <Box
                    className="flex items-center justify-center border-b bg-white p-4"
                    sx={{ borderColor: "divider" }}
                  >
                    <FormTextField
                      name="removals"
                      control={control}
                      label="tCO₂e"
                      type="number"
                      required
                      size="small"
                      sx={{ width: 220 }}
                    />
                  </Box>
                </Box>
                <Box className="flex flex-1 flex-col">
                  <Box
                    className="flex items-center gap-2 border-b bg-[rgba(65,64,70,0.03)] px-2"
                    sx={{ borderColor: "divider", height: 40 }}
                  >
                    <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
                      Reducción/Remoción
                    </Typography>
                    <InfoButton label="Valor calculado automáticamente" />
                  </Box>
                  <Box
                    className="flex items-center justify-center border-b bg-white p-4"
                    sx={{ borderColor: "divider", minHeight: 72 }}
                  >
                    <TextField
                      value={calculatedReduction.toFixed(2)}
                      label="tCO₂e"
                      size="small"
                      disabled
                      sx={{ width: 220 }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* File Upload Section */}
            <Box className="flex flex-col gap-4">
              <Divider sx={{ opacity: 0.2 }} />
              <Typography variant="body1" sx={{ fontSize: 18 }}>
                Carga de archivos para la postulación
              </Typography>
              <Box className="flex gap-8">
                {[
                  {
                    title: "Informe de reducción",
                    formats: "JPG, PNG, PDF, XLS (max. 3MB)",
                  },
                  {
                    title: "Informe de verificación",
                    formats: "JPG, PNG, PDF, XLS (max. 3MB)",
                  },
                  {
                    title: "Autodeclaración de No conflicto de interés",
                    formats: "JPG, PNG, PDF (max. 3MB)",
                  },
                ].map((upload, index) => (
                  <Box key={index} className="flex flex-col gap-3">
                    <Typography sx={{ fontWeight: 600, width: 240 }}>
                      {upload.title}
                    </Typography>
                    <Box
                      className="flex h-[235px] w-[378px] items-center justify-center rounded border-0"
                      sx={{ borderColor: "primary.main" }}
                    >
                      <Box
                        className="flex h-full w-full flex-col items-center justify-center gap-2 rounded border border-dashed px-4 py-6"
                        sx={{
                          borderColor: "primary.main",
                          bgcolor: "rgba(0,110,77,0.05)",
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontSize: 32,
                            color: "text.primary",
                          }}
                        >
                          📎
                        </Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 16 }}>
                          Adjuntar documento
                        </Typography>
                        <Box>
                          <Typography
                            component="span"
                            sx={{
                              color: "primary.main",
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                          >
                            Click para cargar
                          </Typography>
                          <Typography component="span" sx={{ fontSize: 16 }}>
                            {" "}
                            o arrasta y suelta el archivo
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 14,
                            color: "text.primary",
                            textAlign: "center",
                          }}
                        >
                          {upload.formats}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

            {/* Action Buttons */}
            <Box className="flex justify-end gap-4 pt-4">
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{
                  textTransform: "uppercase",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Volver
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit(handleFormSubmit)}
                sx={{
                  textTransform: "uppercase",
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: 214,
                }}
              >
                Postular Sello Reducción
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </MainLayout>
  );
};
