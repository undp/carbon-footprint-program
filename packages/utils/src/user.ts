/**
 * Builds a display name from first and last name.
 * Returns `firstName lastName` if both exist, just `firstName` if no last name,
 * or null if no first name.
 */
export function buildUserName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  if (!firstName) return null;
  return lastName ? `${firstName} ${lastName}` : firstName;
}
