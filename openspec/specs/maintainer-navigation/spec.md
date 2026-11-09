# maintainer-navigation Specification

## Purpose

The maintainer sidebar only lists screens that are ready to use.

## Requirements

### Requirement: The maintainer sidebar hides screens under construction

The maintainer sidebar SHALL NOT list «Parámetros» or «Historial de cambios», whose screens only render «En construcción». Their routes (`/admin/parameters`, `/admin/change-history`) and access guards SHALL stay unchanged, and no other screen SHALL link to them.

#### Scenario: Superadmin opens the maintainer

- **WHEN** a SUPERADMIN opens any maintainer screen
- **THEN** the sidebar shows no «Parámetros» and no «Historial de cambios» entry

#### Scenario: Direct URL

- **WHEN** a SUPERADMIN navigates directly to `/admin/parameters`
- **THEN** the «En construcción» screen still renders
