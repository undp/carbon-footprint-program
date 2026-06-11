# Mantenedor de Unidades de medida

## Objetivo

Las unidades de medida son las unidades concretas con las que se expresan cantidades en el sistema (kg, L, kWh, km, t). Cada unidad pertenece a una magnitud y declara un factor de conversión a la unidad base de esa magnitud, lo que permite al sistema convertir valores entre unidades equivalentes de forma consistente.

Este mantenedor permite administrar el catálogo de unidades utilizadas por factores de emisión, tasas y capturas de inventarios.

## Alcance

- Unidades de medida: nombre, abreviatura, magnitud asociada, factor base y marca de unidad base.
- Validación de coherencia entre las unidades y su magnitud: como máximo una unidad base por magnitud, y su factor base debe ser exactamente 1.
- Unidades protegidas: la unidad con abreviatura `kg` y cualquier unidad base ya persistida no pueden modificarse ni eliminarse.
- Búsqueda por magnitud, nombre y abreviatura, y exportación del listado.
- No se gestionan en esta pantalla: las magnitudes (ver "Magnitudes"), las tasas derivadas (ver "Tasas") ni los factores de emisión.

## Acciones disponibles

### Crear unidad

Usa "Agregar unidad" para insertar una nueva fila. Es obligatorio tener al menos una magnitud creada previamente; en caso contrario el sistema avisa. Campos:

- **Magnitud**: obligatoria, se elige del listado.
- **Nombre**: obligatorio, hasta 100 caracteres.
- **Abreviatura**: obligatoria, única, hasta 30 caracteres. No puede contener barras (`/`) ni caracteres de control.
- **Factor base**: obligatorio, número positivo. Representa el factor de conversión a la unidad base de la magnitud.
- **¿Unidad base?**: si se marca, fija automáticamente el factor base a 1 y exige que no exista otra unidad base activa para la misma magnitud.

Si la abreviatura corresponde a una unidad previamente eliminada, esta se restaura ("Unidad restaurada exitosamente"); en algunos casos solo se restauran etiquetas y el resto de campos se conserva.

### Editar unidad

Al hacer clic en una fila se habilitan los campos editables. Cuando la unidad tiene referencias activas o es una unidad base ya persistida, se bloquean la magnitud, la abreviatura, el factor base y la marca de unidad base (los campos muestran un candado y tooltip explicativo), dejando editables únicamente los datos seguros.

### Eliminar unidad

Desde el botón de acciones se puede eliminar una unidad que no sea base de su magnitud y no esté protegida. La acción solicita confirmación. Las unidades en uso por factores de emisión o capturas deben gestionarse con cuidado: la API valida la integridad referencial y puede rechazar la operación.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Cambiar la magnitud, la abreviatura o el factor base de una unidad referenciada distorsionaría todas las conversiones y los factores de emisión que la usan. Por esa razón, el sistema bloquea automáticamente estos campos cuando la unidad tiene datos asociados. Eliminar una unidad referenciada por tasas, factores de emisión o capturas puede corromper inventarios calculados, ya que las tasas dependen de pares de unidades y los factores de emisión dependen de tasas.

> ℹ️ **Cuándo modificar**
> Para agregar unidades que faltan en el catálogo (siempre dentro de una magnitud existente), corregir factores base recientes que aún no tengan referencias, o ajustar nombres y abreviaturas en unidades sin datos asociados.

> 🚫 **Cuándo NO modificar**
> No alterar la unidad `kg` ni las unidades base de cada magnitud. No usar este mantenedor para definir unidades específicas de un país que ya tengan equivalente estándar: prefiere reutilizar las unidades existentes y mantener el catálogo coherente entre despliegues. Las variantes locales se modelan mediante seeds y parámetros del sistema.
