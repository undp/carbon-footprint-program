# RD Territorial Catalog — Sources and Verification

Where the rows in `tools/seed/src/data/base/territories.json` come from, and how
far they have been checked against the official source.

## The source

**Ley Orgánica de Regiones Únicas de Planificación de la República Dominicana,
núm. 345-22**, Gaceta Oficial No. 11077 del 2 de agosto de 2022.

Its article 7 enumerates the whole upper hierarchy in one place: the ten planning
regions, the provinces of each region, and the municipios of each province. That
is not a statistical publication or a ministry proposal — it is the organic law
the Constitution's article 195 calls for, so the three loaded levels are the only
part of this deployment's reference data that rests on primary legislation.

The catalog matches it exactly: **10 regions, 31 provinces plus the Distrito
Nacional, 157 municipios**.

## Corroboration

**ONE — División Territorial 2021**, whose summary table reports the same
counts:

| Unidad territorial | Cantidad |
| ------------------ | -------- |
| Distrito Nacional  | 1        |
| Provincia          | 31       |
| Municipio          | 157      |
| Distrito municipal | 235      |
| Zonas urbanas      | 392      |
| Secciones rurales  | 1,212    |
| Parajes            | 10,056   |
| Barrios            | 2,914    |
| Subbarrios         | 5,733    |

Law and statistics office agree on the three levels this catalog carries.

## What this corrected

The catalog was originally written from the regionalization of **Decreto
710-04**, which Ley 345-22 replaced — the law cites the decree among its `Visto`
and supersedes it. Five rows were wrong:

| Was                     | Now              | Kind              |
| ----------------------- | ---------------- | ----------------- |
| `Azua` under `Valdesia` | under `El Valle` | wrong composition |
| `Baoruco`               | `Bahoruco`       | spelling          |
| `Monte Cristi`          | `Montecristi`    | spelling          |
| `Higuamo`               | `Higüamo`        | spelling          |
| `Ozama o Metropolitana` | `Ozama`          | name              |

Azua is the one that mattered: it moves Valdesia from four provinces to three and
El Valle from two to three, so an organization in Azua was declaring a region the
law does not assign it.

## The two levels not loaded

`territory_level` carries five values. Only three have rows.

`MUNICIPAL_DISTRICT` and `SECTOR` are deliberately empty: the observation asks for
five levels, so the model represents five, but data is only loaded where an
official source is in hand. The two missing levels exist in law and in statistics
— distritos municipales are created one by one by Congress under Ley 176-07, and
parajes are a census unit — so the gap is ours, not the country's.

Both have an identified source, neither has been obtained:

- **ONE, División Territorial** — enumerates the 235 distritos municipales.
  Published as a PDF, so loading it means transcribing it.
- **Geoportal IDE-RD** — layers `RD_DM` (distritos municipales) and
  `RD_BPARAJES` (barrios y parajes), updated to the laws issued through December
  2022, downloadable as CSV, Excel, GeoJSON and Shapefile. This is the
  machine-readable catalog the change's task 1.3 asks for, and it also covers the
  three levels already loaded, so it doubles as a check on them. The layers are
  not served over anonymous WFS: obtaining them needs a portal account or an
  institutional request.

Loading them is a data change. `seedTerritories` writes depth by depth and takes
its levels from the file, and the form renders a selector for every level the
catalog has rows for, so neither needs to know a level was added.

## Modelling notes worth stating before MMARN reads them

**The Distrito Nacional is stored at the province level.** Article 7 reads
"Región Ozama. Integrado por la provincia Santo Domingo y el Distrito Nacional" —
the DN is not a province. It sits where a province sits because that is the level
the hierarchy branches at, which is also how the ONE codes it. It carries no
municipios: the DN is itself the municipal level.

**The law titles it `Distrito Nacional (Santo Domingo de Guzmán)`.** The catalog
stores `Distrito Nacional`, which is what a registrant will look for.

**The five levels come from the observation, not from the ONE.** The statistics
office's own hierarchy inserts zonas urbanas and secciones rurales between the
municipal district and the paraje, and adds subbarrios below. The platform's
`SECTOR` level collapses barrios and parajes — roughly 13,000 rows — into one
step, because page 5 of the observations asks for five levels and names
"sector/paraje" as the last.

## What is still unverified

**Currency, not provenance.** The law is a snapshot of August 2022, and municipios
are created, renamed and promoted by later laws — the elevation of the Verón-Punta
Cana municipal district to a municipio passed a first Senate reading in July 2025.
Nothing in this catalog tracks that. Re-check against the ONE's latest División
Territorial before a deployment treats the list as current.

## Sources

- [Ley núm. 345-22, texto completo](https://www.consultoria.gov.do/Consulta/Home/FileManagement?documentId=3399948&managementType=1)
- [ONE — División Territorial 2021](https://www.one.gob.do/media/zsrmjfzp/divisi%C3%B3n-territorial-2021.pdf)
- [Geoportal IDE-RD — Distritos Municipales (`RD_DM`)](https://geoportal.iderd.gob.do/layers/geonode:RD_DM/metadata_detail)
- [Geoportal IDE-RD — Barrios y Parajes (`RD_BPARAJES`)](https://geoportal.iderd.gob.do/layers/geonode_data:geonode:RD_BPARAJES)
- [Geoportal IDE-RD — Regiones Únicas de Planificación (`RD_RUP`)](https://geoportal.iderd.gob.do/layers/geonode:RD_RUP/metadata_detail)
