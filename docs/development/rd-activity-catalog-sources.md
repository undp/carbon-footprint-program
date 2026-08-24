# RD Activity Catalog — Sources and Verification

Where the rows in `tools/seed/src/data/base/country_sector_subsectors.json` come
from, and how far they have been checked against the official source.

## The two inputs

**The mapping** — which activities exist and which reporting sector each belongs
to — comes from the workbook MMARN sent with its observations, which proposes a
correspondence between the national classifier and the platform's two catalog
levels. It is a proposal by the ministry, not an official publication.

**The names** originally came from the international nomenclature the national
classifier adapts, not from the classifier itself. That is what this verification
corrected.

## The official source

**CIIU.DR 2009 — Clasificador Dominicano de Actividades Económicas**, Dirección
General de Impuestos Internos, Departamento de Estudios Económicos y Tributarios,
published 2009. 166 pages. It is the catalog the DGII made mandatory for RNC
registration and updates from December 2019, and the one the observations point
at.

Its structure corroborates the workbook:

|                | Workbook | Official document |
| -------------- | -------- | ----------------- |
| Sections       | 17       | 17 (A–Q)          |
| Divisions      | 61       | 60                |
| Activity codes | 2,851    | 2,839             |

## The finding: there is no official list of division names

The classifier publishes **section → group → class → activity**. The division
level exists only in the numbering: section C jumps straight from its heading to
group `101000`, with no `100000` line.

Only **41 of the 60 divisions carry a name**. The other 19 are never named
anywhere in the document — including divisions 10, 11, 13, 14, 31, 32, 33, 35,
36, 37, 45, 51, 62, 65, 67, 70, 85 and 91, all of which this catalog uses.

So for roughly a third of the catalog there is no official wording to copy, and
the workbook's "division name" column is the ministry's own labelling rather than
a transcription.

## What was corrected

Of the 41 divisions the document names, 5 already matched. **28 rows were renamed
to the official wording**; two were deliberately left alone (below). The rest of
the catalog — 14 rows that split a division on purpose, and 18 rows whose
division the document never names — keeps names that are ours.

<details>
<summary>The 28 renames</summary>

| Div | Was                                                                                    | Now                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | …de servicios conexas                                                                  | Agricultura, ganadería, caza y actividades de servicios conexos                                                                         |
| 02  | Silvicultura, extracción de madera y actividades de servicios conexas                  | Silvicultura y extracción de madera                                                                                                     |
| 05  | Pesca, explotación de criaderos de peces y granjas piscícolas                          | Pesca y servicios conexos                                                                                                               |
| 12  | Extracción de minerales de uranio y torio                                              | Extracción de minerales y concentrados de uranio y torio                                                                                |
| 17  | Fabricación de productos textiles                                                      | Preparación e hilatura de fibras textiles, tejeduras de productos textiles                                                              |
| 18  | Fabricación de prendas de vestir; adobo y teñido de pieles                             | Fabricación de prendas de vestir                                                                                                        |
| 19  | Curtido y adobo de cueros; fabricación de calzado y artículos de marroquinería         | Preparación, curtido y acabado del cuero, fabricación de maletas, bolsos de mano, artículos de talabartería y guarnicionería, y calzado |
| 20  | …de madera y corcho                                                                    | Producción de madera y fabricación de productos de madera y corcho, excepto muebles                                                     |
| 21  | Fabricación de papel y de productos de papel                                           | Fabricación de papel y de los productos de papel                                                                                        |
| 22  | Actividades de edición e impresión y de reproducción de grabaciones                    | Actividades de impresión y reproducción de grabaciones                                                                                  |
| 23  | …de la refinación del petróleo                                                         | Fabricación de coque y de productos de refinación del petróleo                                                                          |
| 24  | Fabricación de sustancias y productos químicos                                         | Fabricación de sustancias químicas                                                                                                      |
| 25  | Fabricación de productos de caucho y de plástico                                       | Fabricación de productos de caucho y plástico                                                                                           |
| 27  | Fabricación de metales comunes                                                         | Fabricación de metales básicos                                                                                                          |
| 28  | Fabricación de productos elaborados de metal, excepto maquinaria y equipo              | Fabricación de productos derivados del metal, excepto maquinaria y equipo                                                               |
| 29  | Fabricación de maquinaria y equipo n.c.p.                                              | Fabricación de maquinaria y equipo N. C. P.                                                                                             |
| 30  | Fabricación de maquinaria de oficina, contabilidad e informática                       | Fabricación de maquinaria y equipo de oficina (excepto computadoras y equipos periféricos)                                              |
| 41  | Captación, depuración y distribución de agua                                           | Captación, tratamiento y suministro de agua                                                                                             |
| 50  | Venta y reparación de vehículos automotores; venta al por menor de combustibles        | Comercio al por mayor y al por menor, reparación de vehículos automotores y motocicletas                                                |
| 52  | Comercio al por menor; reparación de efectos personales y domésticos                   | Comercio al por menor, excepto el comercio de vehículos automotores y motocicletas                                                      |
| 60  | Transporte por vía terrestre; transporte por tuberías                                  | Transporte por vía terrestre y transporte por tuberías                                                                                  |
| 66  | Seguros y planes de pensiones, excepto la seguridad social obligatoria                 | Seguros, reaseguros, fondos de pensiones, excepto los planes de seguridad social de afiliación obligatoria                              |
| 71  | Alquiler de maquinaria y equipo sin operarios y de efectos personales                  | Alquiler de maquinaria y equipos sin operador                                                                                           |
| 72  | Informática y actividades conexas                                                      | Programación informática, consultarías y actividades relacionadas                                                                       |
| 73  | Investigación y desarrollo                                                             | Investigación y desarrollo científico                                                                                                   |
| 75  | Administración pública y defensa; planes de seguridad social de afiliación obligatoria | Administración del estado y aplicación de la política económica y social de la comunidad                                                |
| 93  | Otras actividades de servicios                                                         | Servicios N. C. P.                                                                                                                      |
| 99  | Organizaciones y órganos extraterritoriales                                            | Actividades de organizaciones y órganos extraterritoriales                                                                              |

</details>

## Two renames deliberately not applied

**Division 80 — `Enseñanza` stays.** The document's `800000` heading reads
"Enseñanza primaria", which contradicts its own section M ("ENSEÑANZA") and looks
like a group name that leaked into the division heading. It is the only row in
the Educación sector, so adopting it would force a university to declare primary
schooling.

**Division 55 — `Hoteles y restaurantes` stays.** The Dominican section H is
"Alojamiento y servicios de comida", splitting lodging (55) from food service
(56). This catalog has no row for 56, so renaming 55 to "Alojamiento" would leave
restaurants with nowhere to classify themselves in the Turismo, Hotelería y
Restaurantes sector. The correct fix is to add a row for 56 — a catalog change,
not a rename. **Open.**

## What is still unverified

- The **14 rows that split a division** — the four electricity activities the
  observations require to be separate, and the cement/glass split — have no
  official name by construction, because they sit below the division level.
- The **18 rows whose division the document never names** carry wording that is
  ours.
- The **mapping itself** — which sector each activity reports under, and the four
  cross-sector reassignments — is still MMARN's proposal, unvalidated.

MMARN validation remains the gate. Corrections are edits over 67 rows in one JSON
file, plus whatever they touch in `subcategory_recommendations.json`, which
resolves activities by exact name.
