import { FC } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  darken,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {
  CloseOutlined,
  HistoryOutlined,
  OpenInNewOutlined,
} from "@mui/icons-material";
import { formatDateTime } from "@/utils/formatting";
import { getReviewTitle } from "@/utils/submissions";
import { FilesSection } from "./FilesSection";
import { CurrentStatusBanner } from "./CurrentStatusBanner";
import { AdminActionsCard } from "./AdminActionsCard";
import { SubmissionHistorySection } from "./SubmissionHistorySection";
import { SubmissionCommentsSection } from "./SubmissionCommentsSection";
import { OrgDataSection } from "./OrgDataSection";
import { AnyQuestionsBanner } from "./AnyQuestionsBanner";
import { useViewSubmission } from "./hooks/useViewSubmission";

type Props = {
  open: boolean;
  carbonInventoryId?: string | null;
  organizationId?: string | null;
  reductionProjectId?: string | null;
  onClose: () => void;
  isAdmin?: boolean;
};

export const ViewSubmissionDialog: FC<Props> = ({
  open,
  carbonInventoryId,
  organizationId,
  reductionProjectId,
  onClose,
  isAdmin,
}) => {
  const theme = useTheme();

  const {
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
  } = useViewSubmission({
    carbonInventoryId,
    organizationId,
    reductionProjectId,
    onClose,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { overflow: "hidden" } } }}
    >
      {isLoading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : submission ? (
        <>
          <DialogTitle component="div" sx={{ pb: 0.5, pr: 6, minHeight: 46 }}>
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{ color: theme.palette.text.primary, fontSize: 18 }}
            >
              {submission.submissionType
                ? getReviewTitle(submission.submissionType)
                : null}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: darken(theme.palette.background.default, 0.5),
                mt: 0.5,
              }}
            >
              {subtitle}
            </Typography>
            <IconButton
              onClick={onClose}
              size="small"
              disabled={isBusy}
              sx={{ position: "absolute", right: 12, top: 12, opacity: 0.7 }}
            >
              <CloseOutlined fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 2 }}>
            <Stack spacing={2}>
              {/* Main card */}
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: "10px",
                  overflow: "hidden",
                  borderColor: theme.palette.divider,
                }}
              >
                <CurrentStatusBanner
                  status={submission.status}
                  eventType={submission.eventType}
                  submissionType={submission.submissionType}
                />

                <Box className="gap-2 p-2">
                  {/* Date pill */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <Chip
                      label={formatDateTime(submission.date)}
                      size="small"
                      sx={{
                        bgcolor: theme.palette.background.default,
                        border: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.secondary,
                        fontSize: "0.75rem",
                        height: 26,
                        borderRadius: "40px",
                      }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      {submission.userName}
                    </Typography>
                  </Stack>

                  {/* Inventory link */}
                  {submission.carbonInventoryId &&
                    isCarbonInventorySubmission && (
                      <Button
                        variant="text"
                        size="small"
                        startIcon={
                          <OpenInNewOutlined
                            sx={{ fontSize: "0.75rem !important" }}
                          />
                        }
                        onClick={() =>
                          handleNavigateToInventory(
                            submission.carbonInventoryId!
                          )
                        }
                        sx={{
                          color: theme.palette.common.glossyTeal,
                          px: 1,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          textTransform: "none",
                          mb: 1,
                          minWidth: 0,
                        }}
                      >
                        Ver resumen del cálculo de huella
                      </Button>
                    )}

                  {/* Reduction project link */}
                  {reductionProjectId && isReductionProjectVerification && (
                    <Button
                      variant="text"
                      size="small"
                      startIcon={
                        <OpenInNewOutlined
                          sx={{ fontSize: "0.75rem !important" }}
                        />
                      }
                      onClick={() =>
                        handleNavigateToReductionProject(reductionProjectId)
                      }
                      sx={{
                        color: theme.palette.common.glossyTeal,
                        px: 1,
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        textTransform: "none",
                        mb: 1,
                        minWidth: 0,
                      }}
                    >
                      Ver detalle del proyecto de reducción
                    </Button>
                  )}

                  {submissionComment && (
                    <SubmissionCommentsSection comment={submissionComment} />
                  )}
                  <Stack direction="column" spacing={2}>
                    {submission.files.length > 0 && (
                      <FilesSection files={submission.files} />
                    )}
                    {submission.recognitions.length > 0 && (
                      <FilesSection
                        files={submission.recognitions}
                        variant="recognitions"
                      />
                    )}
                  </Stack>

                  {submission.organizationData &&
                    isOrganizationAccreditation && (
                      <OrgDataSection data={submission.organizationData} />
                    )}

                  {isAdmin && isStatusPending && submission?.submissionType && (
                    <AdminActionsCard
                      onApprove={handleApproveSubmission}
                      onReview={handleReviewSubmission}
                      isBusy={isBusy}
                      type={submission.submissionType}
                    />
                  )}
                </Box>
              </Paper>

              {/* History section */}
              <SubmissionHistorySection history={historicalEntries} />

              <AnyQuestionsBanner />
            </Stack>
          </DialogContent>
        </>
      ) : (
        <>
          <DialogTitle component="div" sx={{ pb: 0.5, pr: 6, minHeight: 46 }}>
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{ color: theme.palette.text.primary, fontSize: 18 }}
            >
              Historial de postulaciones
            </Typography>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ position: "absolute", right: 12, top: 12, opacity: 0.7 }}
            >
              <CloseOutlined fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 4 }}>
            <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
              <HistoryOutlined
                sx={{ fontSize: 40, color: theme.palette.text.disabled }}
              />
              <Typography
                variant="body1"
                fontWeight={500}
                sx={{ color: theme.palette.text.primary }}
              >
                Sin historial disponible
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  textAlign: "center",
                }}
              >
                Esta organización aún no registra postulaciones.
              </Typography>
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};
