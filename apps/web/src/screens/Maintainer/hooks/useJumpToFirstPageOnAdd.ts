import { useCallback, useState } from "react";

interface PaginationModel {
  page: number;
  pageSize: number;
}

interface UseJumpToFirstPageOnAddOptions {
  /** Initial page size (defaults to 10 — same as the previous `initialState`). */
  initialPageSize?: number;
}

/**
 * Controlled-pagination helper for the profiling maintainer grids. Returns the controlled
 * `paginationModel` plus a `jumpToFirstPage()` callback the screen invokes after appending a
 * new row. The new row is pinned to the top of the grid (see `MaintainerDataGrid`), so the
 * user must be on page 0 to see it regardless of any active sort or filter.
 */
export const useJumpToFirstPageOnAdd = ({
  initialPageSize = 10,
}: UseJumpToFirstPageOnAddOptions = {}) => {
  // Clamp to a positive integer to keep pagination well-defined.
  const safeInitialPageSize =
    Number.isInteger(initialPageSize) && initialPageSize > 0
      ? initialPageSize
      : 10;

  const [paginationModel, setPaginationModel] = useState<PaginationModel>({
    page: 0,
    pageSize: safeInitialPageSize,
  });

  const jumpToFirstPage = useCallback(() => {
    setPaginationModel((prev) =>
      prev.page === 0 ? prev : { ...prev, page: 0 }
    );
  }, []);

  return { paginationModel, setPaginationModel, jumpToFirstPage };
};
