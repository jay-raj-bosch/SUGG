# Functional Specification Document

## JaP Suggestion Management System (Jaipur Plant)

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Date** | 29 May 2026 |
| **Plant** | PLT-02 — Jaipur, Rajasthan |
| **Application Type** | Web-based SPA (Single Page Application) |
| **Platform** | Desktop & Mobile Responsive |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [User Roles & Access Matrix](#4-user-roles--access-matrix)
5. [Workflow Pipeline](#5-workflow-pipeline)
6. [Functional Modules](#6-functional-modules)
7. [Data Model](#7-data-model)
8. [API Specification](#8-api-specification)
9. [Business Rules & Constraints](#9-business-rules--constraints)
10. [Security & Isolation](#10-security--isolation)
11. [UI/UX Specifications](#11-uiux-specifications)
12. [Reporting & MIS](#12-reporting--mis)
13. [Notifications](#13-notifications)
14. [Non-Functional Requirements](#14-non-functional-requirements)

---

## 1. Executive Summary

The JaP Suggestion Management System is a digital platform designed for the Jaipur Plant (PLT-02) to manage the complete lifecycle of employee improvement suggestions — from submission through feasibility review, opinion gathering, implementation, evaluation, and award disbursement.

The system replaces manual paper-based suggestion workflows with a structured 6-phase digital pipeline, supporting 7 distinct user roles, configurable input methods (voice, typing, file upload), bilingual operation (English + Hindi), and offline-capable demo mode.

**Key Objectives:**
- Digitize the employee suggestion lifecycle end-to-end
- Enforce role-based accountability with SLA tracking
- Provide real-time visibility into suggestion pipeline status
- Enable quantitative and qualitative evaluation of implemented suggestions
- Automate award calculation and disbursement tracking

---

## 2. System Overview

### 2.1 Architecture

```
┌─────────────────────────────────────────────────┐
│               Frontend (React SPA)               │
│    Vite + React 18 + TypeScript + Tailwind CSS   │
│         shadcn/ui component library              │
├─────────────────────────────────────────────────┤
│              REST API (Express.js)               │
│         JWT Authentication (HS256)               │
│         Plant-scoped data isolation              │
├─────────────────────────────────────────────────┤
│              Data Layer (In-Memory)              │
│     Seed data per plant + runtime mutations      │
└─────────────────────────────────────────────────┘
```

### 2.2 Plant Isolation

The system supports multiple plants with strict data isolation:

| Plant Code | Name | Location | Language |
|-----------|------|----------|----------|
| PLT-01 | BidP | Bidadi, Karnataka | Kannada |
| PLT-02 | JaP | Jaipur, Rajasthan | Hindi |

- Every API query is scoped by `plantCode` from the JWT token
- Frontend URL routing encodes the plant: `/jap/employee/...`, `/jap/admin/...`
- Session storage enforces mutual exclusion between plant roles
- Language context auto-selects per plant (JaP = Hindi)

### 2.3 Suggestion Number Format

```
JAP-{YYYY}-{NNN}
```

Example: `JAP-2026-041`

- `JAP` — Type code for Improvement Suggestion
- `YYYY` — Year of creation
- `NNN` — Zero-padded sequential counter

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool & dev server |
| React Router | 6.30.1 | Client-side routing |
| React Hook Form | 7.61.1 | Form state management |
| Zod | 3.25.76 | Schema validation |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| shadcn/ui | — | Accessible component library |
| TanStack React Query | 5.83.0 | Async state management |
| Recharts | 2.15.4 | Charts & visualizations |
| jsPDF | 4.2.0 | PDF generation (award letters) |
| Sonner | 1.7.4 | Toast notifications |
| date-fns | 3.6.0 | Date utilities |
| Lucide React | 0.462.0 | Icon library |

### 3.2 Backend

| Technology | Purpose |
|-----------|---------|
| Express.js | HTTP server & routing |
| TypeScript | Type safety |
| JWT (HS256) | Authentication tokens |
| bcryptjs | Password hashing |

### 3.3 Testing & Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 3.2.4 | Unit testing |
| ESLint | 9.32.0 | Code linting |
| PostCSS | 8.5.6 | CSS processing |

---

## 4. User Roles & Access Matrix

### 4.1 Role Definitions

| Role | Code | Description |
|------|------|-------------|
| Employee | `employee` | Submits suggestions; tracks own submissions and rewards |
| Superior | `superior` | Phase 2: Reviews feasibility of submitted suggestions |
| Planner | `planner` | Phase 3: Provides opinion; Phase 5: Initial evaluation |
| Implementer | `implementer` | Phase 4: Executes physical implementation on shop floor |
| CTG | `ctg` | Phase 5: Calculates quantifiable savings (cost/time/power) |
| BPS Admin | `bps` | Full admin access; controls input methods; hold/resume |
| Coordinator | `coordinator` | Read-only observer across all phases |

### 4.2 Access Matrix

| Feature | Employee | Superior | Planner | Implementer | CTG | BPS | Coordinator |
|---------|----------|----------|---------|-------------|-----|-----|-------------|
| Submit Suggestion | ✅ | — | — | — | — | — | — |
| View Own Suggestions | ✅ | — | — | — | — | — | — |
| View Own Rewards | ✅ | — | — | — | — | — | — |
| Feasibility Review | — | ✅ | — | — | — | ✅ | 👁️ |
| Opinion Phase | — | — | ✅ | — | — | ✅ | 👁️ |
| Mark Implemented | — | — | — | ✅ | — | ✅ | 👁️ |
| Classify Evaluation | — | — | ✅ | — | — | ✅ | 👁️ |
| Quantifiable Eval | — | — | ✅* | — | ✅ | ✅ | 👁️ |
| Non-Quantifiable Eval | — | — | ✅ | — | — | ✅ | 👁️ |
| Award Disbursement | — | — | — | — | — | ✅ | 👁️ |
| Hold / Resume | — | — | — | — | — | ✅ | — |
| Reopen Rejected | — | — | — | — | — | ✅ | — |
| Assign Authority | — | — | — | — | — | ✅ | — |
| BPS Settings | — | — | — | — | — | ✅ | — |
| MIS Reports | — | — | — | — | — | ✅ | ✅ |
| View All Suggestions | — | — | — | — | — | ✅ | ✅ |

\* Planner fills basic fields; CTG fills savings sections for quantifiable.

---

## 5. Workflow Pipeline

### 5.1 Six-Phase Lifecycle

```
┌─────────────┐    ┌───────────────────────────┐    ┌──────────────────┐
│   Phase 1   │───▶│        Phase 2            │───▶│     Phase 3      │
│    Draft    │    │  Pending Feasibility      │    │   In Opinion     │
│  (Employee) │    │  Review (Superior)        │    │   Phase (Planner)│
└─────────────┘    └───────────────────────────┘    └──────────────────┘
                                                            │
                                                            ▼
┌─────────────┐    ┌───────────────────────────┐    ┌──────────────────┐
│   Phase 6   │◀───│        Phase 5            │◀───│     Phase 4      │
│  In Award   │    │   In Evaluation           │    │ In Implementation│
│ (BPS/Finance│    │ (Planner + CTG)           │    │  (Implementer)   │
└─────────────┘    └───────────────────────────┘    └──────────────────┘
       │
       ▼
┌─────────────────────┐
│  Closed / Awarded   │
└─────────────────────┘
```

### 5.2 Status Definitions

| Status | Phase | Responsible Role | Description |
|--------|-------|------------------|-------------|
| Draft | 1 | Employee | Saved locally, not yet submitted |
| Pending Feasibility Review | 2 | Superior | Technical viability assessment |
| In Opinion Phase | 3 | Planner | Opinion gathering and validation |
| In Implementation | 4 | Implementer | Physical shop floor execution |
| In Evaluation | 5 | Planner + CTG | Classify and calculate savings |
| In Award | 6 | BPS / Finance | Award amount determination and disbursement |
| Closed / Awarded | Final | — | Suggestion lifecycle complete |
| Rejected | Terminal | — | Rejected at any phase; can be reopened |
| Reopened | Recovery | — | Previously rejected, reversed by BPS |
| On Hold | Paused | BPS | Temporarily paused; resumes to previous status |

### 5.3 SLA Requirements

| Phase | SLA (Days) | Escalation |
|-------|-----------|------------|
| Pending Feasibility Review | — | No SLA enforced |
| In Opinion Phase | 7 | Marked overdue in inbox |
| In Implementation | 30 | Marked overdue in inbox |
| In Evaluation | 10 | Marked overdue in inbox |
| In Award | 3 | Marked overdue in inbox |

### 5.4 Phase Transitions

| From Status | Action | To Status | Actor |
|------------|--------|-----------|-------|
| Draft | Submit | Pending Feasibility Review | Employee |
| Pending Feasibility Review | Approve | In Opinion Phase | Superior |
| Pending Feasibility Review | Reject | Rejected | Superior |
| In Opinion Phase | Approve | In Implementation | Planner |
| In Opinion Phase | Reject | Rejected | Planner |
| In Implementation | Mark Done | In Evaluation | Implementer |
| In Evaluation | Classify & Evaluate | In Award | Planner/CTG |
| In Award | Disburse | Closed / Awarded | BPS |
| Any Active | Hold | On Hold | BPS |
| On Hold | Resume | (Previous Status) | BPS |
| Rejected | Reopen | Reopened | BPS |

### 5.5 Evaluation Sub-workflow

```
In Evaluation
    │
    ├── Classify as "Quantifiable"
    │       │
    │       ├── Planner fills: Judgement, Team, Implementation details
    │       │       → Saves plannerEvalDone = true, keeps "In Evaluation"
    │       │
    │       └── CTG fills: Material, Processing Time, Power, Space,
    │               Manpower, Cost savings calculations
    │               → Advances to "In Award"
    │
    └── Classify as "Non-Quantifiable"
            │
            └── Planner fills: Factor degree scoring (Safety, Quality,
                    Cost, Productivity, etc.)
                    → Advances to "In Award"
```

---

## 6. Functional Modules

### 6.1 Employee Modules

#### 6.1.1 New Suggestion Submission

**Purpose:** Allow employees to submit improvement suggestions with configurable input methods.

**Fields:**
| Field | Type | Required | Input Method |
|-------|------|----------|--------------|
| Subject | Text | Yes | Typing |
| Theme | Dropdown (16 options) | Yes | Selection |
| Suggestion Area | Dropdown (24 options) | Yes | Selection |
| Category | Dropdown | Yes | Selection |
| Present Method | Textarea | Yes | Voice / Typing |
| Proposed Method | Textarea | Yes | Voice / Typing |
| Expected Benefits | Textarea | Yes | Voice / Typing |
| Machine Reference | Radio (Name/Number/NA) | No | Selection |
| Co-suggestors | Multi-select (18 employees) | No | Selection |
| Attachments | File upload (images/docs) | No | File Upload |

**Themes (16):**
1. Safety Improvement / सुरक्षा सुधार
2. Quality Enhancement / गुणवत्ता सुधार
3. Cost Reduction / लागत कटौती
4. Productivity Improvement / उत्पादकता सुधार
5. Energy Conservation / ऊर्जा संरक्षण
6. 5S & Workplace Organization / 5S एवं कार्यस्थल व्यवस्था
7. Environment & Sustainability / पर्यावरण एवं स्थिरता
8. Delivery & Logistics / डिलीवरी एवं लॉजिस्टिक्स
9. Customer Satisfaction / ग्राहक संतुष्टि
10. Innovation & Technology / नवाचार एवं प्रौद्योगिकी
11. Skill Development / कौशल विकास
12. Kaizen / कैज़न
13. Standardization / मानकीकरण
14. Power Saving / बिजली बचत
15. Motion Waste / गति अपव्यय
16. Time Saving / समय बचत

**Shop Floor Areas (24):**
Ve Assembly, QMM 8 Lab, Component Audit, Barrier Audit, Std Room, HT Shop, Calibration, Post Calibration, Subassembly, Plunger Hardstage, Plunger Soft Stage, Commissioning, TEF Mechanical, PI Lab, NHA Assembly, NHA Hardstage, Roller Ring, Drive Shaft, Z-Stage, Y-Stage, Camplate, Tool Room, Feedpump, Valv Spool Area

**Behavior:**
- Voice input toggle converts speech-to-text for Present Method, Proposed Method, Benefits
- Draft auto-save to localStorage with form state
- File upload supports images (JPEG, PNG) and documents (PDF) up to 4 MB each, max 5 files
- On submit: generates `JAP-{year}-{rand}` number, transitions to "Pending Feasibility Review"
- Input methods (Voice / Typing / File Upload) can be globally enabled/disabled by BPS Admin

#### 6.1.2 My Suggestions

**Purpose:** Track all suggestions submitted by the logged-in employee.

**Features:**
- List view with status badges, dates, and phase indicators
- Status timeline showing progression through phases
- Reopen request dialog for rejected suggestions
- Filter/search by suggestion number or subject

#### 6.1.3 My Rewards

**Purpose:** View all awarded suggestions and download award letters.

**Features:**
- Display award amount, category (Bronze/Silver/Gold/Platinum), and date
- PDF award letter generation using jsPDF
- Total Points and Total Value summary cards

#### 6.1.4 Employee Home Dashboard

**Features:**
- Quick stats: Submitted, Pending, Approved, Rejected, Awarded counts
- Total Points card (star icon, amber)
- Total Value card (rupee icon, green)
- Navigation buttons to key pages

---

### 6.2 Admin Modules

#### 6.2.1 Workflow Inbox

**Purpose:** Phase-tab browsing interface showing all suggestions organized by workflow phase.

**Features:**
- Tab navigation for each workflow phase
- Role-filtered view (each role sees only their responsible phases)
- Action dialogs per phase (Approve, Reject, Classify)
- Audit trail display (who approved at which stage)
- Navigate to evaluation forms on classification

#### 6.2.2 Approval Inbox

**Purpose:** Flat "urgent items" list for role-aware action — items awaiting the logged-in user's action.

**Features:**
- Sorted by urgency: overdue items first, then by days pending descending
- SLA indicators with overdue badges
- Phase summary cards (count per phase)
- Search by suggestion number, subject, employee, department
- **Stage Filter** — dropdown to filter by workflow phase
- **Department Filter** — dropdown to filter by department
- Active filter badges with click-to-remove
- Approve/Reject action dialogs with phase-specific fields
- Detail view panel with full suggestion information

#### 6.2.3 View Suggestions

**Purpose:** Full search and general enquiry interface with administrative actions.

**Features:**
- Search by: date range, suggestion number, employee number, stage, category
- Paginated results table
- Hold/Resume buttons (BPS only)
- Classify action for evaluation phase
- Export capabilities

#### 6.2.4 Assign Authority

**Purpose:** Map evaluators/approvers to each workflow stage.

**Features:**
- Assign authority for: Opinion, Implementation, Evaluation, Award stages
- Employee selector filtered to PLT-02 staff
- Local fallback when API is offline (creates local-* ID entries)
- Delete authority assignments

#### 6.2.5 Evaluation — Quantifiable

**Purpose:** Detailed cost/savings evaluation for measurable improvement suggestions.

**Split Workflow:**
- **Planner Section:** Judgement option, team details, implementation summary
- **CTG Section:** Material savings, processing time savings, power savings, space savings, manpower savings, total cost reduction calculation

**Behavior:**
- URL pre-selection via `?sugg=` query parameter
- Planner submits → saves `plannerEvalDone: true`, keeps "In Evaluation"
- CTG submits → advances to "In Award" with calculated savings

#### 6.2.6 Evaluation — Non-Quantifiable

**Purpose:** Qualitative assessment using factor-degree scoring.

**Factors:**
- Safety, Quality, Cost, Productivity, Environment, Customer Satisfaction, Innovation

**Scoring:** Small / Medium / High / NA per factor

**Behavior:**
- URL pre-selection via `?sugg=` query parameter
- Filters candidates by `evaluationType === "non-quantifiable"`
- Submit advances to "In Award"

#### 6.2.7 Award Management

**Purpose:** Process awards for suggestions that have completed evaluation.

**Features:**
- View all "In Award" suggestions
- Quantifiable awards: cash amount based on savings calculation
- Non-quantifiable awards: certificate-based recognition
- Award categories: Bronze (< ₹3,000) / Silver (₹3,000–₹4,999) / Gold (≥ ₹5,000) / Platinum
- CSV export of awards data

#### 6.2.8 Reopen Suggestion

**Purpose:** Reverse rejection decisions with proper audit trail.

**Features:**
- Display full rejection details (reason, rejector, date)
- Re-open with new remark
- Reopen audit trail maintained

#### 6.2.9 BPS Settings

**Purpose:** BPS-admin-only control panel for input method configuration.

**Settings:**
| Setting | Default | Description |
|---------|---------|-------------|
| Voice Input | Enabled | Speech-to-text for description fields |
| Typing | Enabled | Standard keyboard input |
| File Upload | Enabled | Image and document attachments |

**Constraints:**
- At least one input method must remain enabled
- Persisted to localStorage (`jap_input_methods`)
- Changes take immediate effect for all employee submissions

#### 6.2.10 MIS Graphical Reports

**Purpose:** Visual dashboard for suggestion system performance metrics.

**Charts:**
- Department participation rate (bar chart)
- Category distribution (pie chart)
- Status-wise suggestion count
- Monthly trend analysis

---

## 7. Data Model

### 7.1 Core Entities

#### Suggestion

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier |
| suggestionNo | String | Auto-generated (JAP-2026-NNN) |
| subject | String | Suggestion title |
| type | String | "Improvement Suggestion" |
| category | String | Safety / Quality / Productivity / etc. |
| status | String | Current workflow status |
| date | String | Submission date (YYYY-MM-DD) |
| pendingWith | String | Current responsible role label |
| daysPending | Number | Days in current phase |
| employeeNo | String | Submitter employee number |
| employeeName | String | Submitter name |
| department | String | Submitter department |
| presentMethod | String | Current state description |
| proposedMethod | String | Proposed improvement |
| benefits | String | Expected benefits |
| attachments | Array | File attachments (max 5, 4 MB each) |
| formData | Object | Full form state (theme, area, co-suggestors, eval data) |
| plantCode | String | "PLT-02" |
| awardAmount | Number | Disbursed award amount (₹) |
| awardCategory | String | Bronze / Silver / Gold / Platinum |
| rejectionReason | String | Reason for rejection |
| rejectedBy | String | Rejector employee number |

#### Employee

| Field | Type | Description |
|-------|------|-------------|
| employeeNo | String | Unique employee number |
| name | String | Full name |
| department | String | Department name |
| area | String | Shop floor area |
| plantCode | String | Plant assignment |
| role | String | "employee" or "admin" |
| japRole | String | JaP-specific role |

#### Authority Assignment

| Field | Type | Description |
|-------|------|-------------|
| id | String | Assignment ID |
| employeeNo | String | Assigned authority |
| role | String | Stage role (opinion/implementation/evaluation/award) |
| plantCode | String | Plant scope |

### 7.2 Database Tables (18 Total)

1. `plants` — Master plant codes
2. `employees` — All workers with NEFT bank details
3. `suggestions` — Core suggestion records
4. `suggestion_types` — Type definitions (SSS, SFC, MIC, DCP, CTF, JAP)
5. `categories` — Plant-scoped category master
6. `simple_suggestion_details` — SSS-specific fields
7. `shop_floor_cip_details` — SFC-specific fields
8. `cip_team_members` — Junction table for CIP teams
9. `my_idea_card_details` — MIC-specific fields
10. `daily_cip_details` — DCP-specific fields
11. `cash_the_flash_details` — CTF-specific fields
12. `attachments` — File attachments (max 5 per suggestion, 4 MB)
13. `awards` — Award records with NEFT disbursement status
14. `authority_assignments` — Stage-to-person mappings
15. `transfer_audit_log` — Immutable ownership changes
16. `reopen_audit_log` — Immutable rejection reversals
17. `notifications` — Per-user notification feed
18. `department_mappings` — Raw-to-display name mappings

---

## 8. API Specification

### 8.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user, return JWT |
| GET | `/api/auth/me` | Get current user from token |

### 8.2 Suggestions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suggestions` | List suggestions (filtered by status, type, employeeNo) |
| GET | `/api/suggestions/:id` | Get suggestion detail |
| POST | `/api/suggestions` | Create new suggestion |
| PUT | `/api/suggestions/:id` | Full update |
| PATCH | `/api/suggestions/:id/status` | Update status + pendingWith |

**Query Parameters (GET /suggestions):**
- `status` — Filter by status
- `type` — Filter by suggestion type
- `employeeNo` — Filter by submitter
- `assignedFlm` — Filter by assigned FLM
- `page` — Pagination page number
- `limit` — Results per page

### 8.3 Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List employees (optional `?role=` filter) |
| GET | `/api/employees/:employeeNo` | Get employee detail |

### 8.4 Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List categories (plant-scoped) |
| POST | `/api/categories` | Create category (admin) |
| DELETE | `/api/categories/:id` | Delete category (admin) |

### 8.5 Department Mappings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dept-mappings` | List mappings |
| POST | `/api/dept-mappings` | Create mapping (admin) |
| PUT | `/api/dept-mappings/:id` | Update mapping (admin) |
| DELETE | `/api/dept-mappings/:id` | Delete mapping (admin) |

### 8.6 Authority Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/authority-assignments` | List assignments (optional `?role=`) |
| POST | `/api/authority-assignments` | Create assignment (admin) |
| DELETE | `/api/authority-assignments/:id` | Delete assignment (admin) |

### 8.7 Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications (optional `?unread=true`) |
| POST | `/api/notifications` | Create notification |
| PATCH | `/api/notifications/:id/read` | Mark single as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |

### 8.8 Awards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/awards` | List awards (filter by employeeNo, neftStatus) |
| POST | `/api/awards` | Create award (admin) |
| PATCH | `/api/awards/:id/neft` | Update NEFT disbursement status (admin) |

### 8.9 Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/summary` | Overall summary statistics |
| GET | `/api/reports/dept-stats` | Department-wise breakdown |
| GET | `/api/reports/category-stats` | Category-wise breakdown |
| GET | `/api/reports/memo` | Memo report (by month/year/type) |

**All endpoints auto-scope to `req.user.plantCode` from JWT.**

---

## 9. Business Rules & Constraints

### 9.1 Submission Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-01 | At least one input method must be enabled globally | BpsSettings validation |
| BR-02 | Attachments limited to 5 files, 4 MB each | Frontend + backend validation |
| BR-03 | Present Method, Proposed Method, and Benefits are mandatory | Form validation |
| BR-04 | Suggestion number is auto-generated and immutable | Backend generation |
| BR-05 | Draft suggestions are saved to localStorage until submitted | Frontend persistence |

### 9.2 Workflow Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-06 | Only the role responsible for a phase can approve/reject | `canActOnSuggestion()` check |
| BR-07 | BPS Admin can act on any phase | Role override in canAct |
| BR-08 | Rejection requires a mandatory reason text | Dialog validation |
| BR-09 | Only BPS can place suggestions On Hold | UI gating + update function |
| BR-10 | Resume from Hold returns to the previous status | `previousStatus` stored in formData |
| BR-11 | Evaluation classification (quantifiable/non-quantifiable) must be done before evaluation form | Navigate pattern |
| BR-12 | CTG can only see quantifiable evaluations | Filter: `evaluationType === "quantifiable"` |
| BR-13 | Planner must complete their section before CTG can act | `plannerEvalDone` flag check |

### 9.3 Award Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-14 | Award category: Bronze (< ₹3,000), Silver (₹3,000–₹4,999), Gold (≥ ₹5,000) | Auto-calculated |
| BR-15 | Award requires completed evaluation phase | Status check |
| BR-16 | NEFT disbursement status tracked separately | Awards table |

### 9.4 Data Isolation Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-17 | JaP data never mixes with BidP data | JWT plantCode scoping |
| BR-18 | Setting JaP role clears BidP session data | AuthContext mutual exclusion |
| BR-19 | All queries auto-filtered by plantCode | Backend middleware |

---

## 10. Security & Isolation

### 10.1 Authentication

- JWT (HS256) token-based authentication
- Token contains: `employeeNo`, `name`, `plantCode`, `role`
- Token stored in `localStorage`
- Auto-login with default credentials for demo mode

### 10.2 Authorization

- Role-based access control enforced at frontend (UI gating) and backend (middleware)
- Admin endpoints (`POST`, `PUT`, `DELETE`) require `role === "admin"` in JWT
- Plant-scoping applied at the data layer — no cross-plant access possible

### 10.3 Data Isolation

- Strict plant isolation: backend queries always filter by `req.user.plantCode`
- Session storage separates JaP and BidP state (`japRole` vs `bidpRole`)
- Frontend URL routing prevents cross-plant navigation

### 10.4 Input Validation

- Zod schemas for form validation
- Sanitized text inputs (no raw HTML injection)
- File type and size validation for uploads

---

## 11. UI/UX Specifications

### 11.1 Design System

- **Framework:** Tailwind CSS 3.4 with shadcn/ui components
- **Theme:** Light mode with accent colors per plant
- **Typography:** System font stack
- **Icons:** Lucide React icon library
- **Language:** Bilingual labels (English / Hindi for JaP)
- **Responsiveness:** Mobile-first responsive design with collapsible sidebar

### 11.2 Layout Structure

```
┌─────────────────────────────────────────────┐
│              App Header                      │
│  (Logo, Plant Name, User, Notifications)    │
├────────┬────────────────────────────────────┤
│        │                                    │
│  Side  │        Main Content Area           │
│  bar   │                                    │
│        │                                    │
│ (Nav   │  (Page-specific content with       │
│  Links)│   cards, forms, tables, charts)    │
│        │                                    │
└────────┴────────────────────────────────────┘
```

### 11.3 Key UI Components

| Component | Usage |
|-----------|-------|
| Card | Container for data display and forms |
| Badge | Status indicators with color coding |
| Dialog | Modal dialogs for actions (Approve/Reject/Detail) |
| Select | Dropdown selectors for filters and form fields |
| Input | Text inputs with search icon overlays |
| Textarea | Multi-line input with voice toggle |
| Button | Action buttons with size/color variants |
| Toast (Sonner) | Success/error/info notifications |
| Tabs | Phase navigation in workflow inbox |

### 11.4 Status Color Coding

| Status | Color |
|--------|-------|
| Draft | Gray |
| Pending Feasibility Review | Blue |
| In Opinion Phase | Indigo |
| In Implementation | Amber |
| In Evaluation | Purple |
| In Award | Emerald |
| Closed / Awarded | Green |
| Rejected | Red |
| Reopened | Orange |
| On Hold | Slate |

### 11.5 Voice Input

- Speech-to-text toggle button on supported fields
- Visual indicator (microphone icon) when recording
- Auto-fills text area with transcribed speech
- Can be globally disabled by BPS Admin via BPS Settings

---

## 12. Reporting & MIS

### 12.1 Summary Report

- Total suggestions submitted (by period)
- Status distribution
- Average days to close
- Award amounts distributed

### 12.2 Department Statistics

- Suggestions per department (bar chart)
- Participation rate per department
- Department-wise award distribution

### 12.3 Category Statistics

- Suggestions by category (pie chart)
- Category trend over time
- Top categories by savings generated

### 12.4 Memo Report

- Parameterized by month, year, and type
- Printable format for management review

---

## 13. Notifications

### 13.1 Notification Types

| Type | Icon | Trigger |
|------|------|---------|
| `info` | Blue | Classification, status updates |
| `success` | Green | Approvals, awards |
| `warning` | Amber | SLA approaching, hold placed |
| `error` | Red | Rejections |

### 13.2 Notification Events

| Event | Recipients | Message |
|-------|-----------|---------|
| Suggestion submitted | Superior | New suggestion pending feasibility review |
| Phase approved | Next-phase role | Suggestion advanced to next phase |
| Suggestion rejected | Employee | Suggestion rejected with reason |
| Award disbursed | Employee | Award of ₹X approved |
| Put on hold | All stakeholders | Suggestion placed on hold by BPS |
| Reopened | Employee | Previously rejected suggestion reopened |
| SLA breach | Responsible role | Suggestion overdue by X days |

### 13.3 Notification UI

- Bell icon in header with unread count badge
- Dropdown panel showing recent notifications
- Mark individual or all as read
- Auto-refresh on page navigation

---

## 14. Non-Functional Requirements

### 14.1 Performance

| Metric | Target |
|--------|--------|
| Page load time | < 2 seconds |
| API response time | < 500ms |
| Search results display | < 1 second |
| PDF generation | < 3 seconds |

### 14.2 Availability

| Requirement | Specification |
|-------------|---------------|
| Offline mode | Demo data available when backend offline |
| Local fallback | Authority assignments saved locally if API fails |
| Draft persistence | localStorage saves form state across sessions |

### 14.3 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 14+ |
| Mobile Chrome/Safari | Latest |

### 14.4 Scalability

| Metric | Current Capacity |
|--------|-----------------|
| Concurrent users | 50+ |
| Suggestions per plant | 10,000+ |
| Employees per plant | 500+ |

### 14.5 Localization

| Language | Coverage | Plant |
|----------|----------|-------|
| English | Full | Both |
| Hindi | Labels, headers, option text | JaP (PLT-02) |
| Kannada | Labels, headers, option text | BidP (PLT-01) |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| JaP | Jaipur Plant (PLT-02) |
| BidP | Bidadi Plant (PLT-01) |
| BPS | Business Process Services (Admin role) |
| CTG | Cost Target Group (Savings evaluation) |
| FLM | First Line Manager |
| SLA | Service Level Agreement |
| NEFT | National Electronic Funds Transfer |
| CIP | Continuous Improvement Process |
| MIS | Management Information System |
| Kaizen | Continuous improvement philosophy |

## Appendix B: Suggestion Form Data Schema

```typescript
formData: {
  // Submission fields
  theme: string;                      // One of 16 JAP_THEMES
  suggestionArea: string;             // One of 24 JAP_AREAS
  machineRef: "name" | "number" | "na";
  machineValue?: string;
  teamMembers?: string[];             // Co-suggestor employee numbers
  teamMembersShare?: Record<string, number>; // Share percentages

  // Feasibility review
  feasibilityApprovedBy?: string;
  feasibilityApprovedByName?: string;
  feasibilityApprovedOn?: string;

  // Opinion phase
  opinionApprovedBy?: string;
  opinionApprovedByName?: string;
  opinionApprovedOn?: string;
  opinionComment?: string;

  // Implementation
  implementedBy?: string;
  implementedByName?: string;
  implementedOn?: string;

  // Evaluation
  evaluationType?: "quantifiable" | "non-quantifiable";
  classifiedBy?: string;
  classifiedByName?: string;
  classifiedOn?: string;
  plannerEvalDone?: boolean;
  evaluatedBy?: string;
  evaluatedByName?: string;
  evaluatedOn?: string;

  // Quantifiable savings (CTG)
  materialSavings?: number;
  processingTimeSavings?: number;
  powerSavings?: number;
  spaceSavings?: number;
  manpowerSavings?: number;
  totalCostReduction?: number;
  recommendedAward?: number;

  // Non-quantifiable scoring
  factorScores?: Record<string, "small" | "medium" | "high" | "na">;

  // Hold/Resume
  holdReason?: string;
  holdBy?: string;
  holdByName?: string;
  holdOn?: string;
  previousStatus?: string;

  // Rejection
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedOn?: string;
}
```

---

*End of Functional Specification Document*
