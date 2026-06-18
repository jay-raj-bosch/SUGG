# Business Requirement Document (BRD)

## Flow Boost Ideas — Suggestion Management Platform

| Field               | Details                                                    |
|---------------------|------------------------------------------------------------|
| **Document Version**| 1.0                                                        |
| **Date**            | 12-May-2026                                                |
| **Project Name**    | Flow Boost Ideas                                           |
| **Domain**          | Continuous Improvement (CI) & Suggestion Management        |
| **Prepared By**     | IT / Digital Transformation Team                           |
| **Status**          | Draft                                                      |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Objectives](#2-business-objectives)
3. [Scope](#3-scope)
4. [User Roles & Access Criteria](#4-user-roles--access-criteria)
5. [Suggestion Schemes](#5-suggestion-schemes)
6. [Functional Requirements](#6-functional-requirements)
7. [Approval Workflow](#7-approval-workflow)
8. [Access Criteria Matrix](#8-access-criteria-matrix)
9. [Data Model & Entities](#9-data-model--entities)
10. [Business Rules & Constraints](#10-business-rules--constraints)
11. [Notification & Communication Rules](#11-notification--communication-rules)
12. [Award & Recognition System](#12-award--recognition-system)
13. [Reporting & MIS Requirements](#13-reporting--mis-requirements)
14. [Duplicate Detection Engine](#14-duplicate-detection-engine)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Glossary](#16-glossary)

---

## 1. Executive Summary

**Flow Boost Ideas** is an enterprise-grade web application designed for manufacturing plants to collect, evaluate, track, and reward employee suggestions under a structured Continuous Improvement (CI) program. The platform supports **five distinct suggestion schemes**, a **multi-level approval workflow**, and a comprehensive **award & disbursement system** with NEFT integration.

The system operates on a **dual-portal architecture** — a dedicated **Employee Portal** for suggestion submission and tracking, and an **Admin Dashboard** for authority management, evaluation, reporting, and award disbursement.

---

## 2. Business Objectives

| # | Objective | Measurable Outcome |
|---|-----------|-------------------|
| BO-01 | Digitize suggestion submission across all plant locations | 100% paperless submission |
| BO-02 | Reduce suggestion evaluation cycle time | Target < 15 days from submission to decision |
| BO-03 | Enable transparent approval tracking | Real-time status visibility for employees |
| BO-04 | Standardize award disbursement via NEFT | Automated bank transfer reconciliation |
| BO-05 | Provide MIS & reporting for CI program monitoring | Monthly memo reports, department-level KPIs |
| BO-06 | Prevent duplicate/redundant suggestions | Client-side ML-based duplicate detection |
| BO-07 | Support multi-plant, multi-department operations | Plant-scoped data isolation and configuration |
| BO-08 | Maintain complete audit trail | Immutable logs for transfers and reopens |

---

## 3. Scope

### 3.1 In Scope

- Employee self-service suggestion submission (5 scheme types)
- Multi-level approval workflow (FLM → BPS → Decision)
- Authority assignment and management
- Award creation, categorization, and NEFT payment processing
- Monthly memo report generation (CSV/PDF export)
- Department and category master data management
- Suggestion transfer (ownership change) with audit trail
- Suggestion reopen (rejection reversal) with audit trail
- MIS dashboards and graphical analytics
- Real-time notification system
- Duplicate suggestion detection (client-side ML)
- Multi-language support (i18n)

### 3.2 Out of Scope

- Integration with external ERP / HRMS systems (future phase)
- Mobile native application (responsive web only)
- Automated FLM assignment via org-chart hierarchy
- Financial accounting module integration

---

## 4. User Roles & Access Criteria

### 4.1 Role Definitions

| Role | Code | Portal Access | Description |
|------|------|---------------|-------------|
| **Employee** | `employee` | Employee Portal | Any plant worker who submits and tracks suggestions |
| **Administrator** | `admin` | Admin Dashboard | CI coordinator responsible for approvals, awards, MIS, and configuration |
| **First Line Manager (FLM)** | `FLM` | Employee Portal + Authority Role | Employee with delegated first-level approval authority |
| **Business Process Streamer (BPS)** | `BPS` | Employee Portal + Authority Role | Employee with delegated second-level evaluation authority |

### 4.2 Authentication Criteria

| Criterion | Specification |
|-----------|--------------|
| **Login Method** | Employee Number + Password |
| **Token Type** | JSON Web Token (JWT) |
| **Token Attachment** | `Authorization: Bearer {token}` header on all API calls |
| **Token Expiry** | Configurable via environment variable (`JWT_EXPIRES_IN`) |
| **Session Validation** | Token verified on every API request via `authenticate` middleware |
| **Re-authentication** | Required on token expiry; no automatic refresh |

### 4.3 Authorization Criteria

| Level | Mechanism | Description |
|-------|-----------|-------------|
| **Level 0 — Public** | No token required | Only `/api/auth/login` endpoint |
| **Level 1 — Authenticated** | Valid JWT (`authenticate` middleware) | All endpoints except login |
| **Level 2 — Admin Only** | JWT + `role === 'admin'` (`requireAdmin` middleware) | Master data CRUD, award management, authority setup |
| **Level 3 — Ownership** | JWT + `employeeNo` match | Employees can only modify their own suggestions |

### 4.4 Portal Access Criteria

| Criterion | Employee Portal | Admin Dashboard |
|-----------|----------------|-----------------|
| **Who can access** | Users with `role = 'employee'` | Users with `role = 'admin'` |
| **URL Path** | `/employee/*` | `/admin/*` |
| **Menu Sections** | Home, New Suggestion, Copy, My Pending, Pending Evaluation, My Suggestions, My Awards, Procedure | Assign Authority, General Enquiry, View Memo, NEFT Report, MIS Graphical, Dept Mapping, Category Master, Transfer, Reopen, Award Letter |
| **Data Visibility** | Own suggestions only | All suggestions (plant-scoped) |

---

## 5. Suggestion Schemes

### 5.1 Scheme Overview

| # | Code | Scheme Name | Purpose | Complexity |
|---|------|-------------|---------|------------|
| 1 | **SSS** | Simple Suggestion Scheme | Basic workplace improvement ideas | Low |
| 2 | **SFC** | Shop Floor CIP | Structured team-based Kaizen activities | High |
| 3 | **MIC** | My Idea Card | Detailed individual problem-solution narratives | Medium |
| 4 | **DCP** | Daily CIP | Quick daily improvements with photo evidence | Low |
| 5 | **CTF** | Cash The Flash | Rapid-win ideas with shared incentive | Low |

### 5.2 Type-Specific Field Requirements

#### SSS — Simple Suggestion Scheme

| Field | Required | Validation |
|-------|----------|------------|
| Subject | Yes | — |
| Category | Yes | Must exist in plant's category master |
| Present Method | Yes | Describe current state |
| Proposed Method | Yes | Describe improvement |
| Benefits | Yes | Quantifiable or qualitative |
| FLM (First Line Manager) | Yes | Authority assignment lookup |

#### SFC — Shop Floor CIP

| Field | Required | Validation |
|-------|----------|------------|
| Kaizen Theme | Yes | — |
| Root Cause | Yes | — |
| Before/After Description | Yes | — |
| Benefits | Yes | — |
| Horizontal Deployment | Yes | Positive integer (> 0) |
| Moderator(s) | Yes | At least 1 moderator employee |
| Team Members | Yes | Multi-select employees |
| Category | Yes | Plant category master |

#### MIC — My Idea Card

| Field | Required | Validation |
|-------|----------|------------|
| Subject | Yes | — |
| Category | Yes | Plant category master |
| Problem Description | Yes | Minimum 20 characters |
| Improvement Description | Yes | Minimum 20 characters |
| Benefits | Yes | — |
| FLM | Yes | Authority lookup |
| Date of Implementation | Yes | Valid date |

#### DCP — Daily CIP

| Field | Required | Validation |
|-------|----------|------------|
| Machine No / Area | Yes | — |
| Suggestion Description | Yes | — |
| Action Taken | Yes | — |
| Photos Before | Yes | At least 1 image (JPG/PNG only) |
| Photos After | Yes | At least 1 image (JPG/PNG only) |
| Workshop | Yes | — |

#### CTF — Cash The Flash

| Field | Required | Validation |
|-------|----------|------------|
| Subject | Yes | — |
| Category | Yes | Plant category master |
| Present Method | Yes | — |
| Proposed Method | Yes | — |
| Benefits | Yes | — |
| FLM | Yes | Authority lookup |
| Share Percentage | Yes | Numeric: 0–100 |
| Suggestor Name | Yes | — |

### 5.3 Global Fields (All Types)

| Field | Required | Validation |
|-------|----------|------------|
| Suggestion Type | Yes | One of: SSS, SFC, MIC, DCP, CTF |
| Suggestion Date | Yes | Valid date |
| Range | Yes | Dropdown: A, B, C, or D |
| Suggestion For | Yes | Self or On Behalf |
| Group Suggestion | Yes | Yes or No |
| Other Information | No | Free text |
| Attachments | No | Max 5 files, max 4 MB each |

---

## 6. Functional Requirements

### 6.1 Employee Portal Features

| FR# | Feature | Description | Access |
|-----|---------|-------------|--------|
| FR-01 | **Dashboard** | View KPIs — total submissions, pending, approved, awarded; recent suggestions feed | Employee |
| FR-02 | **New Suggestion** | Multi-step form supporting all 5 types; duplicate detection pre-submission; file upload | Employee |
| FR-03 | **Copy Suggestion** | Clone an existing suggestion as a new draft for rapid re-submission with modifications | Employee |
| FR-04 | **My Pending** | View suggestions awaiting FLM/BPS approval with days-pending counter | Employee |
| FR-05 | **Pending Evaluation** | View submitted suggestions currently under evaluation | Employee |
| FR-06 | **My Suggestions** | Full list with status filters (Draft, Submitted, Approved, Rejected, Implemented) | Employee |
| FR-07 | **My Awards** | View awarded suggestions — amount, category (Bronze/Silver/Gold/Platinum), NEFT status | Employee |
| FR-08 | **Procedure** | Read-only documentation of submission rules and approval workflow | Employee |
| FR-09 | **Notifications** | Real-time notification feed for status changes, awards, transfers | Employee |

### 6.2 Admin Dashboard Features

| FR# | Feature | Description | Access |
|-----|---------|-------------|--------|
| FR-10 | **Assign Authority** | Map employees to FLM/BPS/Admin roles per plant; Internal/External classification | Admin |
| FR-11 | **General Enquiry** | Advanced search with filters (date range, suggestion #, status, employee, range, type); CSV/PDF export | Admin |
| FR-12 | **View Memo** | Monthly report — period: 16th prev month to 15th current month; filterable by type; export CSV/PDF | Admin |
| FR-13 | **NEFT / MIS Report** | Track award payments — NEFT status (Pending/Processed/Failed); bank transfer reconciliation | Admin |
| FR-14 | **MIS Graphical** | Department statistics bar chart, category distribution pie chart, participation % metrics | Admin |
| FR-15 | **Dept Mapping** | Map raw department names to standardized names (one-to-one mapping) | Admin |
| FR-16 | **Category Master** | CRUD operations for suggestion categories scoped per plant | Admin |
| FR-17 | **Transfer Suggestion** | Reassign suggestion ownership to a different employee with mandatory reason and audit trail | Admin |
| FR-18 | **Reopen Suggestion** | Reverse a rejection decision with remarks; creates reopen audit log entry | Admin |
| FR-19 | **Award Letter** | Generate formal award certificates with amount, category, and date | Admin |

---

## 7. Approval Workflow

### 7.1 Suggestion Lifecycle States

```
┌──────────┐
│  Draft   │  (Employee saves without submitting)
└────┬─────┘
     │ Submit
     ▼
┌──────────┐
│Submitted │  (Pending FLM review)
└────┬─────┘
     │ Auto-assign to FLM
     ▼
┌────────────┐
│Pending FLM │  (Awaiting First Line Manager action)
└────┬───────┘
     │ FLM Decision
     ├──────────────────────┐
     ▼                      ▼
┌────────────┐        ┌──────────┐
│Pending BPS │        │ Rejected │
│(if needed) │        └──────────┘
└────┬───────┘              ▲
     │ BPS evaluates        │ (Admin can Reopen)
     ▼                      │
┌─────────────────┐         │
│Under Evaluation │─────────┘
└────┬────────────┘
     │ Final Decision
     ├──────────────────────┐
     ▼                      ▼
┌──────────┐          ┌──────────┐
│ Approved │          │ Rejected │
└────┬─────┘          └──────────┘
     │ Implementation
     ▼
┌─────────────┐
│ Implemented │
└─────────────┘
```

### 7.2 Approval Roles & Routing

| Stage | Responsible Role | Trigger | Next State |
|-------|-----------------|---------|------------|
| Submission | Employee | Clicks Submit | Submitted → Pending FLM |
| First Review | FLM | Notification / Dashboard alert | Approve → Pending BPS **or** Reject |
| Second Review | BPS (optional) | FLM forwarding | Approve → Under Evaluation **or** Reject |
| Final Decision | Admin / BPS | Evaluation complete | Approved / Rejected |
| Award Creation | Admin | Suggestion approved | Award record created |
| Reopen | Admin | Overrides rejection | Rejected → Draft (re-enters workflow) |

### 7.3 Pending Tracking

| Field | Purpose |
|-------|---------|
| `pending_with` | Stores approver identity, e.g., "FLM - Suresh" or "BPS - Rajesh" |
| `days_pending` | Auto-incremented counter for SLA breach monitoring |

---

## 8. Access Criteria Matrix

### 8.1 API Endpoint Access Matrix

| Endpoint | Method | Public | Employee | Admin | Notes |
|----------|--------|--------|----------|-------|-------|
| `/api/auth/login` | POST | ✅ | — | — | Only public endpoint |
| `/api/auth/me` | GET | ❌ | ✅ | ✅ | Returns current user profile |
| `/api/suggestions` | GET | ❌ | ✅ (own) | ✅ (all) | Employee filtered by `employeeNo` |
| `/api/suggestions/:id` | GET | ❌ | ✅ | ✅ | View suggestion detail |
| `/api/suggestions` | POST | ❌ | ✅ | ❌ | Only employees submit suggestions |
| `/api/suggestions/:id` | PUT | ❌ | ✅ (own) | ❌ | Ownership enforced |
| `/api/suggestions/:id/status` | PATCH | ❌ | ✅ | ✅ | Status transition with validation |
| `/api/employees` | GET | ❌ | ✅ | ✅ | Read-only employee list |
| `/api/employees/:id` | GET | ❌ | ✅ | ✅ | Read-only employee detail |
| `/api/categories` | GET | ❌ | ✅ | ✅ | Read-only category list |
| `/api/categories` | POST | ❌ | ❌ | ✅ | Admin-only create |
| `/api/categories/:id` | DELETE | ❌ | ❌ | ✅ | Admin-only delete |
| `/api/dept-mappings` | GET | ❌ | ✅ | ✅ | Read-only |
| `/api/dept-mappings` | POST | ❌ | ❌ | ✅ | Admin-only create |
| `/api/dept-mappings/:id` | DELETE | ❌ | ❌ | ✅ | Admin-only delete |
| `/api/authority-assignments` | GET | ❌ | ✅ | ✅ | Read-only list |
| `/api/authority-assignments` | POST | ❌ | ❌ | ✅ | Admin-only assign |
| `/api/authority-assignments/:id` | DELETE | ❌ | ❌ | ✅ | Admin-only remove |
| `/api/notifications` | GET | ❌ | ✅ | ✅ | Filtered by user JWT |
| `/api/notifications` | POST | ❌ | ✅ | ✅ | Create notification |
| `/api/notifications/:id/read` | PATCH | ❌ | ✅ | ✅ | Mark single read |
| `/api/notifications/read-all` | PATCH | ❌ | ✅ | ✅ | Mark all read |
| `/api/awards` | GET | ❌ | ✅ (own) | ✅ (all) | Filtered by `employeeNo` for employees |
| `/api/awards` | POST | ❌ | ❌ | ✅ | Admin-only create award |
| `/api/awards/:id/neft` | PATCH | ❌ | ❌ | ✅ | Admin-only NEFT update |
| `/api/reports/summary` | GET | ❌ | ✅ | ✅ | Summary KPIs |
| `/api/reports/dept-stats` | GET | ❌ | ✅ | ✅ | Department statistics |
| `/api/reports/category-stats` | GET | ❌ | ✅ | ✅ | Category distribution |
| `/api/reports/memo` | GET | ❌ | ✅ | ✅ | Monthly memo report |

### 8.2 Feature-Level Access Matrix

| Feature | Employee | FLM | BPS | Admin |
|---------|----------|-----|-----|-------|
| View own suggestions | ✅ | ✅ | ✅ | — |
| Submit new suggestion | ✅ | ✅ | ✅ | — |
| Copy existing suggestion | ✅ | ✅ | ✅ | — |
| Track pending status | ✅ | ✅ | ✅ | — |
| View own awards | ✅ | ✅ | ✅ | — |
| View procedure docs | ✅ | ✅ | ✅ | — |
| Receive notifications | ✅ | ✅ | ✅ | ✅ |
| Approve/Reject (Level 1) | ❌ | ✅ | ❌ | — |
| Evaluate (Level 2) | ❌ | ❌ | ✅ | — |
| View all suggestions | ❌ | ❌ | ❌ | ✅ |
| Assign authorities | ❌ | ❌ | ❌ | ✅ |
| General enquiry (search) | ❌ | ❌ | ❌ | ✅ |
| Generate memo report | ❌ | ❌ | ❌ | ✅ |
| NEFT / MIS report | ❌ | ❌ | ❌ | ✅ |
| MIS graphical dashboard | ❌ | ❌ | ❌ | ✅ |
| Manage department mappings | ❌ | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ✅ |
| Transfer suggestion | ❌ | ❌ | ❌ | ✅ |
| Reopen rejected suggestion | ❌ | ❌ | ❌ | ✅ |
| Generate award letter | ❌ | ❌ | ❌ | ✅ |
| Create awards | ❌ | ❌ | ❌ | ✅ |
| Process NEFT payments | ❌ | ❌ | ❌ | ✅ |

### 8.3 Data Visibility Access Criteria

| Data Entity | Employee | Admin |
|-------------|----------|-------|
| **Suggestions** | Own submissions only (filtered by `employeeNo`) | All suggestions within plant scope |
| **Awards** | Own awards only | All awards; NEFT status management |
| **Notifications** | Own notifications (filtered by JWT `userId`) | Own notifications |
| **Categories** | Read-only (per plant) | Full CRUD (per plant) |
| **Department Mappings** | Read-only | Full CRUD |
| **Authority Assignments** | Read-only | Full CRUD |
| **Employee Directory** | Read-only (for team member selection) | Read-only |
| **Reports** | Summary KPIs only | Full reporting suite with export |
| **Audit Logs** | Not accessible | View transfer and reopen history |
| **Bank Details** | Not visible via UI | Accessible via NEFT report flow |

### 8.4 Cross-Plant Data Isolation

| Rule | Description |
|------|-------------|
| Plant-scoped categories | Categories are defined per `plant_code`; employees only see their plant's categories |
| Plant-scoped authorities | Authority assignments are scoped to `(plant_code, employee_no, role)` |
| Plant-scoped reports | Memo and MIS reports filter by plant |
| No cross-plant access | An employee or admin at Plant A cannot view Plant B's data |

---

## 9. Data Model & Entities

### 9.1 Entity Relationship Overview

```
plants
  ├── employees
  │   ├── suggestions
  │   │   ├── simple_suggestion_details      (1:0..1 — SSS type only)
  │   │   ├── shop_floor_cip_details         (1:0..1 — SFC type only)
  │   │   │   └── cip_team_members           (N:M junction)
  │   │   ├── my_idea_card_details           (1:0..1 — MIC type only)
  │   │   ├── daily_cip_details              (1:0..1 — DCP type only)
  │   │   ├── cash_the_flash_details         (1:0..1 — CTF type only)
  │   │   ├── attachments                    (1:N — max 5)
  │   │   ├── awards                         (1:0..1)
  │   │   ├── transfer_audit_log             (1:N — immutable)
  │   │   └── reopen_audit_log               (1:N — immutable)
  │   ├── authority_assignments              (1:N — per role per plant)
  │   └── notifications                      (1:N)
  ├── categories                             (per plant)
  ├── suggestion_types                       (lookup)
  └── department_mappings                    (per plant)
```

### 9.2 Core Tables

| # | Table | Primary Key | Purpose |
|---|-------|-------------|---------|
| 1 | `plants` | `plant_code` | Master plant/facility registry |
| 2 | `employees` | `employee_no` | All users (employees + admins); includes bank details |
| 3 | `suggestion_types` | `code` | Lookup for 5 scheme types (SSS, SFC, MIC, DCP, CTF) |
| 4 | `categories` | Auto-increment | Suggestion categories per plant (Safety, Quality, Cost, etc.) |
| 5 | `suggestions` | `id` | Main suggestion record with status, pending_with, days_pending |
| 6 | `simple_suggestion_details` | `suggestion_id` (FK) | SSS-specific fields |
| 7 | `shop_floor_cip_details` | `suggestion_id` (FK) | SFC-specific fields |
| 8 | `cip_team_members` | Composite (suggestion_id, employee_no) | SFC team member junction table |
| 9 | `my_idea_card_details` | `suggestion_id` (FK) | MIC-specific fields |
| 10 | `daily_cip_details` | `suggestion_id` (FK) | DCP-specific fields |
| 11 | `cash_the_flash_details` | `suggestion_id` (FK) | CTF-specific fields |
| 12 | `attachments` | Auto-increment | File attachments per suggestion |
| 13 | `awards` | Auto-increment | Award records (one per approved suggestion) |
| 14 | `authority_assignments` | Auto-increment | FLM/BPS/Admin role assignments per plant |
| 15 | `department_mappings` | Auto-increment | Raw → standardized department name mapping |
| 16 | `transfer_audit_log` | `audit_id` | Immutable ownership transfer history |
| 17 | `reopen_audit_log` | `audit_id` | Immutable rejection reversal history |
| 18 | `notifications` | Auto-increment | Per-user notification queue |

### 9.3 Suggestion Numbering Convention

| Component | Format | Example |
|-----------|--------|---------|
| Type Code | 3 letters | SSS, SFC, MIC, DCP, CTF |
| Year | 4 digits | 2026 |
| Sequence | 3+ digits (zero-padded) | 001, 002, ..., 999 |
| **Full Format** | `{TYPE}-{YYYY}-{NNN}` | `SSS-2026-001` |

- Generated server-side on `POST /suggestions`
- Enforced by database UNIQUE constraint

---

## 10. Business Rules & Constraints

### 10.1 Suggestion-Level Rules

| Rule ID | Rule | Enforcement | Impact |
|---------|------|-------------|--------|
| BR-01 | Suggestion date is mandatory | Schema validation | Cannot submit without a valid date |
| BR-02 | Range classification (A/B/C/D) is mandatory | Dropdown required | Influences evaluation complexity |
| BR-03 | Category must belong to employee's plant | FK constraint on `(plant_code, name)` | Prevents cross-plant category usage |
| BR-04 | Group suggestion flag is mandatory | Enum (Yes/No) | Determines team member linking |
| BR-05 | Maximum 5 attachments per suggestion | Database CHECK constraint | Enforced at DB level |
| BR-06 | Maximum 4 MB per attachment file | Frontend upload + DB validation | Prevents storage bloat |
| BR-07 | Daily CIP requires before AND after photos | Schema validation | At least 1 image each (JPG/PNG) |
| BR-08 | SFC requires at least 1 moderator | Schema validation | Mandatory for Shop Floor CIP |
| BR-09 | MIC descriptions must be ≥ 20 characters | Schema validation | Both Problem and Improvement fields |
| BR-10 | CTF share percentage must be 0–100 | Numeric range validation | Integer value only |
| BR-11 | SFC horizontal deployment must be > 0 | Positive integer validation | — |
| BR-12 | Suggestion number is unique and auto-generated | UNIQUE constraint | Server-side generation |

### 10.2 Approval-Level Rules

| Rule ID | Rule | Enforcement | Impact |
|---------|------|-------------|--------|
| BR-13 | One authority assignment per (plant, employee, role) | UNIQUE constraint | Cannot assign same FLM twice per plant |
| BR-14 | Status transitions must follow defined workflow | ENUM + application logic | Cannot skip from Draft to Approved |
| BR-15 | `pending_with` field is denormalized on assignment | Application trigger | Kept in sync for display performance |
| BR-16 | `days_pending` is auto-incremented | Scheduled task / cron | Enables SLA breach monitoring |
| BR-17 | Award can only be created for approved suggestions | Admin-enforced via UI | FK links `suggestion_id` uniquely |
| BR-18 | One award per suggestion | UNIQUE constraint on `suggestion_id` | Prevents duplicate awards |

### 10.3 Department Mapping Rules

| Rule ID | Rule | Enforcement | Impact |
|---------|------|-------------|--------|
| BR-19 | One raw department name maps to exactly one standard name | UNIQUE(`dept_name`) | Prevents ambiguous mappings |
| BR-20 | Duplicate mappings are rejected | Unique constraint | Admin notified of conflict |

### 10.4 Audit & Immutability Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-21 | Transfer audit log entries are immutable — no UPDATE or DELETE | Insert-only table |
| BR-22 | Reopen audit log entries are immutable — no UPDATE or DELETE | Insert-only table |
| BR-23 | Suggestions are never physically deleted | Application policy (soft-filter) |
| BR-24 | Transfer requires a mandatory reason | Schema validation |

---

## 11. Notification & Communication Rules

### 11.1 Notification Types

| Type | Icon/Severity | Usage |
|------|---------------|-------|
| `info` | Informational | General updates, status changes |
| `success` | Positive | Approval, award disbursement |
| `warning` | Caution | SLA breach alerts, pending reminders |
| `error` | Critical | Submission failures, processing errors |

### 11.2 Notification Triggers

| Event | Recipient | Notification Type |
|-------|-----------|-------------------|
| Suggestion submitted | Employee (self) | `success` |
| Status changed to Pending FLM | Assigned FLM | `info` |
| Status changed to Pending BPS | Assigned BPS | `info` |
| Suggestion approved | Employee | `success` |
| Suggestion rejected | Employee | `warning` |
| Award created | Employee | `success` |
| Suggestion transferred | New owner | `info` |
| Suggestion reopened | Original submitter | `info` |
| SLA breach (days_pending threshold) | Admin / FLM | `warning` |

### 11.3 Notification Management

| Action | API | Description |
|--------|-----|-------------|
| Fetch feed | `GET /notifications` | Returns user's notifications (JWT-filtered) |
| Create | `POST /notifications` | System or user-triggered notification |
| Mark read | `PATCH /notifications/:id/read` | Mark single notification as read |
| Mark all read | `PATCH /notifications/read-all` | Bulk mark all as read |

---

## 12. Award & Recognition System

### 12.1 Award Categories

| Category | Typical Use Case |
|----------|-----------------|
| **Bronze** | Quick wins — Daily CIP, Cash The Flash |
| **Silver** | Standard improvements — Simple Suggestion, My Idea Card |
| **Gold** | Significant innovations — Shop Floor CIP with measurable impact |
| **Platinum** | Strategic breakthroughs — Organization-wide transformations |

### 12.2 Award Lifecycle

```
Suggestion Approved
       │
       ▼
Admin creates award (POST /awards)
  → category: Bronze/Silver/Gold/Platinum
  → amount: monetary value
  → neft_status: "Pending"
       │
       ▼
Finance batch NEFT processing (PATCH /awards/:id/neft)
  → neft_status: "Processed" (success)
  → neft_status: "Failed" (retry required)
       │
       ▼
Employee notified of award
       │
       ▼
Admin generates Award Letter (certificate)
```

### 12.3 NEFT Payment Status

| Status | Description |
|--------|-------------|
| `Pending` | Award created, awaiting bank transfer |
| `Processed` | NEFT transfer successful |
| `Failed` | Payment rejected — eligible for retry |

### 12.4 Bank Details

- Stored in `employees` table: `bank_account`, `bank_ifsc`, `bank_name`
- Populated during employee onboarding
- Visible to Admin only via NEFT report workflow
- Not exposed to employees via the application UI

---

## 13. Reporting & MIS Requirements

### 13.1 Report Catalog

| Report | API | Parameters | Output |
|--------|-----|------------|--------|
| **Summary Dashboard** | `GET /reports/summary` | — | Total suggestions, submitted, approved, pending counts, award totals |
| **Department Statistics** | `GET /reports/dept-stats` | — | Per-dept: submitted, implemented, pending, rejected; participation % |
| **Category Statistics** | `GET /reports/category-stats` | — | Per-category suggestion count (for pie chart) |
| **Monthly Memo** | `GET /reports/memo` | `month`, `year`, `type` (optional) | Suggestion details with award amounts, CSV/PDF export |

### 13.2 Memo Report Period

- **Start:** 16th of the previous month
- **End:** 15th of the selected month
- **Example:** May 2026 Memo → 16-Apr-2026 to 15-May-2026

### 13.3 Key Performance Indicators (KPIs)

| KPI | Source | Formula | Frequency |
|-----|--------|---------|-----------|
| Total Submissions | Summary report | `COUNT(suggestions)` | Real-time |
| Approval Rate | Summary report | `Approved / Submitted × 100%` | Real-time |
| Average Days Pending | `suggestions.days_pending` | `AVG(days_pending)` | Real-time |
| Total Award Disbursement | `awards.amount` | `SUM(amount)` | Monthly |
| Department Participation | Dept stats | `(Depts with ≥1 suggestion) / Total depts × 100%` | Monthly |
| Cycle Time | Suggestion timestamps | `AVG(updated_at - created_at)` | Monthly |

### 13.4 Export Capabilities

| Format | Available In | Details |
|--------|-------------|---------|
| **CSV** | General Enquiry, Memo Report | Downloadable spreadsheet |
| **PDF** | Memo Report, Award Letter | Printable documents |

---

## 14. Duplicate Detection Engine

### 14.1 Overview

The system implements a **client-side ML-based duplicate detection engine** that runs a **11-stage algorithm pipeline** in under 80ms, with no dependency on external APIs.

### 14.2 Detection Pipeline

| Stage | Process | Purpose |
|-------|---------|---------|
| 1 | Text normalization | Lowercase, punctuation removal, contraction expansion |
| 2 | Stop-word removal | 50+ manufacturing domain-specific stop words |
| 3 | Porter-style stemming | 22 suffix rules for word root extraction |
| 4 | Synonym expansion | 52 industrial synonym groups |
| 5 | TF-IDF cosine similarity | Per-field text similarity scoring |
| 6 | N-gram overlap | Bigram and trigram phrase matching |
| 7 | Jaccard similarity | Token-set overlap measurement |
| 8 | Field-weighted scoring | Proposed method: 32%, Present method: 26%, Subject: 20%, Benefits: 14%, Category: 5%, Type: 3% |
| 9 | Cross-field boost | Multi-field agreement increases confidence |
| 10 | Context threshold | Same category + type lowers detection threshold |
| 11 | Concurrent detection | Checks pending submissions store for in-flight matches |

### 14.3 Confidence Levels

| Level | Score Range | Action |
|-------|------------|--------|
| **HIGH** | 70–100 | Strong duplicate warning; employee should reconsider |
| **MEDIUM** | 50–69 | Moderate match; employee reviews and decides |
| **LOW** | 36–49 | Possible similarity; informational alert |

### 14.4 User Experience

- Pre-submission alert dialog displays matched suggestions with confidence scores
- Employee can **override** the warning and proceed, or **abandon** and revise
- No hard block — duplicate detection is advisory, not mandatory

---

## 15. Non-Functional Requirements

### 15.1 Security

| Requirement | Specification |
|-------------|--------------|
| Authentication | JWT-based with configurable expiry |
| Authorization | Role-based (Employee, Admin) with middleware enforcement |
| Data Isolation | Plant-scoped; no cross-plant data access |
| Sensitive Data | Bank details restricted to admin NEFT workflow |
| Audit Trail | Immutable logs for transfers and reopens |
| Input Validation | Zod schemas on client; parameterized queries on server |
| File Upload | Max 5 files, 4 MB each, type-restricted for photos |

### 15.2 Performance

| Requirement | Target |
|-------------|--------|
| Page load time | < 3 seconds |
| API response time | < 500ms (95th percentile) |
| Duplicate detection | < 80ms client-side |
| Concurrent users | Support plant-scale workforce |

### 15.3 Availability

| Requirement | Target |
|-------------|--------|
| Uptime | 99.5% during business hours |
| Backup | Daily database backups |
| Recovery | RPO < 24 hours; RTO < 4 hours |

### 15.4 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| UI Framework | ShadCN UI (Radix Primitives + TailwindCSS) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| State Management | React Context API (Auth, Suggestions, Notifications, Language) |
| Validation | Zod |
| Authentication | JSON Web Tokens (JWT) |

---

## 16. Glossary

| Term | Definition |
|------|------------|
| **BPS** | Business Process Streamer — second-level evaluator in the approval hierarchy |
| **CI** | Continuous Improvement — systematic approach to ongoing process enhancement |
| **CIP** | Continuous Improvement Process |
| **CTF** | Cash The Flash — quick-win suggestion scheme with rapid awards |
| **DCP** | Daily CIP — daily improvement suggestions requiring photo evidence |
| **FLM** | First Line Manager — first-level approver in the suggestion workflow |
| **JWT** | JSON Web Token — stateless authentication token standard |
| **Kaizen** | Japanese philosophy of continuous improvement through small, incremental changes |
| **MIC** | My Idea Card — detailed individual problem-solution suggestion scheme |
| **MIS** | Management Information System — dashboards and reports for decision-making |
| **NEFT** | National Electronic Funds Transfer — bank payment mechanism for award disbursement |
| **SFC** | Shop Floor CIP — team-based Kaizen suggestion scheme for manufacturing floor |
| **SLA** | Service Level Agreement — response/resolution time commitment |
| **SSS** | Simple Suggestion Scheme — basic workplace improvement idea submission |

---

*End of Document*
