import { TERMS_CONDITIONS_FILE_URL } from "@/config/constants";
import { useCurrentTermsConditions } from "./useCurrentTermsConditions";

/**
 * Link to the current Términos y Condiciones file. `isAvailable` is false
 * while the request is in flight or when no current document is published, so
 * every surface gates the link on a single rule instead of hand-rolling it.
 */
export const useTermsConditionsFileLink = (): {
  href: string;
  isAvailable: boolean;
} => {
  const { data, isLoading } = useCurrentTermsConditions();

  return {
    href: TERMS_CONDITIONS_FILE_URL,
    isAvailable: !isLoading && !!data?.fileName,
  };
};
