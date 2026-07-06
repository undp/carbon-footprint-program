import { FC, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { StatusChip } from "@/components";
import { NewInventoryDialog } from "@/components/dialogs";
import { OrganizationFormDialog } from "@/screens/MyOrganization/components";
import { DialogMode } from "@/screens/MyOrganization/types";
import { CARBON_INVENTORY_STATUS_CONFIG } from "@/labels/chips/carbonInventory";
import { StatusFamily } from "@/labels/chips/types";
import { CalculatorIcon } from "@/icons";
import { useUserStore } from "@/stores/userStore";
import { OnboardingStep } from "./OnboardingStep";
import { WelcomeHero } from "./WelcomeHero";
import { getHuellaTreatment, HuellaItem } from "./welcomeHome.config";

interface Props {
  hasOrganization: boolean;
  /** The in-progress huella to feature, or null when none exists yet. */
  primaryHuella: HuellaItem | null;
}

export const WelcomeHome: FC<Props> = ({ hasOrganization, primaryHuella }) => {
  const navigate = useNavigate();
  const firstName = useUserStore((state) => state.user?.firstName ?? null);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [huellaDialogOpen, setHuellaDialogOpen] = useState(false);

  const namePart = firstName ? `, ${firstName}` : "";
  const treatment = primaryHuella
    ? getHuellaTreatment(primaryHuella.status)
    : null;

  // ---- Hero ----------------------------------------------------------------
  const hero = !hasOrganization
    ? {
        eyebrow: "Te damos la bienvenida",
        title: `¡Hola${namePart}! 👋`,
        subtitle:
          "En Huella Latam mides, reportas y reduces la huella de carbono de tu organización. Pongamos todo en marcha.",
        progress: undefined,
        progressLabel: undefined,
      }
    : !treatment
      ? {
          eyebrow: "Qué bueno verte de nuevo",
          title: `Hola de nuevo${namePart}`,
          subtitle:
            "Ya tienes tu organización lista. El siguiente paso es medir: calculemos tu primera huella de carbono.",
          progress: 33,
          progressLabel: "1 de 3",
        }
      : {
          eyebrow: treatment.eyebrow,
          title: `Hola de nuevo${namePart}`,
          subtitle: treatment.heroSubtitle,
          progress: 66,
          progressLabel: treatment.progressLabel,
        };

  // ---- Section heading -----------------------------------------------------
  const needsAttention =
    !!primaryHuella &&
    [StatusFamily.ACTION_REQUIRED, StatusFamily.NEGATIVE].includes(
      CARBON_INVENTORY_STATUS_CONFIG[primaryHuella.status].family
    );
  const sectionTitle = !hasOrganization
    ? "Tu camino en Huella Latam"
    : !primaryHuella
      ? "Continúa donde quedaste"
      : needsAttention
        ? "Tienes una tarea pendiente"
        : "Vas muy bien";
  const sectionHint = hasOrganization
    ? "Paso 2 de 3"
    : "El primer paso toma ~10 min";

  return (
    <Box className="flex flex-1 flex-col gap-6">
      <WelcomeHero {...hero} />

      <Box className="flex flex-col gap-4">
        <Box className="flex items-baseline justify-between gap-3">
          <Typography variant="h6" fontWeight={700}>
            {sectionTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {sectionHint}
          </Typography>
        </Box>

        {/* Escape hatch for brand-new users: try the calculator without committing. */}
        {!hasOrganization && (
          <Box
            className="flex items-center gap-4 rounded-xl border border-dashed p-4"
            sx={{ borderColor: "divider", bgcolor: "background.paper" }}
          >
            <CalculatorIcon sx={{ color: "primary.main" }} />
            <Typography
              variant="body2"
              color="text.secondary"
              className="flex-1"
            >
              <Box component="span" fontWeight={600} color="text.primary">
                ¿Solo quieres explorar?
              </Box>{" "}
              Prueba la calculadora y estima emisiones de tu rubro sin crear una
              organización.
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              endIcon={<ArrowForwardRounded />}
              onClick={() => setHuellaDialogOpen(true)}
            >
              Usar calculadora
            </Button>
          </Box>
        )}

        {/* Step 1 — organization */}
        <OnboardingStep
          index={1}
          state={hasOrganization ? "done" : "active"}
          title="Crea tu organización"
          description={
            hasOrganization
              ? "Ya registraste tu organización. Puedes editar su perfil cuando quieras."
              : "Cuéntanos de tu empresa: rubro, tamaño y actividad principal. Es la base de todo."
          }
          tag={
            hasOrganization
              ? { label: "Completado", variant: "ok" }
              : { label: "Empieza aquí", variant: "next" }
          }
          action={
            hasOrganization ? (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => void navigate({ to: Routes.MY_ORGANIZATION })}
              >
                Ver perfil
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRounded />}
                onClick={() => setOrgDialogOpen(true)}
              >
                Crear organización
              </Button>
            )
          }
        />

        {/* Step 2 — measure */}
        <OnboardingStep
          index={2}
          state={hasOrganization ? "active" : "locked"}
          title="Mide tu huella"
          description={
            !hasOrganization
              ? "Registra tus consumos y fuentes de emisión del año. Te guiamos categoría por categoría."
              : treatment
                ? treatment.stepMessage
                : "Elige cómo empezar: calcula con nuestra guía o sube tus datos."
          }
          tag={
            hasOrganization && !treatment
              ? { label: "Continúa aquí", variant: "next" }
              : !hasOrganization
                ? { label: "Después", variant: "wait" }
                : undefined
          }
          action={
            hasOrganization ? (
              treatment ? (
                <Button
                  variant={treatment.emphasize ? "contained" : "outlined"}
                  color="primary"
                  endIcon={<ArrowForwardRounded />}
                  onClick={() =>
                    void navigate({ to: Routes.CARBON_INVENTORIES })
                  }
                >
                  {treatment.ctaLabel}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<ArrowForwardRounded />}
                  onClick={() => setHuellaDialogOpen(true)}
                >
                  Crear huella
                </Button>
              )
            ) : undefined
          }
        >
          {primaryHuella && (
            <Box
              className="mt-3 flex items-center gap-3 rounded-lg p-3"
              sx={{ bgcolor: "grey.50", border: 1, borderColor: "divider" }}
            >
              <Box className="min-w-0 flex-1">
                <Typography variant="body2" fontWeight={600} noWrap>
                  {primaryHuella.name ?? "Huella"}
                  {primaryHuella.year ? ` · ${primaryHuella.year}` : ""}
                </Typography>
                {primaryHuella.organizationName && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {primaryHuella.organizationName}
                  </Typography>
                )}
              </Box>
              <StatusChip
                config={CARBON_INVENTORY_STATUS_CONFIG[primaryHuella.status]}
                size="small"
              />
            </Box>
          )}
        </OnboardingStep>

        {/* Step 3 — recognition (always the horizon here) */}
        <OnboardingStep
          index={3}
          state="locked"
          title="Obtén tu reconocimiento"
          description="Verifica tu huella y obtén el reconocimiento oficial. Se habilita al aprobar tu medición."
          tag={{ label: "El horizonte", variant: "wait" }}
        />
      </Box>

      <OrganizationFormDialog
        open={orgDialogOpen}
        onClose={() => setOrgDialogOpen(false)}
        mode={DialogMode.create}
        onCreated={() => setOrgDialogOpen(false)}
      />
      <NewInventoryDialog
        open={huellaDialogOpen}
        onClose={() => setHuellaDialogOpen(false)}
      />
    </Box>
  );
};
