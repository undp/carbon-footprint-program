import { FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { SubmissionStatus } from "@repo/types";
import { Routes } from "@/interfaces";
import { CalculatorIcon } from "@/icons";
import { useUserStore } from "@/stores/userStore";
import { markOnboardingFocus } from "@/utils/onboardingSignals";
import { OnboardingStep } from "./OnboardingStep";
import { WelcomeHero } from "./WelcomeHero";

interface Props {
  hasOrganization: boolean;
  orgAccredited: boolean;
  /** lastSubmissionStatus of the primary org — drives the inscribe step copy. */
  inscriptionStatus: SubmissionStatus | null;
  /** Has at least one huella that is not yet dashboard-ready. */
  hasHuella: boolean;
  /** Has at least one draft huella (the one that can be self-declared). */
  hasDraftHuella: boolean;
}

export const WelcomeHome: FC<Props> = ({
  hasOrganization,
  orgAccredited,
  inscriptionStatus,
  hasHuella,
  hasDraftHuella,
}) => {
  const navigate = useNavigate();
  const firstName = useUserStore((state) => state.user?.firstName ?? null);
  const namePart = firstName ? `, ${firstName}` : "";

  const goToOrg = () => void navigate({ to: Routes.MY_ORGANIZATION });
  const goToHuellas = () => void navigate({ to: Routes.CARBON_INVENTORIES });

  const hero = hasOrganization
    ? {
        eyebrow: "Qué bueno verte de nuevo",
        title: `Hola de nuevo${namePart}`,
        subtitle:
          "Sigue avanzando con la huella de carbono de tu organización. Estos son tus próximos pasos.",
      }
    : {
        eyebrow: "Te damos la bienvenida",
        title: `¡Hola${namePart}! 👋`,
        subtitle:
          "En Huella Latam mides, reportas y reduces la huella de carbono de tu organización. Completa estos pasos para empezar.",
      };

  // --- Step 3 (inscribe organization) has several sub-states -----------------
  const step3Pending =
    !orgAccredited && inscriptionStatus === SubmissionStatus.PENDING;

  return (
    <Box className="flex flex-1 flex-col gap-6">
      <WelcomeHero {...hero} />

      <Box className="flex flex-col gap-4">
        <Typography variant="h6" fontWeight={700}>
          {hasOrganization
            ? "Continúa donde quedaste"
            : "Tu camino en Huella Latam"}
        </Typography>

        {/* Escape hatch — always available; standardised to navigate + focus. */}
        <Box
          className="flex items-center gap-4 rounded-xl border border-dashed p-4"
          sx={{ borderColor: "divider", bgcolor: "background.paper" }}
        >
          <CalculatorIcon sx={{ color: "primary.main" }} />
          <Typography variant="body2" color="text.secondary" className="flex-1">
            <Box component="span" fontWeight={600} color="text.primary">
              ¿Solo quieres explorar?
            </Box>{" "}
            Prueba la calculadora y estima las emisiones de tu rubro en minutos.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            endIcon={<ArrowForwardRounded />}
            onClick={() => {
              markOnboardingFocus("new-huella");
              goToHuellas();
            }}
          >
            Usar calculadora
          </Button>
        </Box>

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
              <Button variant="outlined" color="primary" onClick={goToOrg}>
                Ir a Mi Organización
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRounded />}
                onClick={() => {
                  markOnboardingFocus("create-org");
                  goToOrg();
                }}
              >
                Crear organización
              </Button>
            )
          }
        />

        {/* Step 2 — huella (unlocked by step 1) */}
        <OnboardingStep
          index={2}
          state={!hasOrganization ? "locked" : hasHuella ? "done" : "active"}
          title="Crea tu huella"
          description={
            hasHuella
              ? "Ya tienes una huella creada. Revísala o crea una nueva cuando quieras."
              : "Calcula con nuestra guía o sube tus datos. Es la base para medir tu impacto."
          }
          tag={
            !hasOrganization
              ? { label: "Después", variant: "wait" }
              : hasHuella
                ? { label: "Completado", variant: "ok" }
                : { label: "Continúa aquí", variant: "next" }
          }
          action={
            !hasOrganization ? undefined : hasHuella ? (
              <Button variant="outlined" color="primary" onClick={goToHuellas}>
                Ir a Huella Organizacional
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRounded />}
                onClick={() => {
                  markOnboardingFocus("new-huella");
                  goToHuellas();
                }}
              >
                Crear huella
              </Button>
            )
          }
        />

        {/* Step 3 — inscribe organization (unlocked by step 1) */}
        <OnboardingStep
          index={3}
          state={
            !hasOrganization ? "locked" : orgAccredited ? "done" : "active"
          }
          title="Inscribe tu organización"
          description={
            !hasOrganization
              ? "Inscribe tu organización para validarla oficialmente."
              : orgAccredited
                ? "Tu organización está inscrita."
                : step3Pending
                  ? "Tu inscripción está en revisión. Te avisaremos cuando sea aprobada."
                  : inscriptionStatus === SubmissionStatus.REJECTED
                    ? "Tu inscripción fue rechazada; revísala y vuelve a intentarla."
                    : "Solicita la inscripción de tu organización para validarla oficialmente."
          }
          tag={
            !hasOrganization
              ? { label: "Después", variant: "wait" }
              : orgAccredited
                ? { label: "Inscrita", variant: "ok" }
                : step3Pending
                  ? { label: "En revisión", variant: "next" }
                  : { label: "Cuando quieras", variant: "next" }
          }
          action={
            !hasOrganization ? undefined : orgAccredited ? (
              <Button variant="outlined" color="primary" onClick={goToOrg}>
                Ir a Mi Organización
              </Button>
            ) : step3Pending ? (
              <Button variant="outlined" color="primary" onClick={goToOrg}>
                Ver estado
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRounded />}
                onClick={() => {
                  markOnboardingFocus("solicit-inscription");
                  goToOrg();
                }}
              >
                Inscribir organización
              </Button>
            )
          }
        />

        {/* Step 4 — self-declare (unlocked by an inscribed org + a draft huella) */}
        <OnboardingStep
          index={4}
          state={orgAccredited && hasDraftHuella ? "active" : "locked"}
          title="Autodeclara tu huella"
          description={
            orgAccredited
              ? "Autodeclála para publicarla en tu inicio y ver tu dashboard de emisiones."
              : "Se habilita cuando tu organización esté inscrita (paso 3)."
          }
          tag={
            orgAccredited && hasDraftHuella
              ? { label: "Último paso", variant: "next" }
              : { label: "Después", variant: "wait" }
          }
          action={
            orgAccredited && hasDraftHuella ? (
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRounded />}
                onClick={() => {
                  markOnboardingFocus("self-declare");
                  goToHuellas();
                }}
              >
                Autodeclarar
              </Button>
            ) : undefined
          }
        />
      </Box>
    </Box>
  );
};
