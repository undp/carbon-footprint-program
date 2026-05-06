# Alcance 2 — Emisiones indirectas por energías importadas

Emisiones generadas por la **electricidad, vapor, calor o frío** que tu empresa **compra y consume**, pero que se generaron físicamente fuera de sus instalaciones (en la central eléctrica o planta proveedora).

## ⚡ Alcance 2 — Energías importadas

Esta categoría incluye las emisiones asociadas a la energía que tu empresa **compra a un tercero y consume internamente**. La combustión que genera las emisiones ocurre en la planta del proveedor (central eléctrica, planta de cogeneración, etc.), pero como tu empresa es la que **demanda y usa esa energía**, las emisiones se le atribuyen.

Por eso son **indirectas**: no las generas tú directamente, pero sí son consecuencia directa de tu consumo.

### Sub-categorías que incluye

| Sub-categoría                   | Qué cubre                                                       | Ejemplo                                                |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| 💡 Electricidad comprada        | Consumo de energía eléctrica de la red                          | Cuenta de luz mensual a tu distribuidora local         |
| 🔥 Vapor, calor o frío comprado | Energía térmica adquirida a terceros (district heating/cooling) | Vapor de planta vecina, agua helada de central de frío |

> 💡 En la mayoría de las empresas de América Latina y el Caribe, **Alcance 2 = electricidad de la red**. El vapor/calor/frío comprado es poco común salvo en parques industriales específicos.

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta categoría?

- ¿Tu empresa **paga cuentas de electricidad** a una distribuidora local (ej. Luz del Sur o Enel Distribución en Perú; Enel, CGE o Saesa en Chile; CNEL o Empresa Eléctrica Quito en Ecuador; EDEESTE, EDESUR o EDENORTE en República Dominicana)?
- ¿Tienes **medidores eléctricos** en tus oficinas, plantas, bodegas o sucursales?
- ¿**Compras energía térmica** (vapor, agua caliente, agua helada) a otra empresa?
- ¿Operas en un parque industrial con **suministro centralizado** de energía?
- ¿Tienes contratos de **suministro eléctrico no regulado / clientes libres** con alguna generadora?

### 💡 Tip importante

Si la respuesta a una o más de estas preguntas es **SÍ**, tu empresa probablemente debe medir y declarar emisiones en Alcance 2.

> **Prácticamente toda empresa tiene Alcance 2** si paga cuenta de luz, aunque sea solo de una oficina pequeña.

## ¿Cómo es el cálculo de emisiones?

El cálculo en Alcance 2 sigue la misma lógica general:

**CO₂eq = Energía consumida × Factor de emisión de la red**

El **factor de emisión depende del país** (y a veces de la región o sistema eléctrico) porque cada matriz energética es distinta. Por ejemplo:

- Una red con mucha generación hidráulica o renovable tiene un factor **bajo**
- Una red con mucha generación a carbón, diésel o gas tiene un factor **alto**

**Factores referenciales por país (kg CO₂eq/kWh, valores aproximados):**

| País                 | Factor referencial |
| -------------------- | ------------------ |
| Perú                 | ~0,25              |
| Ecuador              | ~0,30              |
| Chile                | ~0,35              |
| República Dominicana | ~0,55              |

> 💡 Los factores varían año a año según la matriz energética efectiva. **Verifica el factor oficial vigente** del país donde reportas — tu plataforma debería actualizarlo automáticamente.

| Tipo de energía | Unidad de consumo | Factor típico              |
| --------------- | ----------------- | -------------------------- |
| Electricidad    | kWh o MWh         | varía por país (ver tabla) |
| Vapor           | kg o ton          | kg CO₂eq / kg vapor        |
| Calor / frío    | kWh térmicos      | kg CO₂eq / kWh             |

> 💡 Al final de la página hay un ejemplo ilustrativo.

## 🧭 Paso a paso para completar la información de esta categoría

### 1️⃣ Identifica todos tus puntos de consumo

Lista cada lugar donde tu empresa consume electricidad o energía térmica comprada:

- Oficinas centrales y sucursales
- Plantas productivas
- Bodegas y centros de distribución
- Locales comerciales
- Data centers propios

⚠️ Incluye **todos los medidores** asociados a la operación de tu empresa, incluso los más pequeños.

### 2️⃣ Recolecta el consumo anual

Para cada punto, suma el consumo de los **12 meses del año reportado**. Las fuentes de datos son:

- **Cuentas / facturas / boletas de electricidad** mensuales
- **Plataformas de gestión** del proveedor eléctrico (muchas distribuidoras dan acceso online al histórico)
- **Sistemas de submedición interna** si los tienes
- **Contratos de suministro** para clientes libres / no regulados

⚠️ La unidad estándar es **kWh** (kilowatt-hora). Si tu factura está en MWh, multiplica por 1.000.

### 3️⃣ Si no tienes el dato exacto en kWh

**Opción 1: Cuando solo tienes el gasto en moneda local**

Cantidad estimada = Gasto anual en electricidad / Precio promedio del kWh

Ejemplo: Si tu empresa gastó **3.600.000 unidades de moneda local** en electricidad y la tarifa promedio fue **120 unidades/kWh**:

> Consumo estimado = 3.600.000 / 120 = **30.000 kWh/año**

⚠️ Asegúrate de que la tarifa promedio que uses corresponda a la **misma moneda y al mismo período** que el gasto.

**Opción 2: Cuando solo tienes algunos meses**

Promedio mensual × 12 meses (asumiendo consumo estable a lo largo del año).

⚠️ Si tu consumo es **estacional** (ej. agroindustria, turismo, calefacción), no uses promedios — busca el dato real de los 12 meses.

### 4️⃣ Ingreso de la información

**CASO 1: Eres novato y solo quieres introducir el consumo**

Debes rellenar los siguientes campos:

| Campo                | Qué debes ingresar                               | Ejemplo                                                              |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| País / Red eléctrica | El sistema eléctrico donde se consume la energía | Perú (SEIN), Chile (SEN), Ecuador (SNI), República Dominicana (SENI) |
| Tipo de energía      | Electricidad, vapor, calor o frío                | Electricidad                                                         |
| Unidad               | Unidad en la que declaras el consumo             | kWh                                                                  |
| Cantidad             | Total anual consumido                            | 30.000 kWh                                                           |

💡 Si la plataforma te sugiere un factor de emisión para el país seleccionado, puedes utilizarlo para hacer los cálculos. Si no hay un factor sugerido, debes buscar uno que aplique apropiadamente a tu caso.

**CASO 2: Eres experto y utilizas un factor propio**

1. Rellena los campos como en el Caso 1.
2. En el campo **"Fuente factor"** selecciona **"Factor propio"**.
3. Modifica el campo **"Factor kgCO₂/kWh"** con tu valor personalizado (por ejemplo, si tienes un PPA con factor certificado distinto al de la red).

**CASO 3: Hiciste el cálculo por fuera y ya tienes las emisiones totales**

Accede a la calculadora en **modo experto**. Luego, en el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las emisiones totales de la sub-categoría.

## 📌 Ejemplo práctico

Supongamos que durante el año tu empresa consumió:

- **30.000 kWh** de electricidad de la red en Ecuador (SNI)

Si el factor de emisión referencial de la red ecuatoriana es **0,30 kg CO₂eq/kWh**:

**CO₂eq = 30.000 kWh × 0,30 kg CO₂eq/kWh = 9.000 kg CO₂eq**

Es decir, el consumo eléctrico habría generado:

- **9.000 kg CO₂eq** en el año
- O lo mismo que **9,0 toneladas de CO₂eq**

> 📊 **El mismo consumo en distintos países arroja resultados muy distintos** por la matriz energética: 30.000 kWh × 0,25 (Perú) = 7,5 ton; × 0,35 (Chile) = 10,5 ton; × 0,55 (RD) = 16,5 ton.

> ⚠️ **Es importante que las unidades coincidan.** Si el factor está en kg CO₂eq por kWh, la cantidad debe estar en kWh.

## 📝 Notas importantes

- **Si tu empresa autogenera electricidad** (paneles solares propios, generador diésel), esa energía **NO va en Alcance 2**:
  - La electricidad **renovable autogenerada y autoconsumida** = 0 emisiones (no se reporta)
  - La electricidad de **un generador a combustible** = va en **Alcance 1** (combustión estacionaria)
- **Inyección a la red:** si tu empresa inyecta excedentes a la red (net billing / net metering — varía según el país), esa energía no debe contarse como consumo — solo declara el consumo neto desde la red.
- **Certificados de energía renovable (REC, IREC):** si tu empresa compra certificados, esto puede afectar el cálculo "market-based". La plataforma usa por defecto el método **location-based** (factor promedio de la red); consulta con un especialista si quieres reportar en modo market-based.
- **No incluyas combustibles** quemados directamente por tu empresa (eso es Alcance 1).
- **Guarda las cuentas de electricidad** del año reportado como respaldo para auditorías o certificaciones.
