import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Estado global del contenedor de prueba
let container: StartedPostgreSqlContainer | null = null;
let databaseUrl: string | null = null;

/**
 * Configuración de la base de datos de prueba
 */
const TEST_DATABASE_CONFIG = {
  image: "postgres:18-alpine",
  database: "testdb",
  username: "testuser",
  password: "testpass",
} as const;

/**
 * Obtiene la ruta al directorio del paquete de base de datos.
 * Esta función es cross-platform y maneja correctamente las rutas en Windows, Linux y macOS.
 */
function getDatabasePackagePath(): string {
  // Desde apps/api/src/test/setup/testcontainers.ts
  // hasta packages/database
  return path.resolve(__dirname, "../../../../../packages/database");
}

/**
 * Ejecuta las migraciones de Prisma en la base de datos de prueba.
 * Usa pnpm para ejecutar Prisma de forma cross-platform.
 *
 * @param databaseUrl - URL de conexión a la base de datos
 * @throws Error si las migraciones fallan
 */
function runPrismaMigrations(databaseUrl: string): void {
  const databasePackagePath = getDatabasePackagePath();

  // Usar pnpm exec para ejecutar Prisma de forma cross-platform
  // pnpm maneja automáticamente los binarios en Windows (.cmd), Linux y macOS
  const command = "pnpm exec prisma migrate deploy";
  const options = {
    cwd: databasePackagePath,
    stdio: "inherit" as const,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  };

  try {
    execSync(command, options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error al ejecutar migraciones de Prisma: ${errorMessage}`);
  }
}

/**
 * Configura una base de datos de prueba usando TestContainers.
 * Crea un contenedor PostgreSQL aislado para cada suite de pruebas.
 *
 * @returns Objeto con la URL de la base de datos y la instancia del contenedor
 * @throws Error si no se puede iniciar el contenedor o ejecutar las migraciones
 *
 * @example
 * ```typescript
 * const { databaseUrl, container } = await setupTestDatabase();
 * ```
 */
export async function setupTestDatabase() {
  // Si ya está configurado, retornar la instancia existente
  if (container && databaseUrl) {
    return { databaseUrl, container };
  }

  try {
    // Iniciar contenedor PostgreSQL
    container = await new PostgreSqlContainer(TEST_DATABASE_CONFIG.image)
      .withDatabase(TEST_DATABASE_CONFIG.database)
      .withUsername(TEST_DATABASE_CONFIG.username)
      .withPassword(TEST_DATABASE_CONFIG.password)
      .start();

    databaseUrl = container.getConnectionUri();

    // Ejecutar migraciones de Prisma
    // Esto aplica todas las migraciones existentes a la base de datos de prueba
    runPrismaMigrations(databaseUrl);

    return { databaseUrl, container };
  } catch (error) {
    // Limpiar el contenedor si algo falla
    if (container) {
      await container.stop().catch(() => {
        // Ignorar errores al detener el contenedor durante el cleanup
      });
      container = null;
      databaseUrl = null;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Error al configurar la base de datos de prueba: ${errorMessage}`
    );
  }
}

/**
 * Limpia y detiene el contenedor de la base de datos de prueba.
 * Debe ser llamado en hooks afterAll para liberar recursos.
 *
 * @example
 * ```typescript
 * afterAll(async () => {
 *   await teardownTestDatabase();
 * });
 * ```
 */
export async function teardownTestDatabase(): Promise<void> {
  if (container) {
    try {
      await container.stop();
    } catch {
      // Ignorar errores al detener el contenedor durante el cleanup
      // No es crítico si falla, solo necesitamos limpiar el estado
    } finally {
      container = null;
      databaseUrl = null;
    }
  }
}

/**
 * Obtiene la URL de la base de datos de prueba si el contenedor está corriendo.
 * Útil para obtener la URL en pruebas sin re-ejecutar el setup.
 *
 * @returns URL de la base de datos o null si no está configurada
 *
 * @example
 * ```typescript
 * const url = getTestDatabaseUrl();
 * if (url) {
 *   // Usar la URL
 * }
 * ```
 */
export function getTestDatabaseUrl(): string | null {
  return databaseUrl;
}
