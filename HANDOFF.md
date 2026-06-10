# ESFPP Auth + RBAC Handoff

## Architecture Overview

Frontend is a Vite React app in `frontend/src` using JSX, Tailwind CSS v4, Base UI/shadcn-style primitives, lucide icons, and a small internal route switch in `App.jsx`.

Backend is an Express API in `backend/server.js`. It validates Supabase bearer tokens for protected APIs and uses a server-only Supabase service role client for all admin operations including invitation link generation, account completion, and user management.

Supabase Auth is the identity source. RBAC is read from `auth.users.user_metadata.role` with either:

```json
{ "role": "admin" }
```

or:

```json
{ "role": "student" }
```

## Route Protection

Frontend:

- `RequireAuth` redirects unauthenticated users to `/login`.
- `RequireRole` redirects authenticated users to their own dashboard when they attempt to access another role's route.
- Admin routes: `/admin/dashboard`, `/admin/accounts`.
- Student route: `/student/dashboard`.
- Invitation completion route: `/complete-account`.

Backend RBAC:

- `/api/admin/*` endpoints require a valid Supabase access token and `role=admin`.
- `/api/complete-account` requires any valid access token (used by invited users completing their account).
- Students cannot access admin APIs even if they manually call the backend.

## Invitation Flow (Development-Friendly)

Invitations do **not** rely on Supabase email delivery. Instead, invitation links are generated server-side using the Supabase Admin API and returned directly to the admin.

### How It Works

1. **Admin creates an invitation** via the Accounts page (`/admin/accounts`).
2. **Backend** calls `supabaseAdmin.auth.admin.generateLink({ type: "invite", email, ... })`.
3. **Backend** creates a `profiles` row with `status = 'invited'` and the assigned `role`.
4. **Backend** returns the `action_link` (invitation URL) to the admin.
5. **Admin** copies the link and shares it with the user (email, chat, etc.).
6. **User** opens the link in their browser.
7. **Supabase** processes the invitation token and redirects to `/complete-account` with session tokens in the URL fragment.
8. **Frontend** Supabase client (`detectSessionInUrl: true`) picks up the session automatically.
9. **User** fills in their name and password.
10. **Frontend** calls `POST /api/complete-account` with `{ firstName, lastName, password }`.
11. **Backend** updates the auth user (password + metadata) via admin API and sets `profiles.status = 'active'`.
12. **User** is redirected to their role-appropriate dashboard.

### Link Regeneration

- Admins can regenerate a fresh invitation link for any user whose `profiles.status` is not `active` or `blocked`.
- Each regeneration creates a **new link**. Previously generated links are invalidated by Supabase.
- Regeneration is done via `POST /api/admin/invitations/:userId/regenerate`.

### Link Expiration

- Supabase invitation links have a default expiration (typically 24 hours, configurable in Supabase Auth settings).
- If a user opens an expired link, Supabase will not establish a session.
- The `/complete-account` page detects this (no user in auth context after loading) and shows a friendly error: *"Ce lien d'invitation n'est plus valide. Veuillez contacter un administrateur pour obtenir une nouvelle invitation."*
- The admin can then regenerate a fresh link.

### Invitation State Rules

| Current Status | Admin Action | Result |
|---------------|-------------|--------|
| `invited` | Generate / Regenerate link | ✅ Fresh link returned |
| `pending` | Generate / Regenerate link | ✅ Fresh link returned |
| `active` | Generate / Regenerate link | ❌ 409 — Account already activated |
| `blocked` | Generate / Regenerate link | ❌ 403 — Must unblock first |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Health check |
| `GET` | `/api/me` | Bearer token | Current user info |
| `GET` | `/api/admin/users` | Admin only | List all users with profile status |
| `POST` | `/api/admin/invitations` | Admin only | Create invitation, return link |
| `POST` | `/api/admin/invitations/:userId/regenerate` | Admin only | Regenerate invitation link |
| `POST` | `/api/complete-account` | Any authenticated | Complete account setup |

### POST /api/admin/invitations

Request:
```json
{ "email": "user@school.edu", "role": "student" }
```

Response (201):
```json
{
  "userId": "uuid",
  "email": "user@school.edu",
  "role": "student",
  "inviteLink": "https://your-project.supabase.co/auth/v1/verify?token=...",
  "status": "invited"
}
```

### POST /api/admin/invitations/:userId/regenerate

Response (200):
```json
{ "inviteLink": "https://your-project.supabase.co/auth/v1/verify?token=..." }
```

### POST /api/complete-account

Request:
```json
{ "firstName": "Jane", "lastName": "Doe", "password": "securepassword" }
```

Response (200):
```json
{ "message": "Account activated", "role": "student" }
```

## Database

### profiles table

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  status text not null default 'invited'
    check (status in ('invited', 'pending', 'active', 'blocked')),
  role text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Trigger: `profiles_set_updated_at` — automatically sets `updated_at = now()` on every row update.

RLS policies:
- Users can select/insert/update their own `profiles` row.
- Admins can read and manage all `profiles` rows.

### Status Source of Truth

`profiles.status` is the **single source of truth** for user status. The backend reads this column directly when listing users and when validating account completion. Status is never derived from Supabase auth metadata fields.

## Security

- `SUPABASE_SERVICE_ROLE_KEY` is **backend-only**. Never exposed in any `VITE_*` variable.
- All invitation link generation and account activation use the service role client on the backend.
- The frontend **never** writes `profiles.status` directly. All status changes go through `POST /api/complete-account` on the backend, which validates the current status before making changes.
- The frontend **never** calls `supabase.auth.updateUser()` for password changes. Password updates go through the backend admin API.
- All `/api/admin/*` endpoints are protected by the middleware chain: `requireServiceRole → requireAuth → requireRole("admin")`.

## Environment Variables

Frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3001
```

Backend:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=http://localhost:5173
PORT=3001
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or any `VITE_*` variable.

## First Admin Bootstrap

After applying database migrations, create the first admin:

1. Set these values in `backend/.env`:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Admin
```

2. Run:

```bash
cd backend
npm run create-admin
```

The script creates a confirmed Supabase Auth user with `user_metadata.role = "admin"` and creates the matching active `public.profiles` row.

## Migrations

Apply in order:

1. `supabase/migrations/20260609_auth_rbac_profiles.sql` — Creates `profiles` table, RLS policies, `auth_role()` function.
2. `supabase/migrations/20260609_auth_rbac_profiles_allow_pending.sql` — Adds `pending` to status check constraint.
3. `supabase/migrations/20260610_fix_profiles_updated_at.sql` — Adds missing `updated_at` column, recreates trigger.

## Supabase Dashboard Configuration

1. Auth → URL Configuration:
   - Site URL: your deployed frontend URL.
   - Additional Redirect URLs:
     - `http://localhost:5173/complete-account`
     - Production `/complete-account` URL.
2. Auth → Providers:
   - Enable email auth.
3. Auth → Users:
   - Ensure manually created users have `user_metadata.role` set.
4. RLS:
   - Confirm RLS is enabled on `profiles`.
   - Confirm migration policies exist.

## File Map

```
backend/
  server.js              — Express API: auth middleware, invitation generation,
                           account completion, user listing
  scripts/create-admin.js — Bootstrap script for first admin
  .env                   — Backend env vars (service role key here)

frontend/src/
  App.jsx                — Route switch
  supabaseClient.js      — Anon Supabase client
  contexts/
    auth-context.jsx     — Session management, role extraction
  lib/
    api.js               — Bearer-token fetch wrapper
    auth.js              — getUserRole, getDashboardPath
    utils.js             — cn() helper
  pages/
    account-management.jsx — Admin: create invitations, list users, regenerate links
    admin-dashboard.jsx    — Admin dashboard
    student-dashboard.jsx  — Student dashboard
    complete-account.jsx   — Invited user sets password + profile
  components/
    auth/
      auth-layout.jsx    — Split-screen auth layout
      brand-panel.jsx    — Branded left panel
      password-input.jsx — Password field with toggle
      route-guards.jsx   — RequireAuth, RequireRole
      sign-in-form.jsx   — Login form
    layout/
      dashboard-shell.jsx — Sidebar + header shell
    ui/
      button.jsx, input.jsx, label.jsx, checkbox.jsx

supabase/migrations/
  20260609_auth_rbac_profiles.sql
  20260609_auth_rbac_profiles_allow_pending.sql
  20260610_fix_profiles_updated_at.sql
```

## Deployment Checklist

1. Apply all SQL migrations in order.
2. Configure backend env vars with service role key.
3. Configure frontend env vars with only URL, anon key, and API URL.
4. Configure Supabase Auth redirect URLs.
5. Deploy backend.
6. Deploy frontend.
7. Create first admin via `npm run create-admin`.
8. Log in as admin, create a test student invitation.
9. Open the invitation link, complete the account.
10. Verify student cannot open `/admin/dashboard` or call `/api/admin/users`.
11. Verify expired links show the friendly error screen.
