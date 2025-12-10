// ============================================
// UNDP Huella Latam - ACR Compartido (Dev)
// ============================================
// Plantilla de parámetros para desplegar solo el
// Azure Container Registry compartido en el RG
// de desarrollo.

using '../main.shared.bicep'

// Nombre globalmente único para el ACR compartido
param acrName = 'huellalatamacr'

// SKU para el ACR (Basic/Standard/Premium)
param acrSku = 'Basic'

// Etiqueta de entorno para el stack compartido
param environment = 'shared'

