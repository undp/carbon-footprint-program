# Sellos

## Objetivo

Esta pantalla administra los Sellos gráficos que la plataforma asocia a cada tipo de Reconocimiento. Un Sello es la imagen oficial con la que se identifica visualmente el reconocimiento otorgado a una organización (en certificados, comunicaciones y materiales públicos).

Aquí se sube, se activa, se reemplaza y se consulta el historial de sellos por cada tipo de Reconocimiento. Está pensada para que el administrador pueda renovar el sello vigente cuando cambia la imagen institucional, sin afectar el funcionamiento del flujo de aprobación: el Sello es un elemento decorativo asociado al tipo de Reconocimiento y su cambio no altera los procesos de revisión ni las aprobaciones ya otorgadas.

## Alcance

- Tarjeta por cada tipo de Reconocimiento configurado en la plataforma: Reconocimiento de medición, Reconocimiento de verificación, Reconocimiento de reducción, Reconocimiento de neutralización y Reconocimiento de inscripción de organización.
- Por cada tipo se muestra: el Sello activo (si existe), un Chip con su estado (Activo / Inactivo) y el contador de elementos en el historial.
- Acciones por tarjeta: Subir sello, Activar uno del historial, Desactivar el activo y Ver historial.
- Formatos aceptados al subir: PNG, SVG, JPG o WebP, con un tamaño máximo definido por la plataforma.
- Cualquier otro formato es rechazado con un mensaje explícito en la propia tarjeta, sin alterar el sello vigente.
- Los tipos de Reconocimiento vienen predefinidos por la plataforma y no se administran desde aquí.
- Tampoco se gestionan los reconocimientos otorgados a cada organización (esos se ven en sus pantallas correspondientes): esta pantalla se limita al activo gráfico asociado a cada tipo.

## Acciones disponibles

### Subir sello

Abre el selector de archivos y permite cargar una nueva imagen. Si la subida es exitosa el sello queda registrado en el historial del tipo correspondiente y se ofrece activarlo desde el diálogo de historial.

Si el archivo no cumple con el tipo o el tamaño permitido se muestra el error en la propia tarjeta y el archivo no se sube.

Subir un sello no lo activa automáticamente: queda disponible en el historial hasta que el administrador decida promoverlo a activo. Esto permite preparar varias propuestas de imagen antes de elegir cuál se publica.

### Activar un sello

Desde el historial se puede activar cualquier sello previamente subido.

Si el tipo ya tiene un sello activo, se abre un diálogo de confirmación con la previsualización del saliente (que quedará inactivo) y del entrante (que pasará a activo), explicitando el reemplazo. Si no hay sello activo, la activación se aplica directamente sin pasos adicionales.

### Desactivar el sello activo

Quita el sello vigente sin eliminar el archivo: el sello pasa al historial como inactivo y puede volver a activarse más adelante.

La desactivación se confirma desde un diálogo que advierte que el tipo de Reconocimiento quedará sin sello activo hasta que se active otro.

### Ver historial

Abre el listado de todos los sellos cargados para ese tipo de Reconocimiento, indicando cuál es el activo (si lo hay) y permitiendo activar uno del histórico.

El recién subido aparece destacado al final del flujo de carga para facilitar su activación inmediata.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> El Sello es exclusivamente decorativo: cambiarlo no afecta aprobaciones ni el estado de los reconocimientos ya otorgados. Sí impacta visualmente todas las superficies donde la plataforma muestre el sello vigente del tipo de Reconocimiento (certificados nuevos, vistas públicas y comunicaciones). El historial se conserva íntegro para facilitar la trazabilidad de versiones.

> ℹ️ **Cuándo intervenir**
> Lo habitual es subir o reemplazar un sello cuando la entidad rectora del país define una nueva versión de la imagen institucional, al iniciar la operación de la plataforma o cuando se detectan inconsistencias gráficas con la normativa vigente. También se interviene cuando una versión previa fue activada por error y se necesita restituir la imagen oficial.

> 🚫 **Cuándo NO intervenir**
> No se debe usar el reemplazo del sello como mecanismo para revertir o corregir reconocimientos otorgados —los flujos de revisión correspondientes existen para eso— ni para gestionar tipos de Reconocimiento distintos a los predefinidos por la plataforma. Tampoco corresponde dejar un tipo de Reconocimiento sin sello activo por períodos prolongados si la operación lo requiere.
