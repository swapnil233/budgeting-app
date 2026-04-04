# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important things to remember:
1. Commits should be 1 line, with no attributions so as to not make each commit too long. They should be easily scannable.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Generate Prisma client + build for production
npm run lint         # Run ESLint
```

To seed the database:
```bash
npx prisma db seed   # Uses tsx to run prisma/seed.ts
```

To apply schema changes:
```bash
npx prisma migrate dev
npx prisma generate  # Regenerates client to lib/generated/prisma
```

## Architecture

**Stack:** Next.js (App Router), React 19, TypeScript, Prisma + PostgreSQL (Supabase), Better Auth, shadcn/ui, Tailwind CSS v4, AG Grid, Recharts.

### Route Structure

- `/` — Landing page
- `/sign-in`, `/sign-up` — Auth pages
- `/dashboard` — Protected layout; auth is checked in the layout server component
  - `/dashboard` — Overview with spending charts and recent transactions
  - `/transactions`, `/budgets`, `/reports`, `/accounts`, `/categories`, `/settings`

### Data Layer

- **Prisma client** is a singleton in `lib/prisma.ts` using the `@prisma/adapter-pg` connection pooler for Supabase compatibility. Generated client lives in `lib/generated/prisma`.
- **API routes** at `app/api/*` handle all CRUD (transactions, categories, bank-accounts, budgets). Dashboard page components fetch data server-side by calling Prisma directly.
- **Transactions** support CSV import (`POST /api/transactions/import`) and export (`POST /api/transactions/export`), with search and pagination via `lib/transactions.ts`.

### Auth

- Better Auth is configured in `lib/auth.ts` (server) and exported for client use from `lib/auth-client.ts`.
- The Better Auth catchall route is at `app/api/auth/[...all]/route.ts`.
- Sessions include IP address and user agent; rate limiting is 10 req/60s.
- Trusted origins: `letobudget.com`, `www.letobudget.com`.

### Data Model (key relationships)

```
User → BankAccount (many)
User → Category (many, with colour, group, budgetAmount)
Category → Transaction (many)
BankAccount → Transaction (many, optional)
```

`CATEGORY_GROUP` enum: `INCOME | FIXED | SUBSCRIPTIONS | FOOD | LIFESTYLE | PEOPLE_AND_PETS | OTHER`  
`BankAccount.type`: `CHECKING | SAVINGS | CREDIT_CARD | CASH`  
`BankAccount.provider`: `TD_BANK | AMEX | SCOTIA_BANK | WEALTH_SIMPLE | RBC | BMO`

### Component Organization

- `components/ui/` — shadcn/ui primitives (New York style, neutral palette)
- `components/shell/` — Sidebar and nav layout (AppSidebar, NavMain, NavUser)
- `components/dashboard/` — Charts (SpendingLineChart) and summary cards
- `components/auth/` — Login/signup forms
- `components/transactions/`, `components/budgets/`, `components/categories/`, `components/accounts/` — Feature modules
- `components/shared/` — Cross-feature utilities

### Styling

Tailwind CSS v4 via `@tailwindcss/postcss`. Theme switching via `next-themes`. Use `clsx` + `tailwind-merge` (re-exported as `cn` from `lib/utils.ts`) for conditional class names.

### Path Aliases

`@/` maps to the repo root. Use `@/components`, `@/lib`, `@/hooks`, etc.
