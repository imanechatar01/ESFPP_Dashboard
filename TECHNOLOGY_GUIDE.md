# ESFPP Dashboard - Technology Stack & Learning Guide

## Project Overview
The ESFPP Dashboard is a full-stack web application for managing educational logigrammes (structured training flowcharts), academic years, training programs (filières), and student completion tracking. It's designed to support multiple training programs with role-based access control.

---

## Technology Stack

### 1. **Frontend - React 19 + Vite**
**Purpose:** Interactive user interface and real-time UI updates

**Key Libraries:**
- **React 19** - Component-based UI framework
- **Vite 6** - Fast build tool and dev server (replaces Webpack)
- **Tailwind CSS 4** - Utility-first CSS framework for styling
- **React Router** (implied) - Page navigation and routing
- **@supabase/supabase-js** - Client library for database queries

**Supporting Libraries:**
- **shadcn/ui** - Pre-built accessible UI components
- **Lucide React** - Icon library
- **SweetAlert2** - User-friendly alert dialogs
- **class-variance-authority** - Component styling variants
- **clsx & tailwind-merge** - CSS class utilities

### 2. **Backend - Node.js + Express 5**
**Purpose:** API server, request routing, authentication, and data validation

**Key Libraries:**
- **Express.js 5** - Web framework for HTTP routing and middleware
- **@supabase/supabase-js** - Server-side Supabase SDK
- **CORS** - Cross-Origin Resource Sharing for secure frontend-backend communication
- **Multer** - File upload handling (for Excel imports)
- **WebSocket (ws)** - Real-time communication with frontend
- **dotenv** - Environment variable management

**Architecture:**
- Modular route organization (`routes/` folder)
- Middleware for authentication and authorization
- Admin, teacher, and student role-based access control

### 3. **Database - Supabase (PostgreSQL)**
**Purpose:** Data persistence with built-in authentication and real-time capabilities

**Key Features:**
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Database-level access control
- **Authentication** - Built-in user management with JWT tokens
- **Real-time Subscriptions** - WebSocket-based updates

**Schema Includes:**
- `academic_years` - School year periods (2025-2026)
- `filieres` - Training programs (AS, REA, IA, IP, RADIO)
- `classes` - Class sections within programs
- `logigrammes` - Training flowcharts/schedules
- `profiles` - User role management
- `completion_tracking` - Student progress tracking

### 4. **Styling - Tailwind CSS 4**
**Purpose:** Rapid UI development with consistent design system

**Tools:**
- **PostCSS** - CSS preprocessing
- **Autoprefixer** - Browser compatibility for CSS
- **Tailwind Oxide** - High-performance Tailwind compiler

### 5. **Data Processing - Python**
**Purpose:** Excel file parsing and data transformation

**Scripts:**
- `parse_xls.py` - Parse Excel workbooks
- `xls_stats.py` - Generate import statistics

---

## Essential Technologies to Master

### **For Frontend Developers** (Priority Order)

1. **React 19** ⭐⭐⭐⭐⭐ (CRITICAL)
   - **Learn:** Component lifecycle, hooks (useState, useContext, useEffect), context API
   - **Why:** All UI logic and state management depends on this
   - **Time:** 2-3 weeks
   - **Key files:** `src/components/`, `src/contexts/`

2. **Vite** ⭐⭐⭐⭐
   - **Learn:** Module bundling, hot module replacement (HMR), build optimization
   - **Why:** Understanding the dev environment is crucial for debugging and performance
   - **Time:** 1 week
   - **Key file:** `vite.config.js`

3. **Tailwind CSS 4** ⭐⭐⭐⭐
   - **Learn:** Utility-first CSS, responsive design, component composition
   - **Why:** All styling is Tailwind-based; understanding utilities saves development time
   - **Time:** 1 week
   - **Key file:** `tailwind.config.js`

4. **Supabase Client SDK** ⭐⭐⭐⭐
   - **Learn:** Database queries, real-time subscriptions, authentication
   - **Why:** Direct database communication from frontend
   - **Time:** 1-2 weeks
   - **Key files:** `src/lib/api.js`, `src/supabaseClient.js`

5. **shadcn/ui Component Library** ⭐⭐⭐
   - **Learn:** Pre-built component patterns and customization
   - **Why:** Accelerates UI development with accessible, tested components
   - **Time:** 3-5 days
   - **Key files:** `src/components/ui/`

---

### **For Backend Developers** (Priority Order)

1. **Express.js 5** ⭐⭐⭐⭐⭐ (CRITICAL)
   - **Learn:** Routing, middleware, error handling, request/response cycle
   - **Why:** Core framework for all API endpoints
   - **Time:** 2-3 weeks
   - **Key files:** `server.js`, `routes/`

2. **Supabase & PostgreSQL** ⭐⭐⭐⭐⭐ (CRITICAL)
   - **Learn:** SQL queries, transactions, Row Level Security (RLS), database schema
   - **Why:** All data persistence and business logic depends on this
   - **Time:** 3-4 weeks
   - **Key files:** `supabase/migrations/`, `lib/supabase.js`

3. **Authentication & Authorization** ⭐⭐⭐⭐⭐ (CRITICAL)
   - **Learn:** JWT tokens, role-based access control (RBAC), middleware
   - **Why:** The app has multiple roles (admin, teacher, student) with different permissions
   - **Time:** 2-3 weeks
   - **Key files:** `lib/auth.js`

4. **CORS & HTTP Headers** ⭐⭐⭐⭐
   - **Learn:** Cross-origin policies, credential handling, security headers
   - **Why:** Essential for frontend-backend communication
   - **Time:** 3-5 days
   - **Key file:** `server.js` (CORS configuration)

5. **File Upload Handling (Multer)** ⭐⭐⭐
   - **Learn:** Form data parsing, file validation, stream handling
   - **Why:** Excel file imports are core to the application
   - **Time:** 1 week
   - **Key files:** `routes/`, `scripts/import-xls.js`

6. **WebSockets (ws)** ⭐⭐⭐
   - **Learn:** Real-time bidirectional communication
   - **Why:** For real-time updates in the dashboard
   - **Time:** 1 week

---

### **For Full-Stack Developers** (Beyond Both Sides)

1. **SQL & Database Design** ⭐⭐⭐⭐⭐
   - **Learn:** Normalization, indexing, query optimization, migrations
   - **Why:** Critical for performance and data integrity
   - **Time:** 3-4 weeks
   - **Key files:** `supabase/migrations/`

2. **Environment Management (.env)** ⭐⭐⭐⭐
   - **Learn:** Configuration management, secrets handling, environment-specific setups
   - **Why:** Different configurations for dev, staging, production
   - **Time:** 3-5 days

3. **Git & Version Control** ⭐⭐⭐⭐
   - **Learn:** Branching strategies, collaborative workflows, conflict resolution
   - **Why:** Essential for team development
   - **Time:** 1-2 weeks

4. **Excel/XLS Processing** ⭐⭐⭐
   - **Learn:** Python data processing, file parsing libraries
   - **Why:** Import functionality uses Python scripts
   - **Time:** 1 week
   - **Key files:** `scripts/parse_xls.py`, `scripts/import-xls.js`

---

## Quick Start Learning Path

### Week 1-2: Foundation
- [ ] React basics and hooks
- [ ] Express.js routing and middleware
- [ ] Supabase setup and authentication

### Week 3-4: Core Features
- [ ] Database schema and RLS policies
- [ ] Frontend component architecture
- [ ] API endpoint development

### Week 5-6: Advanced Features
- [ ] Real-time updates (WebSockets)
- [ ] File uploads and processing
- [ ] Role-based access control implementation

---

## Key Project Patterns

### Frontend Patterns
- **Context API** for global state (auth, logigramme data)
- **Custom Hooks** for reusable logic (useLogigramme)
- **Component Composition** with shadcn/ui

### Backend Patterns
- **Middleware Stack** for authentication/authorization
- **Modular Routes** for feature organization
- **Service Layer** abstraction (supabase calls)

### Database Patterns
- **Row Level Security (RLS)** for multi-tenancy
- **Migrations** for schema versioning
- **Triggers** for audit trails (created_at, updated_at)

---

## Resources by Technology

| Technology | Official Docs | Time to Learn |
|------------|---------------|--------------|
| React 19 | https://react.dev | 2-3 weeks |
| Vite | https://vite.dev | 1 week |
| Express.js | https://expressjs.com | 2-3 weeks |
| Tailwind CSS | https://tailwindcss.com | 1 week |
| Supabase | https://supabase.io/docs | 2-3 weeks |
| PostgreSQL | https://www.postgresql.org/docs/ | 2-3 weeks |
| shadcn/ui | https://ui.shadcn.com | 3-5 days |

---

## Development Workflow

1. **Clone & Setup**
   ```bash
   npm install  # Frontend
   npm install  # Backend
   ```

2. **Start Development**
   ```bash
   # Terminal 1: Frontend (http://localhost:5173)
   npm run dev
   
   # Terminal 2: Backend (http://localhost:3000)
   npm start
   ```

3. **Database Migrations**
   - Run via Supabase Dashboard or CLI
   - Track in `supabase/migrations/`

---

## Critical Success Factors

1. **Understand Authentication Flow**
   - Frontend → Backend → Supabase JWT
   - Role-based access decisions at each level

2. **Master Async/Await**
   - All database and API calls are async
   - Proper error handling is crucial

3. **Learn SQL Basics**
   - RLS policies are SQL-based
   - Query optimization matters

4. **Understand CORS & Security**
   - Frontend and backend must be properly configured
   - Credentials and headers are important

5. **Version Your Migrations**
   - Never modify old migrations; create new ones
   - Track schema changes systematically
