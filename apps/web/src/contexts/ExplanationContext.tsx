/**
 * ExplanationContext manages the explanation dialog state.
 *
 * State semantics for `explanationSlug`:
 *  - `undefined` → dialog is closed
 *  - `null`      → dialog is open, but there is no explanation to fetch (shows empty content)
 *  - `string`    → dialog is open and fetches the explanation by slug
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent } from "@mui/material";
import { ExplanationContent } from "@/components/ExplanationContent";
import { ExplanationSkeleton } from "@/components/ExplanationSkeleton";
import { useSnackbar } from "notistack";
import { useExplanation } from "@/api/query/explanations";

interface ExplanationContextType {
  openExplanation: (slug: string | null) => void;
}

const ExplanationContext = createContext<ExplanationContextType | undefined>(
  undefined
);

export function ExplanationProvider({ children }: { children: ReactNode }) {
  const [explanationSlug, setExplanationSlug] = useState<
    string | null | undefined
  >(undefined);
  const {
    data: explanation,
    isLoading,
    isError,
  } = useExplanation(explanationSlug ?? null);

  const openExplanation = useCallback((slug: string | null) => {
    setExplanationSlug(slug);
  }, []);

  const handleClose = useCallback(() => {
    setExplanationSlug(undefined);
  }, []);

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("No se pudo cargar la explicación", {
        variant: "error",
        preventDuplicate: true,
      });
    }
  }, [isError, enqueueSnackbar]);

  const value = useMemo(() => ({ openExplanation }), [openExplanation]);

  return (
    <ExplanationContext.Provider value={value}>
      {children}
      <Dialog
        maxWidth="md"
        fullWidth
        scroll="body"
        open={explanationSlug !== undefined && !isError}
        onClose={handleClose}
        slotProps={{ transition: { onExited: handleClose } }}
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
