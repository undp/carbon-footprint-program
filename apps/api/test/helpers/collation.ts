/**
 * Sort strings the way the database does, for "is this endpoint ordered?" tests.
 *
 * These tests used to compare a Postgres `ORDER BY name` result against a bare
 * `[...names].sort()`, which orders by UTF-16 code unit — i.e. byte order. That
 * only agreed with the database while the test container was Alpine-based
 * (musl, effectively C collation). It never matched production: the Azure
 * Flexible Server database is created with `collation: 'es_ES.UTF8'` (see
 * infra/modules/postgres.bicep), so Postgres applies glibc *linguistic*
 * collation there — accents and case are weighted, not compared bytewise.
 *
 * The chatbot corpus needs pgvector, and pgvector publishes no Alpine image for
 * pg18, so the test container is now Debian/glibc — which matches production and
 * exposed the mismatch.
 *
 * The collator is deliberately primary-strength (`sensitivity: "base"`, punctuation
 * ignored): glibc and ICU agree on letter order but not on how they tie-break
 * accents, case, and punctuation, and pinning either would just re-create the
 * same brittleness in the other direction. Because the comparator returns 0 for
 * such near-equal strings and `Array.sort` is stable, sorting the database's own
 * output leaves those pairs where the database put them. The assertion therefore
 * reduces to what these tests actually care about — the endpoint returns rows in
 * non-decreasing name order rather than arbitrary order — while staying immune to
 * collation-implementation detail.
 */
const spanishCollator = new Intl.Collator("es", {
  sensitivity: "base",
  ignorePunctuation: true,
});

export const sortedByDbCollation = (values: readonly string[]): string[] =>
  [...values].sort((a, b) => spanishCollator.compare(a, b));
