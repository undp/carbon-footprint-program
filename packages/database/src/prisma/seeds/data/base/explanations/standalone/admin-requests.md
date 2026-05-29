# Administración de Solicitudes

## Objetivo

Esta pantalla centraliza todas las solicitudes que las organizaciones envían a la plataforma —postulaciones a Reconocimiento y solicitudes de inscripción— para que el administrador pueda revisarlas, gestionar su estado y dar seguimiento al flujo de aprobación.

Sirve como bandeja de entrada operativa: muestra cuántas solicitudes hay pendientes, cuáles ya fueron aprobadas y cuáles quedaron con observaciones, y permite abrir cada una para revisarla en profundidad. Es el punto único desde el cual el administrador interviene en los procesos de revisión asociados al ciclo de vida de cada postulación.

## Alcance

- Listado de solicitudes con columnas para Organización, Tipo de solicitud, Periodo, Estado y Fecha de envío.
- Indicadores agregados (KPIs) en la cabecera por estado: Total, Pendientes, Aprobadas y con Observaciones.
- Las aprobaciones automáticas ("Otorgado") se contabilizan junto a las aprobadas; las rechazadas no se contabilizan en los KPIs pero sí aparecen en la tabla y pueden filtrarse.
- Tipos de solicitud cubiertos: inscripción de organización, Reconocimiento de medición, Reconocimiento de verificación, Reconocimiento de reducción y Reconocimiento de neutralización.
- Estados manejados: Pendiente, Aprobada, Con Observaciones, Rechazada y Otorgado (aprobada automáticamente).
- La acción sobre cada solicitud abre el diálogo de revisión correspondiente al tipo (inventario, proyecto de reducción u organización), donde se realiza la evaluación.
- No se gestionan desde esta lista los datos internos de los inventarios, los proyectos de reducción ni los catálogos asociados: la lista sólo orquesta la revisión y los abre en su pantalla correspondiente.

## Acciones disponibles

### Revisar o editar una solicitud

Cada fila expone una acción que abre el diálogo de revisión. Cuando la solicitud está en estado Pendiente el ícono cambia a edición y permite intervenirla activamente; en los demás estados se accede en modo lectura para auditar el resultado.

Desde el diálogo de revisión se ejecutan las transiciones de estado correspondientes al tipo de solicitud: aprobación, devolución con observaciones o rechazo.

Cada decisión queda asociada al revisor y a la marca de tiempo en que se realizó, lo que se refleja luego en el historial de la organización solicitante y permite reconstruir el camino completo de la postulación.

### Consultar KPIs

Las tarjetas superiores resumen el volumen y el estado de las solicitudes. Permiten priorizar la revisión sobre lo Pendiente y supervisar el caudal de aprobaciones y observaciones de forma transversal a todos los tipos de Reconocimiento.

Funcionan como un indicador rápido de carga operativa antes de abrir la tabla en detalle.

### Búsqueda, filtros y exportación

La tabla soporta búsqueda libre por nombre de organización, tipo, estado y periodo. Adicionalmente permite filtrar y ordenar por cualquier columna y exportar los resultados visibles para análisis o reportes externos.

La búsqueda tolera diferencias de tildes y mayúsculas, lo que facilita encontrar rápidamente una postulación por una coincidencia parcial de nombre o periodo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Aprobar o rechazar una solicitud genera efectos persistentes sobre la organización solicitante (otorgamiento o no del reconocimiento, registro en su historial). Devolver con observaciones reabre el flujo del lado de la organización, que deberá ajustar la postulación antes de reenviarla. Por eso conviene confirmar los antecedentes antes de cerrar una solicitud.

> ℹ️ **Cuándo intervenir**
> Es esperable revisar las solicitudes Pendientes de forma periódica para mantener un ciclo razonable de respuesta. También se entra a una solicitud ya cerrada cuando se requiere auditar la decisión, responder consultas o respaldar un proceso ante el regulador del país.

> 🚫 **Cuándo NO intervenir**
> No se debe modificar una solicitud por errores que la propia organización puede corregir en su flujo (por ejemplo, datos del inventario): para eso existe la devolución con observaciones. Tampoco corresponde reabrir desde aquí decisiones ya firmes salvo que exista una causa documentada que lo justifique, ni utilizar esta pantalla para gestionar tipos de Reconocimiento o catálogos asociados.
