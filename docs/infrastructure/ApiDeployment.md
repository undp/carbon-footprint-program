## Despliegue de la API con `infra/deploy-api.sh`

### Requerimientos previos

- Docker instalado y en ejecución.
- Azure CLI instalada y autenticada (`az login`).
- Haber aprovisionado la infraestructura con `infra/deploy.sh` (crea el ACR y el App Service con permisos de AcrPull).
- Variables de entorno obligatorias cargadas:
  - `AZURE_SUBSCRIPTION_ID`
  - `AZURE_RESOURCE_GROUP`
  - `ENVIRONMENT` (ej.: `matias`, `luis`, `staging`, `production`)
- Variables opcionales:
  - `IMAGE_NAME` (default: `api`)
  - `IMAGE_TAG` (default: `git rev-parse --short HEAD` o `latest` si no hay git)
  - `API_PORT` (default: `8080`)

### Forma de uso

En el .envrc de la carpeta infra:

```bash
export AZURE_SUBSCRIPTION_ID="..."   # requerido
export AZURE_RESOURCE_GROUP="..."    # requerido
export ENVIRONMENT="matias"          # requerido (nombre del desarrollador o production/staging)
# Opcionales:
# export IMAGE_NAME="api"
# export IMAGE_TAG="v1.2.3"
# export API_PORT="8080"

```

### Arquitectura de ACR

Cada entorno tiene su propio Azure Container Registry (ACR) dentro de su Resource Group. El stack principal (`undp-huella-latam-stack-$ENVIRONMENT`) expone los outputs de ACR (`containerRegistryId`, `acrLoginServer`).

`deploy-api.sh` lee los outputs del stack del entorno (`undp-huella-latam-stack-$ENVIRONMENT`) para obtener el `acrLoginServer` y `containerRegistryId`.

### Flujo del script

`./deploy-api.sh` (flujo actual):

1. Selecciona la suscripción de Azure.
2. Lee del stack del entorno (`undp-huella-latam-stack-$ENVIRONMENT`, RG = `$AZURE_RESOURCE_GROUP`):
   - `APP_SERVICE_NAME` desde `outputs.api.value.appService.name`
   - `ACR_ID` y `ACR_LOGIN_SERVER` desde `outputs.containerRegistryId` y `outputs.acrLoginServer`
3. Deriva `ACR_NAME` y (para logs) `ACR_RG` desde `ACR_ID`.
4. Login en ACR (`az acr login -n $ACR_NAME`).
5. Build de la imagen con `apps/api/Dockerfile` → tag `$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG`.
6. Push al ACR.
7. Configura App Service para usar la imagen y `acrUseManagedIdentityCreds=true`.
8. Setea app settings (`WEBSITES_PORT=$API_PORT`, `NODE_ENV=production`).
9. Reinicia App Service y muestra `defaultHostName`.

### Resultado esperado

Al finalizar, verás en la salida el `defaultHostName` del App Service. La API queda desplegada con la imagen recién construida y referenciada desde el ACR, lista para responder en el puerto configurado (`API_PORT`). Una buena prueba rápida es abrir `https://<defaultHostName>/api/docs` y verificar que carga el Swagger. Si falla la obtención de outputs de la stack o el login al ACR, el script termina con error y sin cambios en el App Service.

### Idempotencia del `deploy-api.sh`

- No crea recursos; reutiliza los generados por `deploy.sh` (ACR y App Service con identidad gestionada). Si faltan, falla antes de aplicar cambios.
- Cada ejecución deja la app apuntando a `ACR_LOGIN_SERVER/IMAGE_NAME:IMAGE_TAG` y con MI + `acrUseManagedIdentityCreds=true`.
- Siempre build/push. Con mismo `IMAGE_TAG` sobreescribes; con tag nuevo, publicas versión nueva y la app se actualiza a ese tag.
- No limpia imágenes antiguas en ACR; solo avanza el puntero de la app.
- Defaults: `IMAGE_NAME=api`, `IMAGE_TAG=$(git rev-parse --short HEAD || latest)`. Sin git usa `latest` (se sobreescribe cada vez).
