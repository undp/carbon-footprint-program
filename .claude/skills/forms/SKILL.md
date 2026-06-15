---
name: forms
description: Form building for apps/web with React Hook Form + Zod. Use when creating or editing a form — reusable form fields, Zod validation, and field arrays.
---

# Forms

- **Library**: React Hook Form with `Controller` — no Formik.
- **Reusable form components**: use existing components in `apps/web/src/components/form/` (`FormTextField`, `FormSelectField`, `FormDateField`, `FormAutocompleteField`, `FormFileUpload`, etc.). They accept `control` and `name` props from React Hook Form.
- **Validation**: validate form fields with Zod via `@hookform/resolvers/zod`. Define the schema with Spanish error messages using Zod's `message` option (e.g., `z.string().min(1, { message: "Este campo es obligatorio" })`), then pass it to `useForm` as `resolver: zodResolver(mySchema)`. This keeps validation logic and user-facing messages consistent and in Spanish.
- **Field arrays**: never `setValue` over an entire field-array path (e.g. `*.lines`); keep the `setValue` + `resetField` pair (`resetField` no-ops if the field is unregistered).
