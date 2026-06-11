# ⚡ Emisiones indirectas por energías importadas

Esta categoría incluye las emisiones generadas por la **electricidad, vapor, calor o frío** que tu empresa **compra y consume**, pero que se generaron físicamente fuera de sus instalaciones (en la central eléctrica o planta proveedora).

La combustión que genera las emisiones ocurre en la planta del proveedor (central eléctrica, planta de cogeneración, etc.), pero como tu empresa es la que **demanda y usa esa energía**, las emisiones se le atribuyen.

Por eso son **indirectas**: no las generas tú directamente, pero sí son consecuencia directa de tu consumo.

### Sub-categorías que incluye

| Sub-categoría                       | Qué cubre                                                       | Ejemplo                                                |
| :---------------------------------- | :-------------------------------------------------------------- | :----------------------------------------------------- |
| 💡 **Electricidad comprada**        | Consumo de energía eléctrica de la red                          | Cuenta de luz mensual a tu distribuidora local         |
| 🔥 **Vapor, calor o frío comprado** | Energía térmica adquirida a terceros (district heating/cooling) | Vapor de planta vecina, agua helada de central de frío |

> 💡 En la mayoría de las empresas de América Latina y el Caribe, **Alcance 2 = electricidad de la red**. El vapor/calor/frío comprado es poco común salvo en parques industriales específicos.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta categoría?

- ¿Tu empresa **paga cuentas de electricidad** a una distribuidora local?
- ¿Tienes **medidores eléctricos** en tus oficinas, plantas, bodegas o sucursales?
- ¿**Compras energía térmica** (vapor, agua caliente, agua helada) a otra empresa?
- ¿Operas en un parque industrial con **suministro centralizado** de energía?
- ¿Tienes contratos de **suministro eléctrico no regulado / clientes libres** con alguna generadora?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta categoría**.

> **Prácticamente toda empresa tiene Alcance 2** si paga cuenta de luz, aunque sea solo de una oficina pequeña.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo en Alcance 2 sigue la lógica general:

> $CO₂e$ = $Energía\ consumida \times Factor\ de\ emisión\ de\ la\ red$

El **factor de emisión depende del país** (y a veces de la región o sistema eléctrico) porque cada matriz energética es distinta:

- Una red con mucha generación hidráulica o renovable tiene un factor **bajo**
- Una red con mucha generación a carbón, diésel o gas tiene un factor **alto**

| Tipo de energía | Unidad de consumo | Factor típico      |
| :-------------- | :---------------- | :----------------- |
| Electricidad    | kWh o MWh         | varía por país     |
| Vapor           | kg o ton          | kg CO₂e / kg vapor |
| Calor / frío    | kWh térmicos      | kg CO₂e / kWh      |

💡 Los factores varían año a año según la matriz energética efectiva. **Verifica el factor oficial vigente** del país donde reportas — la plataforma debería actualizarlo automáticamente.

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta categoría

### 1️⃣ Identifica todos tus puntos de consumo

Lista cada lugar donde tu empresa consume electricidad o energía térmica comprada:

- Oficinas centrales y sucursales
- Plantas productivas
- Bodegas y centros de distribución
- Locales comerciales
- Data centers propios

⚠️ Incluye **todos los medidores** asociados a la operación de tu empresa, incluso los más pequeños.

---

### 2️⃣ Recolecta el consumo anual

Para cada punto, suma el consumo de los **12 meses del año reportado**. Las fuentes de datos son:

- **Cuentas / facturas / boletas de electricidad** mensuales
- **Plataformas de gestión** del proveedor eléctrico (muchas distribuidoras dan acceso online al histórico)
- **Sistemas de submedición interna** si los tienes
- **Contratos de suministro** para clientes libres / no regulados

⚠️ La unidad estándar es **kWh** (kilowatt-hora). Si tu factura está en MWh, multiplica por 1.000.

---

### 3️⃣ Si no tienes el dato exacto en kWh

#### **Opción 1:** Cuando solo tienes el gasto en moneda local

> **Cantidad estimada** = $\frac{Gasto\ anual\ en\ electricidad}{Precio\ promedio\ del\ kWh}$

_Ejemplo:_ Si tu empresa gastó **3.600.000 unidades de moneda local** en electricidad y la tarifa promedio fue **120 unidades/kWh**:

**Consumo estimado** = $\frac{3.600.000}{120}$ = **30.000 kWh/año**

⚠️ Asegúrate de que la tarifa promedio que uses corresponda a la **misma moneda y al mismo período** que el gasto.

---

#### **Opción 2:** Cuando solo tienes algunos meses

> Promedio mensual × 12 meses (asumiendo consumo estable a lo largo del año).

⚠️ Si tu consumo es **estacional** (ej. agroindustria, turismo, calefacción), no uses promedios — busca el dato real de los 12 meses.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir el consumo**

Debes rellenar los siguientes campos:

| Campo                | Qué debes ingresar                            |                    Ejemplo |
| :------------------- | :-------------------------------------------- | -------------------------: |
| País / Red eléctrica | Sistema eléctrico donde se consume la energía | Sistema eléctrico nacional |
| Tipo de energía      | Electricidad, vapor, calor o frío             |               Electricidad |
| Unidad               | Unidad en la que declaras el consumo          |                        kWh |
| Cantidad             | Total anual consumido                         |                 30.000 kWh |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Factor propio"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (por ejemplo, si tienes un PPA con factor certificado distinto al de la red).

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la categoría**

Debes ingresar a la calculadora en **modo experto**.  
Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales de la categoría**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa consumió:

- **30.000 kWh** de electricidad de la red

Y el factor de emisión referencial de la red es:

- **0,30 kg CO₂e por kWh**

Entonces el cálculo sería:

> $CO₂e$ = $30.000\ kWh \times 0,30\ kg\ CO₂e/kWh$ = $9.000\ kg\ CO₂e$

Es decir, el consumo eléctrico habría generado:

- **9.000 kg CO₂e** en el año
- O lo mismo que **9,0 toneladas de CO₂e**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en **kg CO₂e por kWh**, la cantidad debe estar en **kWh**.

---

## 📝 Notas importantes

> - **Si tu empresa autogenera electricidad** (paneles solares propios, generador diésel), esa energía **NO va en Alcance 2**. La autogeneración renovable autoconsumida = 0 emisiones; la autogeneración a combustible va en **Alcance 1** (combustión estacionaria)
> - **Inyección a la red:** si tu empresa inyecta excedentes (net billing / net metering), esa energía no debe contarse como consumo. Solo declara el consumo neto desde la red
> - **Certificados de energía renovable (REC, IREC):** si tu empresa los compra, esto puede afectar el cálculo "market-based". La plataforma usa por defecto el método **location-based** (factor promedio de la red); consulta con un especialista si quieres reportar en modo market-based
> - **No incluyas combustibles** quemados directamente por tu empresa (eso es Alcance 1)
> - **Guarda las cuentas de electricidad** del año reportado como respaldo para auditorías o certificaciones
