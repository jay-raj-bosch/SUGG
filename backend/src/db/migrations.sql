-- ─────────────────────────────────────────────────────────────────────────────
--  Suggestion Management System – Full Database Migration
--  Run with: psql -U postgres -d suggestion_db -f migrations.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. plants ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plants (
  plant_code  VARCHAR(10)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  location    VARCHAR(150),
  created_at  TIMESTAMP    DEFAULT NOW()
);

-- ─── 2. employees ────────────────────────────────────────────────────────────
CREATE TYPE employee_role AS ENUM ('employee', 'admin');

CREATE TABLE IF NOT EXISTS employees (
  employee_no   VARCHAR(20)  PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  department    VARCHAR(100) NOT NULL,
  area          VARCHAR(150),
  plant_code    VARCHAR(10)  REFERENCES plants(plant_code),
  role          employee_role NOT NULL DEFAULT 'employee',
  ntid          VARCHAR(50)  UNIQUE,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bank_account  VARCHAR(30),
  bank_ifsc     VARCHAR(15),
  bank_name     VARCHAR(100),
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMP    DEFAULT NOW()
);

-- ─── 3. suggestion_types ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suggestion_types (
  id          SERIAL       PRIMARY KEY,
  code        VARCHAR(5)   UNIQUE NOT NULL,
  name        VARCHAR(60)  UNIQUE NOT NULL,
  description TEXT
);

-- ─── 4. categories ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL       PRIMARY KEY,
  plant_code  VARCHAR(10)  NOT NULL REFERENCES plants(plant_code),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMP    DEFAULT NOW(),
  UNIQUE (plant_code, name)
);

-- ─── 5. suggestions (core) ────────────────────────────────────────────────────
CREATE TYPE suggestion_status AS ENUM (
  'Draft', 'Submitted', 'Pending FLM', 'Pending BPS',
  'Under Evaluation', 'Approved', 'Rejected', 'Implemented'
);
CREATE TYPE suggestion_for_enum AS ENUM ('self', 'behalf');
CREATE TYPE group_suggestion_enum AS ENUM ('yes', 'no');

CREATE TABLE IF NOT EXISTS suggestions (
  id               SERIAL               PRIMARY KEY,
  suggestion_no    VARCHAR(20)          UNIQUE NOT NULL,
  type_code        VARCHAR(5)           REFERENCES suggestion_types(code),
  subject          VARCHAR(255),
  category         VARCHAR(100),
  status           suggestion_status    NOT NULL DEFAULT 'Draft',
  suggestion_date  DATE                 NOT NULL,
  range            VARCHAR(50)          NOT NULL,
  suggestion_for   suggestion_for_enum  NOT NULL DEFAULT 'self',
  group_suggestion group_suggestion_enum NOT NULL DEFAULT 'no',
  other_info       TEXT,
  employee_no      VARCHAR(20)          NOT NULL REFERENCES employees(employee_no),
  pending_with     VARCHAR(100),
  days_pending     INTEGER              DEFAULT 0,
  plant_code       VARCHAR(10)          REFERENCES plants(plant_code),
  created_at       TIMESTAMP            DEFAULT NOW(),
  updated_at       TIMESTAMP            DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_employee ON suggestions(employee_no);
CREATE INDEX IF NOT EXISTS idx_suggestions_status   ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_type     ON suggestions(type_code);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suggestions_updated_at ON suggestions;
CREATE TRIGGER trg_suggestions_updated_at
  BEFORE UPDATE ON suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 6. simple_suggestion_details ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simple_suggestion_details (
  id              SERIAL   PRIMARY KEY,
  suggestion_id   INTEGER  UNIQUE NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  present_method  TEXT     NOT NULL,
  proposed_method TEXT     NOT NULL,
  benefits        TEXT     NOT NULL,
  flm             VARCHAR(100) NOT NULL
);

-- ─── 7. shop_floor_cip_details ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_floor_cip_details (
  id                        SERIAL   PRIMARY KEY,
  suggestion_id             INTEGER  UNIQUE NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  date_of_implementation    DATE     NOT NULL,
  kaizen_theme              VARCHAR(255) NOT NULL,
  problem_status            TEXT     NOT NULL,
  before_improvement        TEXT     NOT NULL,
  after_improvement         TEXT     NOT NULL,
  benefits                  TEXT     NOT NULL,
  root_cause_identification TEXT     NOT NULL,
  standardization           TEXT     NOT NULL,
  root_cause                TEXT     NOT NULL,
  idea_to_eliminate         TEXT     NOT NULL,
  action_taken              TEXT     NOT NULL,
  horizontal_deployment     INTEGER  NOT NULL CHECK (horizontal_deployment > 0),
  moderator_emp_no          VARCHAR(20) REFERENCES employees(employee_no)
);

-- ─── 8. cip_team_members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cip_team_members (
  id            SERIAL   PRIMARY KEY,
  suggestion_id INTEGER  NOT NULL REFERENCES shop_floor_cip_details(suggestion_id) ON DELETE CASCADE,
  employee_no   VARCHAR(20) NOT NULL REFERENCES employees(employee_no),
  UNIQUE (suggestion_id, employee_no)
);

-- ─── 9. my_idea_card_details ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS my_idea_card_details (
  id                       SERIAL   PRIMARY KEY,
  suggestion_id            INTEGER  UNIQUE NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  date_of_implementation   DATE     NOT NULL,
  description_problem      TEXT     NOT NULL CHECK (length(description_problem) >= 20),
  description_improvement  TEXT     NOT NULL CHECK (length(description_improvement) >= 20),
  benefits                 TEXT     NOT NULL,
  flm                      VARCHAR(100) NOT NULL
);

-- ─── 10. daily_cip_details ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_cip_details (
  id                       SERIAL   PRIMARY KEY,
  suggestion_id            INTEGER  UNIQUE NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  date_of_implementation   DATE     NOT NULL,
  workshop                 VARCHAR(100),
  machine_no_area          VARCHAR(100) NOT NULL,
  suggestion_description   TEXT     NOT NULL,
  action_taken             TEXT     NOT NULL
);

-- ─── 11. cash_the_flash_details ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_the_flash_details (
  id              SERIAL       PRIMARY KEY,
  suggestion_id   INTEGER      UNIQUE NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  present_method  TEXT         NOT NULL,
  proposed_method TEXT         NOT NULL,
  benefits        TEXT         NOT NULL,
  suggestor_name  VARCHAR(100),
  share_percent   DECIMAL(5,2) CHECK (share_percent BETWEEN 0 AND 100),
  flm             VARCHAR(100) NOT NULL
);

-- ─── 12. attachments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id              SERIAL   PRIMARY KEY,
  suggestion_id   INTEGER  NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  file_name       VARCHAR(255) NOT NULL,
  file_type       VARCHAR(50),
  file_size       INTEGER CHECK (file_size <= 4194304),
  storage_path    TEXT     NOT NULL,
  is_photo_before BOOLEAN  DEFAULT FALSE,
  is_photo_after  BOOLEAN  DEFAULT FALSE,
  uploaded_at     TIMESTAMP DEFAULT NOW()
);

-- ─── 13. awards ──────────────────────────────────────────────────────────────
CREATE TYPE award_category_enum AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum');
CREATE TYPE neft_status_enum    AS ENUM ('Pending', 'Processed', 'Failed');

CREATE TABLE IF NOT EXISTS awards (
  id             SERIAL              PRIMARY KEY,
  suggestion_id  INTEGER             UNIQUE NOT NULL REFERENCES suggestions(id),
  suggestion_no  VARCHAR(20),
  employee_no    VARCHAR(20)         REFERENCES employees(employee_no),
  amount         DECIMAL(10,2)       NOT NULL CHECK (amount > 0),
  category       award_category_enum NOT NULL,
  award_date     DATE                NOT NULL,
  neft_status    neft_status_enum    DEFAULT 'Pending',
  neft_date      DATE,
  created_at     TIMESTAMP           DEFAULT NOW()
);

-- ─── 14. authority_assignments ───────────────────────────────────────────────
CREATE TYPE authority_role_enum AS ENUM ('FLM', 'BPS', 'Admin');
CREATE TYPE authority_type_enum AS ENUM ('Internal', 'External');

CREATE TABLE IF NOT EXISTS authority_assignments (
  id           SERIAL               PRIMARY KEY,
  plant_code   VARCHAR(10)          REFERENCES plants(plant_code),
  employee_no  VARCHAR(20)          REFERENCES employees(employee_no),
  name         VARCHAR(100)         NOT NULL,
  department   VARCHAR(100),
  role         authority_role_enum  NOT NULL,
  type         authority_type_enum  NOT NULL,
  email        VARCHAR(150),
  ntid         VARCHAR(50),
  assigned_at  TIMESTAMP            DEFAULT NOW(),
  UNIQUE (plant_code, employee_no, role)
);

-- ─── 15. department_mappings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS department_mappings (
  id           SERIAL        PRIMARY KEY,
  dept_name    VARCHAR(100)  UNIQUE NOT NULL,
  mapped_name  VARCHAR(100)  NOT NULL,
  created_at   TIMESTAMP     DEFAULT NOW()
);

-- ─── 16. transfer_audit_log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_audit_log (
  id               SERIAL      PRIMARY KEY,
  audit_id         VARCHAR(20) UNIQUE,
  suggestion_no    VARCHAR(20) REFERENCES suggestions(suggestion_no),
  from_emp_no      VARCHAR(20) REFERENCES employees(employee_no),
  to_emp_no        VARCHAR(20) REFERENCES employees(employee_no),
  reason           TEXT        NOT NULL,
  transferred_by   VARCHAR(20) REFERENCES employees(employee_no),
  transferred_at   TIMESTAMP   DEFAULT NOW()
);

-- ─── 17. reopen_audit_log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reopen_audit_log (
  id            SERIAL      PRIMARY KEY,
  audit_id      VARCHAR(20) UNIQUE,
  suggestion_no VARCHAR(20) REFERENCES suggestions(suggestion_no),
  remark        TEXT        NOT NULL,
  reopened_by   VARCHAR(20) REFERENCES employees(employee_no),
  reopened_at   TIMESTAMP   DEFAULT NOW()
);

-- ─── 18. notifications ───────────────────────────────────────────────────────
CREATE TYPE notification_type_enum AS ENUM ('info', 'success', 'warning', 'error');

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL                   PRIMARY KEY,
  user_id     VARCHAR(20)              REFERENCES employees(employee_no),
  message     TEXT                     NOT NULL,
  type        notification_type_enum   NOT NULL DEFAULT 'info',
  is_read     BOOLEAN                  DEFAULT FALSE,
  created_at  TIMESTAMP                DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ─── Views ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_department_stats AS
SELECT
  e.department                                              AS dept,
  COUNT(s.id)                                               AS total,
  COUNT(s.id) FILTER (WHERE s.status = 'Implemented')       AS implemented,
  COUNT(s.id) FILTER (WHERE s.status IN ('Submitted','Under Evaluation','Pending FLM','Pending BPS')) AS pending,
  COUNT(s.id) FILTER (WHERE s.status = 'Rejected')          AS rejected,
  ROUND(
    COUNT(DISTINCT s.employee_no)::NUMERIC /
    NULLIF(COUNT(DISTINCT e2.employee_no), 0) * 100, 1
  )                                                         AS participation
FROM employees e2
LEFT JOIN suggestions s ON s.employee_no = e2.employee_no
LEFT JOIN employees e ON e.employee_no = s.employee_no
GROUP BY e.department;

CREATE OR REPLACE VIEW v_category_stats AS
SELECT category AS name, COUNT(*) AS value
FROM suggestions
WHERE category IS NOT NULL
GROUP BY category;
