# 🛒 Uso de productos de la organización

Esta sub-categoría incluye las emisiones que se producen **cuando tus clientes usan los productos** que tú fabricas o vendes — no cuando los compran, sino mientras los emplean a lo largo de su **vida útil**.

Aplica especialmente a:

- ⚡ **Electrodomésticos** (refrigeradores, lavadoras, secadoras, hornos eléctricos)
- 🚗 **Vehículos** y maquinaria (autos, motos, camiones, equipos pesados)
- 💻 **Equipos electrónicos** (computadores, servidores, equipos industriales)
- 🔥 **Calderas, calentadores, aires acondicionados** vendidos
- ⛽ **Combustibles, lubricantes, aceites**
- 🧴 Productos cuyo procesamiento o disposición genera emisiones

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Vendes productos que **consumen electricidad** durante su uso (electrodomésticos, equipos)?
- ¿Vendes productos que **consumen combustibles** al usarse (vehículos, calderas, generadores)?
- ¿Vendes **combustibles, lubricantes o aceites** directamente?
- ¿Conoces el **consumo energético típico** de tus productos?
- ¿Sabes la **vida útil promedio** de tus productos?
- ¿Tienes registros de **unidades vendidas** durante el año?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para **fabricantes de electrodomésticos, autos, maquinaria o equipos energéticos**, esta sub-categoría suele ser la **MÁS GRANDE** del inventario — a veces 70-90% del total.

---

## ¿Cómo es el cálculo de emisiones?

La fórmula general:

> $CO₂e$ = $Unidades\ vendidas \times Energía\ consumida\ por\ unidad\ durante\ vida\ útil \times Factor\ de\ emisión$

**Por unidad vendida:**

> $Emisiones\ por\ unidad$ = $Consumo\ anual \times Vida\ útil \times Factor\ de\ la\ red$

**Total:**

> $Emisiones\ sub{\text -}categoría$ = $Unidades\ vendidas \times Emisiones\ por\ unidad$

| Tipo de producto | Variables clave |
| :--- | :--- |
| Refrigerador | kWh/año × 15 años × factor red |
| Lavadora | kWh/lavado × ciclos/año × vida útil × factor |
| Auto a combustión | L/100km × km/vida útil × factor combustible |
| Combustible vendido | Litros vendidos × factor de combustión |

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica los productos relevantes

No todos tus productos generan emisiones de uso. Aplica solo a productos que:

- **Consumen energía** al usarse (electricidad, combustible)
- **Son combustibles** o aceites (queman al usarse)
- **Tienen disposición compleja** que emite (algunos plásticos)

⚠️ Para servicios o productos sin uso energético (ropa, mobiliario), esta sub-categoría puede ser **0 o despreciable**.

---

### 2️⃣ Recolecta los datos por producto

Para cada producto relevante, necesitas:

- **Unidades vendidas en el año** (datos comerciales / facturación)
- **Consumo energético típico** (especificaciones técnicas, etiquetado energético)
- **Vida útil promedio** (años o kilómetros para vehículos)
- **Factor de emisión** del energético consumido (red eléctrica del país, combustible)

Fuentes:

- **Etiquetado energético** del producto (kWh/año declarados)
- **Fichas técnicas** del fabricante
- **Estudios sectoriales** de uso típico
- **ERP / sistema de ventas** para unidades

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Etiquetado energético

Usa el dato declarado en la etiqueta (ej. "Refrigerador clase A: 350 kWh/año").

---

#### **Opción 2:** Promedios sectoriales

Si tu producto no tiene etiquetado, usa promedios del rubro:

- Refrigerador: 250-450 kWh/año
- Lavadora: 200-300 kWh/año
- Auto sedán a combustión: 7-9 L/100 km, vida 200.000 km

---

#### **Opción 3:** País de uso por defecto

Para el factor de la red eléctrica, asume la red del **país donde se vende** el producto. Si vendes a múltiples países, calcula por cada uno (o asume el país de venta principal y declara el supuesto).

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo | Qué debes ingresar | Ejemplo |
| :--- | :--- | ---: |
| Tipo de producto | Categoría | Electrodoméstico, Vehículo, Combustible |
| Sub-tipo | Detalle | Refrigerador, Auto a gasolina, Diésel vendido |
| Unidad | Unidad de consumo | kWh totales, L totales |
| Cantidad | Total durante vida útil de unidades vendidas | 6.300.000 kWh, 1.500.000 L |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Factor propio"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos un **fabricante de refrigeradores** que durante el año vende:

- **1.200 unidades** de un modelo de refrigerador
- Consumo declarado: **350 kWh/año** por unidad
- Vida útil promedio: **15 años**
- Factor referencial de la red eléctrica del país de venta: **0,30 kg CO₂e/kWh**

**Por unidad:**

> $350\ kWh/año \times 15\ años \times 0,30\ kg/kWh$ = $1.575\ kg\ CO₂e/unidad$

**Total:**

> $1.200\ unidades \times 1.575\ kg$ = $1.890.000\ kg\ CO₂e$

Es decir, los refrigeradores vendidos en el año habrán generado:

- **1.890.000 kg CO₂e** durante su vida útil
- O lo mismo que **1.890 toneladas de CO₂e**

> ⚠️ Este número se reporta **en el año de venta**, aunque las emisiones se distribuyan en 15 años de uso.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/kWh, la cantidad debe estar en kWh totales.

---

## 📝 Notas importantes

> - **Esta sub-categoría suele ser GIGANTE** para fabricantes de electrodomésticos, vehículos o equipos energéticos. A veces representa más del 80% del inventario total
> - **Para servicios o productos no-energéticos**, suele ser 0 o despreciable y se puede excluir documentando el supuesto
> - **Vida útil:** es un supuesto crítico. Documenta la fuente (estudios sectoriales, datos internos, normativas)
> - **País de uso:** si vendes en varios países, idealmente calcula con el factor de la red de cada país. Como aproximación, usa el factor del país de venta principal
> - **Atribución:** si tu producto integra partes de terceros, las emisiones de uso suelen atribuirse 100% al producto final (al fabricante)
> - **No dupliques con productos comprados:** los insumos para fabricar el producto van en *productos comprados*. El uso del producto **vendido** va aquí
> - **No dupliques con downstream:** el transporte del producto al cliente va en *transporte downstream*; el uso por el cliente va aquí
> - **Combustibles vendidos:** factor especial. Para 1 L de gasolina vendido, las emisiones son ~2,3 kg CO₂e (combustión completa)
> - Guarda **fichas técnicas, etiquetado energético, datos de ventas** como respaldo
