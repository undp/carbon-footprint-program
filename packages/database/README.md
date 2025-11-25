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

## 🚀 Configuración Inicial

### 1. Instalar Dependencias

```bash
pnpm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del paquete `database` con la siguiente configuración:

```env
DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testdb?schema=public"
```

Esta URL de conexión corresponde a la base de datos para pruebas configurada en `docker-compose.yml`.

### 3. Iniciar la Base de Datos

⚠️ **Importante**: Antes de ejecutar comandos de Prisma que interactúan con la base de datos (como migraciones), debes tener la base de datos corriendo.

## 🐳 Base de Datos para Pruebas

Este paquete incluye una configuración de Docker Compose para ejecutar una base de datos PostgreSQL de desarrollo local para pruebas.

### Iniciar la Base de Datos

⚠️ **Requisito previo**: La base de datos debe estar corriendo antes de ejecutar comandos como `dev:migrate`, `dev:reset` o `dev:studio`.

```bash
docker-compose up -d
```

Esto iniciará un contenedor PostgreSQL con las siguientes credenciales:

- **Usuario**: `testuser`
- **Contraseña**: `testpass`
- **Base de datos**: `testdb`
- **Puerto**: `5432`

### Detener la Base de Datos

```bash
docker-compose down
```

Para detener y eliminar los volúmenes (⚠️ esto eliminará todos los datos):

```bash
docker-compose down -v
```

### Verificar que la Base de Datos Está Corriendo

```bash
docker ps
```

Deberías ver un contenedor llamado `undp-postgres` en ejecución.

## 📦 Uso de Prisma

⚠️ **Requisito previo**: Asegúrate de que la base de datos esté corriendo (`docker-compose up -d`) antes de ejecutar comandos que interactúan con la base de datos.

### 1. Generar el Cliente de Prisma

Después de hacer cambios en el schema, genera el cliente de Prisma:

```bash
pnpm run dev:generate
```

Este comando lee el archivo `prisma/schema.prisma` y genera el cliente TypeScript tipado en `generated/client/`.

> **Nota**: Este comando NO requiere que la base de datos esté corriendo, solo genera el cliente desde el schema.

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

## 📝 Scripts Disponibles

| Script         | Descripción                                             | Requiere BD |
| -------------- | ------------------------------------------------------- | ----------- |
| `dev:generate` | Genera el cliente de Prisma desde el schema             | ❌ No       |
| `dev:migrate`  | Crea y aplica una nueva migración                       | ✅ Sí       |
| `dev:studio`   | Abre Prisma Studio para gestión visual                  | ✅ Sí       |
| `dev:reset`    | Resetea la base de datos y aplica todas las migraciones | ✅ Sí       |

## 💻 Ejemplos de Uso

### Importar el Cliente de Prisma

```typescript
import { prisma } from "@repo/database";

// O importar tipos específicos
import { User, Book } from "@repo/database";
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
├── prisma/
│   └── schema.prisma          # Schema de Prisma con los modelos
├── generated/
│   └── client/                # Cliente generado de Prisma
├── src/                       # Código fuente (si aplica)
├── client.ts                  # Configuración del cliente Prisma
├── index.ts                   # Exportaciones del paquete
├── prisma.config.ts           # Configuración de Prisma
├── docker-compose.yml         # Configuración de PostgreSQL
├── package.json
└── README.md                  # Este archivo
```

## 🔍 Modelos Actuales

El schema actual incluye los siguientes modelos:

### User

- `id`: Int (auto-incremental, clave primaria)
- `email`: String (único)
- `name`: String (opcional)

### Book

- `id`: Int (auto-incremental, clave primaria)
- `title`: String
- `author`: String
- `createdAt`: DateTime (automático)
- `updatedAt`: DateTime (automático)
