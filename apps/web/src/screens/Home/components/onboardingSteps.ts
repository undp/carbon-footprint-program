import { SubmissionStatus } from "@repo/types";
import { Routes, SidebarRoutesTranslations } from "@/interfaces";
import type { OnboardingFocus } from "@/utils/onboardingSignals";
import type { OnboardingStepState, StepTag } from "./OnboardingStep";

/**
 * Single source of truth for the guided welcome-home flow: the ordered steps,
 * their copy, and the per-state view logic. Steps are identified by their
 * `OnboardingFocus` id (also the sidebar-spotlight target), never by a bare
 * numeric index — the index is only the visual bullet in `WelcomeHome`.
 *
 * Order matters: "Crea tu huella" comes first (never blocked) so a user who
 * explored with the calculator before creating an organization isn't shown a
 * locked step that also claims "ya tienes una huella creada", and a dedicated
 * association step teaches how to link a loose huella to an organization before
 * inscription / self-declaration.
 */

/** Derived signals the step views branch on (computed in `HomeScreen`). */
export interface OnboardingContext {
  /** Has at least one huella (any status). */
  hasHuella: boolean;
  hasOrganization: boolean;
  /** At least one huella is already linked to an organization. */
  hasHuellaWithOrg: boolean;
  /** At least one draft huella that is linked to an organization (the one that
   *  can actually be self-declared — self-declaration requires an org). */
  hasAssociatedDraft: boolean;
  orgAccredited: boolean;
  /** lastSubmissionStatus of the primary org — drives the inscribe step copy. */
  inscriptionStatus: SubmissionStatus | null;
  /** A huella already fills the dashboard — the whole flow is complete. */
  isComplete: boolean;
}

/** The two shell routes an onboarding secondary CTA can navigate to. */
export type OnboardingNavTarget =
  typeof Routes.MY_ORGANIZATION | typeof Routes.CARBON_INVENTORIES;

export interface OnboardingStepView {
  state: OnboardingStepState;
  description: string;
  tag?: StepTag;
  /** Label of the contained CTA that spotlights the sidebar link (active step). */
  activeCta?: string;
  /** Direct-navigation CTA shown on done / in-review states. */
  secondaryCta?: { label: string; to: OnboardingNavTarget };
}

export interface OnboardingStepDef {
  id: OnboardingFocus;
  title: string;
  /** Sidebar route the active CTA guides the user to. */
  route: OnboardingNavTarget;
  /** Popover copy shown on the spotlighted sidebar link. */
  guide: { title: string; description: string };
  view: (ctx: OnboardingContext) => OnboardingStepView;
}

const isInscriptionPending = (ctx: OnboardingContext) =>
  !ctx.orgAccredited && ctx.inscriptionStatus === SubmissionStatus.PENDING;

/** Guide/CTA labels reuse the sidebar's own label so the copy can't drift. */
const goToSidebarLabel = (route: OnboardingNavTarget) =>
  `Ir a ${SidebarRoutesTranslations[route]}`;

const goToSidebarCta = (to: OnboardingNavTarget) => ({
  label: goToSidebarLabel(to),
  to,
});

const MY_ORGANIZATION_LABEL = SidebarRoutesTranslations[Routes.MY_ORGANIZATION];

export const ONBOARDING_STEPS: readonly OnboardingStepDef[] = [
  {
    id: "new-huella",
    title: "Crea tu huella",
    route: Routes.CARBON_INVENTORIES,
    guide: {
      title: goToSidebarLabel(Routes.CARBON_INVENTORIES),
      description: "Haz clic aquí en el menú para crear tu huella.",
    },
    view: (ctx) =>
      ctx.hasHuella
        ? {
            state: "done",
            description:
              "Ya tienes una huella creada. Revísala o crea una nueva cuando quieras.",
            tag: { label: "Completado", variant: "ok" },
            secondaryCta: goToSidebarCta(Routes.CARBON_INVENTORIES),
          }
        : {
            state: "active",
            description:
              "Calcula con nuestra guía o sube tus datos. Es la base para medir tu impacto.",
            tag: { label: "Empieza aquí", variant: "next" },
            activeCta: "Crear huella",
          },
  },
  {
    id: "create-org",
    title: "Crea tu organización",
    route: Routes.MY_ORGANIZATION,
    guide: {
      title: goToSidebarLabel(Routes.MY_ORGANIZATION),
      description: "Haz clic aquí en el menú para registrar tu organización.",
    },
    view: (ctx) =>
      ctx.hasOrganization
        ? {
            state: "done",
            description: isInscriptionPending(ctx)
              ? "Ya registraste tu organización. Mientras tu inscripción está en revisión, el perfil queda bloqueado; podrás editarlo cuando se apruebe."
              : `Ya registraste tu organización. Puedes ver más información en la página “${MY_ORGANIZATION_LABEL}”.`,
            tag: { label: "Completado", variant: "ok" },
            secondaryCta: goToSidebarCta(Routes.MY_ORGANIZATION),
          }
        : {
            state: "active",
            description: "Crea el perfil de tu organización.",
            tag: { label: "Continúa aquí", variant: "next" },
            activeCta: "Crear organización",
          },
  },
  {
    id: "associate-org",
    title: "Asocia tu huella a la organización",
    route: Routes.CARBON_INVENTORIES,
    guide: {
      title: goToSidebarLabel(Routes.CARBON_INVENTORIES),
      description:
        "Haz clic aquí en el menú para asociar tu huella a tu organización.",
    },
    view: (ctx) => {
      if (ctx.hasHuellaWithOrg) {
        return {
          state: "done",
          description: "Tu huella está asociada a tu organización.",
          tag: { label: "Completado", variant: "ok" },
          secondaryCta: goToSidebarCta(Routes.CARBON_INVENTORIES),
        };
      }
      if (ctx.hasHuella && ctx.hasOrganization) {
        return {
          state: "active",
          description:
            "Vincula tu huella con tu organización desde el botón de organización en tus borradores.",
          tag: { label: "Continúa aquí", variant: "next" },
          activeCta: "Asociar organización",
        };
      }
      return {
        state: "locked",
        description:
          "Asocia tu huella a tu organización para poder inscribirla y autodeclararla.",
        tag: { label: "Después", variant: "wait" },
      };
    },
  },
  {
    id: "solicit-inscription",
    title: "Inscribe tu organización",
    route: Routes.MY_ORGANIZATION,
    guide: {
      title: goToSidebarLabel(Routes.MY_ORGANIZATION),
      description: "Haz clic aquí en el menú para solicitar la inscripción.",
    },
    view: (ctx) => {
      if (!ctx.hasOrganization) {
        return {
          state: "locked",
          description: "Inscribe tu organización para validarla oficialmente.",
          tag: { label: "Después", variant: "wait" },
        };
      }
      if (ctx.orgAccredited) {
        return {
          state: "done",
          description: "Tu organización está inscrita.",
          tag: { label: "Inscrita", variant: "ok" },
          secondaryCta: goToSidebarCta(Routes.MY_ORGANIZATION),
        };
      }
      if (isInscriptionPending(ctx)) {
        return {
          state: "pending",
          description: `Tu inscripción está en revisión. Puedes revisar el estado de tu postulación en “${MY_ORGANIZATION_LABEL}”.`,
          tag: { label: "En revisión", variant: "wait" },
          secondaryCta: { label: "Ver estado", to: Routes.MY_ORGANIZATION },
        };
      }
      // A previously submitted accreditation can come back rejected or with
      // observations (REVIEWED); in both cases the org already applied and needs
      // to revise, not start from scratch.
      const activeDescription =
        ctx.inscriptionStatus === SubmissionStatus.REJECTED
          ? "Tu inscripción fue rechazada; revísala y vuelve a intentarla."
          : ctx.inscriptionStatus === SubmissionStatus.REVIEWED
            ? "Tu inscripción tiene observaciones; revísala y vuelve a enviarla."
            : "Solicita la inscripción de tu organización para validarla oficialmente.";
      return {
        state: "active",
        description: activeDescription,
        tag: { label: "Cuando quieras", variant: "next" },
        activeCta: "Inscribir organización",
      };
    },
  },
  {
    id: "self-declare",
    title: "Autodeclara tu huella",
    route: Routes.CARBON_INVENTORIES,
    guide: {
      title: goToSidebarLabel(Routes.CARBON_INVENTORIES),
      description: "Haz clic aquí en el menú para autodeclarar tu huella.",
    },
    view: (ctx) => {
      if (ctx.isComplete) {
        return {
          state: "done",
          description: "Autodeclaraste tu huella. ¡Ya aparece en tu inicio!",
          tag: { label: "Completado", variant: "ok" },
        };
      }
      if (ctx.orgAccredited && ctx.hasAssociatedDraft) {
        return {
          state: "active",
          description:
            "Autodeclárala para publicarla en tu inicio y ver tu dashboard de emisiones.",
          tag: { label: "Último paso", variant: "next" },
          activeCta: "Autodeclarar",
        };
      }
      return {
        state: "locked",
        description:
          ctx.orgAccredited && !ctx.hasAssociatedDraft
            ? "Necesitas una huella en borrador asociada a tu organización para autodeclarar."
            : "Se habilita cuando tu organización esté inscrita y tengas una huella en borrador asociada.",
        tag: { label: "Después", variant: "wait" },
      };
    },
  },
] as const;
