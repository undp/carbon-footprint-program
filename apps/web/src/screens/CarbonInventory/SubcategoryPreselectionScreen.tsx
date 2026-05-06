import { FC, useCallback, useRef } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";
import { CarbonInventoryLayout, FooterButton } from "./layout";
import { Routes } from "@/interfaces";
import {
  StepHeader,
  SubcategoryPreselectionCarousel,
  ExitInventoryDialog,
  CarbonInventoryNavigationButton,
} from "./components";
import { useAuth } from "@/contexts";
import { useSubcategoryPreselectionData } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionData";
import { useSubcategoryPreselectionForm } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionForm";
import { useSubcategoryPreselectionSubmit } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionSubmit";
import { useSubcategoryPreselectionNavigation } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionNavigation";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { DevTool } from "@hookform/devtools";
import { IS_DEVELOPMENT } from "@/config/environment";
import { useEmissionCaptureData } from "./hooks/useEmissionCaptureData";
import { useCarbonInventory } from "@/api/query";
import { useInventoryEditGuard } from "./hooks/useInventoryEditGuard";
import { useExitDialog } from "./hooks/useExitDialog";
import { useCommonNavigation } from "./hooks/useCommonNavigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { VOCAB } from "@/config/vocab";
import { useInventoryErrorHandler } from "./hooks/useInventoryErrorHandler";
import capitalize from "lodash-es/capitalize";

const ERROR_MESSAGE = {
  title:
    "Hubo un error cargando las categorías y subcategorías para su huella.",
  description:
    "Por favor, pruebe a recargar la página nuevamente o intente más tarde.",
  retryButtonText: "Recargar Página",
} as const;

const SUBCATEGORY_PRESELECTION_EXPLANATION_SLUGS = {
  MAIN: "subcategory-preselection",
} as const;

export const SubcategoryPreselectionScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_SUBCATEGORY_PRESELECTION,
  });
  const { user } = useAuth();

  const { data: existingInventory, error: inventoryError } =
    useCarbonInventory(inventoryId);

  const { isReady, mustNavigateAway } = useInventoryEditGuard(
    inventoryId,
    existingInventory?.status
  );

  const { data } = useEmissionCaptureData({
    inventoryId,
  });

  const {
    data: categories,
    isLoading: isSubcategoryPreselectionLoading,
    hasError,
  } = useSubcategoryPreselectionData(inventoryId);

  const { goBack, goNext } = useSubcategoryPreselectionNavigation(inventoryId);
  const { goToList, goToLanding } = useCommonNavigation();

  useInventoryErrorHandler(inventoryError);

  const methods = useSubcategoryPreselectionForm({
    data: categories,
  });
  const {
    handleSubmit,
    formState: { isDirty },
  } = methods;

  const { saveSelections, isSavingSelections } =
    useSubcategoryPreselectionSubmit(inventoryId, { onSuccess: goNext });

  const {
    saveSelections: saveSelectionsAndGoToList,
    isSavingSelections: isSavingSelectionsAndGoingToList,
  } = useSubcategoryPreselectionSubmit(inventoryId, { onSuccess: goToList });

  const globalSubmitting =
    isSavingSelections || isSavingSelectionsAndGoingToList;

  const isLoading = isSubcategoryPreselectionLoading || !isReady;

  const { handleExitClick, dialogProps } = useExitDialog({
    user,
    onUserExit: () =>
      void handleSubmit((values) =>
        saveSelectionsAndGoToList(values, isDirty)
      )(),
    onGuestConfirm: goToLanding,
  });

  const confirmDialog = useConfirmDialog();
  // Use a ref to store the submit closure, ensuring a stable reference for the
  // confirm dialog while capturing the atomic form state at the moment of click.
  const pendingActionRef = useRef<(() => void) | null>(null);

  const hasUnselectedCategory = useCallback((): boolean => {
    const formValues = methods.getValues();
    return !!categories?.some((category) => {
      if (category.subcategories.length === 0) return false;
      return !category.subcategories.some((s) => formValues[s.id] === true);
    });
  }, [categories, methods]);

  const onNextClick = useCallback(() => {
    const doSubmit = () =>
      void handleSubmit((values) => saveSelections(values, isDirty))();

    if (hasUnselectedCategory()) {
      pendingActionRef.current = doSubmit;
      confirmDialog.openConfirm({
        title: "Categorías sin subcategorías seleccionadas",
        message:
          "Hay categorías donde no seleccionaste ninguna subcategoría. Si continúas, no se incluirán en el inventario.",
        variant: "success",
        confirmLabel: "Continuar",
        cancelLabel: "Revisar",
      });
    } else {
      doSubmit();
    }
  }, [
    handleSubmit,
    saveSelections,
    isDirty,
    hasUnselectedCategory,
    confirmDialog,
  ]);

  const onWarningConfirm = useCallback(() => {
    confirmDialog.closeConfirm();
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, [confirmDialog]);

  if (!isLoading && mustNavigateAway) return null;

  const isFormDisabled = globalSubmitting || hasError || isLoading;

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      disabled: globalSubmitting,
      onClick: goBack,
    },
  };

  const nextButton: FooterButton = {
    text: "Siguiente",
    align: "right",
    buttonProps: {
      endIcon: <ArrowRightAltRounded />,
      variant: "contained",
      onClick: onNextClick,
      loading: isSavingSelections,
      disabled: isFormDisabled,
    },
  };

  return (
    <FormProvider {...methods}>
      <form id="subcategory-preselection-form" noValidate>
        <CarbonInventoryLayout
          headerProps={{
            title: `Simulador de Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
            subtitle: data?.name ?? undefined,
            action: (
              <CarbonInventoryNavigationButton
                type={user ? "inventories" : "landing"}
                buttonProps={{
                  onClick: handleExitClick,
                  disabled: globalSubmitting,
                  loading: isSavingSelectionsAndGoingToList,
                }}
              />
            ),
          }}
          footerProps={{
            buttons: [backButton, nextButton],
          }}
          isLoading={isLoading}
          hasError={hasError}
          errorMessage={ERROR_MESSAGE}
        >
          <Box className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto rounded-lg bg-white p-6">
            <StepHeader
              title="Paso 2: Fuentes o actividades sugeridas"
              description={`Estas son las principales fuentes de emisión que te recomendamos medir según tu rubro. Marca y/o desmarca las que aplican a tu ${VOCAB.organization.noun.singular}.`}
              explanationSlug={SUBCATEGORY_PRESELECTION_EXPLANATION_SLUGS.MAIN}
            />
            <SubcategoryPreselectionCarousel categories={categories} />
          </Box>
        </CarbonInventoryLayout>
      </form>
      {IS_DEVELOPMENT && <DevTool control={methods.control} />}
      <ExitInventoryDialog {...dialogProps} />
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onClose={confirmDialog.closeConfirm}
        onConfirm={onWarningConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
      />
    </FormProvider>
  );
};
