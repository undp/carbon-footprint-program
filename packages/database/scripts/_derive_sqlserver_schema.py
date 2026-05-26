#!/usr/bin/env python3
"""One-off helper (PR 4) to apply @db.Text to the PostgreSQL schema and derive
the SQL Server schema from it. Mechanical transforms only; views/CHECK/indexes
are handled in raw-SQL migrations separately. Kept in scripts/ for reproducibility.
"""
import re
import sys
from pathlib import Path

PG = Path("packages/database/src/prisma/postgresql/schema.prisma")
MSSQL = Path("packages/database/src/prisma/sqlserver/schema.prisma")

# (model, field) pairs that must carry @db.Text (free-text -> nvarchar(max) on MSSQL).
TEXT_FIELDS = {
    "CountryParameter": ["value", "description"],
    "SystemParameter": ["value", "description"],
    "CountryOrganizationSize": ["description"],
    "CountrySector": ["description"],
    "CountrySubsector": ["description"],
    "OrganizationMainActivity": ["description"],
    "MethodologyVersion": ["description", "regulation"],
    "Explanation": ["description", "content"],
    "Category": ["synonyms", "description"],
    "Subcategory": ["description"],
    "EmissionFactor": ["source"],
    "CarbonInventoryLineInput": ["manualFactorSource", "comment"],
    "CarbonInventoryLineFactor": ["appliedFactorSource"],
    "OrganizationData": ["address"],
    "ReductionProject": ["description", "reportedElsewhereDescription"],
    "Submission": ["reviewComments"],
    "ReductionPlanInitiative": ["description"],
}

ENUMS = [
    "CountryOrganizationSizeStatus", "CountrySectorStatus", "CountrySubsectorStatus",
    "OrganizationMainActivityStatus", "SystemRole", "OrganizationRole", "MembershipStatus",
    "SubcategoryStatus", "EmissionFactorDimensionStatus", "EmissionFactorDimensionValueStatus",
    "MagnitudeStatus", "MeasurementUnitStatus", "MethodologyVersionStatus", "CategoryStatus",
    "SubcategoryRecommendationStatus", "EmissionFactorStatus", "InventoryStatus", "UsageMode",
    "CarbonInventoryLineStatus", "InputType", "OrganizationSummaryDisplayStatus",
    "OrganizationStatus", "OrganizationDataStatus", "SubmissionFileType", "FileStatus",
    "ReductionProjectStatus", "SubmissionStatus", "SubmissionType", "BadgeType", "BadgeStatus",
    "ReductionPlanInitiativeStatus",
]


def split_blocks(text):
    """Yield (kind, name, header_line_idx, start_idx, end_idx) for model/enum/view blocks."""
    lines = text.splitlines(keepends=True)
    blocks = []
    i = 0
    depth = 0
    cur = None
    for idx, line in enumerate(lines):
        m = re.match(r"^(model|enum|view|type)\s+(\w+)\s*\{", line)
        if m and depth == 0:
            cur = [m.group(1), m.group(2), idx]
            depth = 1
            continue
        if cur:
            depth += line.count("{") - line.count("}")
            if depth <= 0:
                blocks.append((cur[0], cur[1], cur[2], idx))
                cur = None
    return lines, blocks


def apply_db_text(text):
    lines, blocks = split_blocks(text)
    # Map model name -> (start_line, end_line)
    for kind, name, start, end in blocks:
        if name not in TEXT_FIELDS:
            continue
        targets = set(TEXT_FIELDS[name])
        for li in range(start + 1, end):
            line = lines[li]
            fm = re.match(r"^(\s+)([A-Za-z_]\w*)(\s+)(\S+)(.*)$", line.rstrip("\n"))
            if not fm:
                continue
            field = fm.group(2)
            if field not in targets:
                continue
            if "@db.Text" in line:
                continue
            # Append @db.Text at end of the field line (before newline).
            lines[li] = line.rstrip("\n") + " @db.Text\n"
    return "".join(lines)


def derive_mssql(pg_text):
    text = pg_text
    # 1. Header: provider + generator output (single shared client dir, per ADR).
    text = text.replace('provider = "postgresql"', 'provider = "sqlserver"')
    # 2. Remove enum blocks entirely.
    lines, blocks = split_blocks(text)
    drop = set()
    for kind, name, start, end in blocks:
        if kind == "enum":
            for li in range(start, end + 1):
                drop.add(li)
    lines = [l for i, l in enumerate(lines) if i not in drop]
    text = "".join(lines)
    # 3. Enum-typed fields -> String (type position: indent + fieldName + spaces + EnumName).
    for e in ENUMS:
        text = re.sub(rf"(^\s+\w+\s+){e}\b", r"\1String", text, flags=re.MULTILINE)
    # 4. Enum-member defaults -> quoted string defaults: @default(ACTIVE) -> @default("ACTIVE").
    text = re.sub(r'@default\(([A-Z][A-Z0-9_]*)\)', r'@default("\1")', text)
    # 5. UUID native type.
    text = text.replace("@db.Uuid", "@db.UniqueIdentifier")
    # 6. Collapse 3+ blank lines left by enum removal.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def main():
    pg = PG.read_text()
    pg2 = apply_db_text(pg)
    PG.write_text(pg2)
    mssql = derive_mssql(pg2)
    MSSQL.write_text(mssql)
    # Report
    added = pg2.count("@db.Text") - pg.count("@db.Text")
    print(f"PG @db.Text annotations now: {pg2.count('@db.Text')} (+{added})")
    print(f"MSSQL enum blocks remaining: {len(re.findall(r'^enum ', mssql, re.M))}")
    print(f"MSSQL @db.UniqueIdentifier: {mssql.count('@db.UniqueIdentifier')}, @db.Uuid left: {mssql.count('@db.Uuid')}")
    print(f"MSSQL String-quoted defaults: {len(re.findall(chr(64)+'default\\(\"[A-Z]', mssql))}")


if __name__ == "__main__":
    main()
