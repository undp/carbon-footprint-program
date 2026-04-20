import { useCallback, useEffect, useMemo, useState } from "react";
import Fuse, { IFuseOptions } from "fuse.js";
import { DEFAULT_SEARCH_DEBOUNCE_MS } from "@/config/constants";

const defaultOptions: IFuseOptions<unknown> = {
  includeScore: false,
  threshold: 0.4,
  ignoreLocation: false,
};

const normalizeQuery = (query: string): string => {
  return query.trim();
};

interface UseFuzzySearchParams<T> {
  fuseOptions?: IFuseOptions<T>;
  query?: string;
  debounceMs?: number;
}

/**
 * Hook for fuzzy searching over an array of options using Fuse.js.
 *
 * Two modes:
 * - Imperative: pass only `options` and `fuseOptions`, call `search(query)` on demand.
 * - Reactive: pass `query` to get `results` auto-filtered with a debounced value.
 */
export const useFuzzySearch = <T>(
  options: T[],
  params: UseFuzzySearchParams<T> = {}
) => {
  const {
    fuseOptions,
    query,
    debounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  } = params;

  const [debouncedQuery, setDebouncedQuery] = useState(query ?? "");

  useEffect(() => {
    if (query === undefined) return;
    const timeoutId = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timeoutId);
  }, [query, debounceMs]);

  const fuse = useMemo(() => {
    return new Fuse(options, {
      ...defaultOptions,
      ...fuseOptions,
    });
  }, [options, fuseOptions]);

  const search = useCallback(
    (q: string): T[] => {
      const normalizedQuery = normalizeQuery(q);
      if (!normalizedQuery) return options;

      return fuse.search(normalizedQuery).map((result) => result.item);
    },
    [fuse, options]
  );

  const results = useMemo(() => {
    if (query === undefined) return options;
    return search(debouncedQuery);
  }, [query, debouncedQuery, search, options]);

  return { search, results };
};
