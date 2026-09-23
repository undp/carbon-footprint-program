/**
 * The maintainer grids let a row be added before it exists on the server: it is
 * prepended with a temporary id and gets its real one from the create response.
 *
 * The prefix is the sentinel every screen tests for, so it lives here rather
 * than being written out at each call site — changing it should be one edit,
 * not a search for `startsWith`.
 */
export const TEMP_ROW_PREFIX = "temp_";

export const createTemporaryRowId = () => `${TEMP_ROW_PREFIX}${Date.now()}`;

export const isTemporaryRowId = (rowId: string) =>
  rowId.startsWith(TEMP_ROW_PREFIX);
