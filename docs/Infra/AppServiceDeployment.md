# Documentar Deployment de API

### 1. Requisitos Previos

#### Infraestructura Desplegada

- La infraestructura de Azure debe estar desplegada ejecutando `./deploy.sh` desde el directorio `infra/`
- El App Service debe existir y estar configurado

#### Herramientas Requeridas

- **Azure CLI**: Instalado y autenticado (`az login`)
- **Node.js**: Versión compatible (verificar con `node --version`)
- **pnpm**: Gestor de paquetes (`npm install -g pnpm`)
- **zip**: Herramienta para crear archivos ZIP
  - En Linux: generalmente preinstalado o `sudo apt-get install zip`
  - En macOS: generalmente preinstalado
  - En Windows: puede requerir instalación adicional o usar WSL

#### Variables de Entorno

- Archivo `infra/.envrc` debe existir con:
  - `AZURE_RESOURCE_GROUP`: Nombre del grupo de recursos
  - `ENVIRONMENT`: Entorno (development, staging, production)

### 2. Cómo Ejecutar el Script

#### Uso Básico

```bash
cd infra
./deploy-api.sh
```

#### Modo Dry-Run (Simulación)

```bash
DRY_RUN=true ./deploy-api.sh
```

### 3. Qué Hace el Script por Detrás

El script `infra/deploy-api.sh` realiza los siguientes pasos:

1. **Autenticación**: Verifica que estés autenticado en Azure CLI
2. **Carga de configuración**: Lee variables de entorno desde `infra/.envrc`
3. **Verificación de herramientas**: Comprueba que `az`, `pnpm` y `node` estén instalados
4. **Obtención del App Service**: Recupera el nombre del App Service desde el Deployment Stack de Azure
5. **Preparación del código fuente**: Verifica que el código fuente existe (el build se ejecutará en Azure)

6. **Creación del paquete ZIP**:
   - Crea un directorio temporal
   - Copia el código fuente TypeScript (`src/`) y archivos de configuración
   - Incluye archivos del monorepo necesarios:
     - `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc` del root
     - Paquete `packages/database` (requerido para el workspace)
     - Código fuente y configuración de `apps/api`
   - Crea un archivo ZIP con todos estos archivos

7. **Deployment al App Service**:
   - Sube el ZIP al App Service usando `az webapp deploy`
   - Azure ejecuta automáticamente `pnpm install` y `pnpm build` (gracias a `SCM_DO_BUILD_DURING_DEPLOYMENT: true`)
   - Las dependencias nativas (como Prisma) se compilan para la plataforma correcta de Azure
   - Limpia el directorio temporal

8. **Reinicio del App Service**: Reinicia el servicio para cargar el nuevo código
9. **Verificación**: Verifica que el deployment fue exitoso haciendo una petición HTTP al hostname

### 4. Consideraciones

#### Separación de Responsabilidades

- **`deploy.sh`**: Ejecutar cuando cambia la infraestructura (App Service, Key Vault, etc.)
- **`deploy-api.sh`**: Ejecutar cada vez que cambia el código de la API

#### Tiempo de Deployment

- Típicamente toma 3-5 minutos (más tiempo que antes debido al build en Azure)
- Incluye tiempo para instalar dependencias y compilar el código en Azure
- Depende del tamaño del código, número de dependencias y velocidad de red

#### Contenido del Paquete

- Incluye código fuente TypeScript completo (`src/`)
- Incluye archivos de configuración (`package.json`, `tsconfig.json`)
- Incluye archivos del monorepo necesarios (`pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`)
- Incluye paquetes del workspace (`packages/database`)
- **No incluye** `node_modules` ni `dist/` (se generan en Azure durante el deployment)
- Azure ejecuta `pnpm install` y `pnpm build` automáticamente, asegurando compatibilidad de binarios nativos

#### Reinicio del Servicio

- El App Service se reinicia automáticamente después del deployment
- Puede haber un breve período de downtime durante el reinicio

#### Variables de Entorno

- Las variables de entorno del App Service se configuran en `infra/modules/appService.bicep`
- Incluyen: `DATABASE_URL`, `NODE_ENV`, `PORT`, `ALLOWED_ORIGIN`, etc.
- No se modifican durante el deployment de código
