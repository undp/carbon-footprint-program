# Administración de Organizaciones

## Objetivo

Esta pantalla concentra una vista global de todas las organizaciones registradas en la plataforma y permite al administrador inspeccionar, auditar y, en caso necesario, bloquear o desbloquear su acceso.

No es un mantenedor clásico: las organizaciones se autorregistran desde la aplicación pública, por lo que aquí no se crean ni se editan sus datos maestros. Se utiliza principalmente para tener visibilidad operativa sobre el estado del ecosistema (cuántas organizaciones existen, en qué etapa se encuentran, cuáles tienen mediciones cargadas), revisar el detalle de una organización particular y aplicar medidas correctivas frente a comportamientos anómalos o solicitudes formales del regulador.

## Alcance

- Listado completo de organizaciones con Rubro, Sub-Rubro, Tamaño, Estado, fecha de la última medición y emisiones totales acumuladas en tCO₂e.
- Indicadores agregados (KPIs) en la parte superior: total de organizaciones, las que ya tienen mediciones cargadas, las registradas (acreditadas pero aún sin medición) y las no acreditadas.
- Estados visibles en la columna Estado: "con Mediciones" (acreditada y con inventarios), "Acreditada" (sin inventarios todavía), "No acreditada" y "Bloqueada".
- Acceso al perfil completo de cada organización y al historial de sus postulaciones.
- Acciones de control de acceso: bloquear y desbloquear.
- No se gestionan desde aquí los miembros internos de cada organización, sus inventarios ni los reconocimientos otorgados; cada uno se administra desde su propia pantalla.

## Acciones disponibles

### Ver detalles de la organización

Abre el perfil de la organización, donde se consulta su información declarada, su composición y los datos relevantes para soporte o auditoría, sin permitir editarlos.

Es el punto de partida natural cuando llega una consulta de soporte: permite confirmar identidad, ubicar a quién pertenece la cuenta y revisar de qué información dispone el sistema antes de tomar cualquier acción correctiva.

### Ver historial

Abre el historial de postulaciones y eventos asociados a la organización, útil para revisar cómo ha evolucionado en el sistema: postulaciones, aprobaciones, observaciones, rechazos y aprobaciones automáticas.

Es la fuente recomendada para responder consultas sobre por qué una organización aparece con un determinado estado o por qué una postulación no fue aprobada.

### Bloquear organización

Marca la organización como bloqueada. A partir de ese momento la organización no puede usar las funcionalidades del sistema.

La acción se confirma desde un cuadro de diálogo dedicado y queda reflejada en la columna Estado con la etiqueta "Bloqueada". Solo está disponible sobre organizaciones que no estén ya bloqueadas.

### Desbloquear organización

Disponible solo sobre organizaciones bloqueadas, restituye el acceso a la plataforma.

Se confirma también mediante un cuadro de diálogo dedicado y la organización vuelve al estado que le corresponda según su acreditación y la presencia de inventarios.

### Búsqueda, filtros y exportación

La tabla soporta búsqueda libre por nombre, rubro, sub-rubro, tamaño y estado, además de filtrado y ordenamiento por columna y exportación de los resultados mostrados.

Esto facilita armar listados focalizados para auditoría o soporte. La búsqueda es tolerante a diferencias de tildes y mayúsculas, por lo que sirve también para localizar rápidamente una organización por una coincidencia parcial.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Bloquear una organización suspende su operación pero no elimina sus inventarios, miembros ni postulaciones previas: estos datos permanecen y vuelven a estar disponibles si la organización se desbloquea. Los reconocimientos ya otorgados no se revocan automáticamente al bloquear; si se requiere ese efecto debe gestionarse por el flujo de revisión correspondiente.

> ℹ️ **Cuándo intervenir**
> El bloqueo se justifica frente a usos indebidos confirmados de la plataforma, datos manifiestamente fraudulentos o solicitudes formales del regulador del país. Las acciones de ver detalles e historial pueden usarse libremente como apoyo a soporte y auditoría sin riesgo sobre los datos.

> 🚫 **Cuándo NO intervenir**
> No corresponde bloquear una organización por errores de carga, demora en sus postulaciones o discrepancias en la calidad de los datos: para esos casos existen los flujos de observaciones sobre cada solicitud. Tampoco debe usarse esta pantalla para corregir información declarada por la organización, que se gestiona desde sus propios formularios, ni para administrar miembros internos de la organización.
