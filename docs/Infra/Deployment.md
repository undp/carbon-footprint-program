# Deployment de Infraestructura Azure con Bicep

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Estructura del Directorio `infra/`](#estructura-del-directorio-infra)
- [Arquitectura de la Solución](#arquitectura-de-la-solución)
- [Requisitos Previos](#requisitos-previos)
- [Configuración Inicial](#configuración-inicial)
- [Proceso de Deployment](#proceso-de-deployment)
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

---

## Estructura del Directorio `infra/`

```
infra/
├── main.bicep                    # Orquestador principal
├── modules/                      # Módulos reutilizables
│   ├── keyVault.bicep           # Azure Key Vault + secretos
│   ├── postgres.bicep           # PostgreSQL Flexible Server
│   └── storage.bicep            # Azure Storage Account
└── params/                       # Archivos de parámetros por entorno
    └── main.dev.bicepparam      # Parámetros para desarrollo
```

### Descripción de Componentes

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
  - Permite rotación controlada mediante `DB_PASSWORD_OVERRIDE`
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

- **Versión**: PostgreSQL 18
- **Alta disponibilidad**: Deshabilitada (para dev)
- **Zona de disponibilidad**: 1
- **Database**: Crea una base de datos con charset UTF8 y collation `es_ES.UTF8`
- **Contraseña**: Recibida como parámetro seguro desde `main.bicep`

**Outputs**:

- `serverNameOut`: Nombre del servidor
- `serverIdOut`: Resource ID
- `dbNameOut`: Nombre de la base de datos creada
- `hostOut`: FQDN para conexión (`.postgres.database.azure.com`)

#### `modules/storage.bicep`

**Propósito**: Crea Azure Storage Account para almacenamiento de archivos/blobs.

**Configuración**:

- Kind: `StorageV2` (propósito general v2)
- Acceso: Públicamente accesible
- SupportsHttpsTrafficOnly: true
- MinimumTlsVersion: TLS 1.2

#### `params/main.dev.bicepparam`

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
param dbName = 'huella_latam_db'
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
2. **Generación**: Como no existe, genera una contraseña aleatoria usando `openssl rand -base64 18`
3. **Paso a Bicep**: La contraseña se pasa como parámetro `@secure()` a `main.bicep`
4. **Almacenamiento**: El módulo `keyVault` crea el secreto en Key Vault
5. **Recuperación**: `main.bicep` usa `existingKeyVault.getSecret()` para obtener el valor
6. **Uso**: Se pasa al módulo `postgres` como parámetro seguro

**Flujo de Ejecuciones Posteriores**:

1. **Verificación**: `deploy.sh` detecta que el secreto ya existe en Key Vault
2. **Preservación**: Pasa `dbPassword=""` (vacío) a Bicep
3. **Sin cambios**: El módulo `keyVault` no actualiza el secreto (condición `if (dbPassword != '')`)
4. **Recuperación**: PostgreSQL continúa usando la contraseña original del secreto

**Rotación Manual con Override**:

1. **Variable de entorno**: Definir `export DB_PASSWORD_OVERRIDE="nueva-contraseña"`
2. **Ejecución**: Ejecutar `./deploy.sh`
3. **Sobrescritura**: El secreto se actualiza con la nueva contraseña
4. **Actualización**: PostgreSQL recibe la nueva contraseña

**Ventajas de este enfoque**:

- ✅ Password no está hardcodeada en archivos
- ✅ Password no aparece en logs de deployment
- ✅ Password queda almacenada en Key Vault para uso futuro
- ✅ **Password no se sobrescribe en cada deployment** (preservación automática)
- ✅ Rotación controlada mediante variable de entorno
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

Crea un archivo `.env` o `.envrc` en la raíz del proyecto:

```bash
# .env
export AZURE_SUBSCRIPTION_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export AZURE_RESOURCE_GROUP="undp-huella-latam-rg"
export AZURE_SUBSCRIPTION_GROUP="Devs-Contributors"  # Grupo de Azure AD con acceso a Key Vault
export APP_ENV="dev"
export LOCATION="eastus"
# Opcional: Fuerza una contraseña en especifico
export DB_PASSWORD_OVERRIDE="miContraseA123"
```

**Importante**: Asegúrate de que `.env` esté en `.gitignore` para no commitear credenciales.

### 2. Hacer Ejecutable el Script

```bash
chmod +x deploy.sh
```

### 3. Validar Parámetros

Revisa y ajusta `infra/params/main.dev.bicepparam` según tus necesidades:

- **Storage**: `Standard_LRS` es la opción más económica
- **Key Vault**: `standard` es suficiente para la mayoría de casos
- **PostgreSQL**:
  - `Standard_B1ms` (Burstable)
  - `dbStorageSizeGB: 32` es el mínimo permitido
  - `dbBackupRetentionDays: 7` es el mínimo permitido

---

## Proceso de Deployment

### Deployment Completo

```bash
./deploy.sh
```

### Pasos Ejecutados por el Script

1. **Verificación de login en Azure CLI**
2. **Carga de variables de entorno** desde `.env` o `.envrc`
3. **Validación de variables requeridas**:
   - `AZURE_SUBSCRIPTION_ID`
   - `AZURE_RESOURCE_GROUP`
   - `AZURE_SUBSCRIPTION_GROUP` (nombre del grupo de Azure AD)
   - `APP_ENV` (default: "dev")
4. **Selección de suscripción**
5. **Creación de Resource Group** (si no existe)
6. **Obtención del Object ID del grupo de Azure AD** para permisos de Key Vault
7. **Verificación de secreto existente** en Key Vault
   - Si existe `postgres-admin-password`: No genera nueva contraseña (preserva la existente)
   - Si no existe: Genera nueva contraseña con `openssl rand -base64 18`
   - Si `DB_PASSWORD_OVERRIDE` está definido: Usa esa contraseña (sobrescribe)
8. **Ejecución del deployment de Bicep**:

   ```bash
   az deployment group create \
     --resource-group "$AZURE_RESOURCE_GROUP" \
     --template-file "infra/main.bicep" \
     --parameters "infra/params/main.$APP_ENV.bicepparam" \
     --parameters dbPassword="$DB_PASSWORD" \
     --parameters devGroupObjectId="$DEVS_GROUP_ID" \
     --verbose
   ```

### Deployment Dry-Run (What-If)

Para ver qué recursos se crearían sin ejecutar el deployment:

```bash
az deployment group what-if \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --template-file "infra/main.bicep" \
  --parameters "infra/params/main.dev.bicepparam" \
  --parameters dbPassword="dummy-password-for-testing"
```

### Validar Sintaxis sin Deploy

```bash
az bicep build --file infra/main.bicep
```

---

## Gestión de Secretos

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

**Opción 1: Usando DB_PASSWORD_OVERRIDE (Recomendado)**

```bash
# Generar y aplicar nueva contraseña en un solo paso
DB_PASSWORD_OVERRIDE=$(openssl rand -base64 18) ./deploy.sh

# O definir la contraseña manualmente
export DB_PASSWORD_OVERRIDE="mi-nueva-contraseña-segura"
./deploy.sh
```

**Opción 2: Actualización Manual en Key Vault**

```bash
# 1. Generar nueva contraseña
NEW_PASSWORD=$(openssl rand -base64 18)

# 2. Actualizar en Key Vault
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "postgres-admin-password" \
  --value "$NEW_PASSWORD"

# 3. Re-desplegar PostgreSQL con override para aplicar nueva contraseña
DB_PASSWORD_OVERRIDE=$(az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name "postgres-admin-password" \
  --query "value" -o tsv) ./deploy.sh
```

### Forzar Contraseña Específica

Si necesitas usar una contraseña específica (por ejemplo, para testing o migración):

```bash
# En .envrc (opcional, comentado por defecto)
# export DB_PASSWORD_OVERRIDE="tu-contraseña-especifica"

# O en línea de comando
DB_PASSWORD_OVERRIDE="mi-contraseña" ./deploy.sh
```

**Importante**: Una vez aplicada, la contraseña se preservará en futuros deployments a menos que vuelvas a usar `DB_PASSWORD_OVERRIDE`.

---

## Parámetros de Configuración

### Storage Account SKUs

| SKU | Redundancia | Costo | Uso Recomendado |
|-----|-------------|-------|-----------------|
| `Standard_LRS` | Local | Bajo | Dev/Testing |
| `Standard_GRS` | Geográfica | Medio | Producción básica |
| `Standard_RAGRS` | Geo + Read Access | Alto | Producción crítica |
| `Premium_LRS` | Local (SSD) | Alto | Alta performance |

### PostgreSQL SKUs (Burstable Tier)

| SKU | vCores | RAM | Costo Aprox/Mes | Uso |
|-----|--------|-----|-----------------|-----|
| `Standard_B1ms` | 1 | 2 GB | $12-15 | Dev/Testing |
| `Standard_B2s` | 2 | 4 GB | $25-30 | Staging |
| `Standard_B2ms` | 2 | 8 GB | $50-60 | Small Production |

**Nota**: Para producción se recomienda usar tiers `GeneralPurpose` o `MemoryOptimized`.

### Storage Size (PostgreSQL)

- **Mínimo**: 32 GB
- **Máximo**: 16,384 GB (16 TB)
- **Incrementos**: Burstable tier usa potencias de 2 (32, 64, 128, 256...)

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

**Solución**: Actualiza `dbStorageSizeGB` en `params/main.dev.bicepparam` a `32` o más.

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
---

## Referencias

- [Documentación oficial de Bicep](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure PostgreSQL Flexible Server](https://learn.microsoft.com/azure/postgresql/flexible-server/)
- [Azure Key Vault](https://learn.microsoft.com/azure/key-vault/)
- [Bicep Modules](https://learn.microsoft.com/azure/azure-resource-manager/bicep/modules)
