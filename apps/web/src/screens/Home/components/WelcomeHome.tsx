import { FC, useEffect, useRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ArrowForwardRounded, CelebrationRounded } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { SubmissionStatus } from "@repo/types";
import { Routes } from "@/interfaces";
import { CalculatorIcon } from "@/icons";
import { useUserStore } from "@/stores/userStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import {
  clearOnboardingFocus,
  markOnboardingFocus,
} from "@/utils/onboardingSignals";
import {
  runOnboardingHighlight,
  findSidebarLink,
} from "@/utils/onboardingHighlight";
import { OnboardingStep } from "./OnboardingStep";
import { WelcomeHero } from "./WelcomeHero";
import { ONBOARDING_STEPS, OnboardingContext } from "./onboardingSteps";

interface Props {
  hasOrganization: boolean;
  orgAccredited: boolean;
  /** lastSubmissionStatus of the primary org — drives the inscribe step copy. */
  inscriptionStatus: SubmissionStatus | null;
  /** Has at least one huella (any status). */
  hasHuella: boolean;
  /** Has at least one huella already linked to an organization. */
  hasHuellaWithOrg: boolean;
  /** Has a draft huella linked to an organization (the one that can be self-declared). */
  hasAssociatedDraft: boolean;
  /** A huella already fills the dashboard — the flow is 100% complete. */
  isComplete: boolean;
  /** Persist onboarding completion and reveal the dashboard. */
  onFinish: () => void;
  isFinishing?: boolean;
}

export const WelcomeHome: FC<Props> = ({
  hasOrganization,
  orgAccredited,
  inscriptionStatus,
  hasHuella,
  hasHuellaWithOrg,
  hasAssociatedDraft,
  isComplete,
  onFinish,
  isFinishing = false,
}) => {
  const navigate = useNavigate();
  const firstName = useUserStore((state) => state.user?.firstName ?? null);
  const setSidebarForcedOpen = useSidebarStore((state) => state.setForcedOpen);
  const namePart = firstName ? `, ${firstName}` : "";

  const ctx: OnboardingContext = {
    hasHuella,
    hasOrganization,
    hasHuellaWithOrg,
    hasAssociatedDraft,
    orgAccredited,
    inscriptionStatus,
    isComplete,
  };

  // Rather than redirecting, the active step spotlights the matching sidebar
  // link so the user navigates themselves; the destination screen then
  // highlights the exact control to click (via the one-shot focus signal).
  const activeHighlight = useRef<(() => void) | null>(null);
  const guideToSidebar = (
    focus: (typeof ONBOARDING_STEPS)[number]["id"],
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
      debugLabel: `sidebar:${focus}`,
      onDismiss: () => setSidebarForcedOpen(false),
      // Closing the guide without following it should also drop the pending
      // focus — otherwise it would resurface on a later organic visit.
      onUserClose: clearOnboardingFocus,
    });
  };
  useEffect(() => () => activeHighlight.current?.(), []);

  const hero = isComplete
    ? {
        eyebrow: "¡Lo lograste!",
        title: `¡Felicitaciones${namePart}! 🎉`,
        subtitle:
          "Completaste todos los pasos para medir la huella de carbono de tu organización.",
      }
    : hasOrganization
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

  return (
    <Box className="flex flex-1 flex-col gap-6">
      <WelcomeHero {...hero} />

      {/* Completion — the flow no longer disappears on its own; the user closes
          it explicitly and we persist that so it doesn't reappear elsewhere. */}
      {isComplete && (
        <Box
          className="flex items-center gap-4 rounded-xl border p-5"
          sx={{ borderColor: "success.main", bgcolor: "background.paper" }}
        >
          <CelebrationRounded sx={{ color: "success.main" }} />
          <Typography variant="body2" color="text.secondary" className="flex-1">
            <Box component="span" fontWeight={600} color="text.primary">
              Completaste tu onboarding.
            </Box>{" "}
            Termínalo para ir a tu inicio y ver el dashboard de emisiones.
          </Typography>
          <Button
            variant="contained"
            color="success"
            endIcon={<ArrowForwardRounded />}
            onClick={onFinish}
            disabled={isFinishing}
          >
            Terminar Onboarding
          </Button>
        </Box>
      )}

      <Box className="flex flex-col gap-4">
        <Typography variant="h6" fontWeight={700}>
          {isComplete
            ? "Tu camino en Huella Latam"
            : hasOrganization
              ? "Continúa donde quedaste"
              : "Tu camino en Huella Latam"}
        </Typography>

        {/* Escape hatch — always available while onboarding; navigates directly
            to the calculator. Hidden once the flow is complete. */}
        {!isComplete && (
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
              Prueba la calculadora y estima las emisiones de tu rubro en
              minutos.
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              endIcon={<ArrowForwardRounded />}
              onClick={() => {
                markOnboardingFocus("new-huella");
                void navigate({ to: Routes.CARBON_INVENTORIES });
              }}
            >
              Usar calculadora
            </Button>
          </Box>
        )}

        {ONBOARDING_STEPS.map((step, index) => {
          const view = step.view(ctx);
          const action =
            view.state === "active" && view.activeCta ? (
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRounded />}
                onClick={() =>
                  guideToSidebar(
                    step.id,
                    step.route,
                    step.guide.title,
                    step.guide.description
                  )
                }
              >
                {view.activeCta}
              </Button>
            ) : view.secondaryCta ? (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => void navigate({ to: view.secondaryCta!.to })}
              >
                {view.secondaryCta.label}
              </Button>
            ) : undefined;

          return (
            <OnboardingStep
              key={step.id}
              index={index + 1}
              state={view.state}
              title={step.title}
              description={view.description}
              tag={view.tag}
              action={action}
            />
          );
        })}
      </Box>
    </Box>
  );
};
