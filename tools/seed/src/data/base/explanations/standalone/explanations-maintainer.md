# Mantenedor de Explicaciones

## Objetivo

Esta pantalla administra el catálogo de Explicaciones que la plataforma muestra detrás de los íconos de información (i) presentes en distintas pantallas: encabezados de mantenedor, pasos de captura de inventarios, secciones de proyectos de reducción, formularios de profiling, entre otros. Cada Explicación está identificada por un `slug` único y entrega contexto textual al usuario que consulta o captura información.

Las Explicaciones son contenido markdown y se renderizan con soporte de GFM (tablas, listas de tareas, etc.), fórmulas matemáticas mediante KaTeX y HTML embebido, lo que permite construir manuales ricos y consistentes en formato.

## Alcance

- Permite gestionar el contenido markdown de las Explicaciones existentes en el sistema, identificadas por `slug`, nombre y descripción.
- Cada Explicación se asocia a un punto concreto de la interfaz mediante su `slug`; la asociación se establece en el código de la pantalla correspondiente y no se administra desde aquí.
- No se administra desde esta pantalla la creación de nuevos puntos de exposición ni la asignación de `slugs` a pantallas: eso ocurre a nivel de código.
- El contenido tiene un tope de 10.000 caracteres por Explicación.

## Acciones disponibles

### Editar contenido

1. Localizar la Explicación en la tabla (es posible buscar por nombre o descripción).
2. Abrir la fila para acceder al editor.
3. Modificar el contenido en la pestaña "Editar" y revisarlo en la pestaña "Vista Previa" antes de guardar.

El editor expone vista previa con el mismo renderizador que se usa en la aplicación (markdown + GFM + KaTeX + HTML), de modo que lo visualizado coincide con lo que verá el usuario final. Al guardar, los cambios se aplican inmediatamente en todos los puntos donde se muestra el `slug`.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Las Explicaciones son contenido informativo: editarlas no altera datos de inventarios, organizaciones ni cálculos. Sí cambia inmediatamente lo que ven todos los usuarios al abrir el ícono (i) correspondiente en la aplicación.

> ℹ️ **Cuándo modificar**
> Las Explicaciones marcadas como "standalone" en el catálogo se siembran desde archivos markdown del repositorio, ubicados en `packages/database/src/prisma/seeds/data/base/explanations/standalone/`. La convención del proyecto es que los cambios persistentes y de alcance general se realicen editando esos archivos `.md` y propagándolos por el flujo de seeds, no desde la interfaz. La edición desde esta pantalla es adecuada para correcciones puntuales en producción o para personalizaciones específicas del país que no deban viajar de regreso al repositorio compartido.

> 🚫 **Cuándo NO modificar**
> No se recomienda editar desde la interfaz contenidos que se mantienen vivos en el repositorio: una próxima ejecución de seeds puede sobrescribir el cambio. En esos casos, abrir un cambio sobre el archivo `.md` correspondiente. Tampoco usar las Explicaciones para almacenar avisos temporales o información sensible: el contenido es público para cualquier usuario autenticado que abra la pantalla asociada.
