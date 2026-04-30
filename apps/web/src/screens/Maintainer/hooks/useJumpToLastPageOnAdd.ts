import { useCallback, useState } from "react";

interface PaginationModel {
  page: number;
  pageSize: number;
}

interface UseJumpToLastPageOnAddOptions {
  /** Initial page size (defaults to 10 — same as the previous `initialState`). */
  initialPageSize?: number;
}

/**
 * Controlled-pagination helper for the profiling maintainer grids. Returns the controlled
 * `paginationModel` plus a `jumpToLastPage(totalRowCount)` callback the screen invokes after
 * appending a new row, so the freshly-added row is always on the visible page.
 */
export const useJumpToLastPageOnAdd = ({
  initialPageSize = 10,
}: UseJumpToLastPageOnAddOptions = {}) => {
  // Clamp to a positive integer to keep `Math.ceil(total / pageSize)` well-defined.
  const safeInitialPageSize =
    Number.isInteger(initialPageSize) && initialPageSize > 0
      ? initialPageSize
      : 10;

  const [paginationModel, setPaginationModel] = useState<PaginationModel>({
    page: 0,
    pageSize: safeInitialPageSize,
  });

  const jumpToLastPage = useCallback((totalRowCount: number) => {
    if (totalRowCount === 0) return;
    setPaginationModel((prev) => {
      const safePageSize = prev.pageSize > 0 ? prev.pageSize : 1;
      const lastPage = Math.max(0, Math.ceil(totalRowCount / safePageSize) - 1);
      return prev.page === lastPage ? prev : { ...prev, page: lastPage };
    });
  }, []);

  return { paginationModel, setPaginationModel, jumpToLastPage };
};
