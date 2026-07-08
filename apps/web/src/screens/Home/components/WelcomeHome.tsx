import { FC, useEffect, useRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { SubmissionStatus } from "@repo/types";
import { Routes } from "@/interfaces";
import { CalculatorIcon } from "@/icons";
import { useUserStore } from "@/stores/userStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import {
  clearOnboardingFocus,
  markOnboardingFocus,
  OnboardingFocus,
} from "@/utils/onboardingSignals";
import {
  runOnboardingHighlight,
  findSidebarLink,
} from "@/utils/onboardingHighlight";
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
  const setSidebarForcedOpen = useSidebarStore((state) => state.setForcedOpen);
  const namePart = firstName ? `, ${firstName}` : "";

  // Secondary links (already-done / in-review steps) still navigate directly —
  // the guided flow below only applies to the active step's primary CTA.
  const goToOrg = () => void navigate({ to: Routes.MY_ORGANIZATION });
  const goToHuellas = () => void navigate({ to: Routes.CARBON_INVENTORIES });

  // Rather than redirecting, the active step spotlights the matching sidebar
  // link so the user navigates themselves; the destination screen then
  // highlights the exact control to click (via the one-shot focus signal).
  const activeHighlight = useRef<(() => void) | null>(null);
  const guideToSidebar = (
    focus: OnboardingFocus,
    route: string,
    title: string,
    description: string
  ) => {
    markOnboardingFocus(focus);
    activeHighlight.current?.();
    // Open the sidebar so the spotlighted item's label is readable, and wait
    // out its expand animation before positioning the popover.
    setSidebarForcedOpen(true);
    activeHighlight.current = runOnboardingHighlight({
      find: findSidebarLink(route),
      title,
      description,
      delayMs: 450,
      onDismiss: () => setSidebarForcedOpen(false),
      // Closing the guide without following it should also drop the pending
      // focus — otherwise it would resurface on a later organic visit.
      onUserClose: clearOnboardingFocus,
    });
  };
  useEffect(() => () => activeHighlight.current?.(), []);

  const hero = hasOrganization
    ? {
        eyebrow: "Qué bueno verte de nuevo",
        title: `Hola de nuevo${namePart}`,
        subtitle:
          "Estos son tus próximos pasos para avanzar con tu huella de carbono.",
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

        {/* Escape hatch — always available; navigates directly to the calculator. */}
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
              ? step3Pending
                ? "Ya registraste tu organización. Mientras tu inscripción está en revisión, el perfil queda bloqueado; podrás editarlo cuando se apruebe."
                : "Ya registraste tu organización. Puedes ver más información en la página “Mi organización”."
              : "Crea el perfil de tu organización."
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
                onClick={() =>
                  guideToSidebar(
                    "create-org",
                    Routes.MY_ORGANIZATION,
                    "Ve a Mi Organización",
                    "Haz clic aquí en el menú para registrar tu organización."
                  )
                }
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
                onClick={() =>
                  guideToSidebar(
                    "new-huella",
                    Routes.CARBON_INVENTORIES,
                    "Ve a Huella Organizacional",
                    "Haz clic aquí en el menú para crear tu huella."
                  )
                }
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
            !hasOrganization
              ? "locked"
              : orgAccredited
                ? "done"
                : step3Pending
                  ? "pending"
                  : "active"
          }
          title="Inscribe tu organización"
          description={
            !hasOrganization
              ? "Inscribe tu organización para validarla oficialmente."
              : orgAccredited
                ? "Tu organización está inscrita."
                : step3Pending
                  ? "Tu inscripción está en revisión. Puedes revisar el estado de tu postulación en “Mi organización”."
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
                onClick={() =>
                  guideToSidebar(
                    "solicit-inscription",
                    Routes.MY_ORGANIZATION,
                    "Ve a Mi Organización",
                    "Haz clic aquí en el menú para solicitar la inscripción."
                  )
                }
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
              ? hasDraftHuella
                ? "Autodeclárala para publicarla en tu inicio y ver tu dashboard de emisiones."
                : "Necesitas una huella en borrador para autodeclarar."
              : "Se habilita cuando tengas una huella creada (paso 2) y tu organización esté inscrita (paso 3)."
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
                onClick={() =>
                  guideToSidebar(
                    "self-declare",
                    Routes.CARBON_INVENTORIES,
                    "Ve a Huella Organizacional",
                    "Haz clic aquí en el menú para autodeclarar tu huella."
                  )
                }
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
