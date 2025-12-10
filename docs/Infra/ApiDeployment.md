## Despliegue de la API con `infra/deploy-api.sh`

### Requerimientos previos

- Docker instalado y en ejecución.
- Azure CLI instalada y autenticada (`az login`).
- Haber aprovisionado la infraestructura con `infra/deploy.sh` (crea el ACR y el App Service con permisos de AcrPull).
- Variables de entorno obligatorias cargadas:
  - `AZURE_SUBSCRIPTION_ID`
  - `AZURE_RESOURCE_GROUP`
  - `ENVIRONMENT` (ej.: `dev`, `stg`, `prod`)
- Variables opcionales:
  - `IMAGE_NAME` (default: `api`)
  - `IMAGE_TAG` (default: `git rev-parse --short HEAD` o `latest` si no hay git)
  - `API_PORT` (default: `8080`)

### Forma de uso

Desde la raíz del repo:

```bash
export AZURE_SUBSCRIPTION_ID="..."   # requerido
export AZURE_RESOURCE_GROUP="..."    # requerido
export ENVIRONMENT="dev"             # requerido
# Opcionales:
# export IMAGE_NAME="api"
# export IMAGE_TAG="v1.2.3"
# export API_PORT="8080"

./infra/deploy-api.sh
```

El script:

1. Selecciona la suscripción de Azure indicada.
2. Obtiene de la Azure Deployment Stack (`undp-huella-latam-stack-$ENVIRONMENT`) el nombre del App Service y el login server del ACR.
3. Hace login en el ACR.
4. Construye la imagen usando `apps/api/Dockerfile` con tag `$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG`.
5. Hace push de la imagen al ACR.
6. Configura el contenedor del App Service para usar esa imagen y habilita `acrUseManagedIdentityCreds`.
7. Setea app settings (`WEBSITES_PORT=$API_PORT`, `NODE_ENV=production`).
8. Reinicia el App Service.

### Resultado esperado

Al finalizar, verás en la salida el `defaultHostName` del App Service. La API queda desplegada con la imagen recién construida y referenciada desde el ACR, lista para responder en el puerto configurado (`API_PORT`). Una buena prueba rápida es abrir `https://<defaultHostName>/api/docs` y verificar que carga el Swagger. Si falla la obtención de outputs de la stack o el login al ACR, el script termina con error y sin cambios en el App Service.
