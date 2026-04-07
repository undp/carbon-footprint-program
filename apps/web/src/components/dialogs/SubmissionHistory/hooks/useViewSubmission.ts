import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { useGetCarbonInventoryHistory } from "@/api/query/submissions/useGetCarbonInventoryHistory";
import { useGetOrganizationHistory } from "@/api/query/submissions/useGetOrganizationHistory";
import { useApproveRequest } from "@/api/query/requests/useApproveRequest";
import { useReviewSubmission } from "@/api/query/requests/useReviewSubmission";
import {
  ApproveRequestBody,
  ReviewSubmissionBody,
  SubmissionStatus,
  SubmissionType,
} from "@repo/types";
import { Routes } from "@/interfaces/routes/routes.const";

type UseViewSubmissionParams = {
  carbonInventoryId?: string | null;
  organizationId?: string | null;
  onClose: () => void;
};

export const useViewSubmission = ({
  carbonInventoryId,
  organizationId,
  onClose,
}: UseViewSubmissionParams) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const ciHistory = useGetCarbonInventoryHistory(
    carbonInventoryId ?? undefined
  );
  const orgHistory = useGetOrganizationHistory(organizationId ?? undefined);

  const activeQuery = carbonInventoryId ? ciHistory : orgHistory;
  const history = activeQuery.data ?? [];
  const isLoading = activeQuery.isLoading;

  const submission = history[0] ?? null;
  const historicalEntries = history.slice(1);

  const { mutateAsync: approveRequest, isPending: isApproving } =
    useApproveRequest();

  const { mutateAsync: reviewSubmission, isPending: isReviewing } =
    useReviewSubmission();

  const isStatusPending = submission?.status === SubmissionStatus.PENDING;
  const isCarbonInventorySubmission =
    submission?.submissionType ===
      SubmissionType.CARBON_INVENTORY_CALCULATION ||
    submission?.submissionType === SubmissionType.CARBON_INVENTORY_VERIFICATION;
  const isOrganizationAccreditation =
    submission?.submissionType === SubmissionType.ORGANIZATION_ACCREDITATION;
  const isBusy = isApproving || isReviewing;
  const submissionComment = submission?.comment?.trim() ?? "";

  const orgName = submission?.userMetadata ?? undefined;
  const year = submission ? new Date(submission.date).getFullYear() : undefined;
  const subtitle = orgName && year ? `${orgName} • Año ${year}` : "";

  const handleApprove = useCallback(
    async (body: ApproveRequestBody) => {
      if (!submission || !submission.submissionId) return;
      try {
        await approveRequest({ id: submission.submissionId, body });
        enqueueSnackbar("Solicitud aprobada correctamente", {
          variant: "success",
        });
        onClose();
      } catch {
        enqueueSnackbar("Error al aprobar la postulación", { variant: "error" });
      }
    },
    [submission, approveRequest, enqueueSnackbar, onClose]
  );

  const handleReviewSubmission = useCallback(
    async (body: ReviewSubmissionBody) => {
      if (!submission || !submission.submissionId) return;
      try {
        await reviewSubmission({ id: submission.submissionId, body });
        enqueueSnackbar("Cambios solicitados correctamente", {
          variant: "success",
        });
        onClose();
      } catch {
        enqueueSnackbar("Error al solicitar cambios en la postulación", {
          variant: "error",
        });
      }
    },
    [submission, reviewSubmission, enqueueSnackbar, onClose]
  );

  const handleNavigateToInventory = useCallback(
    (inventoryId: string) => {
      void navigate({
        to: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
        params: { inventoryId },
      });
      onClose();
    },
    [navigate, onClose]
  );

  return {
    submission,
    historicalEntries,
    isLoading,
    isStatusPending,
    isCarbonInventorySubmission,
    isOrganizationAccreditation,
    isBusy,
    submissionComment,
    subtitle,
    handleApprove,
    handleReviewSubmission,
    handleNavigateToInventory,
  };
};
