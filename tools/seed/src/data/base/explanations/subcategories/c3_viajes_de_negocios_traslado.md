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

La plataforma trabaja con **cantidades agregadas a nivel organización**, no viaje por viaje. Para cada opción de **Transporte** que tu equipo haya usado en el año, ingresas una línea con el total de distancia y se multiplica por su factor:

> $CO_2e$ = $Distancia\ anual\ agregada \times Factor\ del\ Transporte\ (kg\ CO_2e/km)$

### 🔑 Las dos dudas más frecuentes

**1️⃣ ¿Ingreso los km de una persona o los multiplico por el número de personas?**

Depende del modo, porque el factor no está construido igual en todos:

- ✈️ **Avión, 🚌 bus, 🚂 tren y 🚕 taxi:** el factor es **por pasajero** (kg CO₂e por pasajero-km). Debes **multiplicar la distancia por el número de personas que viajaron**. Si 3 personas volaron 1.000 km, ingresas **3.000 km**; si 3 personas compartieron un taxi de 20 km, ingresas **60 km**.
- 🚗 **Auto:** el factor es **por vehículo** (kg CO₂e por km recorrido por el vehículo). Ingresas **los km del vehículo una sola vez**, sin importar cuántos ocupantes iban. Si 3 personas compartieron un auto arrendado por 200 km, ingresas **200 km**, no 600.

💡 El taxi usa el factor DEFRA **por pasajero-km**, que ya considera la ocupación promedio del taxi. Por eso se multiplica por personas, igual que el bus.

**2️⃣ ¿El viaje es solo ida o ida y vuelta?**

Se cuenta **toda la distancia efectivamente recorrida**: si el viaje fue ida y vuelta, debes contar **los dos tramos**. Un viaje de ida y vuelta entre dos ciudades separadas por 800 km son **1.600 km**, no 800.

### 🧮 La fórmula práctica para obtener la cantidad

> **Avión / bus / tren / taxi:**  
> $Cantidad$ = $km\ por\ tramo \times N°\ de\ tramos \times N°\ de\ personas \times N°\ de\ viajes$
>
> **Auto:**  
> $Cantidad$ = $km\ por\ tramo \times N°\ de\ tramos \times N°\ de\ viajes$ (sin multiplicar por ocupantes)

Donde **N° de tramos** = 2 en un viaje de ida y vuelta, 1 si fue solo ida.

### Factores de la plataforma

El factor de cada opción aparece en el campo **"Factor kgCO₂e/unidad"** al elegirla, y corresponde al año de tu huella. Lo que cambia entre opciones es **a qué corresponde** el factor:

| Opción de Transporte                                | El factor es por... |
| :-------------------------------------------------- | :------------------ |
| Transporte en avión: Short haul (<3 hrs) Economy    | pasajero            |
| Transporte en avión: Short haul (<3 hrs) Business   | pasajero            |
| Transporte en avión: Medium haul (3-6 hrs) Economy  | pasajero            |
| Transporte en avión: Medium haul (3-6 hrs) Business | pasajero            |
| Transporte en avión: Long haul (>6 hrs) Economy     | pasajero            |
| Transporte en avión: Long haul (>6 hrs) Business    | pasajero            |
| Transporte en Bus                                   | pasajero            |
| Transporte en Tren                                  | pasajero            |
| Transporte en Taxi                                  | pasajero            |
| Transporte en auto                                  | vehículo            |

💡 **La clase ya viene incluida en la opción.** No debes aplicar ningún multiplicador extra por Business: el factor de Business ya es más alto que el de Economy (entre ~1,5× y ~2,9× según el tramo), porque un asiento premium ocupa el espacio de varios asientos económicos.

💡 **Referencia orientativa para elegir el tramo aéreo:** _short haul_ (<3 hrs) ≈ hasta ~2.000 km; _medium haul_ (3-6 hrs) ≈ 2.000-5.000 km; _long haul_ (>6 hrs) ≈ más de 5.000 km. Si conoces la duración real del vuelo, úsala.

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
- **Clase** (en aéreo: Economy o Business)
- **Origen y destino** (o km recorridos)
- **Tramos:** ¿fue solo ida o ida y vuelta?
- **N° de personas** que hicieron ese viaje

💡 Con esos cinco datos puedes aplicar directamente la fórmula práctica de arriba.

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Distancia geográfica

Si tienes origen y destino pero no los km, calcula con Google Maps o herramientas como [Great Circle Mapper](https://www.gcmap.com/).

⚠️ Estas herramientas devuelven la distancia **de un tramo**. Recuerda duplicarla si el viaje fue ida y vuelta.

---

#### **Opción 2:** Calculadora ICAO

Para vuelos comerciales, usa la **calculadora oficial ICAO** que ajusta por modelo de avión, ocupación y otros factores. Su resultado ya viene **por pasajero**.

---

#### **Opción 3:** Estimación por gasto

Si solo tienes el monto pagado en pasajes:

> **km estimados** ≈ $\frac{Gasto}{Tarifa\ promedio\ por\ km\ del\ modo}$

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo      | Qué debes ingresar                                                               |                                            Ejemplo |
| :--------- | :------------------------------------------------------------------------------- | -------------------------------------------------: |
| Transporte | Modo y clase, elegido de la lista                                                | Transporte en avión: Medium haul (3-6 hrs) Economy |
| Unidad     | Unidad de distancia (km, m o mi)                                                 |                                                 km |
| Cantidad   | Distancia total anual: km × tramos × personas × viajes (personas solo si aplica) |                                          16.800 km |

⚠️ Ingresa **una línea por cada opción de Transporte** que hayas usado. Los vuelos se separan por tramo (short/medium/long haul) y por clase (Economy/Business), porque cada combinación tiene su propio factor.

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el transporte que utilizaste no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (ej. resultado de calculadora ICAO).

⚠️ Si usas un factor propio, revisa si está expresado **por pasajero-km o por vehículo-km** y ajusta la cantidad en consecuencia.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos una **consultora** que durante el año tuvo:

- **Congreso internacional:** 3 personas, vuelo de 9.500 km por tramo, ida y vuelta, Economy (long haul)
- **Visitas a clientes en la región:** 4 viajes de 1 persona, 2.100 km por tramo, ida y vuelta, Economy (medium haul)
- **Vuelos domésticos:** 3 viajes de 2 personas, 620 km por tramo, ida y vuelta, Economy (short haul)
- **Bus interurbano:** 1 viaje de 5 personas, 225 km por tramo, ida y vuelta
- **Taxis en destino:** 20 viajes de 30 km, con 2 personas en cada uno
- **Auto arrendado:** 800 km recorridos por el vehículo

Primero se calcula la **cantidad** de cada línea:

| Transporte                | Cálculo de la cantidad                          |  Cantidad |
| :------------------------ | :---------------------------------------------- | --------: |
| Avión Long haul Economy   | 9.500 km × 2 tramos × 3 personas × 1 viaje      | 57.000 km |
| Avión Medium haul Economy | 2.100 km × 2 tramos × 1 persona × 4 viajes      | 16.800 km |
| Avión Short haul Economy  | 620 km × 2 tramos × 2 personas × 3 viajes       |  7.440 km |
| Bus                       | 225 km × 2 tramos × 5 personas × 1 viaje        |  2.250 km |
| Taxi                      | 30 km × 1 tramo × 2 personas × 20 viajes        |  1.200 km |
| Auto                      | km del vehículo (sin multiplicar por ocupantes) |    800 km |

Y luego las emisiones:

| Transporte                | Cantidad (km) | Factor (kg CO₂e/km) |     Emisiones |
| :------------------------ | ------------: | ------------------: | ------------: |
| Avión Long haul Economy   |        57.000 |             0,10916 | 6.222 kg CO₂e |
| Avión Medium haul Economy |        16.800 |             0,11704 | 1.966 kg CO₂e |
| Avión Short haul Economy  |         7.440 |             0,12576 |   936 kg CO₂e |
| Bus                       |         2.250 |             0,10151 |   228 kg CO₂e |
| Taxi                      |         1.200 |             0,14861 |   178 kg CO₂e |
| Auto                      |           800 |             0,16591 |   133 kg CO₂e |

_(Factores ilustrativos; el factor real es gestionado por la plataforma según la opción de transporte y el año de tu huella)_

**Total: ~9.664 kg CO₂e al año (~9,7 ton CO₂e)**

> 💡 Fíjate en los dos efectos que más confunden:
>
> - El congreso internacional pesa el **64% del total** no porque el vuelo sea el más caro por km (de hecho es el factor aéreo **más bajo**), sino porque **3 personas × 2 tramos × 9.500 km** genera 57.000 pasajeros-km.
> - El auto arrendado se ingresa con los km del vehículo aunque viajen varias personas, porque su factor es del vehículo completo. El taxi, en cambio, se multiplica por las personas: su factor es por pasajero.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **Pasajero-km vs vehículo-km:** avión, bus, tren y taxi se multiplican por el número de pasajeros; el auto no. Es el error más común al declarar esta sub-categoría
> - **Cuenta ida y vuelta:** salvo que el viaje haya sido efectivamente solo de ida, la distancia se duplica
> - **En Economy, los vuelos cortos tienen factor mayor por km** que los largos: el despegue y aterrizaje son las fases más intensivas y se reparten en menos kilómetros
> - **La clase ya está en el factor:** Business no se multiplica aparte. En vuelos medium y long haul el factor Business casi triplica al Economy, así que **bajar de clase es una palanca real de reducción**
> - **Radiative forcing index (RFI):** la plataforma aplica el factor DEFRA del año de tu huella tal como está, que ya incluye el efecto de las emisiones en altitud. Si tu metodología exige un ajuste distinto por el efecto de las emisiones en altitud, hazlo con la fuente de factor **"Otro"** en lugar de modificar la cantidad
> - **No dupliques con commuting:** commuting es el desplazamiento **diario** casa-trabajo. Esta sub-categoría es para **viajes específicos** por trabajo
> - **No dupliques con Alcance 1:** si la empresa tiene **flota propia** de autos corporativos y los usa en viajes, eso es Alcance 1 (combustión móvil), no aquí
> - **Vehículos arrendados (rent-a-car):** sí van aquí (no es flota propia)
> - **No dupliques con Estadía:** el alojamiento del viaje va en la sub-categoría _Viajes de negocios — Estadía_
> - **Reducciones efectivas:** videoconferencias en lugar de viajes, agrupación de viajes a una región, enviar menos personas al mismo destino, viajar en clase economy en vez de business
> - Guarda **boarding passes, itinerarios, recibos y reportes de booking corporativo** como respaldo
