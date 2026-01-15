# Screen Generation Prompt Template

Use this template to generate complete React screens and components from Figma designs.

## 📋 Instructions

You are tasked with creating a new screen/component for the Huella Latam application. Follow the design specifications from Figma and implement using the project's tech stack and coding patterns.

---

## 🎨 Figma Design Context

**Figma Node URL:**

```
[Paste the Figma node URL here, e.g., https://figma.com/design/:fileKey/:fileName?node-id=1-2]
```

**Design Node ID:**

```
[Extract node ID from URL, e.g., 1:2]
```

**Design Description:**

```
[Brief description of what this screen/component should do]
```

**Design Tokens/Variables:**

```
[If available, list key design tokens like colors, spacing, typography from Figma]
```

---

## 🏗️ Project Context

### Tech Stack

**Frontend:**

- **React 19** - Latest React with enhanced features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool with HMR
- **TanStack Router** - Type-safe, file-based routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS v4** - Utility-first CSS framework
- **Material-UI (MUI)** - Component library (primary UI framework)
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

**Backend:**

- **Fastify** - Web framework
- **Prisma** - ORM for PostgreSQL
- **Zod** - Schema validation

**Monorepo Structure:**

- `apps/web/` - Frontend React application
- `apps/api/` - Backend API
- `packages/database/` - Prisma schema and client
- `packages/types/` - Shared TypeScript types

### Project Architecture

**Frontend Structure:**

```
apps/web/src/
├── routes/              # TanStack Router file-based routes
├── screens/             # Screen components (full-page views)
├── components/          # Reusable React components
│   ├── ui/             # UI components (shadcn/ui style)
│   └── layout/         # Layout components
├── lib/                # Utilities and helpers
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
├── services/           # API client and services
└── api/                # API query hooks (TanStack Query)
```

**Routing Pattern:**

- File-based routing with TanStack Router
- Routes defined in `src/routes/` directory
- Dynamic routes use `$` prefix (e.g., `$inventoryId.tsx`)
- Use `createFileRoute` for route definition

**Component Patterns:**

- Use functional components with TypeScript
- Prefer `FC` type from React for component definitions
- Use Material-UI components as primary UI library
- Combine MUI with Tailwind CSS for styling
- Use path aliases (`@/`) for imports

**Data Fetching:**

- Use TanStack Query hooks for API calls
- Create custom hooks in `src/api/query.ts` or similar
- Handle loading, error, and success states
- Use optimistic updates where appropriate

**State Management:**

- Server state: TanStack Query
- Client state: Zustand stores (in `src/stores/`)
- Form state: React Hook Form
- Local component state: `useState` hook

---

## 📝 Functional Requirements

### User Stories

```
[Describe what the user should be able to do]
```

### Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Business Rules

```
[Any business logic or validation rules]
```

### API Endpoints Required

```
[List any API endpoints that need to be called]
- GET /api/endpoint - Description
- POST /api/endpoint - Description
```

### Navigation Flow

```
[Describe how users navigate to/from this screen]
- From: [Previous screen]
- To: [Next screen/action]
```

---

## 🎯 Implementation Requirements

### File Structure

```
[Specify where files should be created]
apps/web/src/
├── routes/
│   └── [route-file].tsx          # Route definition
├── screens/
│   └── [ScreenName]/
│       ├── [ScreenName]Screen.tsx
│       └── components/            # Screen-specific components
│           └── [ComponentName].tsx
└── components/                   # If creating reusable components
    └── [ComponentName].tsx
```

### Component Requirements

**Screen Component:**

- ✅ Use `MainLayout` wrapper for authenticated screens
- ✅ Handle loading states with appropriate UI
- ✅ Handle error states with user-friendly messages
- ✅ Use Material-UI components (Box, Card, Button, Typography, etc.)
- ✅ Combine MUI with Tailwind CSS classes for styling
- ✅ Implement responsive design (mobile-first)
- ✅ Use TypeScript with proper types
- ✅ Follow existing naming conventions

**Data Fetching:**

- ✅ Create/use TanStack Query hooks for API calls
- ✅ Handle loading, error, and empty states
- ✅ Use proper TypeScript types from `@repo/types`
- ✅ Implement error handling with user feedback (notistack)

**Forms:**

- ✅ Use React Hook Form for form management
- ✅ Use Zod schemas for validation
- ✅ Display validation errors clearly
- ✅ Handle form submission with loading states

**Navigation:**

- ✅ Use TanStack Router's `useNavigate` hook
- ✅ Use type-safe route navigation
- ✅ Use `Link` component for declarative navigation

**Styling:**

- ✅ Use Material-UI components as base
- ✅ Apply Tailwind CSS classes for custom styling
- ✅ Follow existing design patterns
- ✅ Ensure accessibility (ARIA labels, keyboard navigation)
- ✅ Use consistent spacing and typography

### Code Quality Standards

**TypeScript:**

- ✅ Use strict TypeScript types
- ✅ Import types from `@repo/types` when available
- ✅ Avoid `any` types
- ✅ Use proper type inference where possible

**Imports:**

- ✅ Use path aliases (`@/` for `src/`)
- ✅ Group imports: React, third-party, local
- ✅ Use absolute imports, avoid relative paths beyond one level

**Component Structure:**

```typescript
import { FC } from "react";
import {} from /* MUI imports */ "@mui/material";
import {} from /* TanStack Router imports */ "@tanstack/react-router";
import {} from /* Other imports */ "@/...";

export const ComponentName: FC = () => {
  // Hooks
  // State
  // Handlers
  // Render
};
```

**Error Handling:**

- ✅ Use try-catch for async operations
- ✅ Show user-friendly error messages with notistack
- ✅ Log errors appropriately (consider Pino logger)

**Performance:**

- ✅ Use React.memo for expensive components if needed
- ✅ Use useMemo/useCallback for expensive computations
- ✅ Implement proper loading states to avoid layout shifts

---

## 📦 Dependencies & Imports

### Common Imports Pattern

```typescript
// React
import { FC, useState, useEffect } from "react";

// Material-UI
import { Box, Button, Card, Typography } from "@mui/material";

// TanStack Router
import { useNavigate, Link } from "@tanstack/react-router";

// TanStack Query
import { useQuery, useMutation } from "@tanstack/react-query";

// Notifications
import { useSnackbar } from "notistack";

// Project imports
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces";
import {} from /* custom hooks */ "@/api/query";
import {} from /* types */ "@repo/types";
```

---

## 🧪 Testing Considerations

**What to Test:**

- [ ] Component renders correctly
- [ ] Loading states display properly
- [ ] Error states handle gracefully
- [ ] Form validation works
- [ ] Navigation works as expected
- [ ] API calls are made correctly
- [ ] User interactions trigger expected behavior

---

## 📚 Reference Examples

### Example Screen Structure

```typescript
import { FC } from "react";
import { Box, Button, Card, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { MainLayout } from "@/components/layout";
import { Routes } from "@/interfaces";
import { useDataQuery, useCreateMutation } from "@/api/query";

export const ExampleScreen: FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useDataQuery();
  const createMutation = useCreateMutation();

  const handleAction = async () => {
    try {
      const result = await createMutation.mutateAsync({ /* data */ });
      void navigate({ to: Routes.NEXT_SCREEN, params: { id: result.id } });
    } catch {
      enqueueSnackbar("Error message", { variant: "error" });
    }
  };

  if (isLoading) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6 p-6">
        {/* Screen content */}
      </Box>
    </MainLayout>
  );
};
```

### Example Route Definition

```typescript
// src/routes/app/example.tsx
import { createFileRoute } from "@tanstack/react-router";
import { ExampleScreen } from "@/screens/Example/ExampleScreen";

export const Route = createFileRoute("/app/example")({
  component: ExampleScreen,
});
```

---

## ✅ Output Checklist

Before completing, ensure:

- [ ] All files are created in the correct locations
- [ ] TypeScript types are properly defined
- [ ] Components follow project patterns
- [ ] Material-UI components are used appropriately
- [ ] Tailwind CSS classes are applied correctly
- [ ] Loading and error states are handled
- [ ] Navigation is implemented correctly
- [ ] Forms use React Hook Form + Zod
- [ ] API calls use TanStack Query
- [ ] Code follows existing style and conventions
- [ ] Imports use path aliases
- [ ] No TypeScript errors
- [ ] Responsive design is considered
- [ ] Accessibility is considered

---

## 🚀 Next Steps

After generation:

1. Review the generated code
2. Test the screen in the browser
3. Verify API integrations work
4. Check responsive design on different screen sizes
5. Test error scenarios
6. Update route tree if needed (TanStack Router auto-generates)
7. Add any missing types to `@repo/types` if needed

---

## 📝 Additional Notes

```
[Any additional context, constraints, or special requirements]
```

---

**Ready to generate!** Use the Figma MCP server to extract design context, then generate the complete implementation following this template.
