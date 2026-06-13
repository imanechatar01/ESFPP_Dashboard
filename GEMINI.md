# ESFPP Dashboard Project Context

This file contains the foundational mandates, architecture, and workflows for the ESFPP Dashboard project.

## Tech Stack
- **Frontend:** React 19, Tailwind CSS v4, Vite.
- **Backend:** Node.js, Express.
- **Database/Auth:** Supabase (PostgreSQL, GoTrue for Auth).
- **Icons:** Lucide React.
- **Styling:** Vanilla CSS + Tailwind v4 `@theme` directives.

## Architecture
- **Monorepo-ish:** `frontend/` and `backend/` are in the same repository but managed as separate npm projects.
- **RBAC (Role Based Access Control):** 
  - Roles are `admin` or `student`.
  - Roles are stored in `auth.users.user_metadata.role` for session-based access.
  - Roles are also mirrored in `public.profiles.role`.
- **Invitation Flow:**
  - Custom backend flow using Supabase Admin API.
  - Bypasses email delivery issues in dev by generating links manually.
  - Status tracking: `invited`, `pending`, `active`, `blocked`.
- **Routing:** 
  - Custom internal router in `frontend/src/App.jsx` (no `react-router-dom`).
  - Route guards: `RequireAuth` and `RequireRole` in `frontend/src/components/auth/route-guards.jsx`.

## Security Mandates
- **Service Role Key:** The `SUPABASE_SERVICE_ROLE_KEY` is **STRICTLY BACKEND-ONLY**. Never expose it to the frontend.
- **Data Access:** Enforced via Supabase Row Level Security (RLS) on the database level and role-checks on the backend.

## Conventions
- **Routing:** Add new pages to the `pages/` directory and register them in `App.jsx`.
- **Components:** UI primitives in `components/ui/`, logic-specific components in their respective subfolders.
- **State Management:** React Context (`auth-context.jsx`) for global auth state.
- **API Calls:** Use the wrapper in `lib/api.js` for authenticated requests to the backend.

## Workspace Workflows
- **Database:** Apply migrations in `supabase/migrations/` sequentially.
- **Bootstrap:** Use `backend/scripts/create-admin.js` to create the initial admin user.
- **Development:** 
  - Backend: `npm start` in `backend/` (runs on port 3001).
  - Frontend: `npm run dev` in `frontend/` (runs on port 5173).

## Key Files
- `backend/server.js`: Core API and middleware.
- `frontend/src/App.jsx`: Main routing logic.
- `frontend/src/contexts/auth-context.jsx`: Auth provider.
- `supabase/migrations/`: Database schema and policies.

## Frontend Conventions (Critical)

### 1. Tailwind v4 Theme Tokens
Always use these theme variables (via `@theme inline` in `globals.css`) instead of arbitrary values:
- **Fonts:** 
  - `font-sans`: 'Figtree' (Default for UI)
  - `font-heading`: 'Figtree'
  - `font-mono`: 'Geist Mono'
- **Colors:**
  - `primary`: Professional Medical Blue (`oklch(0.42 0.12 245)`)
  - `secondary`: Calming Cyan (`oklch(0.85 0.08 195)`)
  - `accent`: Medical Vitality Green (`oklch(0.6 0.15 160)`)
  - `background`: Soft blue-gray (`oklch(0.98 0.005 195)`)
  - `foreground`: Dark medical blue text (`oklch(0.25 0.06 230)`)
- **UI Components:**
  - `.medical-glass`: Custom class for frosted-glass effects with medical styling.
- **Border Radius:** Use `radius-sm`, `radius-md`, `radius-lg` (default 0.625rem), `radius-xl`, etc.

### 2. Custom Routing System
This project **does not use react-router-dom**. It uses a lightweight internal router in `App.jsx`:
- **State Management:** The `usePath` hook tracks the current `window.location.pathname`.
- **Navigation:** Use the `navigate(path, options)` function provided by `usePath` (passed down as props). 
  - `navigate('/path')` for push.
  - `navigate('/path', { replace: true })` for redirect/replace.
- **Route Switch:** The `AppRoutes` component performs direct string matching or `.startsWith()` checks on the `path` variable to render the appropriate page component.

### 3. Engineering Rules
- **Never import `react-router-dom`**: Use the internal `navigate` and `usePath` logic.
- **Never use `localStorage` or `sessionStorage`**: Authentication state is managed by Supabase and the `AuthContext`. All persistent settings should be handled via the backend or Supabase user metadata.
