# Huella Latam Web

Frontend web application for the Huella Latam project, built with React 19, Vite, TanStack Router, and Tailwind CSS v4.

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Routing](#-routing)
- [State Management](#-state-management)
- [Data Fetching](#-data-fetching)
- [UI Components](#-ui-components)
- [Styling](#-styling)
- [Type Safety](#-type-safety)
- [Building for Production](#-building-for-production)
- [Docker](#-docker)
- [Best Practices](#-best-practices)

## 🛠 Tech Stack

### Core Framework

- **[React 19](https://react.dev/)** - Latest React with enhanced features
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool with HMR
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Routing & Navigation

- **[TanStack Router](https://tanstack.com/router)** - Type-safe, file-based routing
- **Auto-generated route tree** - Routes automatically generated from file structure
- **Code splitting** - Automatic route-based code splitting
- **Type-safe navigation** - Full TypeScript support for routes and params

### Data Fetching & Caching

- **[TanStack Query (React Query)](https://tanstack.com/query)** - Powerful data synchronization
- **Automatic caching** - Smart cache management
- **Background refetching** - Keep data fresh automatically
- **Optimistic updates** - Instant UI feedback

### State Management

- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **React Context** - Built-in React state management
- **TanStack Query** - Server state management

### Styling & UI

- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible headless components
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, customizable components
- **[Lucide React](https://lucide.dev/)** - Modern icon library
- **[CVA](https://cva.style/docs)** - Class Variance Authority for component variants

### Form Handling

- **[React Hook Form](https://react-hook-form.com/)** - Performant form validation
- **[Zod](https://zod.dev/)** - Schema validation with type inference

### Development Tools

- **[TanStack Router DevTools](https://tanstack.com/router/latest/docs/framework/react/devtools)** - Debug routes in development
- **[ESLint](https://eslint.org/)** - Code linting
- **[Vitest](https://vitest.dev/)** - Unit testing framework

## 📁 Folder Structure

```
apps/web/
├── src/
│   ├── routes/                   # File-based routing (TanStack Router)
│   │   ├── __root.tsx            # Root layout component
│   │   ├── index.tsx             # Home page (/)
│   │   └── about.tsx             # About page (/about)
│   │
│   ├── components/               # React components
│   │   └── ui/                   # UI components (shadcn/ui)
│   │       └── button.tsx        # Button component
│   │
│   ├── lib/                      # Utilities and helpers
│   │   └── utils.ts              # Utility functions (cn, etc.)
│   │
│   ├── hooks/                    # Custom React hooks
│   │
│   ├── stores/                   # Zustand stores
│   │
│   ├── services/                 # API client and services
│   │
│   ├── types/                    # TypeScript type definitions
│   │
│   ├── assets/                   # Static assets
│   │   ├── react.svg
│   │   └── vite.svg
│   │
│   ├── main.tsx                  # Application entry point
│   ├── index.css                 # Global styles and Tailwind
│   ├── routeTree.gen.ts          # Auto-generated route tree
│   └── vite-env.d.ts             # Vite type definitions
│
├── public/                       # Static files (served as-is)
│   └── vite.svg
│
├── dist/                         # Build output (production)
│
├── components.json               # shadcn/ui configuration
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.ts              # ESLint configuration
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 24.0.0
- pnpm >= 10.23.0

### Installation

From the **monorepo root**:

```bash
# Install all dependencies
pnpm install
```

Or from the **web directory**:

```bash
cd apps/web
pnpm install
```

### Development Server

```bash
# From root
pnpm --filter web dev

# Or from apps/web
pnpm dev
```

The app will start at **http://localhost:5173** with hot module replacement (HMR).

## 💻 Development

### Project Configuration

#### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true, // Automatic code splitting per route
    }),
    react(), // React support with Fast Refresh
    tailwindcss(), // Tailwind CSS v4
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // @ points to src/
    },
  },
});
```

#### Path Aliases

The `@` alias points to the `src/` directory:

```typescript
// Instead of relative imports
import { Button } from "../../../components/ui/button";

// Use alias imports
import { Button } from "@/components/ui/button";
```

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server with HMR

# Building
pnpm build            # Type-check + build for production
pnpm start            # Preview production build locally

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript compiler (no emit)

# Testing
pnpm test             # Run Vitest tests

# Maintenance
pnpm clean            # Remove build artifacts
```

## 🗺 Routing

The app uses **TanStack Router** with file-based routing. Routes are automatically generated from the file structure.

### File-Based Routing

```
src/routes/
├── __root.tsx        →  Root layout (wraps all pages)
├── index.tsx         →  / (home page)
├── about.tsx         →  /about
└── posts/
    ├── index.tsx     →  /posts
    └── $postId.tsx   →  /posts/:postId (dynamic route)
```

### Creating a Route

```typescript
// src/routes/about.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: AboutComponent,
});

function AboutComponent() {
  return (
    <div>
      <h1>About Page</h1>
      <p>This is the about page.</p>
    </div>
  );
}
```

### Dynamic Routes

Use `$` prefix for dynamic parameters:

```typescript
// src/routes/posts/$postId.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/$postId")({
  component: PostComponent,
});

function PostComponent() {
  const { postId } = Route.useParams();

  return <div>Post ID: {postId}</div>;
}
```

### Type-Safe Navigation

```typescript
import { useNavigate, Link } from "@tanstack/react-router";

function MyComponent() {
  const navigate = useNavigate();

  // Programmatic navigation
  const handleClick = () => {
    navigate({ to: "/about" });

    // With parameters
    navigate({
      to: "/posts/$postId",
      params: { postId: "123" }
    });
  };

  return (
    <div>
      {/* Link component */}
      <Link to="/about">About</Link>

      {/* Link with parameters */}
      <Link to="/posts/$postId" params={{ postId: "123" }}>
        View Post
      </Link>
    </div>
  );
}
```

### Route Tree

Routes are auto-generated into `src/routeTree.gen.ts`:

```typescript
// Auto-generated - DO NOT EDIT MANUALLY
export const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  postsRoute,
]);
```

This file is automatically updated when you add/remove route files.

### Root Layout

The `__root.tsx` file defines the layout for all pages:

```typescript
// src/routes/__root.tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <nav>{/* Navigation */}</nav>
        <main>
          <Outlet /> {/* Child routes render here */}
        </main>
        <footer>{/* Footer */}</footer>
      </div>
    </QueryClientProvider>
  );
}
```

## 🔄 State Management

### Server State (TanStack Query)

For data fetched from APIs:

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";

function PostsComponent() {
  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts");
      return response.json();
    },
  });

  // Mutate data
  const createPost = useMutation({
    mutationFn: async (newPost) => {
      return fetch("/api/posts", {
        method: "POST",
        body: JSON.stringify(newPost),
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render posts */}</div>;
}
```

### Client State (Zustand)

For app-level state:

```typescript
// src/stores/authStore.ts
import { create } from "zustand";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

// Use in components
function Profile() {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated) return <Login />;

  return (
    <div>
      <p>Welcome, {user.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 📡 Data Fetching

### API Client

Create a centralized API client:

```typescript
// src/services/api.ts
import { z } from "zod";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to post");
    return response.json();
  }
}

export const api = new ApiClient();
```

### Type-Safe API Calls

```typescript
// src/services/posts.ts
import { z } from "zod";
import { api } from "./api";

const PostSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

type Post = z.infer<typeof PostSchema>;

export const postsService = {
  getAll: () => api.get<Post[]>("/api/posts"),
  getById: (id: string) => api.get<Post>(`/api/posts/${id}`),
  create: (data: Omit<Post, "id">) => api.post<Post>("/api/posts", data),
};
```

### Usage with TanStack Query

```typescript
import { useQuery } from "@tanstack/react-query";
import { postsService } from "@/services/posts";

function Posts() {
  const { data: posts } = useQuery({
    queryKey: ["posts"],
    queryFn: postsService.getAll,
  });

  return (
    <div>
      {posts?.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

## 🎨 UI Components

### shadcn/ui Integration

The project uses shadcn/ui for beautiful, accessible components.

#### Adding Components

```bash
# Add a new component (from root)
pnpm --filter web dlx shadcn@latest add button

# Or from apps/web
npx shadcn@latest add button
```

This installs the component source code into `src/components/ui/`.

#### Using Components

```typescript
import { Button } from "@/components/ui/button";

function MyComponent() {
  return (
    <div>
      <Button>Default</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline" size="lg">Large</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}
```

#### Component Variants (CVA)

Components use Class Variance Authority for variants:

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        destructive: "bg-red-500 text-white",
      },
      size: {
        default: "h-9 px-4",
        lg: "h-10 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Custom Components

Create your own components following the same pattern:

```typescript
// src/components/Card.tsx
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

## 🎨 Styling

### Tailwind CSS v4

The project uses the latest Tailwind CSS v4 with native Vite integration.

#### Global Styles

```css
/* src/index.css */
@import "tailwindcss";

/* Custom CSS variables */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    /* ... more variables */
  }
}
```

#### Using Tailwind Classes

```typescript
function Hero() {
  return (
    <div className="flex h-screen items-center justify-center bg-blue-600">
      <h1 className="text-4xl font-bold text-white">
        Welcome to Huella Latam
      </h1>
    </div>
  );
}
```

#### Utility Function: `cn()`

Combine classes with conditional logic:

```typescript
import { cn } from "@/lib/utils";

function Button({ variant, className }) {
  return (
    <button
      className={cn(
        "rounded-md px-4 py-2",
        variant === "primary" && "bg-blue-500 text-white",
        variant === "secondary" && "bg-gray-200 text-black",
        className  // Allow custom classes to override
      )}
    >
      Click me
    </button>
  );
}
```

### Icons

Use Lucide React for icons:

```typescript
import { Check, X, AlertCircle } from "lucide-react";

function StatusIcon({ status }) {
  if (status === "success") return <Check className="text-green-500" />;
  if (status === "error") return <X className="text-red-500" />;
  return <AlertCircle className="text-yellow-500" />;
}
```

## 🔒 Type Safety

### Environment Variables

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Usage
const apiUrl = import.meta.env.VITE_API_URL;
```

### Zod Integration

Validate API responses:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().min(1),
});

type User = z.infer<typeof UserSchema>;

// Validate response
const response = await fetch("/api/user");
const data = await response.json();
const user = UserSchema.parse(data); // Throws if invalid
```

### Form Validation

With React Hook Form + Zod:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    console.log(data);  // Type-safe!
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

## 🏗 Building for Production

### Build

```bash
# From root
pnpm --filter web build

# Or from apps/web
pnpm build
```

This will:

1. Run TypeScript type checking (`tsc -b`)
2. Build optimized production bundle with Vite
3. Output to `dist/` directory

### Preview Production Build

```bash
pnpm start
```

Serves the production build locally at **http://localhost:4173**.

### Build Output

```
dist/
├── assets/
│   ├── index-[hash].js      # Main JS bundle
│   ├── about-[hash].js      # Route chunk (code split)
│   ├── index-[hash].css     # Styles
│   └── ...
├── index.html
└── vite.svg
```

### Deployment

The `dist/` folder can be deployed to any static hosting service:

- **Azure Static Web Apps**
- **Vercel**
- **Netlify**
- **Cloudflare Pages**
- **AWS S3 + CloudFront**

### Environment Variables (Production)

Create `.env.production`:

```bash
VITE_API_URL=https://api.huella-latam.com
VITE_APP_NAME="Huella Latam"
```

These are embedded at build time, so rebuild after changing them.

## 🐳 Docker

The web app ships with a production-ready container based on `nginxinc/nginx-unprivileged:alpine-slim`.

- **Full-stack workflow (postgres + api + web via docker-compose):** [`docs/operations/docker-compose.md`](../../docs/operations/docker-compose.md)
- **Web image reference (architecture, build args, standalone run):** [`docs/operations/web-docker.md`](../../docs/operations/web-docker.md)

## ✅ Best Practices

### 1. File Organization

```
src/
├── routes/              # Pages only
├── components/          # Reusable UI components
├── features/            # Feature-specific code
│   └── auth/
│       ├── components/
│       ├── hooks/
│       └── services/
├── lib/                 # Utilities
└── types/               # Shared types
```

### 2. Component Patterns

**Use function components with hooks:**

```typescript
// ✅ Good
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useQuery({ ... });
  return <div>{user?.name}</div>;
}

// ❌ Avoid class components
class UserProfile extends React.Component { ... }
```

### 3. Type Everything

```typescript
// ✅ Good - explicit types
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

function Button({ onClick, children, variant = "primary" }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// ❌ Avoid - implicit any
function Button(props) {
  return <button onClick={props.onClick}>{props.children}</button>;
}
```

### 4. Prefer Composition

```typescript
// ✅ Good - composable
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// ❌ Avoid - prop drilling
<Card title="Title" content="Content" showHeader={true} />
```

### 5. Co-locate Tests

```
src/components/
├── Button.tsx
└── Button.test.tsx
```

### 6. Use Path Aliases

```typescript
// ✅ Good
import { Button } from "@/components/ui/button";

// ❌ Avoid
import { Button } from "../../../components/ui/button";
```

### 7. Handle Loading & Error States

```typescript
function DataComponent() {
  const { data, isLoading, error } = useQuery({ ... });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;

  return <div>{/* Render data */}</div>;
}
```

### 8. Memoize Expensive Computations

```typescript
import { useMemo } from "react";

function DataTable({ data }) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  return <table>{/* Render sortedData */}</table>;
}
```

## 📚 Additional Resources

### Official Documentation

- [React 19](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TanStack Router](https://tanstack.com/router)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)

### Tutorials & Guides

- [TanStack Router Quick Start](https://tanstack.com/router/latest/docs/framework/react/quick-start)
- [React Query Tutorial](https://tanstack.com/query/latest/docs/framework/react/quick-start)
- [Tailwind CSS v4 Guide](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Follow the established folder structure
2. Use TypeScript for all code
3. Add prop types and JSDoc comments
4. Test your components
5. Follow the styling conventions
6. Update this README if you add new patterns

---

**Happy Coding! 🚀**
