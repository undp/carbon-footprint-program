import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useGetCarbonInventoryHistory } from "@/api/query/submissions/useGetCarbonInventoryHistory";
import { useGetOrganizationHistory } from "@/api/query/submissions/useGetOrganizationHistory";
import { useGetReductionProjectHistory } from "@/api/query/submissions/useGetReductionProjectHistory";
import { useApproveRequest } from "@/api/query/requests/useApproveRequest";
import { useReviewSubmission } from "@/api/query/requests/useReviewSubmission";
import {
  ApproveRequestBody,
  ReviewSubmissionBody,
  SubmissionStatus,
  SubmissionType,
} from "@repo/types";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { Routes } from "@/interfaces/routes/routes.const";

type UseViewSubmissionParams = {
  carbonInventoryId?: string | null;
  organizationId?: string | null;
  reductionProjectId?: string | null;
  onClose: () => void;
};

export const useViewSubmission = ({
  carbonInventoryId,
  organizationId,
  reductionProjectId,
  onClose,
}: UseViewSubmissionParams) => {
  const { enqueueSnackbar } = useSnackbar();

  const ciHistory = useGetCarbonInventoryHistory(
    carbonInventoryId ?? undefined
  );
  const orgHistory = useGetOrganizationHistory(organizationId ?? undefined);
  const rpHistory = useGetReductionProjectHistory(
    reductionProjectId ?? undefined
  );

  const activeQuery = carbonInventoryId
    ? ciHistory
    : reductionProjectId
      ? rpHistory
      : orgHistory;
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
  const isReductionProjectVerification =
    submission?.submissionType ===
    SubmissionType.REDUCTION_PROJECT_VERIFICATION;
  const isBusy = isApproving || isReviewing;
  const submissionComment = submission?.comment?.trim() ?? "";

  const orgName = submission?.userMetadata ?? undefined;
  const year = submission?.carbonInventoryYear;
  const subtitle =
    !isOrganizationAccreditation && orgName && year
      ? `${orgName} • Año ${year}`
      : orgName
        ? `${orgName}`
        : "";

  const handleApproveSubmission = useCallback(
    async (body: ApproveRequestBody) => {
      if (!submission || !submission.submissionId) return;
      try {
        await approveRequest({ id: submission.submissionId, body });
        enqueueSnackbar("Postulación aprobada correctamente", {
          variant: "success",
        });
        onClose();
      } catch (error) {
        enqueueSnackbar(
          getApiErrorMessage(error, "Error al aprobar la postulación"),
          { variant: "error" }
        );
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

  const handleNavigateToInventory = useCallback((inventoryId: string) => {
    const href = Routes.CARBON_INVENTORY_EMISSION_SUMMARY.replace(
      "$inventoryId",
      inventoryId
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  const handleNavigateToReductionProject = useCallback((projectId: string) => {
    const href = Routes.REDUCTION_PROJECT_DETAILS.replace("$id", projectId);
    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  return {
    submission,
    historicalEntries,
    isLoading,
    isStatusPending,
    isCarbonInventorySubmission,
    isOrganizationAccreditation,
    isReductionProjectVerification,
    isBusy,
    submissionComment,
    subtitle,
    handleApproveSubmission,
    handleReviewSubmission,
    handleNavigateToInventory,
    handleNavigateToReductionProject,
  };
};
