# Deployment de Frontend con Azure Static Web Apps y Front Door

Este documento describe cómo desplegar la aplicación web del proyecto UNDP Huella Latam utilizando Azure Static Web Apps con Azure Front Door.

## 🎯 ¿Por Qué Dos Scripts de Despliegue?

### La Separación: Infraestructura vs Aplicación

El proceso de despliegue está dividido en **dos scripts independientes** por razones estratégicas:

#### 1️⃣ `deploy.sh` - Despliegue de Infraestructura

**Cuándo ejecutar**: Una vez al inicio o cuando cambies la infraestructura

```bash
cd infra
./deploy.sh
```

**Qué hace**:

- ✅ Crea/actualiza recursos de Azure (Key Vault, Storage, PostgreSQL, Static Web App, Front Door)
- ✅ Configura permisos y secretos
- ✅ Establece la red y seguridad
- ⏱️ **Tiempo**: 5-10 minutos
- 💰 **Costo**: Crea recursos que generan cobros

**Cuándo re-ejecutar**:

- Cambias parámetros de infraestructura (`main.dev.bicepparam`)
- Agregas nuevos recursos
- Actualizas SKUs o configuraciones de Azure
- Primera vez que despliegas

#### 2️⃣ `deploy-web.sh` - Despliegue de Aplicación

**Cuándo ejecutar**: Cada vez que actualices el código del frontend

```bash
cd infra
./deploy-web.sh
```

**Qué hace**:

- ✅ Construye tu aplicación React/Vite (`pnpm build`)
- ✅ Sube el build a Azure Static Web Apps
- ✅ Actualiza tu app en producción
- ⏱️ **Tiempo**: 1-3 minutos
- 💰 **Costo**: Solo bandwidth (negligible en desarrollo)

**Cuándo re-ejecutar**:

- Hiciste cambios en el código del frontend
- Arreglaste un bug
- Agregaste una nueva feature
- Actualizaste estilos o componentes

### 🎁 Beneficios de Esta Separación

| Aspecto       | Con Separación               | Todo en Uno                     |
| ------------- | ---------------------------- | ------------------------------- |
| **Velocidad** | ⚡ 1-3 min (solo app)        | 🐌 10+ min (todo siempre)       |
| **Seguridad** | 🔒 Infraestructura estable   | ⚠️ Más oportunidades de error   |
| **Iteración** | 🚀 Deploy rápido de cambios  | 🐢 Esperas innecesarias         |
| **Costos**    | 💰 Solo pagas lo que cambias | 💸 Más validaciones = más costo |

### 📊 Flujo de Trabajo Típico

```
Primera Vez:
┌─────────────┐
│ deploy.sh   │  ← Crea infraestructura (10 min)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│deploy-web.sh│  ← Despliega app (2 min)
└─────────────┘

Actualizaciones de Código (95% del tiempo):
┌─────────────┐
│deploy-web.sh│  ← Solo esto (2 min)
└─────────────┘

Cambios de Infraestructura (5% del tiempo):
┌─────────────┐
│ deploy.sh   │  ← Actualiza recursos (8 min)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│deploy-web.sh│  ← Redespliega app (2 min)
└─────────────┘
```

## Arquitectura

La solución utiliza:

- **Azure Static Web Apps**: Hosting optimizado para aplicaciones web estáticas (React/Vite)
- **Azure Front Door**: CDN global con SSL automático, aceleración y protección DDoS

### Ventajas

1. **Rendimiento Global**: CDN distribuido globalmente con baja latencia
2. **SSL Automático**: Certificados HTTPS gestionados automáticamente
3. **CI/CD Integrado**: Despliegue automático desde Git
4. **Escalabilidad**: Escala automáticamente según demanda
5. **Costos Optimizados**: Plan gratuito disponible para desarrollo

## Configuración

### 1. Parámetros de Infraestructura

Edita `infra/params/main.dev.bicepparam`:

```bicep
// Static Web App
param staticWebAppSkuName = 'Free' // Usa 'Standard' para producción
param staticWebAppRepositoryUrl = '' // Opcional: URL del repo GitHub
param staticWebAppBranch = 'main'

// Front Door
param enableFrontDoor = false // Set to true for staging/production to enable global CDN (~$35/month)
param frontDoorSkuName = 'Standard_AzureFrontDoor' // Usa 'Premium_AzureFrontDoor' para características avanzadas
param frontDoorCustomDomain = '' // Opcional: tu dominio personalizado (ej: 'app.tudominio.com') - automated by Bicep

// WAF Configuration
param frontDoorEnableManagedRules = false // true requiere Premium SKU - habilita Microsoft Default RuleSet + Bot Manager
param frontDoorWafMode = 'Detection' // 'Detection' (monitorea) o 'Prevention' (bloquea)
param frontDoorRateLimitThreshold = 100 // Requests por minuto por IP (rango: 10-10000)
```

### 2. SKUs Disponibles

#### Static Web Apps

- **Free**:
  - 100 GB bandwidth/mes
  - 0.5 GB storage
  - Ideal para desarrollo y pruebas
- **Standard**:
  - 100 GB bandwidth incluido
  - 250 GB storage
  - Dominios personalizados
  - SLA del 99.95%

#### Azure Front Door

- **Standard** (~$35/mes):
  - CDN global con 118+ edge locations
  - WAF con **custom rules** (rate limiting)
  - Compresión automática
  - Modo Detection (monitorea sin bloquear)
  - **No incluye**: Managed rules (requiere Premium)
- **Premium** (~$330/mes):
  - Todo lo de Standard +
  - **Managed rules**: Microsoft Default RuleSet (OWASP Top 10) + Bot Manager
  - Request body inspection
  - Private Link a origins
  - Microsoft Threat Intelligence

#### Optimización de Costos: Health Probes Desactivados

Los **health probes están desactivados** en Front Door porque:

- Solo hay un origen (Static Web App)
- Con un solo origen, Front Door **siempre enruta el tráfico** independientemente del estado del health probe
- Los health probes **no afectan el comportamiento** de enrutamiento en este escenario
- Desactivarlos **ahorra costos de ancho de banda** sin impacto funcional

💡 **Recomendación de Azure**: Habilita health probes solo cuando tengas dos o más orígenes para alta disponibilidad.

#### Configuración del WAF (Web Application Firewall)

El WAF protege tu aplicación contra ataques comunes:

**Con Standard SKU** (configuración por defecto):

- ✅ **Custom rules**: Rate limiting configurable (100 req/min por IP por defecto)
- ✅ **Modo Detection**: Monitorea y registra amenazas sin bloquear tráfico
- ❌ **Managed rules**: No disponibles (requiere Premium SKU)

**Con Premium SKU** (para producción):

- ✅ **Managed rules**: Microsoft Default RuleSet 2.1 (protección OWASP Top 10)
- ✅ **Bot Manager**: Detección y bloqueo de bots maliciosos
- ✅ **Modo Prevention**: Bloquea activamente amenazas detectadas
- ✅ **Request body inspection**: Analiza payloads de requests

**Parámetros configurables**:

```bicep
param frontDoorEnableManagedRules = false  // true solo con Premium SKU
param frontDoorWafMode = 'Detection'       // 'Detection' o 'Prevention'
param frontDoorRateLimitThreshold = 100    // Requests/minuto por IP (10-10000)
```

**Recomendaciones**:

- **Desarrollo**: Standard SKU + Detection mode + Rate limiting básico
- **Staging**: Standard SKU + Prevention mode (si no hay falsos positivos)
- **Producción**: Premium SKU + Managed rules + Prevention mode

## Despliegue

### Paso 1: Desplegar Infraestructura

```bash
cd infra
./deploy.sh
```

Este comando despliega:

- Key Vault
- Storage Account
- PostgreSQL Database
- **Static Web App**
- **Azure Front Door** (si está habilitado)

### Paso 2: Desplegar Aplicación Web

```bash
cd infra
./deploy-web.sh
```

Este script:

1. Obtiene el nombre de la Static Web App desde el deployment stack
2. Recupera el token de despliegue
3. Construye la aplicación web con `pnpm build`
4. Despliega el contenido usando SWA CLI al ambiente de **production**
5. Verifica que el deployment fue exitoso
6. Muestra las URLs de acceso

### Modo Dry Run (Simulación)

Para validar el deployment sin hacer cambios:

```bash
cd infra
DRY_RUN=true ./deploy-web.sh
```

**Qué hace en Dry Run**:

- ✅ Verifica autenticación de Azure CLI
- ✅ Valida variables de entorno
- ✅ Confirma que la infraestructura existe
- ✅ Muestra comandos que se ejecutarían (build, deploy)
- ✅ No construye ni despliega la aplicación
- ✅ Útil para verificar configuración antes del deployment real

**Cuándo usar Dry Run**:

- Antes de tu primer deployment
- Para verificar configuración después de cambios
- Troubleshooting de problemas de deployment
- Validar que todas las herramientas están instaladas

### URLs Generadas

Después del despliegue, tendrás:

- **Static Web App URL**: `https://[swa-name].azurestaticapps.net`
- **Front Door URL**: `https://[endpoint-name].azurefd.net` (si está habilitado)

**Recomendación**:

- **Desarrollo**: Usa la URL de Static Web App directamente (Free, sin costos)
- **Producción**: Usa la URL de Front Door para aprovechar el CDN global (requiere Front Door habilitado)

## Dominio Personalizado

**Automatización**: Front Door custom domains se pueden pre-configurar vía `FRONT_DOOR_CUSTOM_DOMAIN` en `.envrc` y Bicep los configurará automáticamente. Static Web App custom domains requieren configuración manual con `az staticwebapp hostname set` después del despliegue.

### Opción 1: Dominio Personalizado con Static Web App (sin Front Door)

Si `enableFrontDoor = false`, puedes configurar un dominio directamente en Static Web App (requiere pasos manuales):

1. **Primero, crea el registro CNAME** en tu proveedor DNS:
   - Tipo: CNAME
   - Nombre: tu subdominio (ej: `app`)
   - Valor: `[swa-name].azurestaticapps.net`

2. **Verifica la propagación DNS**:

```bash
dig app.tudominio.com CNAME
```

3. **Configura el dominio en Azure**:

```bash
az staticwebapp hostname set \
  --name [swa-name] \
  --resource-group $AZURE_RESOURCE_GROUP \
  --hostname app.tudominio.com
```

4. Azure validará automáticamente el dominio y provisionará el certificado SSL (puede tomar unos minutos)

### Opción 2: Dominio Personalizado con Front Door

Si `enableFrontDoor = true`, configura el dominio en Front Door:

1. **Agrega el dominio personalizado**:

```bash
az afd custom-domain create \
  --resource-group $AZURE_RESOURCE_GROUP \
  --profile-name [front-door-profile-name] \
  --custom-domain-name [nombre-sin-puntos] \
  --host-name app.tudominio.com \
  --certificate-type ManagedCertificate
```

2. **Configura el DNS** en tu proveedor:
   - Tipo: CNAME
   - Nombre: app (o tu subdominio)
   - Valor: `[endpoint-name].azurefd.net`

3. **Validación**: Azure validará automáticamente y provisionará SSL

### Configuración Automática vía Parámetros

Puedes pre-configurar el dominio personalizado para Front Door en `.envrc`:

```bash
# Para Front Door
export FRONT_DOOR_CUSTOM_DOMAIN='app.tudominio.com'
```

Luego ejecuta `./deploy.sh` y el dominio se configurará automáticamente.

**Nota**: Para dominios personalizados en Static Web App (sin Front Door), debes configurarlos manualmente usando `az staticwebapp hostname set` después del despliegue.

## Variables de Entorno

Para configurar variables de entorno en la Static Web App:

```bash
# Vía CLI
az staticwebapp appsettings set \
  --name [swa-name] \
  --resource-group $RESOURCE_GROUP \
  --setting-names VITE_API_URL=https://api.tudominio.com
```

O configúralas en el portal de Azure: Static Web App > Configuration > Application settings

## Monitoreo

### Ver Logs

```bash
# Logs de despliegue
az staticwebapp show \
  --name [swa-name] \
  --resource-group $RESOURCE_GROUP
```

### Métricas en Azure Portal

1. Navega a tu Static Web App
2. Ve a "Metrics" para ver:
   - Requests
   - Data transfer
   - Response times

3. Navega a Front Door Profile
4. Ve a "Metrics" para ver:
   - Cache hit ratio
   - Origin latency
   - Request count por región

## Troubleshooting

### Validar Configuración sin Deployar

Usa el modo dry run para diagnosticar problemas sin hacer cambios:

```bash
# Validar infraestructura
DRY_RUN=true ./deploy.sh

# Validar deployment de aplicación
DRY_RUN=true ./deploy-web.sh
```

Esto mostrará:

- Variables de entorno configuradas
- Recursos que se crearían/modificarían
- Comandos que se ejecutarían
- Posibles errores de configuración

### Error: "Could not find Static Web App name"

Asegúrate de que la infraestructura esté desplegada primero:

```bash
cd infra
./deploy.sh
```

### Error: SWA CLI no encontrado

El script instalará automáticamente SWA CLI, pero puedes instalarlo manualmente:

```bash
npm install -g @azure/static-web-apps-cli
```

### Error: "Deploying to environment: preview" en lugar de production

Si ves que despliega a `preview` en lugar de `production`, verifica que `deploy-web.sh` incluya el flag `--env production`:

```bash
swa deploy \
  --deployment-token "$DEPLOYMENT_TOKEN" \
  --app-location . \
  --output-location dist \
  --env production \
  --no-use-keychain
```

### Error: "CNAME Record is invalid" al configurar dominio personalizado

Debes crear el registro CNAME en tu DNS **antes** de ejecutar el comando de Azure. El DNS debe estar propagado para que Azure pueda validarlo.

### 404 en rutas de la aplicación

Para apps SPA con client-side routing, verifica que `staticwebapp.config.json` esté configurado en `/apps/web/public/`.

**Configuración canónica**: Ver el archivo completo y actualizado en [`apps/web/public/staticwebapp.config.json`](../../apps/web/public/staticwebapp.config.json)

**Características clave de la configuración**:

- **navigationFallback**: Redirige rutas desconocidas a `/index.html` para client-side routing
- **responseOverrides**: Convierte 404 en 200 para SPA routing
- **globalHeaders**: Headers de seguridad modernos incluyendo:
  - Content-Security-Policy (sin `'unsafe-eval'` por seguridad)
  - Strict-Transport-Security (HSTS)
  - Permissions-Policy (deshabilita APIs no usadas)
  - X-Frame-Options + frame-ancestors (protección contra clickjacking)
- **mimeTypes**: MIME types modernos (`application/javascript` en lugar de `text/javascript`)

**Ejemplo mínimo alternativo** (solo SPA routing):

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*"]
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

**Nota**: El patrón `exclude: ["/assets/*"]` debe coincidir con tu estructura. Vite usa `/assets/*` por defecto.

### Sitio muestra "Congratulations on your new site!"

Esto significa que el deployment fue al ambiente `preview` en lugar de `production`. Re-ejecuta `./deploy-web.sh` con la versión actualizada del script que incluye `--env production`.

## Costos Estimados

### Opción 1: Solo Static Web App (Recomendado para Desarrollo)

- Static Web App Free: **$0/mes**
- Front Door: **Deshabilitado** (`enableFrontDoor = false`)
- **Total: $0/mes** ✅

### Opción 2: Con Front Door Standard (Desarrollo/Staging)

- Static Web App Free: $0/mes
- Front Door Standard: ~$35/mes (base) + ~$0.01/GB tráfico
- WAF (incluido): Custom rules + Rate limiting
- **Total: ~$35-40/mes**

⚠️ **Nota**: Front Door tiene un costo base incluso sin tráfico. Para desarrollo puro, desactívalo en `main.dev.bicepparam`:

```bicep
param enableFrontDoor = false
```

### Opción 3: Producción con Front Door Standard

- Static Web App Standard: $9/mes
- Front Door Standard: ~$35/mes + tráfico
- WAF (incluido): Custom rules + Rate limiting
- **Total: ~$44-50/mes + tráfico adicional**

### Opción 4: Producción con Front Door Premium (Máxima Seguridad)

- Static Web App Standard: $9/mes
- Front Door Premium: ~$330/mes + tráfico
- WAF Premium: Managed rules (OWASP Top 10) + Bot Manager
- **Total: ~$339-350/mes + tráfico adicional**

**Recomendación**: Usa Standard para la mayoría de casos. Premium solo si necesitas:

- Protección avanzada contra bots
- Microsoft Threat Intelligence
- Reglas OWASP automáticas

### Comparación de Costos

| Escenario            | Static Web App | Front Door       | Total Mensual |
| -------------------- | -------------- | ---------------- | ------------- |
| **Desarrollo Local** | Free           | ❌ Deshabilitado | **$0**        |
| **Staging/Preview**  | Free           | ✅ Habilitado    | **~$35**      |
| **Producción**       | Standard ($9)  | ✅ Habilitado    | **~$44+**     |

## Recursos Adicionales

- [Azure Static Web Apps Docs](https://learn.microsoft.com/azure/static-web-apps/)
- [Azure Front Door Docs](https://learn.microsoft.com/azure/frontdoor/)
- [SWA CLI](https://azure.github.io/static-web-apps-cli/)

## Limpieza de Recursos

Para eliminar todos los recursos:

```bash
cd infra
./delete-stack.sh
```

⚠️ **Nota**: Esto eliminará permanentemente todos los recursos, incluyendo datos.
