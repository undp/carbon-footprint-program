## Despliegue de la API con `infra/deploy-api.sh`

### Requerimientos previos

- Docker instalado y en ejecución.
- Azure CLI instalada y autenticada (`az login`).
- Haber aprovisionado la infraestructura con `infra/deploy.sh` (crea el ACR y el App Service con permisos de AcrPull).
- Variables de entorno obligatorias cargadas:
  - `AZURE_SUBSCRIPTION_ID`
  - `AZURE_RESOURCE_GROUP`
  - `ENVIRONMENT` (ej.: `development`, `staging`, `production`)
- Variables opcionales:
  - `IMAGE_NAME` (default: `api`)
  - `IMAGE_TAG` (default: `git rev-parse --short HEAD` o `latest` si no hay git)
  - `API_PORT` (default: `8080`)

### Forma de uso

En el .envrc de la carpeta infra:

```bash
export AZURE_SUBSCRIPTION_ID="..."   # requerido
export AZURE_RESOURCE_GROUP="..."    # requerido
export ENVIRONMENT="development"             # requerido
# Opcionales:
# export IMAGE_NAME="api"
# export IMAGE_TAG="v1.2.3"
# export API_PORT="8080"

```

El script `./deploy-api.sh`:

1. Selecciona la suscripción de Azure indicada.
2. Obtiene de la Azure Deployment Stack (`undp-huella-latam-stack-$ENVIRONMENT`) el nombre del App Service y el login server del ACR.
3. Hace login en el ACR.
4. Construye la imagen usando `apps/api/Dockerfile` con tag `$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG`.
5. Hace push de la imagen al ACR.
6. Configura el contenedor del App Service para usar esa imagen y habilita `acrUseManagedIdentityCreds`.
7. Setea app settings (`API_PORT=$API_PORT`).
8. Reinicia el App Service.

### Resultado esperado

Al finalizar, verás en la salida el `defaultHostName` del App Service. La API queda desplegada con la imagen recién construida y referenciada desde el ACR, lista para responder en el puerto configurado (`API_PORT`). Una buena prueba rápida es abrir `https://<defaultHostName>/api/docs` y verificar que carga el Swagger. Si falla la obtención de outputs de la stack o el login al ACR, el script termina con error y sin cambios en el App Service.

### Idempotencia del `deploy-api.sh`

- El script no crea recursos; solo reutiliza los generados por `deploy.sh` (ACR y App Service con identidad administrada). Si esos recursos no existen, falla antes de aplicar cambios.
- Cada ejecución vuelve a configurar la misma app: asigna la imagen `ACR_LOGIN_SERVER/IMAGE_NAME:IMAGE_TAG`, habilita `acrUseManagedIdentityCreds` y actualiza `WEBSITES_PORT`/`NODE_ENV`. Estos comandos son declarativos, por lo que múltiples corridas dejan la app en el mismo estado.
- Siempre construye y hace push de la imagen. Si usas el mismo `IMAGE_TAG`, la imagen se sobreescribe; con un tag distinto, se publica una nueva versión pero la app se actualiza a ese tag.
- No borra imágenes antiguas en el ACR ni revierte cambios previos; simplemente apunta la app a la imagen indicada.
- Si no defines `IMAGE_NAME` ni `IMAGE_TAG` en `.envrc`, usa `IMAGE_NAME=api` y `IMAGE_TAG=$(git rev-parse --short HEAD || latest)`. Con el mismo commit, reejecutar el script deja la app igual (`api:<sha>`). Si cambia el commit, el tag cambia y la app apunta a la nueva imagen. Sin git, siempre usa `api:latest`, sobreescribiéndola en cada corrida (el estado final es la última ejecución).
