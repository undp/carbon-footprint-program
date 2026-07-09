# Mantenedor de Usuarios

## Objetivo

Esta pantalla administra los usuarios registrados en la plataforma y los roles de sistema con que operan en ella. Permite ver quién está dado de alta, qué rol global tiene cada persona, su actividad reciente y la composición administrativa del sistema.

Es la pantalla desde la cual se promueve a un usuario a administrador, se cambia su rol de sistema y se audita ese cambio en el tiempo. Conviene distinguir dos dimensiones de rol: el rol de sistema (Usuario, Admin, Superadmin) es global y se gestiona aquí; el rol dentro de una organización (Visualizador, Contribuyente, Administrador) es específico de cada organización y se administra desde la propia organización, no desde esta pantalla.

## Alcance

- Pestaña "Usuarios": lista de cuentas con rol de sistema Usuario. Para cada una se muestra Correo, las Organizaciones a las que pertenece y el rol que ocupa en cada una, Fecha de último acceso y Fecha de registro.
- Pestaña "Administradores": lista de cuentas con rol Admin o Superadmin, con su Rol, Fecha de registro y acciones de gestión.
- Indicadores agregados (KPIs):
  - En "Usuarios": total registrados y actividad (activos en los últimos N días, según el parámetro de sistema, e inactivos).
  - En "Administradores": total de Admin y de Super Administradores.
- Acciones operativas sobre los usuarios: consultar historial de roles, cambiar rol de sistema y promover a administrador.
- No se administran desde aquí los roles de cada usuario dentro de una organización ni los datos personales del usuario; esos flujos viven en otras pantallas y se mantienen separados.

## Acciones disponibles

### Ver historial de roles

Disponible para cualquier fila, abre el listado cronológico de cambios de rol de sistema del usuario, mostrando rol anterior, rol nuevo, fecha del cambio y quién lo realizó.

Sirve como pista de auditoría cuando se necesita reconstruir cómo evolucionaron los privilegios de una cuenta o responder a una consulta sobre por qué un usuario tiene determinados accesos.

### Cambiar rol de sistema

Disponible para usuarios con rol Superadmin sobre cualquier fila distinta de la propia. Permite mover al usuario entre los roles Usuario, Admin y Superadmin desde un diálogo dedicado.

Al bajar a Usuario se muestra una advertencia explícita de revocación de privilegios.

El sistema impide bajar de rol al último Superadmin existente: siempre debe quedar al menos uno activo. Tampoco se permite que un usuario modifique su propio rol.

### Promover a admin

Botón disponible solo para Superadmin en el encabezado de la pantalla. Abre un diálogo que permite seleccionar un usuario con rol Usuario y asignarle directamente rol Admin o Superadmin.

Equivale a un atajo del "Cambiar rol" enfocado al alta de administradores, pensado para flujos de incorporación de nuevos miembros al equipo operador.

### Búsqueda, filtros y exportación

La tabla soporta filtrado y ordenamiento por columna y la exportación de los resultados visibles. Las pestañas separan la operación cotidiana sobre cuentas regulares de la administración del equipo con privilegios.

Resulta útil combinar el filtrado por fecha de último acceso con la pestaña "Usuarios" para identificar cuentas inactivas, o usar la pestaña "Administradores" para auditar la composición del equipo con privilegios elevados.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Cambiar el rol de sistema modifica de inmediato los permisos globales del usuario en la plataforma: un Admin o Superadmin obtiene acceso transversal a los mantenedores y a las pantallas de administración, mientras que la baja a Usuario revoca esos accesos. El cambio queda registrado en el historial de roles del usuario para fines de auditoría. La asignación de un usuario a las organizaciones a las que pertenece no se altera por estos cambios.

> ℹ️ **Cuándo intervenir**
> Las promociones a Admin o Superadmin deben acompañar cambios efectivos en las responsabilidades del equipo operador. La consulta del historial es útil ante incidentes, traspasos de funciones o solicitudes de auditoría. Se recomienda revisar periódicamente la composición de la pestaña "Administradores" para verificar que el listado siga reflejando al equipo activo.

> 🚫 **Cuándo NO intervenir**
> No se debe usar esta pantalla para resolver problemas de acceso a una organización puntual: para eso existe la gestión de miembros dentro de cada organización, con sus propios roles (Visualizador, Contribuyente, Administrador). Tampoco corresponde otorgar rol Admin o Superadmin como medida temporal sin un proceso definido: si se requiere un acceso acotado, debe gestionarse por el canal correspondiente y revertirse cuando termine.
