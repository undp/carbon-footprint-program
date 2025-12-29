import { useMemo, useCallback } from "react";
import Fuse, { IFuseOptions } from "fuse.js";

const defaultOptions: IFuseOptions<unknown> = {
  includeScore: false,
  threshold: 0.4,
  ignoreLocation: false,
};

const normalizeQuery = (query: string): string => {
  return query.trim();
};

/**
 * Hook for fuzzy searching over an array of options using Fuse.js
 * @param options - Array of items to search
 * @param fuseOptions - Fuse.js configuration (should be memoized or stable)
 * @returns Object with search function
 */
export const useFuzzySearch = <T,>(
  options: T[],
  fuseOptions?: IFuseOptions<T>
) => {
  const fuse = useMemo(() => {
    return new Fuse(options, {
      ...defaultOptions,
      ...fuseOptions,
    });
  }, [options, fuseOptions]);

  const search = useCallback(
    (query: string): T[] => {
      const normalizedQuery = normalizeQuery(query);
      if (!normalizedQuery) return options;

      return fuse.search(normalizedQuery).map((result) => result.item);
    },
    [fuse, options]
  );

  return { search };
};
