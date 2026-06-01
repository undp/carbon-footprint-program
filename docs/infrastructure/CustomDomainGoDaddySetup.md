# Configuración de Dominio Custom con GoDaddy

## Este documento describe cómo configurar un dominio comprado en GoDaddy para apuntar a la aplicación desplegada en Azure (Static Web App, con opción a Azure Front Door).

## Pre-requisitos

- Dominio registrado en GoDaddy (ver ejemplo en [Convenciones](#convenciones-del-documento)).
- Acceso a la cuenta GoDaddy con permisos sobre el dominio.
- Static Web App ya desplegada (debes conocer el `defaultHostname` Azure, formato `*.azurestaticapps.net`).
- Decisión previa: usar **subdominio** o **apex** (sin `www`).
  **Recomendación**: usar subdominio. El flujo apex es más complejo porque GoDaddy DNS estándar no soporta registros `ALIAS`/`ANAME`.

---

## Convenciones del documento

Los siguientes placeholders se usan a lo largo del documento. Reemplazá cada uno por el valor real de tu dominio antes de copiar comandos o configurar recursos:

| Placeholder           | Significado                                                   | Ejemplo                                      |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `<root-domain>`       | Dominio raíz registrado en GoDaddy                            | `huella-test.com`                            |
| `<subdomain>`         | Subdominio elegido para la app (común: `www`, `app`)          | `www`                                        |
| `<custom-domain>`     | Hostname completo (`<subdomain>.<root-domain>`)               | `www.huella-test.com`                        |
| `<api-custom-domain>` | Hostname custom del API (si aplica)                           | `api.huella-test.com`                        |
| `<swa-default-host>`  | Hostname default del Static Web App (`*.azurestaticapps.net`) | `nice-pebble-0abc1234.5.azurestaticapps.net` |
| `<fd-endpoint>`       | Hostname del endpoint Front Door (`*.azurefd.net`)            | `endpoint-xyz.azurefd.net`                   |
| `<api-host>`          | Hostname default del App Service del API                      | `api-<hash>.azurewebsites.net`               |
| `<env>`               | Nombre del entorno (`ENVIRONMENT` en `.envrc`)                | `development`, `staging`, `production`       |

---

## Rutas disponibles según infraestructura

La configuración depende del valor de `enableFrontDoor` en el archivo de parámetros bicep (`infra/params/main.<env>.bicepparam`):

- **`enableFrontDoor = false`** (default en development): el dominio apunta directamente al Static Web App.
- **`enableFrontDoor = true`** (recomendado producción): el dominio apunta al endpoint de Azure Front Door, que actúa como CDN + WAF delante del Static Web App.
  Ambos flujos están cubiertos abajo.

---

## Ruta A — Dominio Custom apuntando directamente al Static Web App

Aplica cuando `enableFrontDoor = false`. Dos opciones según se quiera manejar el dominio por IaC o por portal.

### Opción recomendada (vía bicep redeploy)

Bicep crea el recurso `customDomain` en el Static Web App (validación `cname-delegation`) y propaga el dominio como origen autorizado a App Service CORS + Blob Storage CORS + `ALLOWED_ORIGIN` de Fastify. No requiere pasos manuales en el portal.

1. Crear el CNAME en GoDaddy **antes** del deploy (validación CNAME requiere que el registro exista al crearse el recurso):
   - **Type**: `CNAME`
   - **Name**: `<subdomain>` (resulta en `<custom-domain>`)
   - **Value**: `<swa-default-host>` (sin `https://`, sin slash final)
   - **TTL**: `1 Hour`
     Verificar con `dig <custom-domain> CNAME +short` antes de continuar.
2. Editar `infra/.envrc`:
   ```bash
   export FRONTEND_CUSTOM_DOMAIN="<custom-domain>"
   ```
   (No setees `VITE_FRONT_BASE_URL`: `deploy-web.sh` lo deriva desde `FRONTEND_CUSTOM_DOMAIN` y un valor manual sería ignorado.)
3. Asegurar en el archivo de parámetros (`infra/params/main.<env>.bicepparam`):
   ```bicep
   param enableFrontDoor = false
   ```
4. Ejecutar `./infra/deploy.sh`. Bicep:
   - Crea el `customDomain` en el SWA (valida CNAME automáticamente; toma 2–15 min).
   - Setea `siteConfig.cors.allowedOrigins` del App Service del API al dominio custom.
   - Setea las `corsRules` del Storage Account al dominio custom.
5. Ejecutar `./infra/deploy-web.sh` — rebuildea el bundle con el dominio custom (deriva `VITE_FRONT_BASE_URL` desde `FRONTEND_CUSTOM_DOMAIN` o, si no está exportado, desde el output `frontendCustomDomain` del stack).
6. Ejecutar `./infra/deploy-api.sh` — setea `ALLOWED_ORIGIN` de Fastify con la misma prioridad.
7. Saltar a [Post-configuración](#post-configuración-actualizar-entra-id-frontend-y-api) (Entra ID redirect URIs siguen siendo manuales).

> ⚠️ **El CNAME debe existir y estar propagado ANTES de `deploy.sh`.** La validación `cname-delegation` es **síncrona**: Azure resuelve el CNAME al crear el recurso `customDomains`. Si el registro todavía no resuelve al `<swa-default-host>`, la creación del recurso falla — y como vive dentro del deployment stack, **la corrida completa de `deploy.sh` falla** (no solo el binding del dominio). Los recursos ya existentes no se borran, pero el dominio no queda atado: corregir el DNS, esperar propagación (`dig <custom-domain> CNAME +short`) y re-correr `deploy.sh`.

> ⚠️ **Apex domains** no se soportan en esta opción — el módulo SWA usa `cname-delegation`, que no aplica a registros `@`. Usar la opción manual (abajo) con validación TXT.

### Opción manual (vía portal Azure)

Solo si no querés redeployar bicep, o si necesitás apex con validación TXT. Genera **drift** respecto al IaC — no recomendado para producción.

#### 1. Obtener el hostname del Static Web App

Portal Azure → Resource Group → Static Web App (`swa-<hash>`) → copiar **URL** (sin `https://`). Es el valor `<swa-default-host>`.
Alternativa por CLI:

```bash
az staticwebapp show \
  --name swa-<hash> \
  --resource-group <rg> \
  --query defaultHostname -o tsv
```

#### 2. Configurar DNS en GoDaddy

1. Iniciar sesión en https://godaddy.com
2. En la barra superior derecha, hacer clic en tu **nombre de usuario** (junto al icono de perfil). Se abre un menú desplegable.
3. En la sección **ACCOUNT**, elegir **My Products**.
4. En el menú lateral izquierdo, hacer clic en **Domain**. Si tienes varios dominios, seleccionar `<root-domain>`.
5. En las pestañas horizontales de la página del dominio, hacer clic en **DNS** (junto a Overview, Registration Settings, etc.).
6. Confirmar que estás en la subpestaña **DNS Records** (activa por defecto). Ahí aparece el botón **Add New Record**.

#### 2A. Subdominio (recomendado)

1. Hacer clic en **Add New Record**.
2. Configurar:
   - **Type**: `CNAME`
   - **Name**: `<subdomain>` (resulta en `<custom-domain>`)
   - **Value**: `<swa-default-host>` (sin `https://`, sin slash final)
   - **TTL**: `1 Hour` (o `600 seconds` si está disponible — TTL bajo acelera la iteración)
3. **Save**.
   Verificar propagación (esperar 5–10 minutos):

```bash
dig <custom-domain> CNAME +short
# Debe retornar: <swa-default-host>.
```

#### 2B. Apex (`<root-domain>` sin `www`)

GoDaddy DNS no soporta `ALIAS`/`ANAME`, por lo que el apex requiere validación TXT + registro A apuntando a la IP de Azure.

1. Iniciar primero el alta del custom domain en Azure (paso 3 abajo) para obtener el token TXT y la IP destino.
2. En GoDaddy (**Domain** → pestaña **DNS** → **DNS Records**):

   a. **Add New Record** — TXT de validación:
   - **Type**: `TXT`
   - **Name**: `@`
   - **Value**: token de validación entregado por Azure
   - **TTL**: 1 Hour

   b. Borrar el A record existente `@` (apunta al parking GoDaddy).

   c. **Add New Record** — A apuntando a Azure:
   - **Type**: `A`
   - **Name**: `@`
   - **Value**: IP entregada por Azure
   - **TTL**: 1 Hour

3. (Opcional pero recomendado) Redirigir `www` al apex:
   - **Add New Record**:
     - **Type**: `CNAME`
     - **Name**: `www`
     - **Value**: `<root-domain>`
   - Agregar `www.<root-domain>` como segundo custom domain en el Static Web App (mismo flujo subdominio).

#### 3. Agregar el custom domain en el portal Azure

1. Portal → Resource Group → Static Web App → sidebar **Settings** → **Custom domains**.
2. Click **+ Add** → seleccionar **Custom domain on other DNS**.
3. **Domain name**: ingresar el hostname (`<custom-domain>`).
4. **Hostname record type**:
   - `CNAME` para subdominios.
   - `TXT` para apex (Azure entrega entonces token TXT + IP destino, que se ingresan en GoDaddy como se describió en 2B).
5. Click **Add**.

#### 4. Esperar validación + SSL

- Estado pasa por: `Validating` → `Ready` (típicamente 2–15 minutos).
- El certificado SSL es **gestionado por Azure** (gratis, auto-renovado). No requiere acción manual.

#### 5. Verificar

```bash
curl -I https://<custom-domain>
# HTTP/2 200
```

Browser → `https://<custom-domain>` → debe cargar la app con candado verde (cert válido).

> ➡️ **Si elegiste Ruta A, saltar directo a [Post-configuración](#post-configuración-actualizar-entra-id-frontend-y-api).** La sección Ruta B aplica solo si `enableFrontDoor = true`. Los pasos de Post-configuración (Entra ID, rebuild frontend, CORS del API) son **comunes a ambas rutas** y son los que habilitan el login en el dominio custom.

## Ruta B — Dominio Custom apuntando a Azure Front Door

Aplica cuando `enableFrontDoor = true`. El bicep en `infra/modules/frontDoor.bicep` ya define el recurso `customDomain` con `ManagedCertificate` y TLS 1.2; solo necesita recibir el parámetro `frontendCustomDomain` (que main.bicep enruta automáticamente a Front Door cuando `enableFrontDoor` está activo).

### Opción recomendada (vía bicep redeploy)

El recurso `customDomain` lo crea bicep, así que el token de validación TXT solo está disponible **después** del primer `deploy.sh`. El flujo correcto es: deploy → leer token → crear TXT → esperar `Approved` → recién ahí cambiar el CNAME.

1. Editar `.envrc`:
   ```bash
   export FRONTEND_CUSTOM_DOMAIN="<custom-domain>"
   ```
2. Asegurar en el archivo de parámetros (`infra/params/main.<env>.bicepparam`):
   ```bicep
   param enableFrontDoor = true
   ```
3. Ejecutar `infra/deploy.sh`. Bicep crea el `customDomain` (estado `Pending`) y lo asocia a la `route-default` + WAF policy.
4. Obtener el token de validación TXT del recurso recién creado:
   ```bash
   az afd custom-domain show \
     --profile-name "$(az stack group show -n undp-huella-latam-stack-$ENVIRONMENT -g $AZURE_RESOURCE_GROUP --query outputs.frontDoorProfileName.value -o tsv)" \
     --resource-group "$AZURE_RESOURCE_GROUP" \
     --custom-domain-name "$(echo $FRONTEND_CUSTOM_DOMAIN | tr '.' '-')" \
     --query "validationProperties.validationToken" -o tsv
   ```
   Alternativa: Portal → Front Door profile → Domains → click en el dominio → copiar el token TXT.
5. Crear en GoDaddy DNS:
   - **TXT** `_dnsauth.<custom-domain>` con el token del paso anterior.
6. Esperar a que el estado del dominio pase a `Approved` y el cert managed quede aprovisionado (5–30 min). Verificar con `infra/monitor-ssl.sh`.
7. Recién ahí, **cambiar el CNAME** `<custom-domain>` para apuntar al endpoint Front Door:
   - **Type**: `CNAME`
   - **Name**: `<subdomain>`
   - **Value**: `<fd-endpoint>` (obtener desde Portal → Front Door profile → Endpoints, o desde el output bicep `frontDoorEndpoint`).

⚠️ **Orden importa**: TXT primero → validación `Approved` → cert managed listo → recién después cambias el CNAME al endpoint Front Door. Si cambias el CNAME antes de que el cert managed esté aprovisionado, rompes el tráfico de la app activa.

### Opción manual (vía portal Azure)

Solo si no quieres redeployar bicep. Genera **drift** respecto al IaC — no recomendado para producción.

1. Portal → Resource Group → Front Door profile (`fd-<hash>`) → sidebar **Settings** → **Domains** → **+ Add**.
2. **Domain type**: Non-Azure validated → ingresar hostname (`<custom-domain>`).
3. **DNS management**: All other DNS services.
4. **HTTPS**: AFD managed certificate → **Minimum TLS**: 1.2.
5. Click **Add** → Azure genera token de validación TXT.
6. En GoDaddy DNS: crear `TXT` `_dnsauth.<custom-domain>` con el token.
7. Esperar estado `Validated` en el portal (5–15 min).
8. Crear `CNAME` `<custom-domain>` → `<fd-endpoint>` en GoDaddy.
9. Portal → Domain → **Associate with route** → seleccionar `route-default`.
10. Portal → Security policies → editar → agregar el nuevo dominio para que la WAF policy lo cubra.
11. El certificado managed se aprovisiona automáticamente (5–30 min). Estado final: `Approved`.

---

## Post-configuración: actualizar Entra ID, frontend y API

> 📌 **Aplica tanto a Ruta A como a Ruta B.** Independiente de si el dominio apunta directo al Static Web App o pasa por Front Door, los pasos siguientes son los que efectivamente habilitan el login en el dominio custom.

⚠️ **Crítico**: el flujo DNS + cert anterior solo entrega el hostname. La app sigue rota hasta que se sincronizan el tenant Entra, el build del frontend y los orígenes permitidos del API (CORS en **dos capas**). El tenant ID y la authority URL **no cambian** con dominio custom — solo lo hacen los redirect URIs y las URLs base.

### Variables en `.envrc` según ruta

`FRONTEND_CUSTOM_DOMAIN` es la **única fuente de verdad** del hostname público:

- **`FRONTEND_CUSTOM_DOMAIN`**: lo consumen **bicep** (`deploy.sh`), **`deploy-web.sh`** y **`deploy-api.sh`**. Bicep enruta el dominio al recurso correcto según `enableFrontDoor` (Front Door o Static Web App) y deriva la variable local `allowedOrigin` (`infra/main.bicep:221`), que se aplica a `siteConfig.cors.allowedOrigins` del App Service, al app setting `ALLOWED_ORIGIN` (Fastify) y a las `corsRules` del Storage Account. `deploy-web.sh` deriva `VITE_FRONT_BASE_URL` desde esta variable (o desde el output `frontendCustomDomain` del stack como fallback). `deploy-api.sh` resuelve `ALLOWED_ORIGIN` con la misma prioridad.
- **`VITE_FRONT_BASE_URL`**: variable interna del build Vite. **No la setees manualmente** — `deploy-web.sh` la calcula desde `FRONTEND_CUSTOM_DOMAIN` para mantenerla alineada con el `allowedOrigin` que escribió bicep. Si la exportás, el script la ignora con un warning para evitar mismatches CORS.

| Ruta                                                   | `FRONTEND_CUSTOM_DOMAIN` | Comportamiento de los scripts                                                                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A** (custom domain directo a SWA, **opción IaC**)    | **Obligatorio**          | `deploy.sh` lo pasa como parámetro bicep. `deploy-web.sh` deriva `VITE_FRONT_BASE_URL=https://${FRONTEND_CUSTOM_DOMAIN}`. `deploy-api.sh` deriva `ALLOWED_ORIGIN` del mismo origen.                                                        |
| **A** (custom domain directo a SWA, **opción manual**) | No aplica                | Sin `FRONTEND_CUSTOM_DOMAIN` ni custom domain en el stack, `deploy-web.sh` y `deploy-api.sh` caen al hostname default del SWA. El custom domain creado a mano en el portal no se propaga a las CORS — completar manualmente pasos 3b y 3c. |
| **B** (Front Door + custom domain)                     | **Obligatorio**          | Idéntico a Ruta A IaC, pero bicep ata el dominio a Front Door en vez del SWA.                                                                                                                                                              |

> **Nota standalone `deploy-api.sh`**: el script prefiere `FRONTEND_CUSTOM_DOMAIN` del entorno, luego el output `frontendCustomDomain` del stack, luego el hostname default del SWA. No requiere `.envrc` cargado si el stack ya tiene el output.

### Checklist (orden recomendado)

| #   | Acción                                                                                            | Dónde                          |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Redirect URIs en Entra (frontend)                                                                 | Portal Entra                   |
| 2   | `FRONTEND_CUSTOM_DOMAIN` en `.envrc` + `./deploy-web.sh`                                          | Local / CI                     |
| 3a  | Re-ejecutar `./deploy-api.sh` (con `.envrc` cargado) para sincronizar `ALLOWED_ORIGIN` en Fastify | Local / CI                     |
| 3b  | **CORS del App Service** (plataforma)                                                             | Portal Azure → App Service API |
| 4   | Easy Auth en el App Service del API (si `AUTH_PROVIDER=easy-auth`)                                | Portal Azure → Authentication  |
| 5   | Prueba en incógnito: login → `/app/home` → `/api/users/me` 200                                    | Navegador                      |

### 1. Registrar el nuevo dominio como Redirect URI en Entra

Sin este paso, el login falla con `redirect_uri_mismatch`.

1. Portal Azure → **Microsoft Entra ID** → cambiar al tenant correcto (External o Organizational, según `AZURE_TENANT_TYPE`).
2. **App registrations** → abrir el **Frontend App Registration** (el que corresponde a `AZURE_FRONT_CLIENT_ID`).
3. Sidebar **Authentication** → sección **Platform configurations** → **Single-page application** → **Add URI**.
4. Agregar dos entradas exactas (**sin** trailing slash al final del dominio):
   - `https://<custom-domain>`
   - `https://<custom-domain>/app/home`
     El segundo path matchea `redirectUri` en `apps/web/src/config/msalConfig.ts:18` (`${FRONT_BASE_URL}/app/home`).
5. **Save**.

> ⚠️ No uses trailing slash en el hostname: en `FRONTEND_CUSTOM_DOMAIN` poné `app.example.com` (sin `https://`, sin `/`) y en los redirect URIs de Entra `https://<custom-domain>` (sin slash final). Si el dominio termina en `/`, el redirect MSAL queda como `https://<custom-domain>//app/home` y Entra responde `AADSTS50011` / `redirect_uri_mismatch`.
> Si previamente había URIs de un dominio temporal (ej. `*.azurestaticapps.net`) y ya no se usan, borrarlas para reducir superficie.
> Referencia detallada del flujo de App Registration (External vs Organizational): [`docs/infrastructure/MSAL-EasyAuth-Setup.md`](./MSAL-EasyAuth-Setup.md).

### 2. Rebuildear el frontend con las nuevas URLs

`VITE_FRONT_BASE_URL` y `VITE_API_BASE_URL` se inyectan en **build time** (Vite). Cambiar el dominio sin rebuild deja el bundle apuntando al hostname viejo.

`deploy-web.sh` resuelve `VITE_FRONT_BASE_URL` con esta prioridad:

1. `FRONTEND_CUSTOM_DOMAIN` env var (current intent).
2. Output bicep `frontendCustomDomain` (cuando `FRONTEND_CUSTOM_DOMAIN` se pasó a `deploy.sh`).
3. Hostname default del Static Web App (`*.azurestaticapps.net`).

Si exportás manualmente `VITE_FRONT_BASE_URL`, el script lo ignora con un warning. Es deliberado: el dominio que sirve el bundle debe coincidir con el que bicep autorizó en App Service CORS, Fastify `ALLOWED_ORIGIN` y Storage CORS — un override manual rompería esa coherencia.

Según la ruta elegida:

- **Ruta A opción IaC y Ruta B**: setear `FRONTEND_CUSTOM_DOMAIN` en `.envrc` y correr `deploy.sh`. `deploy-web.sh` resuelve automáticamente.
- **Ruta A opción manual**: bicep no conoce el dominio. `deploy-web.sh` caerá al hostname default del SWA — el bundle queda apuntando al `*.azurestaticapps.net`. Para que el bundle apunte al dominio custom, hay que setear `FRONTEND_CUSTOM_DOMAIN` igual y dejar que bicep lo registre (es decir, pasar a opción IaC). El path "manual puro" sin `FRONTEND_CUSTOM_DOMAIN` no soporta login en el dominio custom.
- **`VITE_API_BASE_URL`**: opcional. Sin exportarlo, `deploy-web.sh` lo resuelve desde el stack (`https://<api-host>/api`). Override solo si tenés dominio custom para el API.

Re-ejecutar `infra/deploy-web.sh` para rebuildear y subir el bundle al Static Web App. Validar en el log del script:

- `VITE_FRONT_BASE_URL=https://<custom-domain>`
- `VITE_API_BASE_URL=...` apuntando al App Service correcto del entorno
- `VITE_AZURE_FRONT_CLIENT_ID` / `VITE_AZURE_API_CLIENT_ID` / `VITE_AZURE_AUTH_AUTHORITY` del tenant esperado

> Detalle de `VITE_API_BASE_URL`: [`docs/infrastructure/StaticWebAppDeployment.md`](./StaticWebAppDeployment.md#variables-de-entorno).

### 3. CORS del API (dos capas) + CORS del Storage

Las peticiones del navegador desde `https://<custom-domain>` viajan a dos destinos cross-origin: el App Service del API y el Storage Account (uploads directos vía SAS URL). Hay tres capas de CORS que deben coincidir.

```text
Navegador (Origin: https://<custom-domain>)
    → App Service — CORS de plataforma (siteConfig.cors en bicep / blade API)
    → Contenedor Fastify — ALLOWED_ORIGIN (apps/api/src/plugins/external/cors.ts)
    → Storage Account — corsRules en blobService (bicep / Resource sharing blade)
```

**Con la opción IaC** (`FRONTEND_CUSTOM_DOMAIN` seteado, cualquier ruta): bicep deja las tres capas alineadas al dominio custom. Tras `deploy.sh` + `deploy-api.sh`, no hace falta tocar el portal.

> ℹ️ La opción IaC autoriza **un solo origen** (el dominio custom): bicep computa un único `allowedOrigin`. Una vez atado el dominio, acceder por el hostname default (`*.azurestaticapps.net` / `*.azurefd.net`) deja de pasar CORS. Es esperado — usar siempre el dominio custom. Si necesitás mantener ambos orígenes, agregalos a mano en los blades del portal (paso 3b/3c), asumiendo el drift respecto al IaC.

**Con la opción manual** (sin var bicep): bicep deja el CORS de plataforma + Storage apuntando al hostname default del SWA, **no** al dominio custom. Los pasos 3b y 3c (abajo) son obligatorios.

#### 3a. Fastify — variable `ALLOWED_ORIGIN` (script o portal)

El contenedor lee `ALLOWED_ORIGIN` en runtime.

**Recomendado:** con `FRONTEND_CUSTOM_DOMAIN` en `.envrc`, cargar el entorno y ejecutar:

```bash
cd infra
source .envrc    # o direnv allow; deploy-api.sh NO hace source por sí solo
./deploy-api.sh
```

Debe aparecer en el log: `Resolved ALLOWED_ORIGIN from FRONTEND_CUSTOM_DOMAIN env: https://<custom-domain>`. Si no setiaste `FRONTEND_CUSTOM_DOMAIN` pero el stack ya tiene el output (corriste `deploy.sh` antes), el script lee el output y muestra `Resolved ALLOWED_ORIGIN from stack output frontendCustomDomain`.

**Alternativa manual:** Portal → App Service del API → **Settings** → **Environment variables** → `ALLOWED_ORIGIN=https://<custom-domain>` → Apply → reiniciar.

> Si `ALLOWED_ORIGIN` está vacío, Fastify permite cualquier origen (`origin: true`) — solo development.
> Un redeploy de `infra/deploy.sh` puede volver a pisar `ALLOWED_ORIGIN` con el hostname del SWA; volver a correr `deploy-api.sh` después.

#### 3b. App Service — CORS de plataforma (portal Azure) — **obligatorio solo en Ruta A opción manual**

Saltable si usaste la opción IaC (bicep ya lo dejó). Este ajuste es el que suele faltar si solo corriste `deploy-api.sh`: actualiza Fastify, **no** el CORS del gateway del App Service.

1. Portal Azure → Resource Group del entorno → App Service del API (`api-<hash>`).
2. Menú lateral **API** → **CORS** (no confundir con **Authentication** ni solo con Environment variables).
3. En **Allowed Origins**, agregar el origen del frontend **sin** slash final:
   - `https://<custom-domain>`
4. Dejar habilitado **Support credentials** (debe coincidir con `credentials: true` en Fastify cuando `ALLOWED_ORIGIN` está definido).
5. Opcional pero recomendado: mantener también `https://<swa-default-host>` si aún accedes por el hostname Azure del Static Web App.
6. **Save** y **reiniciar** el App Service.

#### 3c. Storage Account — CORS (portal Azure) — **obligatorio solo en Ruta A opción manual**

Saltable si usaste la opción IaC. Los uploads de archivos (organizaciones, inventarios, etc.) se hacen con `PUT` directo desde el navegador a un SAS URL del Storage; el dominio custom debe estar listado en las CORS rules del Blob service.

1. Portal Azure → Resource Group del entorno → Storage Account (`st<hash>`).
2. Menú lateral **Settings** → **Resource sharing (CORS)** → pestaña **Blob service**.
3. Agregar una fila:
   - **Allowed origins**: `https://<custom-domain>` (una por fila; sumar `http://localhost:5173` si se usa local contra esta cuenta).
   - **Allowed methods**: `GET, PUT, HEAD, OPTIONS`.
   - **Allowed headers**: `*`.
   - **Exposed headers**: `*`.
   - **Max age**: `3600`.
4. **Save**. Toma efecto en ~30 s; hard refresh del navegador para limpiar cache de preflight.

> ⚠️ Próximas corridas de `./infra/deploy.sh` van a reescribir estas rules desde bicep. Si quedaste en opción manual y no querés perder el ajuste, setear `FRONTEND_CUSTOM_DOMAIN` antes del próximo deploy.

**Ruta B (`enableFrontDoor = true`):** si `frontendCustomDomain` se desplegó con bicep, el CORS de plataforma ya puede apuntar al dominio custom. Igual conviene verificar el blade **API → CORS** tras el primer deploy con dominio nuevo.

> **¿Automatizar en bicep?** Es posible ampliar `infra/modules/appService.bicep` con un parámetro de dominio custom y varios `allowedOrigins`. Para pocos entornos, el portal es el camino más simple; un `deploy.sh` posterior puede resetear `siteConfig.cors` al hostname del SWA — repetir este paso si reaparecen errores CORS.

### 4. Easy Auth en el App Service del API (si aplica)

Si el API usa `AUTH_PROVIDER=easy-auth` (default cuando `enableAzureAuth=true` en bicep), el frontend envía `Authorization: Bearer` y Azure debe validar el token e inyectar `X-MS-CLIENT-PRINCIPAL`. Eso se configura en el **mismo** App Service del API, no en `deploy-web` ni `deploy-api`.

Seguir [`docs/infrastructure/MSAL-EasyAuth-Setup.md`](./MSAL-EasyAuth-Setup.md) (Step 6 para tenant CIAM / Step 7 para organizational): proveedor Microsoft, issuer CIAM, client ID del API, audience, frontend en "allowed client applications", _Allow unauthenticated access_, token store habilitado.

**Síntoma si falta o está mal:** log `Missing X-MS-CLIENT-PRINCIPAL header`, `GET /api/users/me` → 401, toast _"Ocurrió un problema al iniciar sesión"_ después de un login Microsoft exitoso (MSAL OK, falla `/users/me`).

> Otro entorno en el **mismo tenant** puede funcionar porque es **otro** App Service con su propio Easy Auth y CORS; mismo tenant ≠ misma configuración de recurso.

### 5. Lo que **no** cambia

Estos valores siguen iguales aunque cambie el dominio público — no modificar:

- `AZURE_TENANT_ID` y `AZURE_TENANT_TYPE`.
- `VITE_AZURE_AUTH_AUTHORITY` (depende solo del tenant, no del hostname).
- `AZURE_FRONT_CLIENT_ID` y `AZURE_API_CLIENT_ID` (las App Registrations son las mismas, solo se les agregan URIs).
- `JWKS_AUDIENCE` en el API (sigue siendo el client ID del API).

### 6. Verificar end-to-end

```bash
curl -I https://<custom-domain>         # HTTP/2 200
curl -I https://<api-host>/health        # API vivo (no valida CORS)
```

En el navegador (idealmente ventana de incógnito):

1. Abrir `https://<custom-domain>` — la app carga con cert válido.
2. DevTools → **Network** → `terms-conditions/current` desde `Origin: https://<custom-domain>` → **sin** error CORS en consola (puede ser 200).
3. **Iniciar sesión** → redirect Microsoft → vuelta a `/app/home`.
4. Petición `users/me` → debe incluir `Authorization: Bearer …` y responder **200**.

| Fallo                                                      | Revisar                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `redirect_uri_mismatch` / `AADSTS50011` con `//` en la URI | Paso 1 y `FRONTEND_CUSTOM_DOMAIN` sin `/` final; re-`deploy-web.sh` |
| CORS en `terms-conditions` o APIs públicas                 | Paso **3b** (portal CORS); luego 3a si aplica                       |
| Login Microsoft OK, toast de error al volver               | Paso 4 (Easy Auth) y que `/users/me` no esté bloqueado por CORS     |
| `Missing X-MS-CLIENT-PRINCIPAL` en logs del API            | Paso 4                                                              |

## Forzar HTTPS

- Static Web App: force HTTPS por default. HTTP redirige automático. Sin acción.
- Front Door: el bicep ya configura `httpsRedirect: 'Enabled'` en la `route-default` (`infra/modules/frontDoor.bicep:173`).

---

## Troubleshooting

| Síntoma                                                              | Causa probable                                            | Fix                                                                                                                         |
| -------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Azure muestra "DNS not propagated"                                   | TTL alto o cache local                                    | Esperar 30 min, validar con `dig +trace`                                                                                    |
| `Validation failed` en SWA                                           | CNAME mal escrito (con `https://` o `/`)                  | Borrar y recrear el CNAME limpio                                                                                            |
| Cert SSL no se aprovisiona                                           | DNS resuelve a un destino incorrecto                      | Verificar con `dig CNAME` que retorna el hostname Azure correcto                                                            |
| GoDaddy no deja borrar A `@`                                         | Parking activo                                            | Settings del dominio → desactivar parking primero                                                                           |
| Apex no resuelve                                                     | Cache navegador local                                     | `dig +trace @8.8.8.8 <root-domain>` ignora cache local                                                                      |
| Front Door TXT validation no pasa                                    | Nombre TXT mal armado                                     | Debe ser `_dnsauth.<subdomain>` exacto, sin sufijo `.com` en el campo Name (GoDaddy agrega el dominio raíz automáticamente) |
| `AADSTS50011`, redirect con `//app/home`                             | `FRONTEND_CUSTOM_DOMAIN` con `/` final                    | Quitar trailing slash en `.envrc` y Entra; `deploy-web.sh`                                                                  |
| CORS en consola desde dominio custom; Network a veces 200 con X roja | Falta origen en **App Service → API → CORS** (plataforma) | Paso 3b (portal); reiniciar App Service. O cambiar a opción IaC (`FRONTEND_CUSTOM_DOMAIN`).                                 |
| CORS tras solo `deploy-api.sh`                                       | Solo se actualizó `ALLOWED_ORIGIN` (Fastify)              | Completar paso 3b en portal o usar opción IaC                                                                               |
| CORS reaparece tras `deploy.sh`                                      | Bicep resetea `siteConfig.cors` al hostname default       | Setear `FRONTEND_CUSTOM_DOMAIN` antes del próximo `deploy.sh`                                                               |
| CORS al subir archivo (`PUT` a `*.blob.core.windows.net`)            | Falta origen en **Storage Account → Resource sharing**    | Paso 3c (portal) o cambiar a opción IaC                                                                                     |
| Login Microsoft OK, _"Ocurrió un problema al iniciar sesión"_        | `/users/me` 401 o bloqueado por CORS                      | CORS 3a+3b; Easy Auth paso 4; ver `Authorization` en DevTools                                                               |
| `Missing X-MS-CLIENT-PRINCIPAL` en logs                              | Easy Auth no valida el Bearer                             | Portal → Authentication en el App Service del API; ver MSAL-EasyAuth-Setup                                                  |
| Otro env (mismo tenant) funciona, este no                            | Otro App Service / otro CORS / otro build                 | Comparar CORS portal + app settings + log de `deploy-web` por entorno                                                       |

---

## Tips operacionales GoDaddy

- **Auto-renew**: revisar en Settings del dominio. Por default está ON. Apagar si es solo prueba para evitar cargo al año siguiente.
- **Email forwarding**: GoDaddy lo ofrece gratis. Útil para `<usuario>@<root-domain>` sin contratar Microsoft 365.
- **Migrar a Cloudflare DNS**: GoDaddy permite cambiar nameservers. Cloudflare DNS gratis ofrece:
  - Mejor performance global (anycast).
  - Analytics DNS gratis.
  - `CNAME flattening` en apex (resuelve la limitación de no tener ALIAS).
  - DDoS protection extra.
    No es necesario para este flujo, pero es una mejora gratis si el dominio se queda en uso prolongado.

---

## Referencias internas

- `infra/main.bicep`: orquestación general. Define el param `frontendCustomDomain` y lo enruta al recurso correcto (Front Door cuando `enableFrontDoor=true`, SWA en caso contrario). Computa `allowedOrigin` (línea ~221) usando ese valor cuando está seteado, o el hostname default Azure en caso contrario. Expone el output `frontendCustomDomain`.
- `infra/modules/staticWebApp.bicep`: recurso Static Web App, expone `defaultHostname` y `customDomain`. Crea el child resource `customDomains` con validación `cname-delegation` cuando `customDomainName` está seteado.
- `infra/modules/storage.bicep`: Blob service `corsRules` usa `allowedOrigin` (más `devAllowedOrigin` opcional para localhost).
- `infra/modules/frontDoor.bicep`: recurso Front Door, define `customDomain` con `ManagedCertificate` (líneas 199–209).
- `infra/params/main.development.bicepparam`: parámetros entorno development, incluye `frontendCustomDomain` y `enableFrontDoor`.
- `infra/deploy.sh`: script de deploy completo de infraestructura.
- `infra/deploy-web.sh`: build y deploy del frontend (inyecta `VITE_*` en build time).
- `infra/deploy-api.sh`: deploy del contenedor API; resuelve `ALLOWED_ORIGIN` con prioridad `FRONTEND_CUSTOM_DOMAIN` env → output `frontendCustomDomain` del stack → hostname default del SWA.
- `infra/modules/appService.bicep`: define `siteConfig.cors` (plataforma) y app setting `ALLOWED_ORIGIN` (Fastify).
- `infra/monitor-ssl.sh`: script para monitorear el aprovisionamiento del certificado SSL en Front Door.
- `docs/infrastructure/StaticWebAppDeployment.md`: deployment general del frontend.
- `docs/infrastructure/MSAL-EasyAuth-Setup.md`: Easy Auth en el App Service del API y app registrations.
