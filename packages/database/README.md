# @repo/database

Paquete de base de datos para el proyecto Huella Latam utilizando Prisma ORM con PostgreSQL.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Configuración Inicial](#configuración-inicial)
- [Base de Datos para Pruebas](#base-de-datos-para-pruebas)
- [Uso de Prisma](#uso-de-prisma)
- [Scripts Disponibles](#scripts-disponibles)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Estructura del Proyecto](#estructura-del-proyecto)

## 🔧 Requisitos Previos

- Node.js (versión 24 o superior)
- Docker y Docker Compose
- pnpm

**Tecnologías Utilizadas:**

- Prisma ORM 7.0.1
- PostgreSQL 18
- @prisma/adapter-pg para conexiones optimizadas

> ⚠️ **Requisito de PostgreSQL**: Este proyecto requiere **PostgreSQL 15 o superior** debido al uso de la sintaxis `NULLS NOT DISTINCT` en las migraciones de base de datos. La versión actual recomendada es PostgreSQL 18. Si intentas desplegar en PostgreSQL 14 o anterior, las migraciones fallarán.

## 🚀 Configuración Inicial

### 1. Instalar Dependencias

```bash
pnpm install
```

### 2. Configurar Variables de Entorno

Configura la variable de entorno `DATABASE_URL` en tu shell o en el archivo `.envrc` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testdb?schema=public"
```

Esta URL de conexión corresponde a la base de datos para pruebas configurada en `docker-compose.yml`.

> **Nota**: El paquete valida automáticamente que `DATABASE_URL` esté definida a través del archivo `environment.ts`.

### 3. Iniciar la Base de Datos

⚠️ **Importante**: Antes de ejecutar comandos de Prisma que interactúan con la base de datos (como migraciones), debes tener la base de datos corriendo.

## 🐳 Base de Datos para Pruebas

Este paquete incluye una configuración de Docker Compose para ejecutar una base de datos PostgreSQL 18 (Alpine) de desarrollo local para pruebas.

### Iniciar la Base de Datos

⚠️ **Requisito previo**: La base de datos debe estar corriendo antes de ejecutar comandos como `dev:migrate`, `dev:reset` o `dev:studio`.

```bash
docker compose up -d
```

Esto iniciará un contenedor PostgreSQL con las siguientes credenciales:

- **Usuario**: `testuser`
- **Contraseña**: `testpass`
- **Base de datos**: `testdb`
- **Puerto**: `5432`

### Detener la Base de Datos

```bash
docker compose down
```

Para detener y eliminar los volúmenes (⚠️ esto eliminará todos los datos):

```bash
docker compose down -v
```

### Verificar que la Base de Datos Está Corriendo

```bash
docker ps
```

Deberías ver un contenedor llamado `undp-postgres` en ejecución.

## 📦 Uso de Prisma

⚠️ **Requisito previo**: Asegúrate de que la base de datos esté corriendo (`docker compose up -d`) antes de ejecutar comandos que interactúan con la base de datos.

### 1. Generar el Cliente de Prisma

Después de hacer cambios en el schema, genera el cliente de Prisma:

```bash
pnpm run dev:generate
```

Este comando lee el archivo `prisma/schema.prisma` y genera el cliente TypeScript tipado en `generated/client/`.

> **Nota**: Este comando NO requiere que la base de datos esté corriendo, solo genera el cliente desde el schema.

> **Configuración**: La URL de conexión a la base de datos se gestiona a través de `prisma.config.ts` usando la variable de entorno `DATABASE_URL` definida en `environment.ts`.

### 2. Crear y Aplicar Migraciones

⚠️ **Requiere base de datos corriendo**: Este comando necesita que la base de datos esté activa.

Para crear una nueva migración basada en los cambios del schema:

```bash
pnpm run dev:migrate
```

Este comando:

- Crea una nueva migración en `prisma/migrations/`
- Aplica la migración a la base de datos
- Regenera el cliente de Prisma

### 3. Resetear la Base de Datos

⚠️ **Requiere base de datos corriendo**: Este comando necesita que la base de datos esté activa.

⚠️ **Cuidado**: Esto eliminará todos los datos y volverá a aplicar todas las migraciones.

```bash
pnpm run dev:reset
```

### 4. Abrir Prisma Studio

⚠️ **Requiere base de datos corriendo**: Este comando necesita que la base de datos esté activa.

Prisma Studio es una interfaz visual para explorar y editar datos:

```bash
pnpm run dev:studio
```

Esto abrirá una interfaz web en `http://localhost:5555` donde podrás ver y editar los datos de tu base de datos.

### 5. Aplicar Migraciones en Producción

⚠️ **Requiere base de datos corriendo**: Este comando necesita que la base de datos esté activa.

Para aplicar migraciones en un entorno de producción sin reiniciar la base de datos:

```bash
pnpm run prod:deploy
```

Este comando aplica todas las migraciones pendientes sin crear nuevas migraciones ni resetear la base de datos.

## 🔌 Adaptador PostgreSQL

Este paquete utiliza `@prisma/adapter-pg` para proporcionar conexión optimizada a PostgreSQL. El adaptador está configurado en `adapter.ts` y se exporta para ser usado en tu aplicación:

```typescript
import { PrismaClient, adapter } from "@repo/database";

const prisma = new PrismaClient({ adapter });
```

El adaptador se inicializa automáticamente con la variable de entorno `DATABASE_URL` y proporciona:

- Connection pooling optimizado
- Mejor rendimiento en entornos serverless
- Gestión eficiente de conexiones

## 🗄️ Soporte multi-base de datos (PostgreSQL + SQL Server)

Este paquete soporta **dos proveedores de base de datos**, seleccionados en
tiempo de build/deploy mediante la variable de entorno `DB_PROVIDER`
(`postgresql` por defecto, o `sqlserver`). Ver
[ADR 0001](../../docs/architecture/adrs/0001-multi-database-support.md).

> ⚠️ El esquema de SQL Server y sus migraciones se incorporan en una PR
> posterior (`feat/mati/sqlserver-schema-and-views`). En este punto la carpeta
> `src/prisma/sqlserver/` existe pero está vacía; los comandos `:mssql` aún no
> funcionan.

### Cómo funciona

- **Dos schemas**, uno por proveedor, bajo
  `src/prisma/postgresql/schema.prisma` y `src/prisma/sqlserver/schema.prisma`.
  Los modelos se mantienen idénticos; solo difieren `datasource.provider`, los
  tipos nativos (`@db.Uuid` vs `@db.UniqueIdentifier`, `@db.Text`) y el `output`
  del generador.
- **Un único directorio de cliente generado** (`src/generated/prisma`). Solo se
  genera el cliente del proveedor activo, según qué `prisma.config.*.ts` se use.
  Por eso `index.ts` y todos los imports de la app no cambian: el código nunca se
  ramifica por proveedor.
- **Un único selector de adaptador** (`adapter.ts`) devuelve `PrismaPg` o
  `PrismaMssql` según `DB_PROVIDER`.

### Configuración del proveedor

```env
# PostgreSQL (por defecto)
DB_PROVIDER="postgresql"
DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testdb?schema=public"

# SQL Server (la cadena usa formato JDBC, distinto al de PostgreSQL)
DB_PROVIDER="sqlserver"
DATABASE_URL="sqlserver://localhost:1433;database=huella;user=sa;password=...;encrypt=true;trustServerCertificate=true"
```

> Si `DB_PROVIDER` está ausente, se asume `postgresql` (retrocompatibilidad). Un
> valor inválido lanza un error claro al cargar `environment.ts`.

### Scripts por proveedor

Cada comando de Prisma tiene una variante `:pg` y `:mssql`
(`dev:generate:pg` / `dev:generate:mssql`, `dev:migrate:pg` / `dev:migrate:mssql`,
`dev:seed:pg` / `dev:seed:mssql`, `prod:deploy:pg` / `prod:deploy:mssql`). Los
alias sin sufijo (`dev:generate`, `dev:migrate`, `dev:seed`, `prod:deploy`)
apuntan a la variante `:pg`.

## 📝 Scripts Disponibles

| Script             | Descripción                                             | Requiere BD |
| ------------------ | ------------------------------------------------------- | ----------- |
| `dev:generate`     | Genera el cliente de Prisma desde el schema             | ❌ No       |
| `dev:migrate`      | Crea y aplica una nueva migración                       | ✅ Sí       |
| `dev:studio`       | Abre Prisma Studio para gestión visual                  | ✅ Sí       |
| `dev:reset`        | Resetea la base de datos y aplica todas las migraciones | ✅ Sí       |
| `prod:deploy`      | Aplica migraciones en producción sin reiniciar          | ✅ Sí       |
| `validate:version` | Valida que PostgreSQL sea versión 15 o superior         | ✅ Sí       |

### Validación de Versión de PostgreSQL

Este paquete incluye un script de validación que verifica que la base de datos esté ejecutando PostgreSQL 15 o superior, requisito necesario para las migraciones que usan la sintaxis `NULLS NOT DISTINCT`.

**Uso manual:**

```bash
pnpm run validate:version
```

El script:

- ✅ Verifica la versión de PostgreSQL conectándose a la base de datos
- ✅ Valida que sea versión 15 o superior
- ✅ Proporciona mensajes de error detallados si la versión es incompatible
- ✅ Se ejecuta automáticamente antes de aplicar migraciones en producción (vía `infra/run-migrations.sh`)

**Variables de entorno requeridas:**

- `DATABASE_URL`: URL de conexión a PostgreSQL

**Ejemplo de salida exitosa:**

```
🔍 Validating PostgreSQL version...

📊 Database Information:
   Raw version: PostgreSQL 18.1 on x86_64-pc-linux-musl...
   PostgreSQL version: 18.1
   Major version: 18

✅ PostgreSQL version check PASSED
   PostgreSQL 18.1 is compatible (>= 15.0)
```

**Ejemplo de error:**

```
❌ INCOMPATIBLE PostgreSQL VERSION DETECTED!

   Current version: PostgreSQL 14.5
   Minimum required: PostgreSQL 15.0

⚠️  REASON:
   This project uses the NULLS NOT DISTINCT syntax in database migrations,
   which was introduced in PostgreSQL 15.

📋 SOLUTION:
   - Upgrade your PostgreSQL server to version 15 or higher
   - Recommended versions: 15, 16, 17, or 18
```

## 💻 Ejemplos de Uso

### Importar el Cliente de Prisma

```typescript
import { PrismaClient, adapter } from "@repo/database";

// Crear una instancia del cliente Prisma
const prisma = new PrismaClient({ adapter });

// O importar tipos específicos (los modelos en el schema usan lowercase)
import type { user, book } from "@repo/database";
```

### Ejemplo: Crear un Usuario

```typescript
const newUser = await prisma.user.create({
  data: {
    email: "usuario@example.com",
    name: "Juan Pérez",
  },
});
```

### Ejemplo: Buscar Usuarios

```typescript
// Buscar todos los usuarios
const users = await prisma.user.findMany();

// Buscar un usuario por email
const user = await prisma.user.findUnique({
  where: {
    email: "usuario@example.com",
  },
});
```

### Ejemplo: Crear un Libro

```typescript
const newBook = await prisma.book.create({
  data: {
    title: "El Quijote",
    author: "Miguel de Cervantes",
  },
});
```

### Ejemplo: Consultas Relacionadas

```typescript
// Buscar libros con filtros
const books = await prisma.book.findMany({
  where: {
    author: {
      contains: "Cervantes",
    },
  },
  orderBy: {
    createdAt: "desc",
  },
});
```

### Ejemplo: Actualizar Datos

```typescript
const updatedUser = await prisma.user.update({
  where: {
    id: 1,
  },
  data: {
    name: "Juan Carlos Pérez",
  },
});
```

### Ejemplo: Eliminar Datos

```typescript
await prisma.user.delete({
  where: {
    id: 1,
  },
});
```

## 📁 Estructura del Proyecto

```
packages/database/
├── src/
│   ├── prisma/
│   │   ├── postgresql/
│   │   │   ├── migrations/        # Migraciones PostgreSQL
│   │   │   └── schema.prisma      # Schema PostgreSQL
│   │   ├── sqlserver/             # Schema + migraciones SQL Server (vacío hasta PR 4)
│   │   └── seeds/                 # Seeds compartidos (provider-agnósticos)
│   ├── generated/
│   │   └── prisma/                # Cliente generado del proveedor activo
│   ├── adapter.ts                 # Selector de adaptador (PrismaPg | PrismaMssql)
│   ├── environment.ts             # Variables de entorno + validación de DB_PROVIDER
│   └── index.ts                   # Exportaciones del paquete
├── prisma.config.pg.ts            # Configuración de Prisma (PostgreSQL)
├── prisma.config.mssql.ts         # Configuración de Prisma (SQL Server)
├── docker-compose.yml             # Configuración de PostgreSQL
├── package.json
└── README.md                      # Este archivo
```

## 🔍 Modelos Actuales

El schema actual incluye los siguientes modelos:

### user

- `id`: Int (auto-incremental, clave primaria)
- `email`: String (único)
- `name`: String (requerido)
- `createdAt`: DateTime (automático)
- `updatedAt`: DateTime (automático)

### book

- `id`: Int (auto-incremental, clave primaria)
- `title`: String (único)
- `author`: String
- `createdAt`: DateTime (automático)
- `updatedAt`: DateTime (automático)
