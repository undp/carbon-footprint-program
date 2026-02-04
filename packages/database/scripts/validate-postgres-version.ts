#!/usr/bin/env tsx

/**
 * PostgreSQL Version Validation Script
 *
 * This script validates that the database is running PostgreSQL 15 or higher,
 * which is required for the NULLS NOT DISTINCT syntax used in migrations.
 *
 * Usage:
 *   tsx scripts/validate-postgres-version.ts
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *
 * Exit Codes:
 *   0 - PostgreSQL version is compatible (15+)
 *   1 - PostgreSQL version is incompatible (<15) or validation failed
 */

import { PrismaClient } from "../src/generated/prisma/client.js";
import { generatePrismaAdapter } from "../src/adapter.js";

const MINIMUM_MAJOR_VERSION = 15;
const MINIMUM_FULL_VERSION = "15.0";

interface VersionInfo {
  version: string;
  majorVersion: number;
  fullVersion: string;
}

async function validatePostgresVersion(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not set");
    console.error(
      "   Please set DATABASE_URL to your PostgreSQL connection string"
    );
    process.exit(1);
  }

  console.log("🔍 Validating PostgreSQL version...\n");

  let prisma: PrismaClient | undefined;
  try {
    // Create Prisma client with adapter
    const adapter = generatePrismaAdapter(databaseUrl);
    prisma = new PrismaClient({ adapter });

    // Query PostgreSQL version using raw SQL
    const result = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version() as version
    `;
    const versionString = result[0]?.version;

    if (!versionString) {
      throw new Error("Unable to retrieve PostgreSQL version");
    }

    // Parse version information
    const versionInfo = parsePostgresVersion(versionString);

    // Display version information
    console.log(`📊 Database Information:`);
    console.log(`   Raw version: ${versionInfo.version}`);
    console.log(`   PostgreSQL version: ${versionInfo.fullVersion}`);
    console.log(`   Major version: ${versionInfo.majorVersion}\n`);

    // Validate minimum version requirement
    if (versionInfo.majorVersion < MINIMUM_MAJOR_VERSION) {
      console.error(`❌ INCOMPATIBLE PostgreSQL VERSION DETECTED!\n`);
      console.error(
        `   Current version: PostgreSQL ${versionInfo.fullVersion}`
      );
      console.error(
        `   Minimum required: PostgreSQL ${MINIMUM_FULL_VERSION}\n`
      );
      console.error(`⚠️  REASON:`);
      console.error(
        `   This project uses the NULLS NOT DISTINCT syntax in database migrations,`
      );
      console.error(`   which was introduced in PostgreSQL 15.`);
      console.error(
        `   Migration: 20251215191534_create_organization_main_acitivty_unique_constraint\n`
      );
      console.error(`📋 SOLUTION:`);
      console.error(
        `   - Upgrade your PostgreSQL server to version 15 or higher`
      );
      console.error(`   - Recommended versions: 15, 16, 17, or 18`);
      console.error(`   - Current project standard: PostgreSQL 18\n`);
      process.exit(1);
    }

    // Success
    console.log(`✅ PostgreSQL version check PASSED`);
    console.log(
      `   PostgreSQL ${versionInfo.fullVersion} is compatible (>= ${MINIMUM_FULL_VERSION})\n`
    );

    process.exit(0);
  } catch (error) {
    console.error(`❌ ERROR during PostgreSQL version validation:`);
    if (error instanceof Error) {
      console.error(`   ${error.message}\n`);

      // Provide helpful hints for common connection errors
      if (error.message.includes("ECONNREFUSED")) {
        console.error(`💡 Hint: Unable to connect to the database.`);
        console.error(`   - Check that PostgreSQL is running`);
        console.error(`   - Verify DATABASE_URL is correct`);
        console.error(`   - Ensure firewall rules allow the connection\n`);
      } else if (error.message.includes("ETIMEDOUT")) {
        console.error(`💡 Hint: Connection timed out.`);
        console.error(`   - Check network connectivity`);
        console.error(
          `   - Verify firewall rules in Azure Portal (if using Azure)`
        );
        console.error(`   - Ensure your IP is whitelisted\n`);
      } else if (error.message.includes("authentication failed")) {
        console.error(`💡 Hint: Authentication failed.`);
        console.error(`   - Verify username and password in DATABASE_URL`);
        console.error(`   - Check that the user has access to the database\n`);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    // Clean up the Prisma client connection
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

function parsePostgresVersion(versionString: string): VersionInfo {
  // PostgreSQL version string format: "PostgreSQL 18.1 on x86_64-pc-linux-musl, compiled by gcc..."
  const match = versionString.match(/PostgreSQL\s+(\d+)\.(\d+)/);

  if (!match) {
    throw new Error(
      `Unable to parse PostgreSQL version from: ${versionString}`
    );
  }

  const majorVersion = parseInt(match[1]!, 10);
  const minorVersion = parseInt(match[2]!, 10);
  const fullVersion = `${majorVersion}.${minorVersion}`;

  return {
    version: versionString,
    majorVersion,
    fullVersion,
  };
}

// Run the validation
void validatePostgresVersion();
