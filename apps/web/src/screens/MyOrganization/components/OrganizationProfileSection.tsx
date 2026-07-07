import { FC, memo } from "react";
import { Edit, StarOutline } from "@mui/icons-material";
import { SectionCard, type ActionConfig } from "./SectionCard";
import { OrganizationProfileView } from "./OrganizationProfileView";
import { AccreditationConfirmDialog } from "./AccreditationConfirmDialog";
import {
  GetOrganizationByIdResponse,
  SubmissionStatus,
  OrganizationDisplayStatusValues,
} from "@repo/types";
import { useAccreditationDialog } from "../hooks";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

type OrganizationProfileSectionProps = {
  profile: GetOrganizationByIdResponse;
  onEdit: () => void;
  canManageOrganization: boolean;
};

const OrganizationProfileSectionComponent: FC<
  OrganizationProfileSectionProps
> = ({ profile, onEdit, canManageOrganization }) => {
  const accreditationDialog = useAccreditationDialog(profile.id);

  const actions: ActionConfig[] = canManageOrganization
    ? [
        {
          label: "EDITAR",
          icon: <Edit />,
          onClick: onEdit,
          disabled: !profile.isEditable,
          title: !profile.isEditable
            ? `${capitalize(VOCAB.organization.article.singular)} tiene una postulación pendiente`
            : undefined,
        },
      ]
    : [];

  // Add Accredit action if not accredited
  if (
    canManageOrganization &&
    profile.status === OrganizationDisplayStatusValues.NOT_ACCREDITED &&
    profile.lastSubmissionStatus !== SubmissionStatus.PENDING
  ) {
    actions.push({
      label: `SOLICITAR ${VOCAB.inscription.noun.singular.toUpperCase()}`,
      icon: <StarOutline />,
      onClick: accreditationDialog.openDialog,
      disabled: false,
      title: `Solicitar ${VOCAB.inscription.noun.singular} de ${VOCAB.organization.article.singular}`,
      variant: "contained",
    });
  }

  return (
    <>
      <SectionCard
        title={`Perfil ${VOCAB.organization.noun.singular}`}
        actions={actions}
      >
        <OrganizationProfileView profile={profile} />
      </SectionCard>

      <AccreditationConfirmDialog
        open={accreditationDialog.isOpen}
        onClose={accreditationDialog.closeDialog}
        onConfirm={accreditationDialog.handleConfirm}
        isLoading={accreditationDialog.isLoading}
      />
    </>
  );
};

export const OrganizationProfileSection = memo(
  OrganizationProfileSectionComponent
);
