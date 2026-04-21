# Ejecución de Migraciones de Base de Datos

Este documento explica cómo ejecutar las migraciones de Prisma contra la base de datos PostgreSQL en Azure.

## Requisitos Previos

### Versión de PostgreSQL

> ⚠️ **IMPORTANTE**: Este proyecto requiere **PostgreSQL 15 o superior** debido al uso de la sintaxis `NULLS NOT DISTINCT` en las migraciones de base de datos.

**Versión actual en uso**: PostgreSQL 18

**Razón técnica**: La migración `20251215191534_create_organization_main_acitivty_unique_constraint` utiliza la sintaxis `NULLS NOT DISTINCT` para índices únicos, que fue introducida en PostgreSQL 15. Esta sintaxis permite que múltiples valores NULL sean tratados como iguales en una restricción de unicidad.

**Impacto**:

- ✅ PostgreSQL 15, 16, 17, 18: Compatibles
- ❌ PostgreSQL 14 o anterior: Las migraciones **fallarán** con un error de sintaxis

Si intentas ejecutar migraciones en PostgreSQL 14 o anterior, verás un error similar a:

```
ERROR: syntax error at or near "NULLS"
```

### Infraestructura Desplegada

PostgreSQL Flexible Server debe estar desplegado y funcionando. Si aún no lo has hecho, ejecuta primero `./deploy.sh` desde el directorio `infra/`.

### Configurar IP en Firewall del PostgreSQL

Para permitir que tu máquina local se conecte a la base de datos, necesitas agregar tu IP actual a las reglas de firewall del servidor PostgreSQL:

1. **Ingresar al Resource Group**
   - En Azure Portal, navega a tu Resource Group

2. **Ingresar al Azure Database for PostgreSQL Flexible Server**
   - Dentro del Resource Group, busca y selecciona el recurso de tipo "Azure Database for PostgreSQL flexible server"

3. **Acceder a la sección Networking**
   - En el menú lateral del servidor PostgreSQL, busca y haz clic en la opción **"Networking"** (Redes)

4. **Agregar IP actual**
   - En la página de Networking, busca el botón **"Add current client IP address"** (Agregar IP de cliente actual)
   - Haz clic en este botón para agregar automáticamente tu IP actual a las reglas de firewall

5. **Guardar cambios**
   - Haz clic en el botón **"Save"** (Guardar) para aplicar los cambios
   - Espera a que se confirme que la regla se agregó correctamente

> Nota: debes repetir estos pasos cada vez que trabajes desde una red distinta o cuando elimines y vuelvas a desplegar el servidor PostgreSQL Flexible Server, ya que las reglas anteriores dejan de ser válidas.

## Funcionamiento del Script `run-migrations.sh`

El script `infra/run-migrations.sh` automatiza la ejecución de migraciones de Prisma contra la base de datos PostgreSQL en Azure. Realiza los siguientes pasos:

1. **Autenticación**: Verifica que estés autenticado en Azure CLI. Si no lo estás, te solicitará iniciar sesión.

2. **Carga de configuración**: Lee las variables de entorno necesarias desde `infra/.envrc` o el archivo `.env` correspondiente, incluyendo:
   - `AZURE_RESOURCE_GROUP`: El nombre del grupo de recursos donde está desplegada la infraestructura
   - `ENVIRONMENT`: El entorno (development, staging, production)

3. **Obtención de información de la base de datos**:
   - Recupera el host, nombre de base de datos y usuario desde el Deployment Stack de Azure
   - Obtiene la contraseña de la base de datos desde Azure Key Vault de forma segura

4. **Construcción de DATABASE_URL**: Genera la cadena de conexión PostgreSQL con SSL requerido (`sslmode=require`)

5. **Prueba de conexión**: Verifica la conectividad a la base de datos (si `psql` está disponible en tu sistema)

6. **Validación de versión de PostgreSQL**: 🆕 Ejecuta automáticamente `pnpm validate:version` para verificar que la base de datos sea PostgreSQL 15 o superior. Si la versión es incompatible, el script se detiene con un mensaje de error detallado.

7. **Ejecución de migraciones**: Ejecuta `pnpm prod:deploy` en el directorio `packages/database`, que aplica todas las migraciones pendientes usando `prisma migrate deploy`

### Uso

```bash
cd infra
./run-migrations.sh
```

Para ejecutar en modo dry-run (simulación sin cambios):

```bash
DRY_RUN=true ./run-migrations.sh
```
