# Deployment de Infraestructura Azure con Bicep

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Estructura del Directorio `infra/`](#estructura-del-directorio-infra)
- [Requisitos Previos](#requisitos-previos)
- [Configuración Inicial](#configuración-inicial)
- [Proceso de Deployment](#proceso-de-deployment)
  - [Azure Deployment Stacks](#azure-deployment-stacks)
  - [Gestión del Deployment Stack](#gestión-del-deployment-stack)
- [Gestión de Secretos](#gestión-de-secretos)
- [Parámetros de Configuración](#parámetros-de-configuración)
- [Troubleshooting](#troubleshooting)

---

## Descripción General

Este proyecto utiliza **Azure Bicep** como lenguaje de Infrastructure as Code (IaC) para desplegar y gestionar recursos en Azure de manera declarativa, versionada y reproducible.

### ¿Por qué Bicep?

- **Sintaxis simplificada**: Más legible que ARM templates JSON
- **Modularidad**: Permite dividir infraestructura en componentes reutilizables
- **Type-safety**: Validación en tiempo de compilación
- **Integración nativa**: Compilación directa a ARM templates
- **Gestión de dependencias**: Resolución automática de dependencias entre recursos

### Gestión de Recursos por Ambiente

El comportamiento de eliminación de recursos varía según el ambiente:

#### 🔒 **Production / Staging** (`ENVIRONMENT=production|staging`)

- **Modo**: `detachAll`
- **Comportamiento**: Los recursos removidos del template **NO se eliminan automáticamente**
- **Ventaja**: Máxima seguridad, previene eliminación accidental
- **Limpieza**: Requiere eliminación manual de recursos no deseados

#### 🧹 **Development** (`ENVIRONMENT=development` o cualquier otro valor custom en minúsculas)

- **Modo**: `deleteResources`
- **Comportamiento**: Los recursos removidos del template **SE ELIMINAN AUTOMÁTICAMENTE**
- **Ventaja**: Ambiente limpio, ideal para experimentación
- **Precaución**: ⚠️ Destructivo - solo usar en entornos de desarrollo

**Ejemplo**:

```bash
# Desarrollo - limpieza automática
export ENVIRONMENT='development'  # DEBE estar en minúsculas
./deploy.sh  # Recursos no declarados serán eliminados

# Producción - modo seguro
export ENVIRONMENT='production'  # DEBE estar en minúsculas
./deploy.sh  # Recursos no declarados se preservan
```

**⚠️ IMPORTANTE**: Todos los valores de `ENVIRONMENT` deben estar en **minúsculas**. Los scripts rechazarán valores con letras mayúsculas como `Production`, `STAGING`, o `Development`.

---

## Arquitectura de Resource Groups y Stacks

Cada entorno tiene su propio Resource Group con todos los recursos necesarios:

### Resource Groups

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Suscripción Azure                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────┐                           │
│  │ undp-huella-latam-matias-rg         │  ← Recursos de Matías     │
│  │ ├── Key Vault, Storage, Postgres    │                           │
│  │ ├── Static Web App, App Service     │                           │
│  │ ├── Azure Container Registry (ACR)  │                           │
│  │ └── Stack: undp-huella-latam-stack-matias                       │
│  └─────────────────────────────────────┘                           │
│                                                                     │
│  ┌─────────────────────────────────────┐                           │
│  │ undp-huella-latam-luis-rg           │  ← Recursos de Luis       │
│  │ ├── Key Vault, Storage, Postgres    │                           │
│  │ ├── Static Web App, App Service     │                           │
│  │ ├── Azure Container Registry (ACR)  │                           │
│  │ └── Stack: undp-huella-latam-stack-luis                         │
│  └─────────────────────────────────────┘                           │
│                                                                     │
│  ┌─────────────────────────────────────┐                           │
│  │ undp-huella-latam-production-rg     │  ← Recursos de Producción │
│  │ ├── Key Vault, Storage, Postgres    │                           │
│  │ ├── Static Web App, App Service     │                           │
│  │ ├── Front Door                      │                           │
│  │ ├── Azure Container Registry (ACR)  │                           │
│  │ └── Stack: undp-huella-latam-stack-production                   │
│  └─────────────────────────────────────┘                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Convención de Nombres de ENVIRONMENT

| ENVIRONMENT  | Tipo       | Stack Name                           | Resource Group                    |
| ------------ | ---------- | ------------------------------------ | --------------------------------- |
| `matias`     | Desarrollo | `undp-huella-latam-stack-matias`     | `undp-huella-latam-matias-rg`     |
| `luis`       | Desarrollo | `undp-huella-latam-stack-luis`       | `undp-huella-latam-luis-rg`       |
| `staging`    | Staging    | `undp-huella-latam-stack-staging`    | `undp-huella-latam-staging-rg`    |
| `production` | Producción | `undp-huella-latam-stack-production` | `undp-huella-latam-production-rg` |

### Stack y ACR

- Cada entorno tiene su propio ACR dentro de su Resource Group.
- El ACR se crea automáticamente como parte del stack principal (`main.bicep`).
- `deploy-api.sh` obtiene la información del ACR desde los outputs del stack del entorno (`undp-huella-latam-stack-$ENVIRONMENT`).
- La conexión entre el App Service y el ACR se gestiona mediante identidad administrada con el rol `AcrPull` asignado automáticamente.

---

## Estructura del Directorio `infra/`

```plaintext
infra/
├── deploy.sh                     # Script principal de deployment (Deployment Stacks)
├── deploy-api.sh                # Script para desplegar la API (Docker → ACR → App Service)
├── deploy-web.sh                # Script para desplegar el frontend (Static Web App)
├── delete-stack.sh              # Script para eliminar Deployment Stacks
├── view-stack.sh                # Script para inspeccionar Deployment Stacks
├── main.bicep                    # Orquestador principal (todos los recursos)
├── modules/                      # Módulos reutilizables
│   ├── keyVault.bicep           # Azure Key Vault + secretos
│   ├── postgres.bicep           # PostgreSQL Flexible Server
│   ├── storage.bicep            # Azure Storage Account
│   ├── acr.bicep                # Azure Container Registry
│   ├── appService.bicep         # Azure App Service (API)
│   ├── staticWebApp.bicep       # Azure Static Web App (frontend)
│   ├── frontDoor.bicep          # Azure Front Door (CDN + WAF)
│   └── acrRoleAssignment.bicep  # Role assignment para ACR pull
└── params/                       # Archivos de parámetros por entorno
    └── main.development.bicepparam      # Parámetros para desarrollo
```

### Descripción de Componentes

#### `deploy.sh`

**Propósito**: Script principal de deployment que utiliza Azure Deployment Stacks.

**Responsabilidades**:

- Validación de Azure CLI login y suscripción
- Carga de variables de entorno desde `.envrc`
- Generación automática de contraseñas seguras (primera ejecución)
- Gestión de secretos en Key Vault
- Configuración dinámica de `--action-on-unmanage` según ambiente:
  - **Production/Staging**: `detachAll` (preserva recursos)
  - **Development**: `deleteResources` (elimina automáticamente)
- Despliegue del Deployment Stack con parámetros
- Manejo de errores y logging detallado

**Características de seguridad**:

- ⚠️ Advertencia visual en modo `deleteResources`
- Reutilización de contraseñas existentes en Key Vault
- Modo dry-run para simulación sin cambios
- Validación de variables requeridas

#### `main.bicep`

**Propósito**: Archivo principal de orquestación que coordina el despliegue de todos los módulos.

**Responsabilidades**:

- Define parámetros generales (location, SKUs, configuración de base de datos)
- Invoca módulos individuales con sus parámetros específicos
- Gestiona dependencias implícitas entre recursos
- Obtiene secretos del Key Vault para configurar PostgreSQL
- Expone outputs para conexión y referencia externa

**Flujo de ejecución**:

1. Crea Key Vault y almacena contraseña de BD
2. Crea Storage Account en paralelo
3. Obtiene secreto del Key Vault
4. Crea PostgreSQL Flexible Server usando el secreto

#### `modules/keyVault.bicep`

**Propósito**: Gestiona Azure Key Vault para almacenamiento seguro de secretos.

**Características**:

- Habilita `enabledForTemplateDeployment` para permitir a ARM leer secretos durante deployments
- Usa **RBAC (Role-Based Access Control)** en lugar de Access Policies (método moderno y recomendado)
- Asigna automáticamente el rol "Key Vault Secrets Officer" a un grupo de Azure AD especificado
- Soft delete habilitado con retención de 90 días
- **Creación condicional de secreto**: Solo crea/actualiza el secreto si `dbPassword != ''`
  - Preserva secretos existentes cuando se pasa contraseña vacía
  - La contraseña se genera automáticamente una sola vez
- Network ACLs configuradas para permitir servicios de Azure

**Role Assignment**:

- Crea automáticamente un `Microsoft.Authorization/roleAssignments` para el grupo de Azure AD
- Rol asignado: "Key Vault Secrets Officer" (ID: `b86a8fe4-44ce-4948-aee5-eccb2c155cd7`)
- Solo se crea si se proporciona `devGroupObjectId`

**Outputs**:

- `name`: Nombre del Key Vault (generado con `uniqueString`)
- `id`: Resource ID completo
- `vaultUri`: URI del vault para operaciones
- `postgresSecretName`: Nombre del secreto de PostgreSQL

#### `modules/postgres.bicep`

**Propósito**: Despliega Azure Database for PostgreSQL Flexible Server.

**Configuración**:

- **Versión**: PostgreSQL 18 ⚠️ **Mínimo requerido: PostgreSQL 15**
  - El proyecto utiliza la sintaxis `NULLS NOT DISTINCT` en las migraciones de base de datos
  - Esta sintaxis fue introducida en PostgreSQL 15
  - **No desplegar en PostgreSQL 14 o anterior** - las migraciones fallarán
  - Versiones compatibles: 15, 16, 17, 18
- **Alta disponibilidad**: Deshabilitada (para dev)
- **Zona de disponibilidad**: Sin zona explícita por defecto (Azure selecciona automáticamente)
  - Configurable mediante el parámetro `availabilityZone` en `params/main.development.bicepparam`
  - Valores posibles: `'1'`, `'2'`, `'3'`, o `''` (vacío = sin zona específica)
  - ⚠️ No todas las regiones soportan zonas de disponibilidad
- **Database**: Crea una base de datos con charset UTF8 y collation `es_ES.UTF8`
- **Contraseña**: Recibida como parámetro seguro desde `main.bicep`
- **Firewall**: Configurable mediante el parámetro `allowedIpRanges`

**Outputs**:

- `serverNameOut`: Nombre del servidor
- `serverIdOut`: Resource ID
- `dbNameOut`: Nombre de la base de datos creada
- `hostOut`: FQDN para conexión (`.postgres.database.azure.com`)

#### `modules/storage.bicep`

**Propósito**: Crea Azure Storage Account para almacenamiento de archivos/blobs.

**Configuración**:

- Kind: `StorageV2` (propósito general v2)
- **Acceso público anónimo**: Deshabilitado (`allowBlobPublicAccess: false`)
- **Network ACLs**: Firewall por defecto en `Deny` con bypass para `AzureServices`
- **Acceso restringido**: Solo servicios de Azure pueden acceder por defecto
- SupportsHttpsTrafficOnly: true
- MinimumTlsVersion: TLS 1.2

**Seguridad**:

- ✅ Sin acceso público anónimo a blobs
- ✅ Firewall restrictivo por defecto
- ✅ Solo servicios de Azure confiables pueden acceder
- ✅ Para acceso desde IPs específicas, configura `networkAclDefaultAction` y añade reglas de IP en el módulo

#### `params/main.development.bicepparam`

**Propósito**: Archivo de parámetros para el entorno de desarrollo.

**Contenido**:

```bicep-params
using '../main.bicep'

// Storage Account
param storageSkuName = 'Standard_LRS'  // Locally-redundant storage

// Key Vault
param keyVaultSkuName = 'standard'

// Database
param dbUser = 'pgadmin'
param dbName = 'huella_latam'
param dbSkuName = 'Standard_B1ms'      // 1 vCore, 2 GB RAM
param dbSkuTier = 'Burstable'          // Tier más económico
param dbStorageSizeGB = 32             // Mínimo permitido
param dbBackupRetentionDays = 7        // Mínimo permitido
param dbGeoRedundantBackup = 'Disabled'
param dbPassword = ''                   // Sobrescrito por deploy.sh
```

**Nota**: `dbPassword` se deja vacío intencionalmente porque es generado dinámicamente por `deploy.sh`.

---

### Control de Acceso con RBAC

**Enfoque Moderno**: Este proyecto usa **RBAC (Role-Based Access Control)** para gestionar permisos de Key Vault en lugar del método legacy de Access Policies.

**Ventajas de RBAC**:

- ✅ No requiere Object IDs explícitos en código
- ✅ Integración nativa con Azure AD
- ✅ Control de acceso más granular
- ✅ Método recomendado por Microsoft
- ✅ Gestión declarativa de permisos en Bicep

**Configuración Automática**:

1. `deploy.sh` obtiene el Object ID del grupo de Azure AD especificado en `$AZURE_SUBSCRIPTION_GROUP`
2. Este Object ID se pasa al deployment de Bicep como parámetro `devGroupObjectId`
3. El módulo `keyVault.bicep` crea automáticamente un role assignment
4. Todos los miembros del grupo obtienen permisos de "Key Vault Secrets Officer"

**Permisos Incluidos** (Key Vault Secrets Officer):

- Get (leer secretos)
- List (listar secretos)
- Set (crear/actualizar secretos)
- Delete (eliminar secretos)
- Backup/Restore (respaldo y restauración)
- Purge (purgar secretos eliminados)

### Gestión de Secretos

**Principio de Seguridad**: La contraseña nunca se expone en logs ni en el historial de deployments.

**Flujo de Primera Ejecución**:

1. **Verificación**: `deploy.sh` verifica si existe el secreto `postgres-admin-password` en Key Vault
2. **Generación**: Como no existe, genera una contraseña aleatoria usando `openssl rand -hex 32`
3. **Paso a Bicep**: La contraseña se pasa como parámetro `@secure()` a `main.bicep`
4. **Almacenamiento**: El módulo `keyVault` crea el secreto en Key Vault
5. **Recuperación**: `main.bicep` usa `existingKeyVault.getSecret()` para obtener el valor
6. **Uso**: Se pasa al módulo `postgres` como parámetro seguro

**Flujo de Ejecuciones Posteriores**:

1. **Verificación**: `deploy.sh` detecta que el secreto ya existe en Key Vault
2. **Preservación**: Pasa `dbPassword=""` (vacío) a Bicep
3. **Sin cambios**: El módulo `keyVault` no actualiza el secreto (condición `if (dbPassword != '')`)
4. **Recuperación**: PostgreSQL continúa usando la contraseña original del secreto

**Ventajas de este enfoque**:

- ✅ Password no está hardcodeada en archivos
- ✅ Password no aparece en logs de deployment
- ✅ Password se genera automáticamente una sola vez
- ✅ Password queda almacenada en Key Vault para uso futuro
- ✅ **Password no se sobrescribe en cada deployment** (preservación automática)
- ✅ ARM tiene permisos para leer durante deployment (`enabledForTemplateDeployment`)

---

## Requisitos Previos

### Software Necesario

1. **Azure CLI** (versión 2.59.0 o superior)

   ```bash
   az --version
   az upgrade  # Si necesitas actualizar
   ```

2. **Bicep CLI** (instalado automáticamente con Azure CLI)

   ```bash
   az bicep version
   az bicep upgrade  # Si necesitas actualizar
   ```

3. **OpenSSL** (para generación de passwords)

   ```bash
   openssl version
   ```

### Permisos de Azure

Tu cuenta de Azure necesita los siguientes permisos en la suscripción:

- **Contributor** o superior en el Resource Group
- Permisos para crear recursos:
  - Key Vault
  - Storage Account
  - PostgreSQL Flexible Server

### Verificar Login

```bash
az login
az account show
az account set --subscription "<tu-subscription-id>"
```

---

## Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.envrc` o `.env` en el directorio **`infra/`**:

```bash
# infra/.envrc
export ENVIRONMENT="development"  # Nombre del ambiente (debe estar en minúsculas). Puede ser production, staging, development o cualquier otro valor custom

export AZURE_SUBSCRIPTION_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export AZURE_RESOURCE_GROUP="undp-huella-latam-$ENVIRONMENT-rg"
export AZURE_SUBSCRIPTION_GROUP="Devs-Contributors"  # Grupo de Azure AD con acceso a Key Vault

# Location 'eastus' is not available for subscriptions with free trial.
export LOCATION="eastus2"

# Opcional: dominio público para el frontend. Bicep lo ata a Front Door cuando enableFrontDoor=true,
# o directo al Static Web App en caso contrario.
export FRONTEND_CUSTOM_DOMAIN=""  # Ejemplo: "app.huellalatam.org"
```

**⚠️ IMPORTANTE**: `ENVIRONMENT` debe estar en **minúsculas** (lowercase). Los scripts validarán y rechazarán valores con letras mayúsculas.

Ejemplos válidos: `production`, `staging`, `development`, `dev`, `test`
Ejemplos inválidos: `Production`, `STAGING`, `Development`

#### Variables de Entorno Disponibles

| Variable                   | Requerida | Descripción                                                                                                                  | Ejemplo                                | Usado Por                    |
| -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------- |
| `AZURE_SUBSCRIPTION_ID`    | ✅ Sí     | ID de tu suscripción de Azure                                                                                                | `00000000-0000-0000-0000-000000000000` | `deploy.sh`                  |
| `AZURE_RESOURCE_GROUP`     | ✅ Sí     | Nombre del Resource Group donde se desplegarán los recursos                                                                  | `rg-huella-dev-example`                | `deploy.sh`, `deploy-web.sh` |
| `AZURE_SUBSCRIPTION_GROUP` | ✅ Sí     | Nombre del grupo de Azure AD con acceso a Key Vault                                                                          | `Devs-Contributors`                    | `deploy.sh`                  |
| `ENVIRONMENT`              | ✅ Sí     | Nombre del ambiente para deployment y tagging de recursos (usado en nombre de Resource Group). **DEBE estar en minúsculas**  | `development`                          | `deploy.sh`                  |
| `LOCATION`                 | ✅ Sí     | Región de Azure donde se desplegarán los recursos                                                                            | `eastus2`                              | `deploy.sh`                  |
| `FRONTEND_CUSTOM_DOMAIN`   | ❌ No     | Dominio público del frontend. Bicep lo ata a Front Door cuando `enableFrontDoor=true`, o al Static Web App en caso contrario | `app.huellalatam.org`                  | `deploy.sh`                  |

**Notas**:

- **`ENVIRONMENT`**: **DEBE estar en minúsculas**. Se usa para crear nombres únicos de Resource Groups, para taggear todos los recursos y define qué archivo de parámetros usar (`params/main.{ENVIRONMENT}.bicepparam`)
- **`AZURE_SUBSCRIPTION_GROUP`**: Debe ser un grupo existente en Azure AD. Los miembros obtendrán rol "Key Vault Secrets Officer"
- **`LOCATION`**: Algunas regiones no están disponibles en suscripciones gratuitas. Usa `eastus2` si `eastus` no funciona
- **`FRONTEND_CUSTOM_DOMAIN`**: Dominio público del frontend. Independiente de Front Door — bicep lo ata al recurso correcto según `enableFrontDoor`. Se propaga a App Service CORS, Fastify `ALLOWED_ORIGIN` y Blob Storage CORS.

#### Cómo se Usan las Variables

**En `deploy.sh`**:

- Lee todas las variables de entorno del archivo `.envrc`
- Genera contraseña de base de datos automáticamente si no existe
- Obtiene el Object ID del grupo de Azure AD especificado en `AZURE_SUBSCRIPTION_GROUP`
- Pasa valores a Bicep como parámetros: `dbPassword`, `devGroupObjectId`, `environment`, `frontendCustomDomain`

**En `deploy-web.sh`**:

- Lee `AZURE_RESOURCE_GROUP` para buscar el deployment stack
- Resuelve `VITE_API_BASE_URL` automáticamente desde los outputs del stack (o usa el valor si ya está definido)
- Obtiene el deployment token de Azure Static Web Apps
- Construye la aplicación web con `pnpm build` (usando `VITE_API_BASE_URL` en el build)
- Usa el token para desplegar la aplicación web

**Nota**: Para más detalles sobre `VITE_API_BASE_URL` y su configuración, consulta la sección "Variables de Entorno" en [`docs/infrastructure/StaticWebAppDeployment.md`](./StaticWebAppDeployment.md#variables-de-entorno).

**En Bicep**:

- Parámetros como `environment` y `frontendCustomDomain` se pasan desde el script
- `dbPassword` se genera automáticamente solo en la primera ejecución
- Los valores se usan para configurar recursos (tags, dominios personalizados, etc.)

**Importante**:

- Todos los comandos a continuación asumen que estás en el directorio raíz del proyecto. Puedes ejecutar scripts con `./infra/deploy.sh` o navegar al directorio infra con `cd infra && ./deploy.sh`.
- Asegúrate de que `infra/.envrc` esté en `.gitignore` para no commitear credenciales
- Si usas direnv, ejecuta `cd infra && direnv allow` para cargar automáticamente las variables

### 2. Hacer Ejecutable el Script

```bash
chmod +x infra/deploy.sh
```

### 3. Validar Parámetros

Revisa y ajusta `infra/params/main.development.bicepparam` según tus necesidades (desde el directorio raíz del proyecto):

- **Storage**: `Standard_LRS` es la opción más económica
- **Key Vault**: `standard` es suficiente para la mayoría de casos
- **PostgreSQL**:
  - `Standard_B1ms` (Burstable)
  - `dbStorageSizeGB: 32` es el mínimo permitido
  - `dbBackupRetentionDays: 7` es el mínimo permitido

---

## Proceso de Deployment

### Azure Deployment Stacks

Este proyecto utiliza **Azure Deployment Stacks** en lugar de deployments estándar. Los Deployment Stacks ofrecen ventajas significativas:

**Ventajas**:

- ✅ **Gestión como unidad atómica**: Todos los recursos se gestionan juntos
- ✅ **Protección contra eliminación**: Previene eliminación accidental de recursos críticos
- ✅ **Limpieza automática**: Puede eliminar recursos que ya no están en el template
- ✅ **Drift detection**: Detecta cambios manuales en recursos
- ✅ **Versionado**: Mantiene historial de cambios
- ✅ **Rollback**: Facilita volver a versiones anteriores

**Configuración del Stack**:

- **Nombre**: `undp-huella-latam-stack-{environment}`
- **Deny Settings**: `none` (sin restricciones, ideal para desarrollo)
- **Action on Unmanage**: `detachAll` (preserva recursos si se eliminan del template)

### Deployment Completo

```bash
cd infra
./deploy.sh
```

El script creará o actualizará el Deployment Stack automáticamente.

### Modo Dry Run (Simulación)

Para validar la configuración sin hacer cambios reales:

```bash
cd infra
DRY_RUN=true ./deploy.sh
```

**Características del Dry Run**:

- ✅ Valida variables de entorno y configuración
- ✅ Muestra qué comandos se ejecutarían
- ✅ Verifica permisos y recursos existentes
- ✅ No crea ni modifica recursos
- ✅ Útil para debugging y validación

**Cuándo usar Dry Run**:

- Primera vez que configuras el proyecto
- Antes de hacer cambios importantes
- Para validar nuevos parámetros
- Troubleshooting de problemas de configuración

### Pasos Ejecutados por el Script

1. **Verificación de login en Azure CLI**
2. **Carga de variables de entorno** desde `infra/.env` o `infra/.envrc`
3. **Validación de variables requeridas**:
   - `AZURE_SUBSCRIPTION_ID`
   - `AZURE_RESOURCE_GROUP`
   - `AZURE_SUBSCRIPTION_GROUP` (nombre del grupo de Azure AD)
   - `ENVIRONMENT` (nombre del ambiente para deployment y tagging de recursos)
   - `LOCATION` (región de Azure)
4. **Selección de suscripción**
5. **Creación de Resource Group** (si no existe)
6. **Obtención del Object ID del grupo de Azure AD** para permisos de Key Vault
7. **Verificación de secreto existente** en Key Vault
   - Si existe `postgres-admin-password`: No genera nueva contraseña (preserva la existente)
   - Si no existe: Genera nueva contraseña con `openssl rand -hex 32`
8. **Creación/actualización del Deployment Stack**:

   ```bash
   az stack group create \
     --name "undp-huella-latam-stack-$ENVIRONMENT" \
     --resource-group "$AZURE_RESOURCE_GROUP" \
     --template-file "main.bicep" \
     --parameters "$ENVIRONMENT_PARAMS_FILE" \
     --parameters dbPassword="$DB_PASSWORD" \
     --parameters devGroupObjectId="$DEVS_GROUP_ID" \
     --parameters environment="$ENVIRONMENT" \
     --deny-settings-mode "none" \
     --action-on-unmanage "detachAll" \
     --yes \
     --verbose
   ```

### Gestión del Deployment Stack

**Ver información del stack**:

```bash
cd infra
./view-stack.sh
```

Muestra:

- Información general del stack
- Lista de recursos gestionados
- Outputs del deployment

**Eliminar el stack**:

```bash
cd infra
./delete-stack.sh
```

El script ofrece tres opciones interactivas:

1. **deleteAll**: Elimina el stack y TODOS los recursos gestionados
2. **detachAll**: Elimina el stack pero PRESERVA todos los recursos
3. **deleteResources**: Elimina recursos pero preserva Resource Groups

**Ver cambios antes de aplicar (What-If)**:

```bash
cd infra
az stack group create \
  --name "undp-huella-latam-stack-dev" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --template-file "main.bicep" \
  --parameters "params/main.development.bicepparam" \
  --what-if
```

### Validar Sintaxis sin Deploy

```bash
az bicep build --file infra/main.bicep
# O desde el directorio infra/
cd infra && az bicep build --file main.bicep
```

---

## Flujo de Gestión de Secretos

### Obtener Contraseña desde Key Vault

Después del deployment, puedes obtener la contraseña de PostgreSQL:

```bash
# 1. Obtener nombre del Key Vault
KEY_VAULT_NAME=$(az keyvault list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "[0].name" -o tsv)

# 2. Obtener contraseña
DB_PASSWORD=$(az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name "postgres-admin-password" \
  --query "value" -o tsv)

echo "Database password: $DB_PASSWORD"
```

### Rotar Contraseña

Para rotar la contraseña de PostgreSQL:

```bash
# 1. Obtener nombre del Key Vault
KEY_VAULT_NAME=$(az keyvault list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "[0].name" -o tsv)

# 2. Generar nueva contraseña
NEW_PASSWORD=$(openssl rand -hex 32)

# 3. Actualizar secreto en Key Vault
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "postgres-admin-password" \
  --value "$NEW_PASSWORD"

# 4. Actualizar contraseña en PostgreSQL
POSTGRES_NAME=$(az postgres flexible-server list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "[0].name" -o tsv)

az postgres flexible-server update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$POSTGRES_NAME" \
  --admin-password "$NEW_PASSWORD"
```

**Importante**:

- La contraseña se preserva automáticamente entre deployments
- No necesitas regenerar la contraseña en cada deployment
- Para cambiarla, debes actualizar tanto Key Vault como PostgreSQL manualmente

---

## Parámetros de Configuración

### Storage Account SKUs

| SKU              | Redundancia       | Costo | Uso Recomendado    |
| ---------------- | ----------------- | ----- | ------------------ |
| `Standard_LRS`   | Local             | Bajo  | Dev/Testing        |
| `Standard_GRS`   | Geográfica        | Medio | Producción básica  |
| `Standard_RAGRS` | Geo + Read Access | Alto  | Producción crítica |
| `Premium_LRS`    | Local (SSD)       | Alto  | Alta performance   |

### PostgreSQL SKUs (Burstable Tier)

| SKU             | vCores | RAM  | Costo Aprox/Mes | Uso              |
| --------------- | ------ | ---- | --------------- | ---------------- |
| `Standard_B1ms` | 1      | 2 GB | $12-15          | Dev/Testing      |
| `Standard_B2s`  | 2      | 4 GB | $25-30          | Staging          |
| `Standard_B2ms` | 2      | 8 GB | $50-60          | Small Production |

**Nota**: Para producción se recomienda usar tiers `GeneralPurpose` o `MemoryOptimized`.

### Storage Size (PostgreSQL)

- **Mínimo**: 32 GB
- **Máximo**: 16,384 GB (16 TB)
- **Incrementos**: Burstable tier usa potencias de 2 (32, 64, 128, 256...)

### Zonas de Disponibilidad (PostgreSQL)

**Configuración actual**: Sin zona explícita (Azure selecciona automáticamente)

**Para especificar una zona**, edita `infra/params/main.development.bicepparam`:

```bicep
// Sin zona específica (default, Azure selecciona)
param availabilityZone = ''

// O especificar una zona (1, 2, o 3)
param availabilityZone = '1'
```

**Importante**:

- ⚠️ No todas las regiones de Azure soportan zonas de disponibilidad
- Regiones con zonas: East US, West Europe, Southeast Asia, etc.
- Regiones sin zonas: Central India, Brazil South (algunas), etc.
- Si especificas una zona no disponible en tu región, el deployment fallará

**Verificar zonas disponibles**:

```bash
az postgres flexible-server list-skus \
  --location "$LOCATION" \
  --query "[?name=='$SKU_NAME'].supportedAvailabilityZones" -o tsv
```

---

## Troubleshooting

### Error: "KeyVaultParameterReferenceSecretRetrieveFailed"

**Causa**: ARM no tiene permisos para leer secretos del Key Vault.

**Solución**: Asegúrate de que `enabledForTemplateDeployment: true` esté configurado en `modules/keyVault.bicep`.

### Error: "Access denied" al listar secretos del Key Vault

**Causa**: Tu usuario no pertenece al grupo de Azure AD especificado o el role assignment no se creó correctamente.

**Solución**:

```bash
# Verificar si perteneces al grupo
az ad group member check \
  --group "$AZURE_SUBSCRIPTION_GROUP" \
  --member-id $(az ad signed-in-user show --query id -o tsv)

# Si no perteneces, pide a un administrador que te agregue
az ad group member add \
  --group "$AZURE_SUBSCRIPTION_GROUP" \
  --member-id $(az ad signed-in-user show --query id -o tsv)

# O asignar el rol directamente a tu usuario
KEY_VAULT_ID=$(az keyvault list --resource-group "$AZURE_RESOURCE_GROUP" --query "[0].id" -o tsv)
az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --scope "$KEY_VAULT_ID"
```

### Error: "Group not found" durante deployment

**Causa**: El grupo especificado en `$AZURE_SUBSCRIPTION_GROUP` no existe en Azure AD.

**Solución**:

```bash
# Verificar que el grupo existe
az ad group show --group "$AZURE_SUBSCRIPTION_GROUP"

# Listar grupos disponibles
az ad group list --query "[].displayName" -o tsv

# Crear el grupo si no existe (requiere permisos de administrador)
az ad group create --display-name "Devs-Contributors" --mail-nickname "devs-contributors"
```

### Error: "Storage size must be at least 32 GB"

**Causa**: PostgreSQL Flexible Server requiere mínimo 32 GB de storage.

**Solución**: Actualiza `dbStorageSizeGB` en `params/main.development.bicepparam` a `32` o más.

### Error: "Resource Group does not exist"

**Causa**: El Resource Group no existe y el script no pudo crearlo.

**Solución**: Verifica permisos y crea manualmente:

```bash
az group create \
  --name "$AZURE_RESOURCE_GROUP" \
  --location "eastus"
```

### Error: "Subscription not found"

**Causa**: La suscripción especificada no existe o no tienes acceso.

**Solución**:

```bash
az account list --output table
az account set --subscription "<correct-subscription-id>"
```

### Error: "Deployment timed out"

**Causa**: Deployment de PostgreSQL puede tardar 5-15 minutos.

**Solución**: El script usa `--verbose` para mostrar progreso. Espera o aumenta timeout:

```bash
# Añadir al comando az deployment
--no-wait  # Para deployment asíncrono
```

### Error: "Operation could not be completed as it results in exceeding approved quota"

**Causa**: La suscripción de Azure no tiene suficiente cuota para el tipo de VM del App Service Plan (`appServiceSkuName`) en la región seleccionada (`LOCATION`). Azure impone límites por tipo de VM y por región.

**Solución**: Solicitar un aumento de cuota de vCPUs para el tipo de VM del App Service Plan en el portal de Azure:

1. Ir a **Azure Portal → Suscripciones → \<tu suscripción\> → Usage + quotas**.
2. Filtrar por `App Service` y por la región de despliegue (ej.: `eastus2`).
3. Localizar la familia de vCPUs correspondiente al SKU configurado en `appServiceSkuName` dentro de `params/main.<environment>.bicepparam` (ej.: `P1v3` usa la familia `Ddsv5`, `B1` usa `BS`).
4. Hacer clic en **Request increase** e indicar la cantidad de vCores necesarios.

Una vez aprobado el aumento (puede tardar minutos u horas según el tipo de instancia), volver a ejecutar `./deploy.sh`.

### Verificar Estado de Deployment

```bash
az deployment group list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --output table

# Ver detalles de deployment fallido
az deployment group show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "postgresDeployment" \
  --query "properties.error"
```

---

## Limpieza de Recursos

### Eliminar Todo el Resource Group

```bash
az group delete \
  --name "$AZURE_RESOURCE_GROUP" \
  --yes \
  --no-wait
```

### Eliminar Solo PostgreSQL

```bash
POSTGRES_NAME=$(az postgres flexible-server list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "[0].name" -o tsv)

az postgres flexible-server delete \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$POSTGRES_NAME" \
  --yes
```

## Referencias

- [Documentación oficial de Bicep](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure PostgreSQL Flexible Server](https://learn.microsoft.com/azure/postgresql/flexible-server/)
- [Azure Key Vault](https://learn.microsoft.com/azure/key-vault/)
- [Bicep Modules](https://learn.microsoft.com/azure/azure-resource-manager/bicep/modules)
