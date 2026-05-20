# 🚚 Combustiones móviles

Esta categoría corresponde a **vehículos y maquinarias móviles que consumen combustible o electricidad y son operados o financiados por la empresa**, como **autos**, **camiones**, **buses**, **motocicletas**, **maquinaria**, **barcos**, **vehículos eléctricos (BEVs)** u **otros equipos móviles**.

Un punto relevante es que, si el transporte lo realiza un **proveedor externo** y tu empresa **no tiene control operativo**, ese consumo se reporta en **Transporte de Terceros (Alcance 3)**.

### ⚡ ¿Y los vehículos eléctricos (BEVs)?

El tratamiento depende de **dónde se cargan**:

- **Cargados en sedes o instalaciones de la empresa** (la electricidad la paga tu empresa al medidor de la sede) → declarar el consumo en **Electricidad (Alcance 2)**, no aquí.
- **Cargados externamente** (electrolineras, cargadores públicos pagados por la empresa) → declarar aquí en **Combustiones móviles**, seleccionando **"Electricidad"** como tipo de combustible y unidades en **kWh** o **MWh**.
- **Cargados por el conductor por su cuenta y luego reembolsados** (o no reembolsados) → corresponde a **Alcance 3 (Viajes de negocios / Desplazamiento de empleados)**, no aquí.

⚠️ En ambos casos (Alcance 1 externo o Alcance 2 sede propia) el **factor de emisión es el mismo**: la intensidad del sistema eléctrico nacional (kg CO₂e/kWh). Lo que cambia es la clasificación, no el factor.

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa paga combustible (bencina, diésel, gas o electricidad para BEVs) para vehículos propios o arrendados?
- ¿Utilizas vehículos de la empresa para transportar productos, insumos o personal?
- ¿Tienes autos administrativos, de ventas o gerenciales cuyo combustible paga la empresa?
- ¿Usas maquinaria o equipos móviles que funcionen con combustible (ej. montacargas, maquinaria liviana, generadores móviles)?
- ¿Tienes facturas, boletas o registros de consumo de combustible asociados a la empresa?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo de emisiones corresponde a la multiplicación de un **factor de emisión por la cantidad consumida**.  
El valor del factor depende del **tipo de combustible** y las **unidades en que se declara el consumo**.

> $CO₂e$ = $Cantidad\ consumida \times Factor\ de\ emisión$

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica las emisiones provenientes de tus fuentes móviles

Incluye todos los **vehículos propios o arrendados** por tu empresa, como:

- **Vehículos propios**, como autos, camiones, vans, motocicletas, barcos, aviones, helicópteros u otros
- **Vehículos arrendados o en leasing** cuyo combustible es pagado por tu empresa
- **Maquinaria liviana** (grúas, montacargas, equipos móviles u otros)
- **Flota operativa** utilizada para almacenaje, logística interna u otras tareas

⚠️ Solo debes incluir **vehículos propios o controlados directamente por tu empresa** (Los que tu empresa paga el combustible)

⚠️ No debes incluir **leasings o subcontratos** si un tercero administra la operación de estos

---

### 2️⃣ Recolecta la información de las cantidades utilizadas

Puedes obtener los datos desde:

- Facturas o boletas de combustible
- Registros internos de abastecimiento
- Bitácoras o libros de ruta
- Planillas de operación o control de flota

⚠️ La información obtenida podría no estar en las unidades que requiere la plataforma. En ese caso, puedes **hacer aproximaciones y declarar los supuestos utilizados**

---

### 3️⃣ Si no tienes el dato en las unidades requeridas, aquí hay aproximaciones

#### **Opción 1:** Estimación de litros cuando tienes el **monto gastado** en combustible

Si sabes cuánto pagas mensualmente por tipo de combustible, la fórmula es:

> **Litros estimados al año** = $\frac{Gasto\ mensual\ en\ combustible \times 12}{Precio\ promedio\ por\ litro}$

_Ejemplo:_

**Litros consumidos al año** = $\frac{600.000\ CLP}{1.400\ CLP/L} \times 12 \approx 5.140\ L/año$

---

#### **Opción 2:** Estimación de litros cuando sabes la cantidad de **kilómetros recorridos**

Si sabes cuántos kilómetros recorrieron tus vehículos en el año:

> **Litros estimados al año** = $\frac{Kilómetros\ recorridos\ al\ año}{Rendimiento\ promedio\ (km/L)}$

_Ejemplo:_

**Litros consumidos al año** = $\frac{120.000\ km/año}{10\ km/L}$ = $12.000\ L/año$

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad** y la fuente de emisión

Debes rellenar los siguientes campos:

| Campo           | Qué debes ingresar                          |                            Ejemplo |
| :-------------- | :------------------------------------------ | ---------------------------------: |
| Tipo (Opcional) | Qué vehículos vas a declarar                |                          Van, auto, camión |
| Combustible     | Combustible utilizado por tu(s) vehículo(s) | Diésel, gasolina, GLP, gas natural, electricidad (BEVs) |
| Unidad          | Unidad en la que se declara el combustible  |                                     Litros |
| Cantidad        | Total anual consumido por la flota          |                                   12.000 L |

⚠️ No siempre hay factor para todos los combustibles y unidades disponibles

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Factor propio"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la subcategoría**

Debes ingresar a la calculadora en **modo experto**.  
Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales de la sub-categoría**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa consumió:

- **12.000 litros de diésel**

Y el factor de emisión del diésel es (ejemplo referencial):

- **Por cada litro consumido de diésel, tu empresa emite 2,68 kg CO₂e**

Entonces el cálculo sería:

> $CO₂e$ = $12.000\ L \times 2,68\ kg\ CO₂e/L$ = $32.160\ kg\ CO₂e$

Es decir, tu flota habría generado:

- **32.160 kg CO₂e en el año**
- O lo mismo que **32,16 toneladas de CO₂e**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en **kg CO₂e por litro**, la cantidad debe estar en **litros**.

---

## 📝 Notas importantes

> - Incluye solo **vehículos propios o controlados directamente**
> - Traslados realizados por **empresas externas** se reportan en **Transporte tercerizado (Alcance 3)**
> - **Vehículos eléctricos (BEVs)** cargados en sede propia se contabilizan en **Electricidad (Alcance 2)**; si se cargan externamente con pago de la empresa, se declaran aquí con combustible **"Electricidad"** (Alcance 1)
> - Guarda **facturas y planillas** como respaldo para auditorías o certificaciones
