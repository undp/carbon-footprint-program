/**
 * ExplanationContext manages the explanation dialog state.
 *
 * State semantics for `explanationId`:
 *  - `undefined` → dialog is closed
 *  - `null`      → dialog is open, but there is no explanation to fetch (shows empty content)
 *  - `string`    → dialog is open and fetches the explanation by id
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent } from "@mui/material";
import { ExplanationContent } from "@/components/ExplanationContent";
import { ExplanationSkeleton } from "@/components/ExplanationSkeleton";
import { useSnackbar } from "notistack";
import { useExplanation } from "@/api/query/explanations";

interface ExplanationContextType {
  openExplanation: (id: string | null) => void;
}

const ExplanationContext = createContext<ExplanationContextType | undefined>(
  undefined
);

export function ExplanationProvider({ children }: { children: ReactNode }) {
  const [explanationId, setExplanationId] = useState<string | null | undefined>(
    undefined
  );
  const {
    data: explanation,
    isLoading,
    isError,
  } = useExplanation(explanationId ?? null);

  const openExplanation = useCallback((id: string | null) => {
    setExplanationId(id);
  }, []);

  const handleClose = useCallback(() => {
    setExplanationId(undefined);
  }, []);

  const { enqueueSnackbar } = useSnackbar();
  const prevIsError = useRef(false);

  useEffect(() => {
    if (isError && !prevIsError.current) {
      enqueueSnackbar("No se pudo cargar la explicación", {
        variant: "error",
        preventDuplicate: true,
      });
    }
    prevIsError.current = isError;
  }, [isError, enqueueSnackbar]);

  const value = useMemo(() => ({ openExplanation }), [openExplanation]);

  return (
    <ExplanationContext.Provider value={value}>
      {children}
      <Dialog
        maxWidth="md"
        fullWidth
        scroll="body"
        open={explanationId !== undefined && !isError}
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
