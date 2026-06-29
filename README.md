

# Suggestion Management System (SMS)

A plant-scoped employee suggestion management web application supporting two plants:

| Plant | Code | URL Prefix |
|-------|------|------------|
| Bidadi Plant (BidP) | `PLT-01` | `/bidp/...` |
| Jaipur Plant (JaP)  | `PLT-02` | `/jap/...`  |

---

## Repository Structure

```
/
├── frontend/          # React 18 + TypeScript SPA (Vite)
│   ├── lib/
│   │   ├── api.ts          # HTTP client — reads VITE_API_URL
│   │   ├── apiService.ts   # Typed endpoint wrappers (27 endpoints)
│   │   ├── constants.ts    # All plant codes, storage keys, JWT claim names
│   │   ├── mockData.ts     # Demo seed data (replaced by real API in production)
│   │   └── types/
│   │       └── formData.ts # Typed interfaces for suggestion formData JSON blob
│   ├── contexts/
│   │   └── AuthContext.tsx # Auth state — supports JWT login + SSO token exchange
│   └── pages/             # Route-level components per plant and role
│
├── backend/           # Node.js/Express prototype — FOR REFERENCE ONLY
│   │                  # THIS WILL BE REPLACED BY THE .NET WEB API
│   ├── src/db/
│   │   ├── schema.ts       # PostgreSQL table definitions
│   │   └── migrations.sql  # DB migration script
│   └── src/controllers/    # Controller logic (mirrors the API contract)
│
└── .env.local.example # Frontend environment variables template
    backend/.env.example   # Backend environment variables template
```

> **Note for .NET Backend Team:** The `backend/` folder contains a Node.js prototype used during frontend development. It defines the API contract and database schema but **will be fully replaced by your .NET Web API**. See `backend/.env.example` for all required configuration and integration notes.

---

## Frontend Setup

```sh
# Install dependencies (uses Bun)
bun install
# or: npm install

# Copy and fill in environment variables
cp .env.local.example .env.local

# Start dev server (http://localhost:8080 by default)
npm run dev
```

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Base URL of the .NET backend (e.g. `https://api.yourcompany.com`) |
| `VITE_DEMO_MODE` | `true` = use local mock data, no backend required |
| `VITE_SSO_MODE` | `true` = show SSO login button instead of form login |
| `VITE_SSO_AUTHORITY` | Azure AD / ADFS authority URL |
| `VITE_SSO_CLIENT_ID` | OAuth2 client ID for SSO |

---

## .NET Backend Integration

### Authentication
- All API requests include `Authorization: Bearer <jwt>` set by the frontend
- JWT payload must contain: `{ "employeeNo", "name", "role", "plantCode" }`
- For SSO: frontend calls `POST /api/auth/sso-exchange` with the SSO access token; backend validates it and returns a JWT
- For session restore: frontend calls `GET /auth/me` on page load to re-hydrate auth state from a stored JWT

### JSON Serialization
Configure camelCase on all responses:
```csharp
builder.Services.AddControllers().AddJsonOptions(o =>
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);
```

### Plant Isolation
Every API endpoint that touches suggestion or employee data accepts a `plantCode` query parameter (`PLT-01` or `PLT-02`). The backend **must** enforce this — never return cross-plant data.

### API Contract
See `frontend/lib/apiService.ts` for the full list of typed endpoint wrappers. All `TODO [BACKEND]` comments in component files identify the exact API call needed at that integration point.

### Database Schema
See `backend/src/db/schema.ts` (TypeScript) and `backend/src/db/migrations.sql` for the full schema. The `formData` column on the `suggestions` table is a `jsonb` blob — see `frontend/lib/types/formData.ts` for its typed structure.

---

## Technologies

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript 5, Vite, Tailwind CSS, shadcn/ui |
| State | TanStack React Query 5, React Hook Form, Zod |
| Routing | React Router DOM 6 |
| Auth | JWT HS256 + optional SSO (Azure AD / ADFS) |
| Backend (to be built) | .NET Web API, PostgreSQL |


