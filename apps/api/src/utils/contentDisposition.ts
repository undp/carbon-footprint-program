export type ContentDispositionType = "inline" | "attachment";

/**
 * Builds a `Content-Disposition` header value per RFC 6266 / RFC 5987 for a
 * file download or inline preview response.
 *
 *   - `filename="..."`      : ASCII-only quoted-string fallback for clients
 *                             that ignore `filename*`. The name is NFKD-
 *                             normalized, non-ASCII bytes are replaced with
 *                             `_`, and `"` / `\` are backslash-escaped so the
 *                             quoted string stays well-formed. It must NOT be
 *                             percent-encoded — legacy clients would otherwise
 *                             save literal `%20` sequences in the file name.
 *   - `filename*=UTF-8''...`: percent-encoded UTF-8 form preferred by modern
 *                             clients; preserves accents and non-ASCII chars.
 *                             `!'()*` are encoded too, since `encodeURIComponent`
 *                             leaves them untouched but RFC 5987 reserves them.
 */
export function buildContentDisposition(
  type: ContentDispositionType,
  originalName: string
): string {
  const asciiFallback = originalName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[\\"]/g, "\\$&");

  const encoded = encodeURIComponent(originalName).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
