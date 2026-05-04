# 💧 Consumo de agua y tratamiento de aguas residuales

Esta categoría corresponde a **las emisiones asociadas al uso de agua y su disposición posterior** de esta.

Incluye:

- El **consumo de agua proveniente de la red pública**
- La **disposición de aguas residuales hacia la red de alcantarillado**

Estas emisiones se generan debido a la **energía utilizada para captar, tratar, transportar y depurar el agua** dentro de los sistemas públicos de abastecimiento y saneamiento.

⚠️ Si tu empresa dispone el agua en **sistemas distintos al alcantarillado público** (por ejemplo: infiltración, riego, tratamiento propio, lagunas, etc.), deberás realizar un **cálculo específico para ese sistema**.

⚠️ En esta subcategoría debes declarar **dos elementos** de forma separada:

1. **Agua consumida desde la red pública**
2. **Agua residual descargada a la red**

---

## 📘 ¿Preguntas que te pueden ayudar a identificar esta información?

- ¿Tu empresa recibe **facturas o boletas de consumo de agua**?
- ¿Estás conectado a una **red pública de agua potable**?
- ¿Tu instalación tiene **medidores de agua**?
- ¿El agua utilizada en los procesos es **descargada al sistema de alcantarillado**?
- ¿El agua utilizada en operaciones sanitarias, limpieza o procesos industriales es eliminada por desagüe?

Si respondiste **sí a alguna de estas preguntas**, debes declarar esta información en esta subcategoría.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo de emisiones se basa en la multiplicación de un **factor de emisión por la cantidad de agua consumida/desechada**.

- El cálculo para el agua consumida y desechada es mediante la siguiente fórmula:

> $CO₂e$ = $Cantidad\ de\ agua \times Factor\ de\ emisión$

---

## 🧭 Paso a paso para completar la información

### 1️⃣ Identificar la fuente de suministro

Debes indicar el **origen del agua utilizada**.

Ejemplo:

- Red pública de agua potable
- Empresa sanitaria
- Sistema municipal de abastecimiento

---

### 2️⃣ Recolectar la información de consumo de agua

Debes identificar la **cantidad total anual de agua consumida**.

Puedes obtener esta información desde:

- **Boletas o facturas de agua**
- **Medidores de agua instalados en la instalación**
- Registros internos de consumo
- Reportes del área de mantenimiento
- Sistemas de monitoreo de consumo hídrico
- Reportes del proveedor sanitario

⚠️ Lo ideal es utilizar el **consumo anual total**.

---

### 3️⃣ Si solo tienes información mensual

Puedes sumar los consumos mensuales:

> **Agua consumida anual** = $Suma\ del\ consumo\ mensual$

Ejemplo:

Si el consumo promedio mensual es:

- **500 m³ de agua**

Entonces:

**Total agua consumida en el año** = $500 \times 12 = 6.000\ m³/año$

---

### 4️⃣ Determinar el agua dispuesta o descargada

Debes indicar **qué porcentaje del agua consumida vuelve al sistema de alcantarillado**.

En la mayoría de las empresas, el agua:

- se usa en sanitarios
- limpieza
- procesos
- refrigeración
- servicios generales

y posteriormente **se descarga al alcantarillado** sin ningún tratamiento previo.

Si tienes registros internos de tratamiento o pérdidas en procesos, puedes declarar **solo el porcentaje realmente descargado**.

---

⚠️ Si **no existe información sobre tratamiento, evaporación o pérdidas**, debes asumir lo siguiente:

> **Agua dispuesta a la red** = $Agua\ consumida$

Es decir, se considera que **el 100% del agua consumida es devuelta a la red**.

Ejemplo:

Tomando el consumo anual del ejemplo anterior que fue de $6.000\ m³/año$ y no se trató nada del agua dispuesta.

Entonces:

**Total agua dispuesta en el año** = $6.000\ m³/año$ x 100% = $6.000\ m³/año$

---

## 📥 Ingreso de la información en la plataforma

Debes ingresar **dos registros separados**:

### Registro 1 — Agua consumida

| Campo                | Qué debes ingresar   | Ejemplo         |
| -------------------- | -------------------- | --------------- |
| Fuente de suministro | Red pública          | Consumo de agua |
| Unidad               | Unidad utilizada     | m³              |
| Cantidad             | Agua consumida anual | 6.000           |

---

### Registro 2 — Agua dispuesta

| Campo                | Qué debes ingresar               | Ejemplo                             |
| -------------------- | -------------------------------- | ----------------------------------- |
| Fuente de suministro | Descarga a red de alcantarillado | Agua dispuesta en el alcantarillado |
| Unidad               | Unidad utilizada                 | m³                                  |
| Cantidad             | Agua residual descargada         | 6.000                               |

---

## 📌 Ejemplo práctico

Una empresa registra:

- **6.000 m³ de agua consumida al año**

Si no existen registros de tratamiento o pérdidas, se asume que:

- **6.000 m³ también son descargados a la red**

### Cálculo emisiones consumo de agua

> $CO₂e$ = $6.000\ m³ \times 0,1913\ kg\ CO₂e/m³$

$CO₂e = 1.147,8\ kg\ CO₂e$

_(Factor 0,1913 kg CO₂e/m³ — valor ilustrativo; el factor real es gestionado por la plataforma según la fuente de suministro seleccionada)_

---

### Cálculo emisiones aguas residuales

> $CO₂e$ = $6.000\ m³ \times 0,1708\ kg\ CO₂e/m³$

$CO₂e = 1.024,8\ kg\ CO₂e$

_(Factor 0,1708 kg CO₂e/m³ — valor ilustrativo; el factor real es gestionado por la plataforma según el tipo de descarga seleccionado)_

---

## 📝 Notas importantes

> - Debes declarar **tanto el consumo de agua como el agua dispuesta**
> - Ambos valores se calculan **por separado**
> - Si **no existen registros de tratamiento de agua**, se debe asumir que **el 100% del agua consumida se descarga a la red**
> - En ese caso, debes declarar **la misma cantidad de agua consumida como agua dispuesta**
> - Puedes obtener la información desde **medidores de agua o boletas del proveedor sanitario**
> - Guarda facturas y registros como respaldo para auditorías o verificaciones
