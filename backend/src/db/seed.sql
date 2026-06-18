-- ─────────────────────────────────────────────────────────────────────────────
--  Seed Data — run AFTER migrations.sql
--  Run with: psql -U postgres -d suggestion_db -f seed.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Plants
INSERT INTO plants (plant_code, name, location) VALUES
  ('PLT-01', 'Main Plant', 'Pune, Maharashtra'),
  ('PLT-02', 'North Plant', 'Nashik, Maharashtra')
ON CONFLICT DO NOTHING;

-- Suggestion Types
INSERT INTO suggestion_types (code, name, description) VALUES
  ('SSS', 'Simple Suggestion Scheme',  'General improvement suggestions from employees'),
  ('SFC', 'Shop Floor CIP',            'Kaizen/CIP suggestions from the shop floor team'),
  ('MIC', 'My Idea Card',              'Individual idea cards for process improvements'),
  ('DCP', 'Daily CIP',                 'Daily continuous improvement proposals'),
  ('CTF', 'Cash The Flash',            'Quick-fix safety and quality observations')
ON CONFLICT DO NOTHING;

-- Categories (scoped to PLT-01)
INSERT INTO categories (plant_code, name) VALUES
  ('PLT-01', 'BIDP1/SAF'),
  ('PLT-01', 'BIDP2/QAL'),
  ('PLT-01', 'Productivity'),
  ('PLT-01', 'Cost Reduction'),
  ('PLT-01', 'Environment'),
  ('PLT-01', '5S / Housekeeping'),
  ('PLT-01', 'Ergonomics'),
  ('PLT-01', 'Energy Saving'),
  ('PLT-01', 'Other'),
  ('PLT-02', 'BIDP1/SAF'),
  ('PLT-02', 'BIDP2/QAL'),
  ('PLT-02', 'Productivity'),
  ('PLT-02', 'Other')
ON CONFLICT DO NOTHING;

-- Employees  (password_hash = bcrypt of 'Password@123')
-- NOTE: In production generate real bcrypt hashes — these are for dev only
INSERT INTO employees (employee_no, name, department, area, plant_code, role, ntid, email, password_hash) VALUES
  ('30698665', 'Karthik',  'BIDP1/TEF', 'RBIN/BIDP1', 'PLT-01', 'employee', 'rkumar',  'ramesh.kumar@company.com',  '$2a$12$placeholder_hash_employee'),
  ('30698701', 'Suresh Patil',  'BIDP2/QAL',       'RBIN/BIDP2',              'PLT-01', 'employee', 'spatil',  'suresh.patil@company.com',  '$2a$12$placeholder_hash_employee'),
  ('30698702', 'Anita Sharma',  'BIDP1/MNT',   'RBIN/BIDP2',            'PLT-01', 'employee', 'asharma', 'anita.sharma@company.com',  '$2a$12$placeholder_hash_employee'),
  ('30698703', 'Vijay Reddy',   'BIDP3/PRD',    'RBIN/BIDP3',       'PLT-02', 'employee', 'vreddy',  'vijay.reddy@company.com',   '$2a$12$placeholder_hash_employee'),
  ('30698704', 'Priya Devi',    'BIDP1/SAF',        'RBIN/BIDP1',       'PLT-01', 'employee', 'pdevi',   'priya.devi@company.com',    '$2a$12$placeholder_hash_employee'),
  ('30698705', 'Ganesh Iyer',   'BIDP1/TEF', 'RBIN/BIDP2',              'PLT-02', 'employee', 'giyer',   'ganesh.iyer@company.com',   '$2a$12$placeholder_hash_employee'),
  ('30698706', 'Kavitha Nair',  'BIDP2/QAL',       'RBIN/BIDP3',      'PLT-01', 'employee', 'knair',   'kavitha.nair@company.com',  '$2a$12$placeholder_hash_employee'),
  ('30698707', 'Mohan Das',     'BIDP1/MNT',   'RBIN/BIDP2',          'PLT-02', 'employee', 'mdas',    'mohan.das@company.com',     '$2a$12$placeholder_hash_employee'),
  ('30698720',   'Vijay Sharma',  'BIDP1/ADM','RBIN/BIDP1',         'PLT-01', 'admin',    'vsharma', 'vijay.sharma@company.com',  '$2a$12$placeholder_hash_admin')
ON CONFLICT DO NOTHING;

-- Department Mappings
INSERT INTO department_mappings (dept_name, mapped_name) VALUES
  ('BIDP1/TEF', 'TEF'),
  ('BIDP2/QAL', 'QAL'),
  ('BIDP1/HRD', 'HRD'),
  ('BIDP1/MNT', 'MNT'),
  ('BIDP3/LOG', 'LOG'),
  ('BIDP2/RND', 'RND'),
  ('BIDP1/FIN', 'FIN'),
  ('BIDP1/ITS', 'ITS')
ON CONFLICT DO NOTHING;

-- Authority Assignments
INSERT INTO authority_assignments (plant_code, employee_no, name, department, role, type, email) VALUES
  ('PLT-01', '30698701', 'Suresh Patil',  'BIDP2/QAL',       'FLM',   'Internal', 'suresh.patil@company.com'),
  ('PLT-01', '30698704', 'Priya Devi',    'BIDP1/SAF',        'BPS',   'Internal', 'priya.devi@company.com'),
  ('PLT-01', '30698720',   'Vijay Sharma',  'BIDP1/ADM','Admin', 'Internal', 'vijay.sharma@company.com')
ON CONFLICT DO NOTHING;
