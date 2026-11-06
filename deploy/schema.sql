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

-- BEGIN MIGRATION: 005_crm_sales_email_signing.sql
-- CRM sales pipeline, quotes/contracts, invoices, email, e-signature and follow-ups.
-- These tables are additive and safe to rerun. The legacy flat crm_invoices table is
-- replaced by the full invoice model below (no invoice records existed previously).

-- ---------------------------------------------------------------------------
-- Contacts: the single home for every person or company. A contact can be a
-- lead or not (is_lead / contact_type), and every quote, invoice and email
-- links back to it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_contacts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(32) NOT NULL UNIQUE,
  contact_name VARCHAR(190) NOT NULL,
  company_name VARCHAR(190) NULL,
  email VARCHAR(190) NULL,
  telephone VARCHAR(40) NULL,
  address_line1 VARCHAR(190) NULL,
  address_line2 VARCHAR(190) NULL,
  city VARCHAR(120) NULL,
  postcode VARCHAR(20) NULL,
  country VARCHAR(120) NULL DEFAULT 'United Kingdom',
  is_lead BOOLEAN NOT NULL DEFAULT TRUE,
  contact_type ENUM('lead','prospect','customer','supplier','partner','other') NOT NULL DEFAULT 'lead',
  lead_stage ENUM('new','contacted','qualified','quoted','won','lost') NOT NULL DEFAULT 'new',
  source VARCHAR(120) NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  tags VARCHAR(255) NULL,
  last_contacted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_contacts_email (email),
  INDEX idx_contacts_type (contact_type),
  INDEX idx_contacts_lead (is_lead, lead_stage),
  INDEX idx_contacts_name (contact_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Quotes / contracts (outbound proposals). Each quote can be revised; the
-- revision links back to its parent and increments version, so the history of
-- an existing contract is preserved when changes are needed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_quotes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_reference VARCHAR(64) NOT NULL UNIQUE,
  contact_id BIGINT UNSIGNED NOT NULL,
  parent_quote_id BIGINT UNSIGNED NULL,
  version INT NOT NULL DEFAULT 1,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  status ENUM('draft','sent','viewed','accepted','declined','expired','amended') NOT NULL DEFAULT 'draft',
  issue_date DATE NULL,
  valid_until DATE NULL,
  subtotal_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  vat_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  discount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  terms TEXT NULL,
  notes TEXT NULL,
  sign_token VARCHAR(64) NULL UNIQUE,
  sign_status ENUM('not_sent','awaiting','viewed','signed','declined') NOT NULL DEFAULT 'not_sent',
  sent_at DATETIME NULL,
  viewed_at DATETIME NULL,
  signed_at DATETIME NULL,
  signer_name VARCHAR(190) NULL,
  signer_email VARCHAR(190) NULL,
  signer_ip VARCHAR(64) NULL,
  accepted_at DATETIME NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_quote_id) REFERENCES crm_quotes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_quotes_contact (contact_id),
  INDEX idx_quotes_status (status),
  INDEX idx_quotes_sign (sign_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_quote_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  amount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE CASCADE,
  INDEX idx_quote_items_quote (quote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Invoices. The earlier flat crm_invoices table is dropped and recreated with
-- line items, a contact link and stage-payment friendly fields. Drop the line
-- item table first so the refresh is safe to rerun.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS crm_invoice_items;
DROP TABLE IF EXISTS crm_invoices;

CREATE TABLE IF NOT EXISTS crm_invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_reference VARCHAR(64) NOT NULL UNIQUE,
  contact_id BIGINT UNSIGNED NULL,
  quote_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(190) NOT NULL,
  customer_email VARCHAR(190) NULL,
  customer_address TEXT NULL,
  title VARCHAR(190) NULL,
  description TEXT NULL,
  amount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  subtotal_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  vat_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  discount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('draft','issued','sent','paid','void','overdue') NOT NULL DEFAULT 'draft',
  issue_date DATE NULL,
  due_at DATE NULL,
  sent_at DATETIME NULL,
  paid_at DATETIME NULL,
  payment_terms TEXT NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_due (due_at),
  INDEX idx_invoices_contact (contact_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_invoice_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  amount_pence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES crm_invoices(id) ON DELETE CASCADE,
  INDEX idx_invoice_items_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Email templates and a full inbound/outbound email log. Templates are
-- triggered by CRM events (quote issued, invoice issued, reminders, signing).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_email_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_key VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body LONGTEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_emails (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  direction ENUM('outbound','inbound') NOT NULL,
  contact_id BIGINT UNSIGNED NULL,
  template_key VARCHAR(80) NULL,
  related_type VARCHAR(40) NULL,
  related_id BIGINT UNSIGNED NULL,
  from_address VARCHAR(190) NOT NULL,
  to_address VARCHAR(190) NOT NULL,
  reply_to VARCHAR(190) NULL,
  subject VARCHAR(255) NOT NULL,
  body LONGTEXT NULL,
  html_body LONGTEXT NULL,
  status ENUM('queued','sent','failed','received') NOT NULL DEFAULT 'queued',
  error TEXT NULL,
  message_id VARCHAR(255) NULL,
  sent_at DATETIME NULL,
  received_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL,
  INDEX idx_emails_contact (contact_id),
  INDEX idx_emails_direction (direction),
  INDEX idx_emails_related (related_type, related_id),
  INDEX idx_emails_message (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Follow-up automation: one row per scheduled chase. The in-process scheduler
-- sends the template when due and reschedules until the document is settled.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_followup_sequences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document_type ENUM('quote','invoice') NOT NULL,
  document_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NULL,
  template_key VARCHAR(80) NOT NULL,
  due_at DATETIME NOT NULL,
  status ENUM('pending','sent','cancelled') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  interval_days INT NOT NULL DEFAULT 3,
  last_sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL,
  INDEX idx_followups_due (status, due_at),
  INDEX idx_followups_document (document_type, document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Company and bank details used on generated PDFs. Seeded from the supplied
-- invoice but editable through site_settings without a code change.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO site_settings (setting_key, setting_value, is_public) VALUES
  ('company_name', 'Omni Developments Ltd', TRUE),
  ('company_address', '68 Woodham Road, Manchester, M23 0NS', TRUE),
  ('company_email', 'admin@omnidevelopment.co.uk', TRUE),
  ('company_phone', '07928 149 731', TRUE),
  ('bank_account_name', 'Omni Developments Manchester Limited', FALSE),
  ('bank_name', 'NatWest', FALSE),
  ('bank_sort_code', '60-15-25', FALSE),
  ('bank_account_number', '65714946', FALSE),
  ('invoice_payment_terms_days', '7', FALSE);

-- ---------------------------------------------------------------------------
-- Default email templates. {{placeholders}} are filled by the mail service.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO crm_email_templates (template_key, name, subject, body) VALUES
  ('quote_issued', 'Quote / contract issued', 'Your quotation {{quote.reference}} from {{company.name}}',
   '<p>Hi {{contact.firstName}},</p><p>Please find attached quotation <strong>{{quote.reference}}</strong> for {{quote.title}}.</p><p>You can review and sign it online here: <a href="{{sign.link}}">{{sign.link}}</a></p><p>Total: {{quote.total}}</p><p>Kind regards,<br />{{company.name}}</p>'),
  ('quote_reminder_1', 'Quote not signed - reminder 1', 'A quick reminder about quotation {{quote.reference}}',
   '<p>Hi {{contact.firstName}},</p><p>Just following up on quotation <strong>{{quote.reference}}</strong>. If you would like to go ahead, you can sign it here: <a href="{{sign.link}}">{{sign.link}}</a></p><p>Happy to answer any questions.</p><p>Kind regards,<br />{{company.name}}</p>'),
  ('quote_reminder_2', 'Quote not signed - reminder 2', 'Still holding quotation {{quote.reference}} for you',
   '<p>Hi {{contact.firstName}},</p><p>We are still holding quotation <strong>{{quote.reference}}</strong> for you. You can review and sign it here: <a href="{{sign.link}}">{{sign.link}}</a></p><p>Kind regards,<br />{{company.name}}</p>'),
  ('quote_accepted', 'Quote signed / accepted', 'Thank you for signing quotation {{quote.reference}}',
   '<p>Hi {{contact.firstName}},</p><p>Thank you for signing quotation <strong>{{quote.reference}}</strong>. We will be in touch about the next steps.</p><p>Kind regards,<br />{{company.name}}</p>'),
  ('invoice_issued', 'Invoice issued', 'Invoice {{invoice.reference}} from {{company.name}}',
   '<p>Hi {{contact.firstName}},</p><p>Please find attached invoice <strong>{{invoice.reference}}</strong>.</p><p>Amount due: {{invoice.total}}<br />Due date: {{invoice.dueDate}}</p><p>{{invoice.paymentDetails}}</p><p>Kind regards,<br />{{company.name}}</p>'),
  ('invoice_reminder', 'Invoice reminder', 'Reminder: invoice {{invoice.reference}} is due',
   '<p>Hi {{contact.firstName}},</p><p>This is a friendly reminder that invoice <strong>{{invoice.reference}}</strong> ({{invoice.total}}) is due on {{invoice.dueDate}}.</p><p>{{invoice.paymentDetails}}</p><p>Kind regards,<br />{{company.name}}</p>'),
  ('lead_acknowledgement', 'New enquiry acknowledgement', 'Thanks for your enquiry, {{contact.firstName}}',
   '<p>Hi {{contact.firstName}},</p><p>Thank you for getting in touch with {{company.name}}. We have received your enquiry and a member of the team will be in contact shortly.</p><p>Kind regards,<br />{{company.name}}</p>');

INSERT IGNORE INTO schema_migrations (version) VALUES ('004_crm_sales_email_signing');
-- END MIGRATION: 005_crm_sales_email_signing.sql
