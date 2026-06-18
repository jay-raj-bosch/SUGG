# Data Model — Suggestion Management System

## Entity Relationship Overview

```
plants ──< employees ──< suggestions ──< attachments
            │                │
            │                ├──< simple_suggestion_details
            │                ├──< shop_floor_cip_details ──< cip_team_members
            │                ├──< my_idea_card_details
            │                ├──< daily_cip_details
            │                ├──< cash_the_flash_details
            │                ├──< awards
            │                ├──< transfer_audit_log
            │                └──< reopen_audit_log
            │
            ├──< authority_assignments
            └──< notifications

plants ──< categories
plants ──< department_mappings (logical link)
```

---

## Tables

---

### 1. `plants`
Master list of plant/facility codes.

| Column      | Type         | Constraints       | Description              |
|-------------|--------------|-------------------|--------------------------|
| plant_code  | VARCHAR(10)  | PK                | e.g. PLT-01, PLT-02      |
| name        | VARCHAR(100) | NOT NULL          | Plant display name       |
| location    | VARCHAR(150) |                   | Physical location        |
| created_at  | TIMESTAMP    | DEFAULT NOW()     |                          |

---

### 2. `employees`
All plant employees — both workers and admins.

| Column       | Type         | Constraints            | Description                         |
|--------------|--------------|------------------------|-------------------------------------|
| employee_no  | VARCHAR(20)  | PK                     | e.g. 30698665                       |
| name         | VARCHAR(100) | NOT NULL               |                                     |
| department   | VARCHAR(100) | NOT NULL               |                                     |
| area         | VARCHAR(150) |                        | Shop floor area/unit                |
| plant_code   | VARCHAR(10)  | FK → plants            |                                     |
| role         | ENUM         | 'employee' \| 'admin'  |                                     |
| ntid         | VARCHAR(50)  | UNIQUE                 | Network/login ID                    |
| email        | VARCHAR(150) | UNIQUE, NOT NULL       |                                     |
| bank_account | VARCHAR(30)  |                        | For NEFT award payment              |
| bank_ifsc    | VARCHAR(15)  |                        |                                     |
| bank_name    | VARCHAR(100) |                        |                                     |
| is_active    | BOOLEAN      | DEFAULT TRUE           |                                     |
| created_at   | TIMESTAMP    | DEFAULT NOW()          |                                     |

---

### 3. `suggestion_types`
Lookup/reference table for the 5 suggestion scheme types.

| Column       | Type        | Constraints   | Description                         |
|--------------|-------------|---------------|-------------------------------------|
| id           | SERIAL      | PK            |                                     |
| code         | VARCHAR(5)  | UNIQUE        | SSS, SFC, MIC, DCP, CTF             |
| name         | VARCHAR(60) | UNIQUE        | Full display name                   |
| description  | TEXT        |               |                                     |

**Seed Data:**
| code | name                        |
|------|-----------------------------|
| SSS  | Simple Suggestion Scheme    |
| SFC  | Shop Floor CIP              |
| MIC  | My Idea Card                |
| DCP  | Daily CIP                   |
| CTF  | Cash The Flash              |

---

### 4. `categories`
Suggestion categories, scoped per plant.

| Column      | Type         | Constraints              | Description              |
|-------------|--------------|--------------------------|--------------------------|
| id          | SERIAL       | PK                       |                          |
| plant_code  | VARCHAR(10)  | FK → plants, NOT NULL    |                          |
| name        | VARCHAR(100) | NOT NULL                 | Safety, Quality, etc.    |
| description | TEXT         |                          |                          |
| is_active   | BOOLEAN      | DEFAULT TRUE             |                          |
| created_at  | TIMESTAMP    | DEFAULT NOW()            |                          |

**Unique constraint:** `(plant_code, name)`

**Seed Data:** Safety, Quality, Productivity, Cost Reduction, Environment,
5S / Housekeeping, Ergonomics, Energy Saving, Other

---

### 5. `suggestions`
Core table — one row per suggestion regardless of type.

| Column            | Type         | Constraints                    | Description                              |
|-------------------|--------------|--------------------------------|------------------------------------------|
| id                | SERIAL       | PK                             |                                          |
| suggestion_no     | VARCHAR(20)  | UNIQUE, NOT NULL               | e.g. SSS-2026-001 (server-generated)     |
| type_code         | VARCHAR(5)   | FK → suggestion_types(code)    |                                          |
| subject           | VARCHAR(255) |                                | Title / brief description                |
| category          | VARCHAR(100) | FK → categories(name)          |                                          |
| status            | ENUM         | NOT NULL, DEFAULT 'Draft'      | See status values below                  |
| suggestion_date   | DATE         | NOT NULL                       |                                          |
| range             | VARCHAR(50)  | NOT NULL                       | Range A / B / C / D                      |
| suggestion_for    | ENUM         | 'self' \| 'behalf'             |                                          |
| group_suggestion  | ENUM         | 'yes' \| 'no'                  |                                          |
| other_info        | TEXT         |                                |                                          |
| employee_no       | VARCHAR(20)  | FK → employees, NOT NULL       | Submitting employee                      |
| pending_with      | VARCHAR(100) |                                | e.g. "FLM - Suresh"                      |
| days_pending      | INTEGER      | DEFAULT 0                      |                                          |
| plant_code        | VARCHAR(10)  | FK → plants                    |                                          |
| created_at        | TIMESTAMP    | DEFAULT NOW()                  |                                          |
| updated_at        | TIMESTAMP    | DEFAULT NOW()                  |                                          |

**Status ENUM values:**
`Draft` → `Submitted` → `Pending FLM` → `Pending BPS` → `Under Evaluation` → `Approved` / `Rejected` → `Implemented`

---

### 6. `simple_suggestion_details`
Extra fields for **Simple Suggestion Scheme (SSS)** type.

| Column          | Type    | Constraints                  | Description             |
|-----------------|---------|------------------------------|-------------------------|
| id              | SERIAL  | PK                           |                         |
| suggestion_id   | INTEGER | FK → suggestions(id), UNIQUE |                         |
| present_method  | TEXT    | NOT NULL                     | Before improvement      |
| proposed_method | TEXT    | NOT NULL                     | After improvement       |
| benefits        | TEXT    | NOT NULL                     |                         |
| flm             | VARCHAR(100) | NOT NULL                | FLM name / employee no  |

---

### 7. `shop_floor_cip_details`
Extra fields for **Shop Floor CIP (SFC)** type.

| Column                   | Type         | Constraints                  | Description              |
|--------------------------|--------------|------------------------------|--------------------------|
| id                       | SERIAL       | PK                           |                          |
| suggestion_id            | INTEGER      | FK → suggestions(id), UNIQUE |                          |
| date_of_implementation   | DATE         | NOT NULL                     |                          |
| kaizen_theme             | VARCHAR(255) | NOT NULL                     |                          |
| problem_status           | TEXT         | NOT NULL                     |                          |
| before_improvement       | TEXT         | NOT NULL                     |                          |
| after_improvement        | TEXT         | NOT NULL                     |                          |
| benefits                 | TEXT         | NOT NULL                     |                          |
| root_cause_identification| TEXT         | NOT NULL                     |                          |
| standardization          | TEXT         | NOT NULL                     |                          |
| root_cause               | TEXT         | NOT NULL                     |                          |
| idea_to_eliminate        | TEXT         | NOT NULL                     |                          |
| action_taken             | TEXT         | NOT NULL                     |                          |
| horizontal_deployment    | INTEGER      | NOT NULL, > 0                | Number of deployments    |
| moderator_emp_no         | VARCHAR(20)  | FK → employees               | Must not be in team      |

---

### 8. `cip_team_members`
Junction table — team members for a Shop Floor CIP suggestion.

| Column        | Type        | Constraints                       |
|---------------|-------------|-----------------------------------|
| id            | SERIAL      | PK                                |
| suggestion_id | INTEGER     | FK → shop_floor_cip_details(suggestion_id) |
| employee_no   | VARCHAR(20) | FK → employees                    |

**Unique constraint:** `(suggestion_id, employee_no)`

---

### 9. `my_idea_card_details`
Extra fields for **My Idea Card (MIC)** type.

| Column                   | Type         | Constraints                  |
|--------------------------|--------------|------------------------------|
| id                       | SERIAL       | PK                           |
| suggestion_id            | INTEGER      | FK → suggestions(id), UNIQUE |
| date_of_implementation   | DATE         | NOT NULL                     |
| description_problem      | TEXT         | NOT NULL, min 20 chars       |
| description_improvement  | TEXT         | NOT NULL, min 20 chars       |
| benefits                 | TEXT         | NOT NULL                     |
| flm                      | VARCHAR(100) | NOT NULL                     |

---

### 10. `daily_cip_details`
Extra fields for **Daily CIP (DCP)** type.

| Column                 | Type         | Constraints                  |
|------------------------|--------------|------------------------------|
| id                     | SERIAL       | PK                           |
| suggestion_id          | INTEGER      | FK → suggestions(id), UNIQUE |
| date_of_implementation | DATE         | NOT NULL                     |
| workshop               | VARCHAR(100) |                              |
| machine_no_area        | VARCHAR(100) | NOT NULL                     |
| suggestion_description | TEXT         | NOT NULL                     |
| action_taken           | TEXT         | NOT NULL                     |

---

### 11. `cash_the_flash_details`
Extra fields for **Cash The Flash (CTF)** type.

| Column          | Type         | Constraints                  |
|-----------------|--------------|------------------------------|
| id              | SERIAL       | PK                           |
| suggestion_id   | INTEGER      | FK → suggestions(id), UNIQUE |
| present_method  | TEXT         | NOT NULL                     |
| proposed_method | TEXT         | NOT NULL                     |
| benefits        | TEXT         | NOT NULL                     |
| suggestor_name  | VARCHAR(100) |                              |
| share_percent   | DECIMAL(5,2) | 0–100                        |
| flm             | VARCHAR(100) | NOT NULL                     |

---

### 12. `attachments`
Files/images uploaded with a suggestion.

| Column       | Type         | Constraints             | Description                         |
|--------------|--------------|-------------------------|-------------------------------------|
| id           | SERIAL       | PK                      |                                     |
| suggestion_id| INTEGER      | FK → suggestions(id)    |                                     |
| file_name    | VARCHAR(255) | NOT NULL                |                                     |
| file_type    | VARCHAR(50)  |                         | MIME type                           |
| file_size    | INTEGER      |                         | Bytes, max 4MB                      |
| storage_path | TEXT         | NOT NULL                | Cloud storage URL / path            |
| is_photo_before | BOOLEAN  | DEFAULT FALSE           | For Daily CIP before photos         |
| is_photo_after  | BOOLEAN  | DEFAULT FALSE           | For Daily CIP after photos          |
| uploaded_at  | TIMESTAMP    | DEFAULT NOW()           |                                     |

**Constraint:** Max 5 attachments per suggestion (`CHECK count(*) <= 5`)

---

### 13. `awards`
Award records linked to an approved suggestion.

| Column        | Type         | Constraints              | Description                      |
|---------------|--------------|--------------------------|----------------------------------|
| id            | SERIAL       | PK                       |                                  |
| suggestion_id | INTEGER      | FK → suggestions(id), UNIQUE |                              |
| suggestion_no | VARCHAR(20)  |                          | Denormalised for quick reports   |
| employee_no   | VARCHAR(20)  | FK → employees           |                                  |
| amount        | DECIMAL(10,2)| NOT NULL, > 0            | Award amount in ₹                |
| category      | ENUM         | NOT NULL                 | Bronze / Silver / Gold / Platinum|
| award_date    | DATE         | NOT NULL                 |                                  |
| neft_status   | ENUM         | DEFAULT 'Pending'        | Pending / Processed / Failed     |
| neft_date     | DATE         |                          | Date NEFT was processed          |
| created_at    | TIMESTAMP    | DEFAULT NOW()            |                                  |

---

### 14. `authority_assignments`
Maps employees to authority roles (FLM, BPS, Admin) per plant.

| Column      | Type        | Constraints           | Description                        |
|-------------|-------------|-----------------------|------------------------------------|
| id          | SERIAL      | PK                    |                                    |
| plant_code  | VARCHAR(10) | FK → plants           |                                    |
| employee_no | VARCHAR(20) | FK → employees        |                                    |
| name        | VARCHAR(100)| NOT NULL              | Denormalised for display           |
| department  | VARCHAR(100)|                       |                                    |
| role        | ENUM        | NOT NULL              | FLM / BPS / Admin                  |
| type        | ENUM        | NOT NULL              | Internal / External                |
| email       | VARCHAR(150)|                       |                                    |
| ntid        | VARCHAR(50) |                       |                                    |
| assigned_at | TIMESTAMP   | DEFAULT NOW()         |                                    |

**Unique constraint:** `(plant_code, employee_no, role)`

---

### 15. `department_mappings`
Maps raw department names to standardised display names.

| Column      | Type         | Constraints   | Description                           |
|-------------|--------------|---------------|---------------------------------------|
| id          | SERIAL       | PK            |                                       |
| dept_name   | VARCHAR(100) | UNIQUE        | Source dept name (e.g. "Mfg Unit 2")  |
| mapped_name | VARCHAR(100) | NOT NULL      | Standard name (e.g. "BIDP1/TEF")      |
| created_at  | TIMESTAMP    | DEFAULT NOW() |                                       |

---

### 16. `transfer_audit_log`
Immutable log of all suggestion ownership transfers.

| Column        | Type         | Constraints            | Description                   |
|---------------|--------------|------------------------|-------------------------------|
| id            | SERIAL       | PK                     |                               |
| audit_id      | VARCHAR(20)  | UNIQUE                 | e.g. TRF-001234               |
| suggestion_no | VARCHAR(20)  | FK → suggestions(suggestion_no) |                      |
| from_emp_no   | VARCHAR(20)  | FK → employees         |                               |
| to_emp_no     | VARCHAR(20)  | FK → employees         |                               |
| reason        | TEXT         | NOT NULL               |                               |
| transferred_by| VARCHAR(20)  | FK → employees         | Admin who actioned            |
| transferred_at| TIMESTAMP    | DEFAULT NOW()          |                               |

---

### 17. `reopen_audit_log`
Immutable log of all rejected-suggestion reopens.

| Column        | Type        | Constraints            | Description                   |
|---------------|-------------|------------------------|-------------------------------|
| id            | SERIAL      | PK                     |                               |
| audit_id      | VARCHAR(20) | UNIQUE                 | e.g. ROP-001122               |
| suggestion_no | VARCHAR(20) | FK → suggestions(suggestion_no) |                      |
| remark        | TEXT        | NOT NULL               |                               |
| reopened_by   | VARCHAR(20) | FK → employees         | Admin who actioned            |
| reopened_at   | TIMESTAMP   | DEFAULT NOW()          |                               |

---

### 18. `notifications`
Per-user notification feed.

| Column      | Type         | Constraints         | Description                                  |
|-------------|--------------|---------------------|----------------------------------------------|
| id          | SERIAL       | PK                  |                                              |
| user_id     | VARCHAR(20)  | FK → employees      |                                              |
| message     | TEXT         | NOT NULL            |                                              |
| type        | ENUM         | NOT NULL            | info / success / warning / error             |
| is_read     | BOOLEAN      | DEFAULT FALSE       |                                              |
| created_at  | TIMESTAMP    | DEFAULT NOW()       |                                              |

---

## Database Views (Computed / Reporting)

### `v_department_stats` (MIS Graphical)
Aggregated from `suggestions` JOIN `employees`:

| Column        | Description                         |
|---------------|-------------------------------------|
| dept          | Department name                     |
| total         | Total suggestions submitted         |
| implemented   | Count with status = Implemented     |
| pending       | Count with status = Submitted / Under Evaluation |
| rejected      | Count with status = Rejected        |
| participation | % of employees who submitted ≥1     |

### `v_category_stats`
Aggregated from `suggestions`:

| Column | Description             |
|--------|-------------------------|
| name   | Category name           |
| value  | Total suggestion count  |

### `v_memo_report` (View Memo)
Parameterised by `month`, `year`, `type`:

| Column          | Source                           |
|-----------------|----------------------------------|
| suggestion_no   | suggestions                      |
| employee_name   | employees                        |
| employee_no     | employees                        |
| department      | employees                        |
| type            | suggestions                      |
| status          | suggestions                      |
| submitted_date  | suggestions.suggestion_date      |
| evaluated_date  | awards.award_date                |
| award_amount    | awards.amount                    |
| remarks         | Derived from status              |

---

## Key Relationships Summary

| Relationship                        | Cardinality | Notes                                       |
|-------------------------------------|-------------|---------------------------------------------|
| plants → employees                  | 1 : N       |                                             |
| plants → categories                 | 1 : N       | Categories are plant-scoped                 |
| employees → suggestions             | 1 : N       | One employee submits many suggestions       |
| suggestions → simple_suggestion_details | 1 : 0..1| Only for SSS type                           |
| suggestions → shop_floor_cip_details | 1 : 0..1  | Only for SFC type                           |
| suggestions → my_idea_card_details  | 1 : 0..1    | Only for MIC type                           |
| suggestions → daily_cip_details     | 1 : 0..1    | Only for DCP type                           |
| suggestions → cash_the_flash_details| 1 : 0..1    | Only for CTF type                           |
| suggestions → attachments           | 1 : N       | Max 5 files                                 |
| suggestions → awards                | 1 : 0..1    | At most one award per suggestion            |
| shop_floor_cip_details → employees  | N : M       | Via cip_team_members                        |
| plants → authority_assignments      | 1 : N       |                                             |
| employees → authority_assignments   | 1 : N       | One person can have multiple roles          |
| suggestions → transfer_audit_log    | 1 : N       | Full history of transfers                   |
| suggestions → reopen_audit_log      | 1 : N       | Full history of reopens                     |
| employees → notifications           | 1 : N       |                                             |

---

## Enum Reference

| Enum            | Values                                                                 |
|-----------------|------------------------------------------------------------------------|
| suggestion status | Draft, Submitted, Pending FLM, Pending BPS, Under Evaluation, Approved, Rejected, Implemented |
| suggestion_for  | self, behalf                                                           |
| group_suggestion| yes, no                                                                |
| role            | employee, admin                                                        |
| authority_role  | FLM, BPS, Admin                                                        |
| authority_type  | Internal, External                                                     |
| award_category  | Bronze, Silver, Gold, Platinum                                         |
| neft_status     | Pending, Processed, Failed                                             |
| notification_type | info, success, warning, error                                        |

---

## Suggestion Number Format

Server-generated, format: `{TYPE_CODE}-{YYYY}-{NNN}`

| Type                     | Code | Example         |
|--------------------------|------|-----------------|
| Simple Suggestion Scheme | SSS  | SSS-2026-001    |
| Shop Floor CIP           | SFC  | SFC-2026-012    |
| My Idea Card             | MIC  | MIC-2026-003    |
| Daily CIP                | DCP  | DCP-2026-020    |
| Cash The Flash           | CTF  | CTF-2026-005    |

---

## File / Storage Constraints

| Rule                      | Value           |
|---------------------------|-----------------|
| Max files per suggestion  | 5               |
| Max file size             | 4 MB each       |
| Allowed types (general)   | Any             |
| Allowed types (Daily CIP photos) | image/jpeg, image/png, image/jpg |
| Daily CIP photos before   | ≥ 1 required    |
| Daily CIP photos after    | ≥ 1 required    |
