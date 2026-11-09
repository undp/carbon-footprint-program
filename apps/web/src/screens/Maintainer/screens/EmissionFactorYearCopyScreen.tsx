import { FC, useCallback, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { Alert, Box, Button, Typography } from "@mui/material";
import { ArrowBackOutlined } from "@mui/icons-material";
import type { GridFilterModel } from "@mui/x-data-grid";
import {
  DuplicateEmissionFactorYearRequestSchema,
  EmissionFactorYearCopyInvalidDetailsSchema,
  EmissionFactorYearCopyViolationReason,
  MethodologyVersionStatus,
  type EmissionFactorYearCopyViolation,
  type EmissionFactorYearCopyViolationReason as ViolationReason,
} from "@repo/types";
import { planEmissionFactorYearCopy, YearCopyOutcome } from "@repo/utils";
import {
  useDuplicateEmissionFactorYear,
  useEmissionFactorDimensions,
  useEmissionFactors,
} from "@/api/query/maintainer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Routes } from "@/interfaces/routes";
import {
  getApiErrorCode,
  getApiErrorMessage,
} from "@/utils/getApiErrorMessage";
import { AppHttpError } from "@/api/http/errors";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { YearCopyYearSelects } from "../components/emissionFactorYearCopy/YearCopyYearSelects";
import { YearCopyGrid } from "../components/emissionFactorYearCopy/YearCopyGrid";
import { YearCopyFooter } from "../components/emissionFactorYearCopy/YearCopyFooter";
import { YearCopyDuplicateNotice } from "../components/emissionFactorYearCopy/YearCopyDuplicateNotice";
import { YearCopySkeleton } from "../components/emissionFactorYearCopy/YearCopySkeleton";
import { useMaintainerMethodologyScope } from "../hooks/useMaintainerMethodologyScope";
import { useYearCopyEdits } from "../hooks/useYearCopyEdits";
import { useYearCopyColumns } from "../hooks/useYearCopyColumns";
import { EMISSION_FACTOR_YEAR_OPTIONS } from "../utils/emissionFactorYearOptions";
import {
  buildYearCopyRows,
  getDefaultCopyYears,
  getDefaultTargetYear,
  toYearCopyRequestChanges,
  type YearCopyRow,
} from "../utils/emissionFactorYearCopy";

const EXPLANATION_SLUG = "emission-factors-maintainer";
const GENERIC_DIMENSION_HEADERS = { dim1: "Variable 1", dim2: "Variable 2" };
const EMPTY_FILTER_MODEL: GridFilterModel = { items: [] };

/** The subcategory a filter model narrows the grid to, if exactly one. */
const filteredSubcategoryName = (model: GridFilterModel): string | null => {
  const [item, ...rest] = model.items;
  if (!item || rest.length > 0) return null;
  if (item.field !== "subcategoryName" || item.operator !== "is") return null;
  return typeof item.value === "string" && item.value !== ""
    ? item.value
    : null;
};

/**
 * Copies the emission factors of one year into another within the methodology
 * version in edit mode, correcting values and sources on the way. The shared
 * planner decides each row's outcome and the blockers, as the API does before
 * writing.
 */
export const EmissionFactorYearCopyScreen: FC = () => {
  const scope = useMaintainerMethodologyScope();
  const { methodologyVersionId, targetMethodology } = scope;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const {
    data: factors,
    isLoading,
    isError,
  } = useEmissionFactors(methodologyVersionId);
  const { data: dimensions } =
    useEmissionFactorDimensions(methodologyVersionId);
  const copyMutation = useDuplicateEmissionFactorYear();
  const { edits, changes, hasEdits, dispatch } = useYearCopyEdits();

  // --- Years ---
  const sourceYearOptions = useMemo(
    () =>
      [...new Set((factors ?? []).map((factor) => factor.year))].sort(
        (a, b) => b - a
      ),
    [factors]
  );
  // Pinned on the first listing: a listing read later with a newer year must
  // not move the years under the admin's edits.
  const [years, setYears] = useState<{
    sourceYear: number;
    targetYear: number;
  } | null>(null);
  if (years === null && factors) {
    const defaults = getDefaultCopyYears(
      sourceYearOptions,
      EMISSION_FACTOR_YEAR_OPTIONS
    );
    if (defaults) setYears(defaults);
  }
  const [pendingSourceYear, setPendingSourceYear] = useState<number | null>(
    null
  );

  // --- Errors from the last copy attempt ---
  // They stand until the next edit, or until a listing read after the error
  // differs: a gas breakdown mismatch is only known to the API.
  const [serverViolations, setServerViolations] = useState<{
    violations: EmissionFactorYearCopyViolation[];
    factors: typeof factors;
  } | null>(null);
  const activeServerViolations = useMemo(
    () =>
      serverViolations && serverViolations.factors === factors
        ? serverViolations.violations
        : [],
    [serverViolations, factors]
  );

  // --- Plan ---
  const plan = useMemo(() => {
    if (!factors || !years) return null;
    return planEmissionFactorYearCopy({
      sourceFactors: factors.filter(({ year }) => year === years.sourceYear),
      targetFactors: factors.filter(({ year }) => year === years.targetYear),
      changes,
    });
  }, [factors, years, changes]);

  const reasonsById = useMemo(() => {
    const map = new Map<string, ViolationReason[]>();
    for (const { sourceFactorId, reason } of [
      ...(plan?.violations ?? []),
      ...activeServerViolations,
    ]) {
      const reasons = map.get(sourceFactorId) ?? [];
      if (!reasons.includes(reason)) reasons.push(reason);
      map.set(sourceFactorId, reasons);
    }
    return map;
  }, [plan, activeServerViolations]);

  const rows = useMemo(
    () => (plan ? buildYearCopyRows(plan, edits, reasonsById) : []),
    [plan, edits, reasonsById]
  );

  const counts = useMemo(() => {
    const copied = rows.filter((row) => row.outcome === YearCopyOutcome.COPY);
    return {
      copied: copied.length,
      existing: rows.filter(
        (row) => row.outcome === YearCopyOutcome.EXISTS_IN_TARGET
      ).length,
      excluded: rows.filter((row) => row.outcome === YearCopyOutcome.EXCLUDED)
        .length,
      newValues: copied.filter((row) => row.valueChanged).length,
      newSources: copied.filter((row) => row.sourceChanged).length,
      warnings: copied.filter((row) => row.variation?.isWarning).length,
    };
  }, [rows]);
  const editedCount = rows.filter(
    (row) => row.valueChanged || row.sourceChanged
  ).length;
  const duplicatedCount =
    plan?.violations.filter(
      ({ reason }) =>
        reason === EmissionFactorYearCopyViolationReason.DUPLICATE_TARGET_FACTOR
    ).length ?? 0;
  const hasViolations =
    (plan?.violations.length ?? 0) > 0 || activeServerViolations.length > 0;

  // --- Grid ---
  const [filterModel, setFilterModel] =
    useState<GridFilterModel>(EMPTY_FILTER_MODEL);

  const subcategoryNames = useMemo(
    () => [...new Set(rows.map((row) => row.subcategoryName))],
    [rows]
  );

  const filteredName = filteredSubcategoryName(filterModel);
  const filteredSubcategoryId = filteredName
    ? rows.find((row) => row.subcategoryName === filteredName)?.subcategoryId
    : undefined;
  const dimensionHeaders = useMemo(() => {
    const entry = dimensions?.find(
      ({ subcategoryId }) => subcategoryId === filteredSubcategoryId
    );
    if (!entry) return GENERIC_DIMENSION_HEADERS;
    const nameAt = (position: number, fallback: string) =>
      entry.dimensions.find((dimension) => dimension.position === position)
        ?.name ?? fallback;
    return {
      dim1: nameAt(1, GENERIC_DIMENSION_HEADERS.dim1),
      dim2: nameAt(2, GENERIC_DIMENSION_HEADERS.dim2),
    };
  }, [dimensions, filteredSubcategoryId]);

  const sourceSuggestions = useMemo(
    () =>
      [...new Set((factors ?? []).map((factor) => factor.source))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [factors]
  );

  const handleValueChange = useCallback(
    (row: YearCopyRow, value: number | null) => {
      setServerViolations(null);
      dispatch({
        type: "setValue",
        sourceFactorId: row.id,
        value,
        storedValue: row.storedValue,
      });
    },
    [dispatch]
  );
  const handleSourceChange = useCallback(
    (row: YearCopyRow, source: string) => {
      setServerViolations(null);
      dispatch({
        type: "setSource",
        sourceFactorId: row.id,
        source,
        storedSource: row.storedSource,
      });
    },
    [dispatch]
  );
  const handleToggleExclude = useCallback(
    (row: YearCopyRow) => {
      setServerViolations(null);
      dispatch({ type: "toggleExclude", sourceFactorId: row.id });
    },
    [dispatch]
  );

  const columns = useYearCopyColumns({
    sourceYear: years?.sourceYear ?? 0,
    targetYear: years?.targetYear ?? 0,
    subcategoryNames,
    dimensionHeaders,
    sourceSuggestions,
    onValueChange: handleValueChange,
    onSourceChange: handleSourceChange,
    onToggleExclude: handleToggleExclude,
  });

  // --- Year changes ---
  const applySourceYear = (sourceYear: number) => {
    setServerViolations(null);
    dispatch({ type: "reset" });
    setYears((current) => {
      const targetYear =
        current && current.targetYear !== sourceYear
          ? current.targetYear
          : getDefaultTargetYear(sourceYear, EMISSION_FACTOR_YEAR_OPTIONS);
      return targetYear === null ? current : { sourceYear, targetYear };
    });
  };
  const handleSourceYearChange = (sourceYear: number) => {
    // The edits belong to the old year's factors.
    if (hasEdits) setPendingSourceYear(sourceYear);
    else applySourceYear(sourceYear);
  };
  const handleTargetYearChange = (targetYear: number) => {
    // The edits stay: they belong to the source factors, which do not change.
    setServerViolations(null);
    setYears((current) => (current ? { ...current, targetYear } : current));
  };

  // --- Leaving with edits ---
  const skipBlockerRef = useRef(false);
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => hasEdits && !skipBlockerRef.current,
    enableBeforeUnload: hasEdits,
    withResolver: true,
  });

  const goBack = () => void navigate({ to: Routes.ADMIN_EMISSION_FACTORS });

  // --- Copy ---
  const handleCopy = async () => {
    if (!plan || !years || !methodologyVersionId) return;
    const request = DuplicateEmissionFactorYearRequestSchema.safeParse({
      methodologyVersionId,
      sourceYear: years.sourceYear,
      targetYear: years.targetYear,
      changes: toYearCopyRequestChanges(plan, edits),
    });
    if (!request.success) {
      void enqueueSnackbar({
        message: "Revisa los cambios marcados antes de copiar.",
        variant: "error",
      });
      return;
    }

    try {
      const result = await copyMutation.mutateAsync(request.data);
      skipBlockerRef.current = true;
      const skipped =
        result.skipped.existingCount > 0
          ? ` ${result.skipped.existingCount} ya existían y no se copiaron.`
          : "";
      void enqueueSnackbar({
        message: `Se copiaron ${result.copiedCount} factores a ${years.targetYear}, ${result.editedCount} con cambios.${skipped}`,
        variant: "success",
      });
      await navigate({ to: Routes.ADMIN_EMISSION_FACTORS });
    } catch (error) {
      void enqueueSnackbar({
        message: getApiErrorMessage(
          error,
          "No fue posible copiar los factores."
        ),
        variant: "error",
      });
      if (
        getApiErrorCode(error) === "EMISSION_FACTOR_YEAR_COPY_INVALID" &&
        error instanceof AppHttpError
      ) {
        const details = EmissionFactorYearCopyInvalidDetailsSchema.safeParse(
          error.apiDetails
        );
        if (details.success) {
          setServerViolations({
            violations: details.data.violations,
            factors,
          });
        }
      }
    }
  };

  // --- Render ---
  const isPublished =
    targetMethodology?.status === MethodologyVersionStatus.PUBLISHED;
  const subtitle = [
    "Copia los factores de un año a otro y corrige valores y fuentes antes de copiar. El año de origen no cambia.",
    isPublished && years
      ? `Metodología activa: lo que copies queda disponible de inmediato para las huellas de ${years.targetYear}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const renderBody = () => {
    if (isError) {
      return (
        <Typography variant="body2" color="text.secondary">
          No fue posible cargar los factores de emisión.
        </Typography>
      );
    }
    if (isLoading || !factors) return <YearCopySkeleton />;
    if (!years || !plan) {
      return (
        <Typography variant="body2" color="text.secondary">
          Esta metodología aún no tiene factores de emisión para copiar.
        </Typography>
      );
    }
    return (
      <Box className="flex w-full flex-col">
        <YearCopyYearSelects
          sourceYear={years.sourceYear}
          targetYear={years.targetYear}
          sourceYearOptions={sourceYearOptions}
          targetYearOptions={EMISSION_FACTOR_YEAR_OPTIONS.filter(
            (year) => year !== years.sourceYear
          )}
          editedCount={editedCount}
          totalCount={rows.length}
          onSourceYearChange={handleSourceYearChange}
          onTargetYearChange={handleTargetYearChange}
        />
        {activeServerViolations.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            La copia fue rechazada y no se copió nada. Revisa las filas
            marcadas.
          </Alert>
        )}
        <YearCopyDuplicateNotice
          duplicatedCount={duplicatedCount}
          targetYear={years.targetYear}
        />
        <YearCopyGrid
          rows={rows}
          columns={columns}
          filterModel={filterModel}
          onFilterModelChange={setFilterModel}
        />
        <YearCopyFooter
          counts={counts}
          targetYear={years.targetYear}
          hasViolations={hasViolations}
          isCopying={copyMutation.isPending}
          onCopy={() => void handleCopy()}
        />
      </Box>
    );
  };

  return (
    <>
      <MaintainerPageHeader
        title="Copiar factores de un año"
        subtitle={subtitle}
        explanationSlug={EXPLANATION_SLUG}
        extra={
          <>
            {scope.methodologySelector}
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackOutlined />}
              onClick={goBack}
            >
              Volver
            </Button>
          </>
        }
      />
      <Box className="flex w-full rounded-sm bg-white p-3">{renderBody()}</Box>
      <ConfirmDialog
        open={pendingSourceYear !== null}
        title="Cambiar año de origen"
        message={`Se descartarán los cambios que hiciste sobre los factores de ${years?.sourceYear ?? ""}.`}
        variant="warning"
        confirmLabel="Cambiar y descartar"
        onClose={() => setPendingSourceYear(null)}
        onConfirm={() => {
          if (pendingSourceYear !== null) applySourceYear(pendingSourceYear);
          setPendingSourceYear(null);
        }}
      />
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
    </>
  );
};
