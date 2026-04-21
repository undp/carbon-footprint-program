/**
 * Promotes a single user to SUPERADMIN by email.
 *
 * Usage:
 *   pnpm db:promote-superadmin <email>
 *   pnpm db:promote-superadmin          # falls back to SUPERADMIN_EMAIL env var
 *
 * Intended for local development and initial deployment setup only.
 * Run against a production database with care.
 */
import { generatePrismaAdapter, PrismaClient, SystemRole } from "../index.js";

const email = (process.argv[2] ?? process.env.SUPERADMIN_EMAIL)?.trim();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

if (!email) {
  console.error(
    "Error: provide an email address as the first argument or set SUPERADMIN_EMAIL."
  );
  process.exit(1);
}

const adapter = generatePrismaAdapter(databaseUrl);
const prisma = new PrismaClient({ adapter });

try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: SystemRole.SUPERADMIN },
    select: { id: true, email: true, role: true },
  });
  console.log(`Promoted ${user.email} (id: ${user.id}) to ${user.role}.`);
} catch (err: unknown) {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2025"
  ) {
    console.error(`Error: no user found with email "${email}".`);
    process.exit(1);
  }
  throw err;
} finally {
  await prisma.$disconnect();
}
