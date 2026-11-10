-- GENERATED FILE: do not edit directly.
-- Source of truth: database/migrations/*.sql in filename order.
-- Regenerate with: npm run db:schema:generate
-- Verify with: npm run db:schema:check

SET NAMES utf8mb4;
-- BEGIN MIGRATION: 001_initial.sql
-- Omni Developments initial schema. Run migrations in version order.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(32) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role ENUM('owner','admin','staff') NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value TEXT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  short_name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  body TEXT NULL,
  icon VARCHAR(60) NULL,
  hero_media_id BIGINT UNSIGNED NULL,
  seo_title VARCHAR(190) NULL,
  seo_description VARCHAR(320) NULL,
  publication_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_services_status (publication_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_faqs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_service_faqs_service (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(160) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  title VARCHAR(190) NOT NULL,
  location_label VARCHAR(190) NULL,
  description TEXT NOT NULL,
  body TEXT NULL,
  category_id BIGINT UNSIGNED NULL,
  seo_title VARCHAR(190) NULL,
  seo_description VARCHAR(320) NULL,
  publication_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES project_categories(id) ON DELETE SET NULL,
  INDEX idx_projects_status (publication_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_media (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  media_kind ENUM('image','document') NOT NULL DEFAULT 'image',
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_media_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS areas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  body TEXT NULL,
  seo_title VARCHAR(190) NULL,
  seo_description VARCHAR(320) NULL,
  publication_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_areas_status (publication_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonials (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(160) NOT NULL,
  location_label VARCHAR(160) NULL,
  content TEXT NOT NULL,
  source VARCHAR(80) NULL,
  publication_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_testimonials_status (publication_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guide_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(160) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guides (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  title VARCHAR(190) NOT NULL,
  excerpt TEXT NOT NULL,
  body LONGTEXT NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  seo_title VARCHAR(190) NULL,
  seo_description VARCHAR(320) NULL,
  publication_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES guide_categories(id) ON DELETE SET NULL,
  INDEX idx_guides_status (publication_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_enquiries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_reference VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  telephone VARCHAR(40) NOT NULL,
  preferred_contact_method ENUM('Email','Telephone','WhatsApp') NOT NULL,
  message TEXT NOT NULL,
  source_page VARCHAR(120) NULL,
  privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
  notification_status ENUM('not-configured','pending','sent','failed') NOT NULL DEFAULT 'not-configured',
  notification_error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_created (created_at),
  INDEX idx_contact_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_reference VARCHAR(32) NOT NULL UNIQUE,
  project_type VARCHAR(80) NOT NULL,
  property_type VARCHAR(80) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  project_stage VARCHAR(100) NOT NULL,
  budget_range VARCHAR(100) NULL,
  desired_start VARCHAR(100) NOT NULL,
  contact_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  telephone VARCHAR(40) NOT NULL,
  preferred_contact_method ENUM('Email','Telephone','WhatsApp') NOT NULL,
  privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
  notification_status ENUM('not-configured','pending','sent','failed') NOT NULL DEFAULT 'not-configured',
  notification_error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quotes_created (created_at),
  INDEX idx_quotes_email (email),
  INDEX idx_quotes_project_type (project_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_request_files (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_request_id BIGINT UNSIGNED NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(190) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id) ON DELETE CASCADE,
  INDEX idx_quote_files_quote (quote_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_audit_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('001_initial');
-- END MIGRATION: 001_initial.sql

-- BEGIN MIGRATION: 002_project_content.sql
-- Project content used by the staff project workspace. Every statement is safe to rerun.
CREATE TABLE IF NOT EXISTS project_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  tag VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_tags_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO project_categories (name, slug) VALUES
  ('Extensions', 'extensions'),
  ('Renovations', 'renovations'),
  ('Bathrooms', 'bathrooms');

INSERT INTO projects (slug, title, location_label, description, category_id, publication_status)
SELECT 'open-plan-extension', 'Open-plan extension & garden connection', 'Supplied project gallery',
       'A visual record of structural work, new openings and the connection between a home and its garden.',
       (SELECT id FROM project_categories WHERE slug = 'extensions'), 'published'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE slug = 'open-plan-extension');

INSERT INTO projects (slug, title, location_label, description, category_id, publication_status)
SELECT 'property-improvements', 'Property improvements & external works', 'Supplied project gallery',
       'A collection of supplied photographs showing external improvements, landscaping and on-site progress.',
       (SELECT id FROM project_categories WHERE slug = 'renovations'), 'published'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE slug = 'property-improvements');

INSERT INTO projects (slug, title, location_label, description, category_id, publication_status)
SELECT 'bathroom-installation', 'Bathroom installation', 'Supplied project gallery',
       'A finished bathroom detail from the supplied photography, used here to show finish quality and installation detail.',
       (SELECT id FROM project_categories WHERE slug = 'bathrooms'), 'published'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE slug = 'bathroom-installation');

INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order)
SELECT p.id, '/images/site-interior.webp', 'Open-plan extension and garden connection supplied project photography', 'image', 0
FROM projects p WHERE p.slug = 'open-plan-extension'
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.sort_order = 0);
INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order)
SELECT p.id, '/images/timber-frame.webp', 'Open-plan extension supplied project photography', 'image', 1
FROM projects p WHERE p.slug = 'open-plan-extension'
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.stored_filename = '/images/timber-frame.webp');
INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order)
SELECT p.id, '/images/works-site.webp', 'Open-plan extension supplied project photography', 'image', 2
FROM projects p WHERE p.slug = 'open-plan-extension'
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.stored_filename = '/images/works-site.webp');

INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order)
SELECT p.id, '/images/project-renovation-01.webp', 'Property improvements supplied project photography', 'image', 0
FROM projects p WHERE p.slug = 'property-improvements'
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.sort_order = 0);
INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order)
SELECT p.id, '/images/driveway-finish.webp', 'Property improvements supplied project photography', 'image', 1
FROM projects p WHERE p.slug = 'property-improvements'
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.stored_filename = '/images/driveway-finish.webp');
INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order)
SELECT p.id, '/images/garden-beds.webp', 'Property improvements supplied project photography', 'image', 2
FROM projects p WHERE p.slug = 'property-improvements'
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.stored_filename = '/images/garden-beds.webp');

INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order)
SELECT p.id, '/images/project-bathroom-01.webp', 'Bathroom installation supplied project photography', 'image', 0
FROM projects p WHERE p.slug = 'bathroom-installation'
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.sort_order = 0);
INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order)
SELECT p.id, '/images/interior-stair.webp', 'Bathroom installation supplied project photography', 'image', 1
FROM projects p WHERE p.slug = 'bathroom-installation'
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.stored_filename = '/images/interior-stair.webp');

INSERT INTO project_tags (project_id, tag, sort_order)
SELECT p.id, 'Extension', 0 FROM projects p WHERE p.slug = 'open-plan-extension'
  AND NOT EXISTS (SELECT 1 FROM project_tags t WHERE t.project_id = p.id AND t.tag = 'Extension');
INSERT INTO project_tags (project_id, tag, sort_order)
SELECT p.id, 'Structural work', 1 FROM projects p WHERE p.slug = 'open-plan-extension'
  AND NOT EXISTS (SELECT 1 FROM project_tags t WHERE t.project_id = p.id AND t.tag = 'Structural work');
INSERT INTO project_tags (project_id, tag, sort_order)
SELECT p.id, 'Renovation', 0 FROM projects p WHERE p.slug = 'property-improvements'
  AND NOT EXISTS (SELECT 1 FROM project_tags t WHERE t.project_id = p.id AND t.tag = 'Renovation');
INSERT INTO project_tags (project_id, tag, sort_order)
SELECT p.id, 'External works', 1 FROM projects p WHERE p.slug = 'property-improvements'
  AND NOT EXISTS (SELECT 1 FROM project_tags t WHERE t.project_id = p.id AND t.tag = 'External works');
INSERT INTO project_tags (project_id, tag, sort_order)
SELECT p.id, 'Bathroom', 0 FROM projects p WHERE p.slug = 'bathroom-installation'
  AND NOT EXISTS (SELECT 1 FROM project_tags t WHERE t.project_id = p.id AND t.tag = 'Bathroom');
INSERT INTO project_tags (project_id, tag, sort_order)
SELECT p.id, 'Installation', 1 FROM projects p WHERE p.slug = 'bathroom-installation'
  AND NOT EXISTS (SELECT 1 FROM project_tags t WHERE t.project_id = p.id AND t.tag = 'Installation');

INSERT IGNORE INTO schema_migrations (version) VALUES ('002_project_content');
-- END MIGRATION: 002_project_content.sql

-- BEGIN MIGRATION: 003_staff_sessions_and_crm.sql
-- Persistent staff sessions and operational CRM records.
CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash CHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_staff_sessions_user (user_id),
  INDEX idx_staff_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_site_visits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_enquiry_id BIGINT UNSIGNED NULL,
  quote_request_id BIGINT UNSIGNED NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_enquiry_id) REFERENCES contact_enquiries(id) ON DELETE SET NULL,
  FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id) ON DELETE SET NULL,
  INDEX idx_site_visits_schedule (scheduled_at),
  INDEX idx_site_visits_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assigned_user_id BIGINT UNSIGNED NULL,
  title VARCHAR(190) NOT NULL,
  notes TEXT NULL,
  due_at DATETIME NULL,
  status ENUM('open','completed','cancelled') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tasks_due (due_at),
  INDEX idx_tasks_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_calendar_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(190) NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_calendar_starts (starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_reference VARCHAR(64) NOT NULL UNIQUE,
  customer_name VARCHAR(190) NOT NULL,
  amount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('draft','issued','paid','void') NOT NULL DEFAULT 'draft',
  due_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_due (due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('003_staff_sessions_and_crm');
-- END MIGRATION: 003_staff_sessions_and_crm.sql

-- BEGIN MIGRATION: 004_crm_pipeline.sql
-- CRM pipeline: leads from every source, their activity history and quotes, plus
-- links from site visits, tasks and invoices back to the lead they belong to.
-- Website contact enquiries and quote requests are copied into crm_leads by the API
-- (an idempotent INSERT ... SELECT guarded by the unique source-id columns).
CREATE TABLE IF NOT EXISTS crm_leads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_reference VARCHAR(32) NOT NULL UNIQUE,
  source ENUM('website_contact','website_quote','wordpress','manual') NOT NULL,
  source_detail VARCHAR(190) NULL,
  external_id VARCHAR(190) NULL UNIQUE,
  contact_enquiry_id BIGINT UNSIGNED NULL UNIQUE,
  quote_request_id BIGINT UNSIGNED NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  postcode VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  project_type VARCHAR(120) NULL,
  property_type VARCHAR(120) NULL,
  budget VARCHAR(100) NULL,
  desired_start VARCHAR(100) NULL,
  description TEXT NULL,
  preferred_contact VARCHAR(40) NULL,
  stage ENUM('new','contacted','site_visit','quoted','won','lost') NOT NULL DEFAULT 'new',
  lost_reason VARCHAR(255) NULL,
  estimated_value_pence BIGINT UNSIGNED NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  raw_payload JSON NULL,
  stage_changed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_enquiry_id) REFERENCES contact_enquiries(id) ON DELETE SET NULL,
  FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_leads_stage (stage),
  INDEX idx_leads_created (created_at),
  INDEX idx_leads_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  kind ENUM('note','call','email','stage','visit','task','quote','invoice','system') NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_activities_lead (lead_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_quotes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_reference VARCHAR(64) NOT NULL UNIQUE,
  lead_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  amount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('draft','sent','accepted','declined') NOT NULL DEFAULT 'draft',
  valid_until DATE NULL,
  notes TEXT NULL,
  sent_at DATETIME NULL,
  decided_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  INDEX idx_crm_quotes_status (status),
  INDEX idx_crm_quotes_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Columns and foreign keys added to the 003 tables. Each change is guarded by an
-- information_schema check so the migration can be applied more than once (MySQL 8 and MariaDB
-- have no portable ADD COLUMN IF NOT EXISTS / ADD CONSTRAINT IF NOT EXISTS).
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_site_visits' AND COLUMN_NAME = 'lead_id') = 0,
  'ALTER TABLE crm_site_visits ADD COLUMN lead_id BIGINT UNSIGNED NULL AFTER id', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_site_visits' AND COLUMN_NAME = 'address') = 0,
  'ALTER TABLE crm_site_visits ADD COLUMN address VARCHAR(255) NULL AFTER scheduled_at', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_site_visits' AND COLUMN_NAME = 'duration_minutes') = 0,
  'ALTER TABLE crm_site_visits ADD COLUMN duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60 AFTER address', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_site_visits' AND COLUMN_NAME = 'assigned_user_id') = 0,
  'ALTER TABLE crm_site_visits ADD COLUMN assigned_user_id BIGINT UNSIGNED NULL AFTER duration_minutes', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_site_visits' AND CONSTRAINT_NAME = 'fk_site_visits_lead' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE crm_site_visits ADD CONSTRAINT fk_site_visits_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_site_visits' AND CONSTRAINT_NAME = 'fk_site_visits_user' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE crm_site_visits ADD CONSTRAINT fk_site_visits_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_tasks' AND COLUMN_NAME = 'lead_id') = 0,
  'ALTER TABLE crm_tasks ADD COLUMN lead_id BIGINT UNSIGNED NULL AFTER id', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_tasks' AND COLUMN_NAME = 'completed_at') = 0,
  'ALTER TABLE crm_tasks ADD COLUMN completed_at DATETIME NULL AFTER status', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_tasks' AND CONSTRAINT_NAME = 'fk_tasks_lead' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE crm_tasks ADD CONSTRAINT fk_tasks_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'lead_id') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN lead_id BIGINT UNSIGNED NULL AFTER id', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'quote_id') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN quote_id BIGINT UNSIGNED NULL AFTER lead_id', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'notes') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN notes TEXT NULL AFTER due_at', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'issued_at') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN issued_at DATETIME NULL AFTER notes', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'paid_at') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN paid_at DATETIME NULL AFTER issued_at', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND CONSTRAINT_NAME = 'fk_invoices_lead' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE crm_invoices ADD CONSTRAINT fk_invoices_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND CONSTRAINT_NAME = 'fk_invoices_quote' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE crm_invoices ADD CONSTRAINT fk_invoices_quote FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO schema_migrations (version) VALUES ('004_crm_pipeline');
-- END MIGRATION: 004_crm_pipeline.sql

-- BEGIN MIGRATION: 005_crm_sales.sql
-- CRM sales documents: quote/invoice line items and VAT, quote versions and e-signature,
-- emails (sent over SMTP and pulled from IMAP), editable email templates, automatic follow-ups
-- and company settings for the PDFs.
--
-- Purely additive and repeatable: tables use IF NOT EXISTS, every column/constraint change is
-- guarded by an information_schema check, seeds use INSERT IGNORE and the backfills only touch
-- rows that still need them. The PHP API applies this file automatically (see crm_sales.php).

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'subtotal_pence') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN subtotal_pence BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER amount_pence', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'vat_rate_bp') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN vat_rate_bp INT UNSIGNED NOT NULL DEFAULT 0 AFTER subtotal_pence', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'vat_pence') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN vat_pence BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER vat_rate_bp', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'version') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN version INT UNSIGNED NOT NULL DEFAULT 1 AFTER vat_pence', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'parent_quote_id') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN parent_quote_id BIGINT UNSIGNED NULL AFTER version', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'revised_by_id') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN revised_by_id BIGINT UNSIGNED NULL AFTER parent_quote_id', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'terms') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN terms TEXT NULL AFTER notes', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'signing_token') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN signing_token CHAR(64) NULL UNIQUE AFTER terms', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'signed_name') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN signed_name VARCHAR(190) NULL AFTER signing_token', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'signed_at') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN signed_at DATETIME NULL AFTER signed_name', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'signed_ip') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN signed_ip VARCHAR(64) NULL AFTER signed_at', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'signed_user_agent') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN signed_user_agent VARCHAR(255) NULL AFTER signed_ip', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'emailed_at') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN emailed_at DATETIME NULL AFTER signed_user_agent', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'status' AND COLUMN_TYPE LIKE '%amended%') = 0,
  'ALTER TABLE crm_quotes MODIFY status ENUM(''draft'',''sent'',''accepted'',''declined'',''amended'') NOT NULL DEFAULT ''draft''', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND CONSTRAINT_NAME = 'fk_quotes_parent' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE crm_quotes ADD CONSTRAINT fk_quotes_parent FOREIGN KEY (parent_quote_id) REFERENCES crm_quotes(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND CONSTRAINT_NAME = 'fk_quotes_revised_by' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE crm_quotes ADD CONSTRAINT fk_quotes_revised_by FOREIGN KEY (revised_by_id) REFERENCES crm_quotes(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'subtotal_pence') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN subtotal_pence BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER amount_pence', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'vat_rate_bp') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN vat_rate_bp INT UNSIGNED NOT NULL DEFAULT 0 AFTER subtotal_pence', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'vat_pence') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN vat_pence BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER vat_rate_bp', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'stage_label') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN stage_label VARCHAR(120) NULL AFTER vat_pence', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'sent_at') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN sent_at DATETIME NULL AFTER paid_at', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- v2: contacts (company + type on the lead) and UK-complete quotes/invoices (customer block, dates, PO).
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_leads' AND COLUMN_NAME = 'company_name') = 0,
  'ALTER TABLE crm_leads ADD COLUMN company_name VARCHAR(190) NULL AFTER name', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_leads' AND COLUMN_NAME = 'contact_type') = 0,
  'ALTER TABLE crm_leads ADD COLUMN contact_type ENUM(''customer'',''prospect'',''supplier'',''other'') NOT NULL DEFAULT ''prospect'' AFTER company_name', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'customer_name') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN customer_name VARCHAR(190) NULL AFTER title', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'customer_company') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN customer_company VARCHAR(190) NULL AFTER customer_name', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'customer_address') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN customer_address VARCHAR(500) NULL AFTER customer_company', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'customer_email') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN customer_email VARCHAR(190) NULL AFTER customer_address', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'quote_date') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN quote_date DATE NULL AFTER customer_email', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'customer_company') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN customer_company VARCHAR(190) NULL AFTER customer_name', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'customer_address') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN customer_address VARCHAR(500) NULL AFTER customer_company', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'customer_email') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN customer_email VARCHAR(190) NULL AFTER customer_address', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'invoice_date') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN invoice_date DATE NULL AFTER status', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'supply_date') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN supply_date DATE NULL AFTER invoice_date', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'po_number') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN po_number VARCHAR(80) NULL AFTER supply_date', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_invoices' AND COLUMN_NAME = 'payment_terms_days') = 0,
  'ALTER TABLE crm_invoices ADD COLUMN payment_terms_days SMALLINT UNSIGNED NULL AFTER po_number', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_leads' AND INDEX_NAME = 'idx_leads_contact_type') = 0,
  'ALTER TABLE crm_leads ADD INDEX idx_leads_contact_type (contact_type)', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS crm_quote_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_id BIGINT UNSIGNED NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  unit_price_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  amount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE CASCADE,
  INDEX idx_quote_items_quote (quote_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_invoice_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  unit_price_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  amount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES crm_invoices(id) ON DELETE CASCADE,
  INDEX idx_invoice_items_invoice (invoice_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_email_templates (
  template_key VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_emails (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  direction ENUM('outbound','inbound') NOT NULL,
  lead_id BIGINT UNSIGNED NULL,
  template_key VARCHAR(64) NULL,
  related_type VARCHAR(16) NULL,
  related_id BIGINT UNSIGNED NULL,
  from_address VARCHAR(255) NOT NULL DEFAULT '',
  to_address VARCHAR(500) NOT NULL DEFAULT '',
  subject VARCHAR(255) NOT NULL DEFAULT '',
  body MEDIUMTEXT NULL,
  status ENUM('queued','sent','failed','received') NOT NULL DEFAULT 'queued',
  error VARCHAR(1000) NULL,
  message_id VARCHAR(255) NULL UNIQUE,
  sent_at DATETIME NULL,
  received_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crm_emails_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL,
  INDEX idx_crm_emails_lead (lead_id, created_at),
  INDEX idx_crm_emails_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_followups (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document_type ENUM('quote','invoice') NOT NULL,
  document_id BIGINT UNSIGNED NOT NULL,
  lead_id BIGINT UNSIGNED NULL,
  template_key VARCHAR(64) NOT NULL,
  due_at DATETIME NULL,
  status ENUM('pending','sent','cancelled') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts INT UNSIGNED NOT NULL DEFAULT 3,
  last_sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_followups_document (document_type, document_id),
  CONSTRAINT fk_crm_followups_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL,
  INDEX idx_followups_due (status, due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing quotes and invoices predate line items and VAT: their amount becomes the subtotal (VAT 0)
-- and a single line item, so old records render the same way as new ones.
UPDATE crm_quotes SET subtotal_pence = amount_pence WHERE subtotal_pence = 0 AND vat_pence = 0 AND amount_pence > 0;
UPDATE crm_invoices SET subtotal_pence = amount_pence WHERE subtotal_pence = 0 AND vat_pence = 0 AND amount_pence > 0;
INSERT INTO crm_quote_items (quote_id, position, description, quantity, unit_price_pence, amount_pence)
  SELECT q.id, 0, q.title, 1.00, q.amount_pence, q.amount_pence FROM crm_quotes q
  WHERE NOT EXISTS (SELECT 1 FROM crm_quote_items i WHERE i.quote_id = q.id);
INSERT INTO crm_invoice_items (invoice_id, position, description, quantity, unit_price_pence, amount_pence)
  SELECT inv.id, 0, COALESCE((SELECT q.title FROM crm_quotes q WHERE q.id = inv.quote_id), CONCAT('Invoice ', inv.invoice_reference)), 1.00, inv.amount_pence, inv.amount_pence
  FROM crm_invoices inv
  WHERE NOT EXISTS (SELECT 1 FROM crm_invoice_items i WHERE i.invoice_id = inv.id);

-- v2 backfills: customer details copied from the lead onto documents that predate them, document
-- dates from the existing timestamps, and leads with an accepted quote or paid invoice become customers.
UPDATE crm_quotes q JOIN crm_leads l ON l.id = q.lead_id
  SET q.customer_name = l.name, q.customer_company = l.company_name,
      q.customer_address = NULLIF(CONCAT_WS(CHAR(10), NULLIF(l.address, ''), NULLIF(l.postcode, '')), ''),
      q.customer_email = l.email
  WHERE q.customer_name IS NULL;
UPDATE crm_quotes SET quote_date = DATE(COALESCE(sent_at, created_at)) WHERE quote_date IS NULL;
UPDATE crm_invoices inv JOIN crm_leads l ON l.id = inv.lead_id
  SET inv.customer_company = l.company_name,
      inv.customer_address = NULLIF(CONCAT_WS(CHAR(10), NULLIF(l.address, ''), NULLIF(l.postcode, '')), ''),
      inv.customer_email = l.email
  WHERE inv.customer_email IS NULL AND inv.customer_address IS NULL AND inv.customer_company IS NULL;
UPDATE crm_invoices SET invoice_date = DATE(issued_at) WHERE invoice_date IS NULL AND issued_at IS NOT NULL;
UPDATE crm_leads l SET l.contact_type = 'customer'
  WHERE l.contact_type = 'prospect'
    AND (EXISTS (SELECT 1 FROM crm_quotes q WHERE q.lead_id = l.id AND q.status = 'accepted')
      OR EXISTS (SELECT 1 FROM crm_invoices i WHERE i.lead_id = l.id AND i.status = 'paid'));

-- Company details printed on quotes and invoices (editable from the CRM settings page).
INSERT IGNORE INTO site_settings (setting_key, setting_value, is_public) VALUES
  ('crm.company_name', 'Omni Developments Ltd', FALSE),
  ('crm.company_address', '68 Woodham Road, Manchester, M23 0NS', FALSE),
  ('crm.company_email', 'admin@omnidevelopment.co.uk', FALSE),
  ('crm.company_phone', '07928 149 731', FALSE),
  ('crm.company_vat_number', '', FALSE),
  ('crm.company_number', '', FALSE),
  ('crm.company_website', 'https://omnidevelopment.co.uk', FALSE),
  ('crm.bank_account_name', 'Omni Developments Manchester Limited', FALSE),
  ('crm.bank_name', 'NatWest', FALSE),
  ('crm.bank_sort_code', '60-15-25', FALSE),
  ('crm.bank_account_number', '65714946', FALSE),
  ('crm.payment_terms_days', '7', FALSE),
  ('crm.default_vat_rate_bp', '0', FALSE),
  ('crm.followups_last_run', '', FALSE);
INSERT IGNORE INTO site_settings (setting_key, setting_value, is_public) VALUES
  ('crm.quote_terms', CONCAT_WS(CHAR(10),
    '1. This quote is valid for 30 days from the date of issue unless another date is shown.',
    '2. The price covers the work and materials described above. Anything extra you ask for will be agreed with you in writing and priced before it is carried out.',
    '3. Deposits and stage payments are invoiced as the work progresses and are payable within 7 days of the invoice date.',
    '4. Planning, building control, party wall and structural engineer fees are not included unless they are listed above.',
    '5. We will keep the site safe and tidy and remove our waste on completion.',
    '6. Materials remain the property of Omni Developments Ltd until they have been paid for in full.',
    '7. By signing this quote you confirm that you have read and accept it and these terms.'
  ), FALSE);

-- Default email templates (placeholders are documented in docs/CRM_SALES.md).
INSERT IGNORE INTO crm_email_templates (template_key, name, subject, body, is_active) VALUES
  ('quote_issued', 'Quote issued', 'Your quote {{quote.reference}} from {{company.name}}',
   '<p>Hi {{lead.firstName}},</p><p>Thank you for asking us to quote for your project. Your quote <strong>{{quote.reference}}</strong> for <strong>{{quote.title}}</strong> comes to <strong>{{quote.total}}</strong>, and a PDF copy is attached.</p><p>{{message}}</p><p>You can read through everything and accept the quote online here:<br><a href="{{sign.link}}">{{sign.link}}</a></p><p>The quote is valid until {{quote.validUntil}}. If you have any questions at all, just reply to this email or give us a ring on {{company.phone}}.</p><p>Kind regards,<br>{{company.name}}</p>', TRUE),
  ('quote_reminder', 'Quote reminder', 'A quick reminder about your quote {{quote.reference}}',
   '<p>Hi {{lead.firstName}},</p><p>Just a friendly reminder about your quote <strong>{{quote.reference}}</strong> for <strong>{{quote.title}}</strong> ({{quote.total}}). We''ve attached it again in case it''s handy.</p><p>If you''re happy to go ahead, you can accept it online in a couple of minutes:<br><a href="{{sign.link}}">{{sign.link}}</a></p><p>If anything needs changing, or you''d like to talk it through, just reply to this email or call us on {{company.phone}}. The quote is valid until {{quote.validUntil}}.</p><p>Kind regards,<br>{{company.name}}</p>', TRUE),
  ('quote_accepted', 'Quote accepted', 'Thank you for accepting quote {{quote.reference}}',
   '<p>Hi {{lead.firstName}},</p><p>Thank you for accepting quote <strong>{{quote.reference}}</strong> for <strong>{{quote.title}}</strong> ({{quote.total}}). A signed copy is attached for your records.</p><p>We''ll be in touch shortly to agree a start date and talk you through the next steps.</p><p>If you have any questions in the meantime, just reply to this email or call us on {{company.phone}}.</p><p>Kind regards,<br>{{company.name}}</p>', TRUE),
  ('invoice_issued', 'Invoice issued', 'Invoice {{invoice.reference}} from {{company.name}}',
   '<p>Hi {{lead.firstName}},</p><p>Please find attached invoice <strong>{{invoice.reference}}</strong> for <strong>{{invoice.total}}</strong>, due by {{invoice.dueDate}}.</p><p>{{message}}</p><p>You can pay by bank transfer using these details:<br>{{invoice.paymentDetails}}</p><p>If you have any questions about the invoice, just reply to this email or call us on {{company.phone}}.</p><p>Many thanks,<br>{{company.name}}</p>', TRUE),
  ('invoice_reminder', 'Invoice reminder', 'Payment reminder: invoice {{invoice.reference}}',
   '<p>Hi {{lead.firstName}},</p><p>Just a friendly reminder that invoice <strong>{{invoice.reference}}</strong> for <strong>{{invoice.total}}</strong> is due by {{invoice.dueDate}}. A copy is attached. If you''ve already paid, thank you, and please ignore this email.</p><p>Payment details:<br>{{invoice.paymentDetails}}</p><p>If there''s a problem, just reply to this email or call us on {{company.phone}} and we''ll be happy to help.</p><p>Many thanks,<br>{{company.name}}</p>', TRUE);

INSERT IGNORE INTO schema_migrations (version) VALUES ('005_crm_sales');
-- END MIGRATION: 005_crm_sales.sql

-- BEGIN MIGRATION: 006_crm_decisions_and_agent.sql
-- Customer quote decisions, optional action tracking and the discreet DeepSeek CRM analyst.

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_quotes' AND COLUMN_NAME = 'declined_reason') = 0,
  'ALTER TABLE crm_quotes ADD COLUMN declined_reason VARCHAR(1000) NULL AFTER decided_at', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO crm_email_templates (template_key, name, subject, body, is_active) VALUES
  ('quote_copy', 'Quote copy (no online decision)', 'Your quote {{quote.reference}} from {{company.name}}',
   '<p>Hi {{lead.firstName}},</p><p>Thank you for asking us to quote for your project. Your quote <strong>{{quote.reference}}</strong> for <strong>{{quote.title}}</strong> comes to <strong>{{quote.total}}</strong>, and a PDF copy is attached.</p><p>{{message}}</p><p>Please reply to this email or call us on {{company.phone}} if you would like to go ahead or discuss any changes. The quote is valid until {{quote.validUntil}}.</p><p>Kind regards,<br>{{company.name}}</p>', TRUE),
  ('quote_declined', 'Quote declined confirmation', 'We have recorded your response to quote {{quote.reference}}',
   '<p>Hi {{lead.firstName}},</p><p>We have recorded that you do not wish to proceed with quote <strong>{{quote.reference}}</strong> at this time.</p><p>Thank you for letting us know. If circumstances change, or you would like us to revise the scope, just reply to this email or call {{company.phone}}.</p><p>Kind regards,<br>{{company.name}}</p>', TRUE);

INSERT IGNORE INTO site_settings (setting_key, setting_value, is_public) VALUES
  ('ai.enabled', 'false', FALSE),
  ('ai.model', 'deepseek-chat', FALSE),
  ('ai.api_key', '', FALSE),
  ('ai.last_analysis', '', FALSE),
  ('ai.last_run', '', FALSE);

INSERT IGNORE INTO schema_migrations (version) VALUES ('006_crm_decisions_and_agent');
-- END MIGRATION: 006_crm_decisions_and_agent.sql

-- BEGIN MIGRATION: 007_crm_followup_agent.sql
-- Silence-gated quote follow-ups: only chase a quote when the customer has gone quiet,
-- with an optional DeepSeek-written one-line body for each reminder.

-- 1. Remember why a reminder was skipped (e.g. the customer replied).
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_followups' AND COLUMN_NAME = 'suppress_reason') = 0,
  'ALTER TABLE crm_followups ADD COLUMN suppress_reason VARCHAR(190) NULL AFTER last_sent_at', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Give the stock quote reminder a {{message}} paragraph for the AI line.
--    Only touches the default template (matched on the greeting) and only if it has no {{message}} yet,
--    so a customised body is left alone.
UPDATE crm_email_templates
SET body = REPLACE(body, '<p>Hi {{lead.firstName}},</p>', '<p>Hi {{lead.firstName}},</p><p>{{message}}</p>')
WHERE template_key = 'quote_reminder'
  AND body LIKE '%<p>Hi {{lead.firstName}},</p>%'
  AND body NOT LIKE '%{{message}}%';

-- 3. Opt-in switch for writing a personalised line into quote reminders (default off).
INSERT IGNORE INTO site_settings (setting_key, setting_value, is_public) VALUES
  ('ai.followup_enabled', 'false', FALSE);

INSERT IGNORE INTO schema_migrations (version) VALUES ('007_crm_followup_agent');
-- END MIGRATION: 007_crm_followup_agent.sql
