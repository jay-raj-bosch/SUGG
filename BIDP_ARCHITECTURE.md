# BidP Suggestion Scheme — Application Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                                │
│  React 18 + TypeScript + Vite (port 8080)                               │
│  UI: shadcn/ui + Tailwind CSS                                           │
│  State: React Context (Auth, Suggestions, Plant)                        │
│  HTTP: Axios via apiService.ts                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ REST API (JSON)
                                 │ Authorization: Bearer <JWT>
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKEND API (Express + TypeScript)                 │
│  Port 4000 | JWT Auth (HS256) | Plant-scoped data isolation             │
│  In-memory store (swap-ready for PostgreSQL)                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (In-Memory Store)                          │
│  Employees | Suggestions | Categories | Awards | Notifications          │
│  Dept Mappings | Authority Assignments                                  │
│  Seed: backend/src/data/seed/bidp.ts                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Access-Based Login & Role System

### Authentication Flow

```
┌──────────┐    POST /api/auth/login       ┌──────────┐
│  Browser │ ─────────────────────────────► │  Backend │
│          │  { employeeNo, password }      │          │
│          │ ◄───────────────────────────── │          │
│          │  { token, user }               │          │
└──────────┘                                └──────────┘
     │
     │  Store JWT in localStorage("authToken")
     │  Attach to all API calls: Authorization: Bearer <token>
     ▼
┌──────────────────────────────────────────────────────────┐
│  JWT Payload                                             │
│  { employeeNo, name, role, plantCode, iat, exp }         │
│  role = "employee" | "admin"                             │
│  plantCode = "PLT-01" (BidP plant)                       │
└──────────────────────────────────────────────────────────┘
```

### Two-Tier Role Model

| Layer | Roles | Purpose |
|-------|-------|---------|
| **Backend** | `employee`, `admin` | API access control — admin gates write operations on categories, mappings, awards |
| **Frontend** | `employee`, `flm`, `manager`, `bps_admin`, `bps_dh` | UI access control — determines which pages/actions are visible |

### BidP Roles & Access Matrix

| BidP Role | Backend Role | Employee | Pages Accessible | Key Actions |
|-----------|-------------|----------|-----------------|-------------|
| **Employee** | `employee` | Karthik (30698665) | Dashboard, New Suggestion, My Suggestions, My Pending, My Awards | Submit suggestions, view own status |
| **FLM** (First Line Manager) | `admin` | Suresh M (30698710) | + My Approvals, Pending Evaluation | Evaluate & approve/reject assigned suggestions |
| **Manager** | `admin` | Anita Sharma (30698702) | + My Approvals, General Enquiry | Approve high-value suggestions from FLM |
| **BPS Admin** | `admin` | Vijay Sharma (30698720) | Full Admin Panel | Assign authority, manage categories, reports, awards, NEFT |
| **BPS DH** (Dept Head) | `admin` | Priya Devi (30698704) | + My Approvals, MIS Reports | Final approval for highest-value suggestions |

### Role Selection Flow

```
  Login (any employee)
        │
        ▼
┌─────────────────────┐
│  BidP Role Select   │  ← /bidp/role-select
│  Pick your persona  │
└────────┬────────────┘
         │
    ┌────┼────┬────────┬──────────┬──────────┐
    ▼    ▼    ▼        ▼          ▼          ▼
Employee  FLM  Manager  BPS Admin  BPS DH
    │    │    │        │          │
    │    └────┴────────┴──────────┘
    │              │
    ▼              ▼
Employee Layout   Admin Layout
(sidebar A)       (sidebar B — includes employee items)
```

**On role switch:**
1. Frontend calls `setBidpRole(role, userData)` in AuthContext
2. For non-employee roles → sets `user.role = "admin"` (enables admin API endpoints)
3. Persists `bidpRole` + `bidpUserData` to sessionStorage (survives refresh)
4. Sidebar re-renders based on active role

---

## Approval Pipeline

```
 ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐
 │ Employee │    │   FLM   │    │ Manager  │    │ BPS Admin │    │  BPS DH │
 │  Submit  │───►│Evaluate │───►│ Approve  │───►│  Approve  │───►│ Approve │
 └──────────┘    └─────────┘    └──────────┘    └───────────┘    └─────────┘
                      │               │               │               │
                      ▼               ▼               ▼               ▼
                  [Reject]        [Reject]        [Reject]        [Reject]
                  [Send Back]     [Send Back]     [Send Back]     [Send Back]
```

### Pipeline Routing Logic

| Suggestion Type | Award ≤ ₹500 | Award > ₹500 |
|-----------------|--------------|--------------|
| **SSS** (Simple Suggestion) | FLM → BPS Admin → Closed | FLM → Manager → BPS Admin → BPS DH → Closed |
| **SFC** (Shop Floor CIP) | FLM → BPS Admin → Closed | FLM → Manager → BPS Admin → BPS DH → Closed |
| **CTF** (Cash The Flash) | FLM → BPS Admin → Closed | FLM → BPS Admin → BPS DH → Closed |
| **MIC** (My Idea Card) | FLM → BPS Admin → Closed | FLM → Manager → BPS Admin → Closed |
| **DCP** (Daily CIP) | Auto-closed on submit | — |

### Status Flow

```
Draft → Submitted → Pending Manager → Pending BPS Admin → Pending BPS DH → Approved & Closed
                 └─► Rejected (at any level)
                 └─► Sent Back (returns to previous level)
```

### Tracked Fields per Level

| Approval Level | Fields Written |
|---------------|---------------|
| FLM Evaluation | `evaluated_by`, `evaluated_by_name`, `evaluated_on`, `award_amount` |
| Manager Approval | `approved_by_manager`, `approved_by_manager_name`, `approved_by_manager_on` |
| BPS Admin Approval | `approved_by_bps_admin`, `approved_by_bps_admin_name`, `approved_by_bps_admin_on` |
| BPS DH Approval | `approved_by_bps_dh`, `approved_by_bps_dh_name`, `approved_by_bps_dh_on` |
| Rejection | `rejection_reason`, `rejected_by`, `rejected_by_name`, `rejected_on` |

---

## Backend API Endpoints

### Auth (No JWT required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/login` | Login → returns JWT + user |
| `GET` | `/api/auth/me` | Get current user (requires JWT) |

### Suggestions (JWT required, plant-scoped)

| Method | Endpoint | Query Params | Purpose |
|--------|----------|-------------|---------|
| `GET` | `/api/suggestions` | `status`, `type`, `employeeNo`, `assignedFlm`, `page`, `limit` | List suggestions |
| `GET` | `/api/suggestions/:id` | — | Single suggestion detail |
| `POST` | `/api/suggestions` | — | Create new suggestion |
| `PUT` | `/api/suggestions/:id` | — | Full update |
| `PATCH` | `/api/suggestions/:id/status` | — | Update status + pendingWith |

### Admin Resources (JWT + Admin role)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET/POST` | `/api/categories` | List / Create categories |
| `DELETE` | `/api/categories/:id` | Delete category |
| `GET/POST` | `/api/dept-mappings` | List / Create department mappings |
| `PUT/DELETE` | `/api/dept-mappings/:id` | Update / Delete mapping |
| `GET/POST` | `/api/authority-assignments` | List / Create authority assignments |
| `DELETE` | `/api/authority-assignments/:id` | Delete assignment |
| `GET/POST` | `/api/awards` | List / Create awards |
| `PATCH` | `/api/awards/:id/neft` | Update NEFT payment status |
| `GET` | `/api/notifications` | List notifications |
| `PATCH` | `/api/notifications/read-all` | Mark all read |

### Reports (JWT required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/reports/summary` | Overall statistics |
| `GET` | `/api/reports/dept-stats` | Per-department breakdown |
| `GET` | `/api/reports/category-stats` | Per-category breakdown |
| `GET` | `/api/reports/memo` | Memo generation |

---

## Frontend Page Architecture

```
/bidp
  ├── /role-select              ← Pick BidP role
  │
  ├── /employee/                ← Employee Layout (all roles)
  │   ├── /                     ← Dashboard (stats + recent)
  │   ├── /new-suggestion       ← Submit new suggestion (FLM selector)
  │   ├── /copy-suggestion      ← Duplicate existing
  │   ├── /my-suggestions       ← All own suggestions
  │   ├── /my-pending           ← Own pending suggestions
  │   ├── /pending-evaluation   ← Queue for this user to evaluate
  │   ├── /my-approvals         ← Approval queue (FLM/Manager/Admin/DH)
  │   ├── /my-awards            ← Awards received
  │   └── /procedure            ← Help documentation
  │
  └── /admin/                   ← Admin Layout (FLM + Manager + BPS Admin + BPS DH)
      ├── /assign-authority     ← Map employees to BidP roles
      ├── /general-enquiry      ← Search/filter all plant suggestions
      ├── /category-master      ← CRUD suggestion categories
      ├── /dept-mapping         ← Department↔Range mapping
      ├── /transfer-suggestion  ← Transfer to another department
      ├── /reopen-suggestion    ← Reopen rejected suggestions
      ├── /neft-report          ← Payment/MIS reports
      ├── /mis-graphical        ← Charts & statistics
      └── /award-letter         ← Generate award letters
```

---

## Data Flow (Production Pattern)

### Create Suggestion

```
Frontend                           Backend
────────                           ───────
NewSuggestion.tsx
  │
  ├─ Select type (SSS/SFC/CTF/MIC/DCP)
  ├─ Fill form fields
  ├─ Select FLM (for SSS/SFC/CTF/MIC)
  │
  ▼
SuggestionContext.addSuggestion()
  │
  ├─► POST /api/suggestions
  │     Body: { typeCode, subject, category, status,
  │             assignedFlm, approvalLevel, pendingWith,
  │             presentMethod, proposedMethod, benefits }
  │
  │     ◄── { id, suggestionNo, ... }
  │
  ├─ Update local state
  └─ Persist to sessionStorage (fallback cache)
```

### Approve Suggestion (FLM Example)

```
Frontend                           Backend
────────                           ───────
MyApprovals.tsx
  │
  ├─ Filter: assignedFlm === currentUser
  │          && status === "Submitted"
  │
  ├─ FLM clicks "Approve"
  │
  ▼
SuggestionContext.updateSuggestion()
  │
  ├─► PUT /api/suggestions/:id
  │     Body: { status: "Pending Manager",
  │             evaluatedBy, evaluatedByName, evaluatedOn,
  │             awardAmount, approvalLevel: "Manager",
  │             pendingWith: "Manager" }
  │
  │     ◄── { updated suggestion }
  │
  └─ Update local state + persist
```

---

## Employee Directory (PLT-01 / BidP)

| Employee No | Name | Department | BidP Role | Password |
|-------------|------|-----------|-----------|----------|
| 30698665 | Karthik | BIDP1/TEF | Employee (default) | password123 |
| 30698701 | Suresh Patil | BIDP2/QAL | Employee | password123 |
| 30698702 | Anita Sharma | BIDP1/MNT | Manager | password123 |
| 30698704 | Priya Devi | BIDP1/SAF | BPS DH | password123 |
| 30698706 | Kavitha Nair | BIDP2/QAL | Employee | password123 |
| 30698710 | Suresh M | BIDP1/TEF | FLM | password123 |
| 30698711 | Ganesh R | BIDP2/QAL | FLM (alt) | password123 |
| 30698712 | Priya S | BIDP1/HRD | FLM (alt) | password123 |
| 30698720 | Vijay Sharma | BIDP1/ADM | BPS Admin | password123 |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite (dev port 8080) |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS |
| State Management | React Context + useReducer |
| HTTP Client | Axios (via apiService.ts) |
| Routing | React Router v6 |
| Backend Framework | Express 4 + TypeScript |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Data Store | In-memory (swap-ready for PostgreSQL) |
| Dev Server | ts-node (port 4000) |
| API Format | REST / JSON |

---

## Security & Access Control

| Control | Implementation |
|---------|---------------|
| Authentication | JWT Bearer token on every request |
| Password Storage | bcrypt hashed |
| Plant Isolation | All queries scoped by `plantCode` from JWT |
| Admin Gates | `requireAdmin` middleware on write endpoints |
| Token Expiry | Configurable via `JWT_EXPIRES_IN` env var |
| CORS | Configurable origin (default: `*` in dev) |
| Input Validation | Controller-level checks before store operations |
