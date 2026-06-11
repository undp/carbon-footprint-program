# ✈️ Viajes de negocios — Traslado

Esta sub-categoría incluye todo el **transporte asociado a viajes laborales** de empleados, distinto del desplazamiento diario casa-trabajo: vuelos, buses, trenes, taxis, vehículos arrendados u otros medios utilizados para viajes de negocios.

Cubre:

- ✈️ **Vuelos comerciales** (nacionales e internacionales)
- 🚌 **Buses interurbanos**
- 🚂 **Trenes**
- 🚕 **Taxis y plataformas** (Uber, Cabify, DiDi) en destino
- 🚗 **Vehículos arrendados** (rent-a-car)
- ⛴️ **Ferries o transporte marítimo** (en algunos casos)
- 🛺 **Transportes locales** durante el viaje

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tus empleados **viajan en avión, bus o tren** por motivos laborales?
- ¿Usan **taxis, Uber o ride-hailing** durante viajes laborales?
- ¿**Arriendan vehículos** durante viajes (rent-a-car)?
- ¿Tienes registros de **tickets, boarding passes o rendiciones de gastos**?
- ¿Tu empresa usa una **plataforma de booking corporativo**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para empresas que viajan mucho, **el modo aéreo suele dominar** la huella de viajes — y es la mayor palanca de mitigación (videoconferencias, agrupación de viajes).

---

## ¿Cómo es el cálculo de emisiones?

La fórmula general:

> $CO₂e$ = $Distancia \times Factor\ por\ modo \times Ajuste\ por\ clase\ (en\ aéreo)$

| Modo                                  | Factor referencial  |
| :------------------------------------ | :------------------ |
| Vuelo doméstico (corto, <500 km)      | 0,25 kg CO₂e/km/pax |
| Vuelo regional (500-3.700 km)         | 0,15 kg CO₂e/km/pax |
| Vuelo internacional largo (>3.700 km) | 0,11 kg CO₂e/km/pax |
| Bus interurbano                       | 0,03 kg CO₂e/km/pax |
| Tren                                  | 0,04 kg CO₂e/km/pax |
| Taxi / Uber                           | 0,18 kg CO₂e/km     |
| Auto arrendado                        | 0,18 kg CO₂e/km     |

**Ajuste por clase en vuelos:**

- Economy: factor base
- Premium economy: ×1,5
- Business: ×2-3
- First class: ×3-4

💡 Algunos métodos aplican un factor adicional ("radiative forcing index", RFI) de ~1,9x para vuelos por el efecto de las emisiones a altitud — verifica con tu metodología.

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica todos los viajes laborales del año

Lista todos los viajes pagados o autorizados por la empresa:

- Visitas a clientes o proveedores
- Conferencias, ferias, congresos
- Capacitaciones o entrenamientos
- Reuniones interregionales

⚠️ **No incluyas commuting** (eso va en la sub-categoría correspondiente).

---

### 2️⃣ Recolecta los datos

Las fuentes principales:

- **Plataformas de booking corporativo** (entregan reportes con km, modo, clase)
- **Boarding passes / itinerarios** (para vuelos)
- **Rendiciones de gastos** de viajes
- **Tarjetas de crédito corporativas** (si pagan vuelos)
- **Apps de Uber/Cabify** (historial corporativo)

Datos mínimos por viaje:

- **Modo** (avión, bus, tren, taxi, auto arrendado)
- **Origen y destino** (o km recorridos)
- **N° de pasajeros** (normalmente 1, salvo grupo)
- **Clase** (en aéreo)

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Distancia geográfica

Si tienes origen y destino pero no los km, calcula con Google Maps o herramientas como [Great Circle Mapper](https://www.gcmap.com/).

---

#### **Opción 2:** Calculadora ICAO

Para vuelos comerciales, usa la **calculadora oficial ICAO** que ajusta por modelo de avión, ocupación y otros factores.

---

#### **Opción 3:** Estimación por gasto

Si solo tienes el monto pagado en pasajes:

> **km estimados** ≈ $\frac{Gasto}{Tarifa\ promedio\ por\ km\ del\ modo}$

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo             | Qué debes ingresar |                                                               Ejemplo |
| :---------------- | :----------------- | --------------------------------------------------------------------: |
| Modo              | Tipo de transporte | Vuelo doméstico, Vuelo internacional, Bus, Tren, Taxi, Auto arrendado |
| Clase (si aplica) | Clase del vuelo    |                                                     Economy, Business |
| Unidad            | Unidad declarada   |                                                      km, moneda local |
| Cantidad          | Total anual        |                                                             28.000 km |

⚠️ Para vuelos, ingresa una línea por **categoría de distancia** (corto/medio/largo) o por **clase**.

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Factor propio"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (ej. resultado de calculadora ICAO).

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos una **consultora** que durante el año tuvo:

- **4 vuelos domésticos**, ida y vuelta ~1.500 km c/u (Economy)
- **2 vuelos regionales** ida y vuelta ~5.000 km c/u (Economy)
- **1 vuelo internacional** ida y vuelta ~7.000 km (Business)
- **Taxis y ride-hailing en destino**: ~600 km en total (acumulado)
- **Auto arrendado en uno de los viajes**: 800 km

Cálculo:

| Modo                           |     km | Factor | Multiplicador clase |     Emisiones |
| :----------------------------- | -----: | -----: | ------------------: | ------------: |
| Vuelo doméstico (Economy)      |  6.000 |   0,25 |                   1 | 1.500 kg CO₂e |
| Vuelo regional (Economy)       | 10.000 |   0,15 |                   1 | 1.500 kg CO₂e |
| Vuelo internacional (Business) |  7.000 |   0,11 |                 2,5 | 1.925 kg CO₂e |
| Taxi / ride-hailing            |    600 |   0,18 |                   1 |   108 kg CO₂e |
| Auto arrendado                 |    800 |   0,18 |                   1 |   144 kg CO₂e |

**Total: ~5.177 kg CO₂e al año (~5,2 ton CO₂e)**

> ⚠️ El viaje en clase business pesa fuerte por su factor multiplicador (×2,5), a pesar de no ser el más largo en kilometraje. Cambiar de business a economy es una de las mayores palancas de reducción.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **Vuelos cortos tienen factor MAYOR por km** que vuelos largos: el despegue y aterrizaje son las fases más intensivas
> - **Clase de vuelo importa mucho:** business consume 2-3x más por pasajero que economy (más espacio = menos pasajeros por avión)
> - **Radiative forcing index (RFI):** algunos métodos multiplican el factor de vuelos por ~1,9x para reflejar el impacto adicional de emisiones en altitud. Verifica si la plataforma lo aplica
> - **No dupliques con commuting:** commuting es el desplazamiento **diario** casa-trabajo. Esta sub-categoría es para **viajes específicos** por trabajo
> - **No dupliques con Alcance 1:** si la empresa tiene **flota propia** de autos corporativos y los usa en viajes, eso es Alcance 1 (combustión móvil), no aquí
> - **Vehículos arrendados (rent-a-car):** sí van aquí (no es flota propia)
> - **Rideshare de varios pasajeros:** si vas con colegas en el mismo Uber o taxi, divide los km entre los pasajeros para no duplicar
> - **Reducciones efectivas:** videoconferencias en lugar de viajes, agrupación de viajes a una región, viajar en clase economy en vez de business
> - Guarda **boarding passes, itinerarios, recibos y reportes de booking corporativo** como respaldo
