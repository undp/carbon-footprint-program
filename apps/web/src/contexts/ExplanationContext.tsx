import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent } from "@mui/material";
import { ExplanationContent } from "@/components/ExplanationContent";
import { ExplanationSkeleton } from "@/components/ExplanationSkeleton";
import { useSnackbar } from "notistack";
import { useExplanation } from "@/api/query/explanations";

interface ExplanationContextType {
  openExplanation: (id: string) => void;
}

const ExplanationContext = createContext<ExplanationContextType | undefined>(
  undefined
);

export function ExplanationProvider({ children }: { children: ReactNode }) {
  const [explanationId, setExplanationId] = useState<string | null>(null);
  const {
    data: explanation,
    isLoading,
    isError,
  } = useExplanation(explanationId);

  const openExplanation = useCallback((id: string) => {
    setExplanationId(id);
  }, []);

  const handleClose = useCallback(() => {
    setExplanationId(null);
  }, []);

  const { enqueueSnackbar } = useSnackbar();

  if (isError && explanationId !== null) {
    enqueueSnackbar("No se pudo cargar la explicación", {
      variant: "error",
      preventDuplicate: true,
    });
    setExplanationId(null);
  }

  return (
    <ExplanationContext.Provider value={{ openExplanation }}>
      {children}
      <Dialog
        maxWidth="md"
        fullWidth
        scroll="body"
        open={explanationId !== null}
        onClose={handleClose}
        aria-labelledby="explanation-dialog-title"
      >
        <DialogContent sx={{ p: 3 }}>
          {isLoading ? (
            <ExplanationSkeleton />
          ) : (
            <ExplanationContent content={explanation?.content ?? ""} />
          )}
        </DialogContent>
      </Dialog>
    </ExplanationContext.Provider>
  );
}

export function useExplanationDialog() {
  const context = useContext(ExplanationContext);
  if (context === undefined) {
    throw new Error(
      "useExplanationDialog must be used within an ExplanationProvider"
    );
  }
  return context;
}
