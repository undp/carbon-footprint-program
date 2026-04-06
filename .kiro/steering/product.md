# Huella Latam — Product Overview

Huella Latam is a full-stack web application for tracking and managing environmental impact data in Latin America. Built for the UNDP (United Nations Development Programme).

## Core Domain

- Carbon inventory management (creation, measurement, verification, self-declaration)
- Emission factor tracking and calculation
- Organization management with branches and main activities
- Reduction project lifecycle (create, submit, approve, reject, reopen)
- Methodology management for carbon measurement
- Badge and certification system for carbon inventories
- File management (upload, download, preview) for supporting documents

## User Roles

The system uses role-based access control with at least: ADMIN, SUPERADMIN, and regular users. Admin routes are separated from app routes in both API and frontend.

## Key Workflows

- Organizations register and create carbon inventories
- Inventories track emission lines by subcategory
- Inventories go through a lifecycle: draft → measurement request → verification → self-declaration
- Reduction projects follow an approval workflow: draft → submitted → approved/rejected/objected
- Admins manage categories, subcategories, methodologies, and review requests
