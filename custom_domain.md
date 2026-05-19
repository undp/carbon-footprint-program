# Configuración de Dominio Custom con GoDaddy

## Este documento describe cómo configurar un dominio comprado en GoDaddy para apuntar a la aplicación desplegada en Azure (Static Web App, con opción a Azure Front Door).

## Pre-requisitos

- Dominio registrado en GoDaddy (ej: `huella-test.com`).
- Acceso a la cuenta GoDaddy con permisos sobre el dominio.
- Static Web App ya desplegada (debes conocer el `defaultHostname` Azure, formato `<x>.azurestaticapps.net`).
- Decisión previa: usar **subdominio** (ej: `app.huella-test.com`) o **apex** (ej: `huella-test.com` sin `www`).
  **Recomendación**: usar subdominio. El flujo apex es más complejo porque GoDaddy DNS estándar no soporta registros `ALIAS`/`ANAME`.

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

Portal Azure → Resource Group → Static Web App (`swa-<hash>`) → copiar **URL** (sin `https://`).
Ejemplo: `nice-pebble-0abc1234.5.azurestaticapps.net`
Alternativa por CLI:

```bash
az staticwebapp show \
  --name swa-<hash> \
  --resource-group <rg> \
  --query defaultHostname -o tsv
```

### 2. Configurar DNS en GoDaddy

1. Login en https://godaddy.com
2. Header → **My Products** → sección **Domains** → buscar `huella-test.com` → click **DNS**.
3. Aterriza en **DNS Management**.

#### 2A. Subdominio (recomendado)

1. Click **Add New Record**.
2. Configurar:
   - **Type**: `CNAME`
   - **Name**: `app` (resulta en `app.huella-test.com`)
   - **Value**: `nice-pebble-0abc1234.5.azurestaticapps.net` (sin `https://`, sin slash final)
   - **TTL**: `1 Hour` (o `600 seconds` si está disponible — TTL bajo acelera la iteración)
3. **Save**.
   Verificar propagación (esperar 5–10 minutos):

```bash
dig app.huella-test.com CNAME +short
# Debe retornar: nice-pebble-0abc1234.5.azurestaticapps.net.
```

#### 2B. Apex (`huella-test.com` sin `www`)

GoDaddy DNS no soporta `ALIAS`/`ANAME`, por lo que el apex requiere validación TXT + registro A apuntando a la IP de Azure.

1. Iniciar primero el alta del custom domain en Azure (paso 3 abajo) para obtener el token TXT y la IP destino.
2. En GoDaddy DNS Management:
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
  - **Value**: `huella-test.com`
- Agregar `www.huella-test.com` como segundo custom domain en el Static Web App (mismo flujo subdominio).

### 3. Agregar el custom domain en el portal Azure

1. Portal → Resource Group → Static Web App → sidebar **Settings** → **Custom domains**.
2. Click **+ Add** → seleccionar **Custom domain on other DNS**.
3. **Domain name**: ingresar el hostname (ej: `app.huella-test.com`).
4. **Hostname record type**:
   - `CNAME` para subdominios.
   - `TXT` para apex (Azure entrega entonces token TXT + IP destino, que se ingresan en GoDaddy como se describió en 2B).
5. Click **Add**.

### 4. Esperar validación + SSL

- Estado pasa por: `Validating` → `Ready` (típicamente 2–15 minutos).
- El certificado SSL es **gestionado por Azure** (gratis, auto-renovado). No requiere acción manual.

### 5. Verificar

```bash
curl -I https://app.huella-test.com
# HTTP/2 200
```

## Browser → `https://app.huella-test.com` → debe cargar la app con candado verde (cert válido).

> ➡️ **Si elegiste Ruta A, saltar directo a [Post-configuración](#post-configuración-actualizar-entra-id-frontend-y-api).** La sección Ruta B aplica solo si `enableFrontDoor = true`. Los pasos de Post-configuración (Entra ID, rebuild frontend, `ALLOWED_ORIGIN`) son **comunes a ambas rutas** y son los que habilitan el login en el dominio custom.

## Ruta B — Dominio Custom apuntando a Azure Front Door

Aplica cuando `enableFrontDoor = true`. El bicep en `infra/modules/frontDoor.bicep` ya define el recurso `customDomain` con `ManagedCertificate` y TLS 1.2; solo necesita recibir el parámetro `frontDoorCustomDomain`.

### Opción recomendada (vía bicep redeploy)

1. Editar `.envrc`:
   ```bash
   export FRONT_DOOR_CUSTOM_DOMAIN="app.huella-test.com"
   ```
2. Asegurar en el archivo de parámetros (`infra/params/main.<env>.bicepparam`):
   ```bicep
   param enableFrontDoor = true
   ```
3. Antes de correr `deploy.sh`, crear en GoDaddy DNS:
   - **TXT** `_dnsauth.app.huella-test.com` con el token de validación. El token se obtiene del portal Front Door → Domains → Add Domain (Azure lo entrega al iniciar el alta del dominio).
4. Ejecutar `infra/deploy.sh`. Bicep crea el `customDomain` y lo asocia a la `route-default` + WAF policy.
5. Después de que el deploy termine y el cert managed quede aprovisionado (5–30 min), **cambiar el CNAME** `app.huella-test.com` para apuntar al endpoint Front Door:
   - **Type**: `CNAME`
   - **Name**: `app`
   - **Value**: `<endpoint>.azurefd.net` (obtener desde Portal → Front Door profile → Endpoints, o desde el output bicep `frontDoorEndpoint`).
6. Verificar con `infra/monitor-ssl.sh` (script existente para watching el certificado).
   ⚠️ **Orden importa**: TXT primero → validación OK → recién después cambias el CNAME al endpoint Front Door. Si cambias el CNAME antes de que el cert managed esté listo, rompes el tráfico de la app activa.

### Opción manual (vía portal Azure)

Solo si no quieres redeployar bicep. Genera **drift** respecto al IaC — no recomendado para producción.

1. Portal → Resource Group → Front Door profile (`fd-<hash>`) → sidebar **Settings** → **Domains** → **+ Add**.
2. **Domain type**: Non-Azure validated → ingresar hostname.
3. **DNS management**: All other DNS services.
4. **HTTPS**: AFD managed certificate → **Minimum TLS**: 1.2.
5. Click **Add** → Azure genera token de validación TXT.
6. En GoDaddy DNS: crear `TXT` `_dnsauth.app.huella-test.com` con el token.
7. Esperar estado `Validated` en el portal (5–15 min).
8. Crear `CNAME` `app.huella-test.com` → `<endpoint>.azurefd.net` en GoDaddy.
9. Portal → Domain → **Associate with route** → seleccionar `route-default`.
10. Portal → Security policies → editar → agregar el nuevo dominio para que la WAF policy lo cubra.
11. El certificado managed se aprovisiona automáticamente (5–30 min). Estado final: `Approved`.

---

## Post-configuración: actualizar Entra ID, frontend y API

> 📌 **Aplica tanto a Ruta A como a Ruta B.** Independiente de si el dominio apunta directo al Static Web App o pasa por Front Door, los pasos siguientes son los que efectivamente habilitan el login en el dominio custom.

⚠️ **Crítico**: el flujo DNS + cert anterior solo entrega el hostname. La app sigue rota hasta que se sincronizan el tenant Entra, el build del frontend y la lista de orígenes del API. El tenant ID y la authority URL **no cambian** con dominio custom — solo lo hacen los redirect URIs y las URLs base.

### 1. Registrar el nuevo dominio como Redirect URI en Entra

Sin este paso, el login falla con `redirect_uri_mismatch`.

1. Portal Azure → **Microsoft Entra ID** → cambiar al tenant correcto (External o Organizational, según `AZURE_TENANT_TYPE`).
2. **App registrations** → abrir el **Frontend App Registration** (el que corresponde a `AZURE_FRONT_CLIENT_ID`).
3. Sidebar **Authentication** → sección **Platform configurations** → **Single-page application** → **Add URI**.
4. Agregar dos entradas exactas (sin trailing slash):
   - `https://app.huella-test.com`
   - `https://app.huella-test.com/app/home`
     El segundo path matchea `redirectUri` en `apps/web/src/config/msalConfig.ts:18` (`${FRONT_BASE_URL}/app/home`).
5. **Save**.
   Si previamente había URIs de un dominio temporal (ej. `*.azurestaticapps.net`) y ya no se usan, borrarlas para reducir superficie.
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
  export VITE_FRONT_BASE_URL="https://app.huella-test.com"
  export VITE_API_BASE_URL="https://api.huella-test.com/api"   # solo si el dominio del API también cambió
  ```
- **Ruta B (Front Door con custom domain)**: si configuraste `FRONT_DOOR_CUSTOM_DOMAIN` antes del `deploy.sh`, el output `frontDoorCustomDomain` queda disponible y `deploy-web.sh` resuelve `VITE_FRONT_BASE_URL` automáticamente. No es necesario exportarlo a mano (pero hacerlo no rompe nada — gana el override).

Re-ejecutar `infra/deploy-web.sh` para rebuildear y subir el bundle al Static Web App.

> Detalle de `VITE_API_BASE_URL`: [`docs/infrastructure/StaticWebAppDeployment.md`](./StaticWebAppDeployment.md#variables-de-entorno).

### 3. Actualizar `ALLOWED_ORIGIN` en el API

El API (`apps/api/src/plugins/external/cors.ts`) restringe orígenes vía la env var `ALLOWED_ORIGIN`. Si está seteada, hay que agregar el nuevo dominio.

**Ruta A (recomendado):** con `VITE_FRONT_BASE_URL` ya exportado en `.envrc` (paso 2), ejecutar `infra/deploy-api.sh`. El script setea `ALLOWED_ORIGIN` al mismo valor y reinicia el App Service.

**Alternativa manual:**

1. Portal Azure → App Service del API → **Settings** → **Environment variables**.
2. Setear/actualizar `ALLOWED_ORIGIN=https://app.huella-test.com`.
3. **Apply** → reiniciar el App Service.

> Si `ALLOWED_ORIGIN` está vacío, CORS permite cualquier origen (`origin: true`) — usar solo en development.
> Un redeploy de `infra/deploy.sh` puede volver a pisar `ALLOWED_ORIGIN` con el hostname default del SWA; volver a correr `deploy-api.sh` después si aplica.

### 4. Lo que **no** cambia

Estos valores siguen iguales aunque cambie el dominio público — no modificar:

- `AZURE_TENANT_ID` y `AZURE_TENANT_TYPE`.
- `VITE_AZURE_AUTH_AUTHORITY` (depende solo del tenant, no del hostname).
- `AZURE_FRONT_CLIENT_ID` y `AZURE_API_CLIENT_ID` (las App Registrations son las mismas, solo se les agregan URIs).
- `JWKS_AUDIENCE` en el API (sigue siendo el client ID del API).

### 5. Verificar end-to-end

```bash
curl -I https://app.huella-test.com           # HTTP/2 200
curl -I https://api.huella-test.com/api/health # HTTP/2 200 (si aplica)
```

## Browser → `https://app.huella-test.com` → click "Iniciar sesión" → debe redirigir al login del tenant y volver a `/app/home` autenticado. Si rebota con `redirect_uri_mismatch` o `AADSTS50011`: revisar paso 1. Si el frontend carga pero las llamadas al API fallan con CORS: revisar paso 3.

## Forzar HTTPS

- Static Web App: force HTTPS por default. HTTP redirige automático. Sin acción.
- Front Door: el bicep ya configura `httpsRedirect: 'Enabled'` en la `route-default` (`infra/modules/frontDoor.bicep:173`).

---

## Troubleshooting

| Síntoma                            | Causa probable                           | Fix                                                                                                                          |
| ---------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Azure muestra "DNS not propagated" | TTL alto o cache local                   | Esperar 30 min, validar con `dig +trace`                                                                                     |
| `Validation failed` en SWA         | CNAME mal escrito (con `https://` o `/`) | Borrar y recrear el CNAME limpio                                                                                             |
| Cert SSL no se aprovisiona         | DNS resuelve a un destino incorrecto     | Verificar con `dig CNAME` que retorna el hostname Azure correcto                                                             |
| GoDaddy no deja borrar A `@`       | Parking activo                           | Settings del dominio → desactivar parking primero                                                                            |
| Apex no resuelve                   | Cache navegador local                    | `dig +trace @8.8.8.8 huella-test.com` ignora cache local                                                                     |
| Front Door TXT validation no pasa  | Nombre TXT mal armado                    | Debe ser `_dnsauth.<subdominio>` exacto, sin sufijo `.com` en el campo Name (GoDaddy agrega el dominio raíz automáticamente) |

---

## Tips operacionales GoDaddy

- **Auto-renew**: revisar en Settings del dominio. Por default está ON. Apagar si es solo prueba para evitar cargo al año siguiente.
- **Email forwarding**: GoDaddy lo ofrece gratis. Útil para `@huella-test.com` sin contratar Microsoft 365.
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
- `infra/monitor-ssl.sh`: script para monitorear el aprovisionamiento del certificado SSL en Front Door.
- `docs/infrastructure/StaticWebAppDeployment.md`: deployment general del frontend.
