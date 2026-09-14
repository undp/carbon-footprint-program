/**
 * Both ids a reorder names have to resolve, or the request is pointing at a row
 * that is not there.
 *
 * Shared by the two swap services (categories and subcategories), each of which
 * applies it twice: once to the unlocked read that only finds the parent to
 * lock, and again to the locked rows every decision is actually taken against.
 *
 * The missing ids are reported together rather than one at a time, so a client
 * whose grid is two deletes behind learns both in one response. `notFound`
 * builds the domain error, which is the only thing that differs between the two
 * callers.
 */
export function requireBothReorderRows<T extends { id: bigint }>(
  rows: T[],
  ids: readonly [bigint, bigint],
  notFound: (missingIds: string) => Error
): readonly [T, T] {
  const [idA, idB] = ids;
  const rowA = rows.find((row) => row.id === idA);
  const rowB = rows.find((row) => row.id === idB);

  if (!rowA || !rowB) {
    const missingIds = [];
    if (!rowA) missingIds.push(idA);
    if (!rowB) missingIds.push(idB);
    throw notFound(missingIds.join(", "));
  }

  return [rowA, rowB] as const;
}
