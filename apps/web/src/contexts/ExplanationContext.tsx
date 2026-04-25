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
import type { ExplanationSlug } from "@repo/constants";

type ExplanationState =
  | { mode: "slug"; slug: ExplanationSlug | null }
  | { mode: "content"; content: string | null }
  | null;

interface ExplanationContextType {
  openExplanationBySlug: (slug: ExplanationSlug | null) => void;
  openExplanationContent: (content: string | null) => void;
}

const ExplanationContext = createContext<ExplanationContextType | undefined>(
  undefined
);

export function ExplanationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExplanationState>(null);

  const slugForFetch = state?.mode === "slug" ? state.slug : null;
  const {
    data: explanation,
    isLoading,
    isError,
  } = useExplanation(slugForFetch);

  const openExplanationBySlug = useCallback((slug: ExplanationSlug | null) => {
    setState({ mode: "slug", slug });
  }, []);

  const openExplanationContent = useCallback((content: string | null) => {
    setState({ mode: "content", content });
  }, []);

  const handleClose = useCallback(() => {
    setState(null);
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

  const value = useMemo(
    () => ({ openExplanationBySlug, openExplanationContent }),
    [openExplanationBySlug, openExplanationContent]
  );

  const isOpen = state !== null && !isError;

  return (
    <ExplanationContext.Provider value={value}>
      {children}
      <Dialog
        maxWidth="md"
        fullWidth
        scroll="body"
        open={isOpen}
        onClose={handleClose}
        slotProps={{ transition: { onExited: handleClose } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {state?.mode === "content" ? (
            <ExplanationContent content={state.content ?? ""} />
          ) : isLoading ? (
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
