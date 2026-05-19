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

Aplica cuando `enableFrontDoor = false`.

### 1. Obtener el hostname del Static Web App

Portal Azure → Resource Group → Static Web App (`swa-<hash>`) → copiar **URL** (sin `https://`). Es el valor `<swa-default-host>`.
Alternativa por CLI:

```bash
az staticwebapp show \
  --name swa-<hash> \
  --resource-group <rg> \
  --query defaultHostname -o tsv
```

### 2. Configurar DNS en GoDaddy

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
2. En GoDaddy (**Domain** → pestaña **DNS** → **DNS Records**), usar **Add New Record**:
   - **Add New Record**:
     - **Type**: `TXT`
     - **Name**: `@`
     - **Value**: token de validación entregado por Azure
     - **TTL**: 1 Hour
   - Borrar el A record existente `@` (apunta al parking GoDaddy).
   - **Add New Record**: - **Type**: `A` - **Name**: `@` - **Value**: IP entregada por Azure - **TTL**: 1 Hour
     Para redirigir `www` al apex (opcional pero recomendado):

- **Add New Record**:
  - **Type**: `CNAME`
  - **Name**: `www`
  - **Value**: `<root-domain>`
- Agregar `www.<root-domain>` como segundo custom domain en el Static Web App (mismo flujo subdominio).

### 3. Agregar el custom domain en el portal Azure

1. Portal → Resource Group → Static Web App → sidebar **Settings** → **Custom domains**.
2. Click **+ Add** → seleccionar **Custom domain on other DNS**.
3. **Domain name**: ingresar el hostname (`<custom-domain>`).
4. **Hostname record type**:
   - `CNAME` para subdominios.
   - `TXT` para apex (Azure entrega entonces token TXT + IP destino, que se ingresan en GoDaddy como se describió en 2B).
5. Click **Add**.

### 4. Esperar validación + SSL

- Estado pasa por: `Validating` → `Ready` (típicamente 2–15 minutos).
- El certificado SSL es **gestionado por Azure** (gratis, auto-renovado). No requiere acción manual.

### 5. Verificar

```bash
curl -I https://<custom-domain>
# HTTP/2 200
```

Browser → `https://<custom-domain>` → debe cargar la app con candado verde (cert válido).

> ➡️ **Si elegiste Ruta A, saltar directo a [Post-configuración](#post-configuración-actualizar-entra-id-frontend-y-api).** La sección Ruta B aplica solo si `enableFrontDoor = true`. Los pasos de Post-configuración (Entra ID, rebuild frontend, CORS del API) son **comunes a ambas rutas** y son los que habilitan el login en el dominio custom.

## Ruta B — Dominio Custom apuntando a Azure Front Door

Aplica cuando `enableFrontDoor = true`. El bicep en `infra/modules/frontDoor.bicep` ya define el recurso `customDomain` con `ManagedCertificate` y TLS 1.2; solo necesita recibir el parámetro `frontDoorCustomDomain`.

### Opción recomendada (vía bicep redeploy)

El recurso `customDomain` lo crea bicep, así que el token de validación TXT solo está disponible **después** del primer `deploy.sh`. El flujo correcto es: deploy → leer token → crear TXT → esperar `Approved` → recién ahí cambiar el CNAME.

1. Editar `.envrc`:
   ```bash
   export FRONT_DOOR_CUSTOM_DOMAIN="<custom-domain>"
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
     --custom-domain-name "$(echo $FRONT_DOOR_CUSTOM_DOMAIN | tr '.' '-')" \
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

`FRONT_DOOR_CUSTOM_DOMAIN` y `VITE_FRONT_BASE_URL` cumplen roles distintos y no son intercambiables:

- **`FRONT_DOOR_CUSTOM_DOMAIN`**: lo consume **bicep** (`deploy.sh`) para crear el recurso `customDomain` en Front Door y para setear `allowedOrigin` (plataforma CORS + `ALLOWED_ORIGIN` del API). Solo aplica en Ruta B.
- **`VITE_FRONT_BASE_URL`**: lo consumen **`deploy-web.sh`** (build time del bundle Vite, redirect URIs MSAL) y **`deploy-api.sh`** (sincroniza `ALLOWED_ORIGIN` del contenedor Fastify si se re-corre standalone).

| Ruta                                | `FRONT_DOOR_CUSTOM_DOMAIN` | `VITE_FRONT_BASE_URL`                                                                                                              |
| ----------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **A** (custom domain directo a SWA) | No aplica                  | **Obligatorio** — bicep no expone el dominio custom como output, así que `deploy-web.sh` y `deploy-api.sh` necesitan el override.  |
| **B** (Front Door + custom domain)  | **Obligatorio**            | **Opcional** — `deploy-web.sh` lo autoresuelve desde el output `frontDoorCustomDomain` y bicep ya dejó CORS/`ALLOWED_ORIGIN` bien. |

> En Ruta B, exportar `VITE_FRONT_BASE_URL` igual no rompe nada (gana el override) y es útil si vas a re-correr `deploy-api.sh` standalone sin re-correr `deploy.sh`.

### Checklist (orden recomendado)

| #   | Acción                                                                                            | Dónde                          |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Redirect URIs en Entra (frontend)                                                                 | Portal Entra                   |
| 2   | `VITE_FRONT_BASE_URL` en `.envrc` + `./deploy-web.sh`                                             | Local / CI                     |
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

> ⚠️ No uses `https://<custom-domain>/` (con `/` final) en `.envrc` ni en Entra. Si `VITE_FRONT_BASE_URL` termina en `/`, el redirect queda como `https://<custom-domain>//app/home` y Entra responde `AADSTS50011` / `redirect_uri_mismatch`.
> Si previamente había URIs de un dominio temporal (ej. `*.azurestaticapps.net`) y ya no se usan, borrarlas para reducir superficie.
> Referencia detallada del flujo de App Registration (External vs Organizational): [`docs/infrastructure/MSAL-EasyAuth-Setup.md`](./MSAL-EasyAuth-Setup.md).

### 2. Rebuildear el frontend con las nuevas URLs

`VITE_FRONT_BASE_URL` y `VITE_API_BASE_URL` se inyectan en **build time** (Vite). Cambiar el dominio sin rebuild deja el bundle apuntando al hostname viejo.

`deploy-web.sh` resuelve `VITE_FRONT_BASE_URL` con esta prioridad:

1. Valor explícito exportado en `.envrc` (override manual).
2. Output bicep `frontDoorCustomDomain` (cuando Ruta B está activa).
3. Hostname default del Static Web App (`*.azurestaticapps.net`).

Según la ruta elegida:

- **Ruta A (dominio custom directo al SWA)**: el stack bicep no expone el dominio custom como output, así que el script caería al hostname default. **Debes exportar `VITE_FRONT_BASE_URL` manualmente en `.envrc`** para que el bundle apunte al dominio custom:
  ```bash
  export VITE_FRONT_BASE_URL="https://<custom-domain>"
  export VITE_API_BASE_URL="https://<api-custom-domain>/api"   # solo si el dominio del API también cambió
  ```
  Si no exportas `VITE_API_BASE_URL`, `deploy-web.sh` resuelve la URL del API desde el stack (`https://<api-host>/api`).
- **Ruta B (Front Door con custom domain)**: con `FRONT_DOOR_CUSTOM_DOMAIN` ya seteado y `deploy.sh` corrido, el output `frontDoorCustomDomain` queda disponible y `deploy-web.sh` resuelve `VITE_FRONT_BASE_URL` automáticamente. **No** necesitás exportar `VITE_FRONT_BASE_URL` (ver matriz arriba).

Re-ejecutar `infra/deploy-web.sh` para rebuildear y subir el bundle al Static Web App. Validar en el log del script:

- `VITE_FRONT_BASE_URL=https://<custom-domain>`
- `VITE_API_BASE_URL=...` apuntando al App Service correcto del entorno
- `VITE_AZURE_FRONT_CLIENT_ID` / `VITE_AZURE_API_CLIENT_ID` / `VITE_AZURE_AUTH_AUTHORITY` del tenant esperado

> Detalle de `VITE_API_BASE_URL`: [`docs/infrastructure/StaticWebAppDeployment.md`](./StaticWebAppDeployment.md#variables-de-entorno).

### 3. CORS del API (dos capas)

Las peticiones del navegador desde `https://<custom-domain>` al App Service son **cross-origin**. Hay que permitir ese origen en **dos sitios**; configurar solo uno deja la app con errores CORS en consola (a veces status 200 con icono rojo en DevTools) y el login puede fallar tras volver de Microsoft.

```text
Navegador (Origin: https://<custom-domain>)
    → App Service — CORS de plataforma (siteConfig.cors en bicep / blade API)
    → Contenedor Fastify — ALLOWED_ORIGIN (apps/api/src/plugins/external/cors.ts)
```

En **Ruta A**, bicep deja el CORS de plataforma apuntando al hostname default del SWA (`*.azurestaticapps.net`), **no** al dominio custom. Por eso el paso del portal es obligatorio aunque hayas corrido `deploy-api.sh`.

#### 3a. Fastify — variable `ALLOWED_ORIGIN` (script o portal)

El contenedor lee `ALLOWED_ORIGIN` en runtime.

**Recomendado (Ruta A):** con `VITE_FRONT_BASE_URL` en `.envrc`, cargar el entorno y ejecutar:

```bash
cd infra
source .envrc    # o direnv allow; deploy-api.sh NO hace source por sí solo
./deploy-api.sh
```

Debe aparecer en el log: `Setting ALLOWED_ORIGIN from VITE_FRONT_BASE_URL: https://<custom-domain>`

**Alternativa manual:** Portal → App Service del API → **Settings** → **Environment variables** → `ALLOWED_ORIGIN=https://<custom-domain>` → Apply → reiniciar.

> Si `ALLOWED_ORIGIN` está vacío, Fastify permite cualquier origen (`origin: true`) — solo development.
> Un redeploy de `infra/deploy.sh` puede volver a pisar `ALLOWED_ORIGIN` con el hostname del SWA; volver a correr `deploy-api.sh` después.

#### 3b. App Service — CORS de plataforma (portal Azure) — **obligatorio en Ruta A**

Este ajuste es el que suele faltar si solo corriste `deploy-api.sh`: actualiza Fastify, **no** el CORS del gateway del App Service.

1. Portal Azure → Resource Group del entorno → App Service del API (`api-<hash>`).
2. Menú lateral **API** → **CORS** (no confundir con **Authentication** ni solo con Environment variables).
3. En **Allowed Origins**, agregar el origen del frontend **sin** slash final:
   - `https://<custom-domain>`
4. Dejar habilitado **Support credentials** (debe coincidir con `credentials: true` en Fastify cuando `ALLOWED_ORIGIN` está definido).
5. Opcional pero recomendado: mantener también `https://<swa-default-host>` si aún accedes por el hostname Azure del Static Web App.
6. **Save** y **reiniciar** el App Service.

**Ruta B (`enableFrontDoor = true`):** si `frontDoorCustomDomain` se desplegó con bicep, el CORS de plataforma ya puede apuntar al dominio custom. Igual conviene verificar el blade **API → CORS** tras el primer deploy con dominio nuevo.

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

| Fallo                                                      | Revisar                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `redirect_uri_mismatch` / `AADSTS50011` con `//` en la URI | Paso 1 y `VITE_FRONT_BASE_URL` sin `/` final; re-`deploy-web.sh` |
| CORS en `terms-conditions` o APIs públicas                 | Paso **3b** (portal CORS); luego 3a si aplica                    |
| Login Microsoft OK, toast de error al volver               | Paso 4 (Easy Auth) y que `/users/me` no esté bloqueado por CORS  |
| `Missing X-MS-CLIENT-PRINCIPAL` en logs del API            | Paso 4                                                           |

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
| `AADSTS50011`, redirect con `//app/home`                             | `VITE_FRONT_BASE_URL` con `/` final                       | Quitar trailing slash en `.envrc` y Entra; `deploy-web.sh`                                                                  |
| CORS en consola desde dominio custom; Network a veces 200 con X roja | Falta origen en **App Service → API → CORS** (plataforma) | Paso 3b (portal); reiniciar App Service                                                                                     |
| CORS tras solo `deploy-api.sh`                                       | Solo se actualizó `ALLOWED_ORIGIN` (Fastify)              | Completar paso 3b en portal                                                                                                 |
| CORS reaparece tras `deploy.sh`                                      | Bicep resetea `siteConfig.cors` al hostname SWA           | Repetir paso 3b; opcional `deploy-api.sh`                                                                                   |
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

- `infra/main.bicep`: orquestación general, expone los outputs `staticWebAppHostname` y `frontDoorCustomDomain`.
- `infra/modules/staticWebApp.bicep`: recurso Static Web App, expone `defaultHostname`.
- `infra/modules/frontDoor.bicep`: recurso Front Door, define `customDomain` con `ManagedCertificate` (líneas 199–209).
- `infra/params/main.development.bicepparam`: parámetros entorno development, incluye `frontDoorCustomDomain` y `enableFrontDoor`.
- `infra/deploy.sh`: script de deploy completo de infraestructura.
- `infra/deploy-web.sh`: build y deploy del frontend (inyecta `VITE_*` en build time).
- `infra/deploy-api.sh`: deploy del contenedor API; sincroniza `ALLOWED_ORIGIN` desde `VITE_FRONT_BASE_URL` si está definido.
- `infra/modules/appService.bicep`: define `siteConfig.cors` (plataforma) y app setting `ALLOWED_ORIGIN` (Fastify).
- `infra/monitor-ssl.sh`: script para monitorear el aprovisionamiento del certificado SSL en Front Door.
- `docs/infrastructure/StaticWebAppDeployment.md`: deployment general del frontend.
- `docs/infrastructure/MSAL-EasyAuth-Setup.md`: Easy Auth en el App Service del API y app registrations.
