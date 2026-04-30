import { orderBy } from "lodash-es";

const STATUS_RANK: Record<string, number> = {
  ACTIVE: 0,
  DELETED: 1,
};

const statusRank = (status: string): number => STATUS_RANK[status] ?? 99;

export const sortByStatusThenName = <
  T extends { status: string | null; name: string },
>(
  rows: T[]
): T[] =>
  orderBy(
    rows,
    [(r) => statusRank(r.status ?? ""), (r) => r.name.toLocaleLowerCase()],
    ["asc", "asc"]
  );

export const sortByStatusThenPosition = <
  T extends { status: string | null; position: number },
>(
  rows: T[]
): T[] =>
  orderBy(
    rows,
    [(r) => statusRank(r.status ?? ""), (r) => r.position],
    ["asc", "asc"]
  );
