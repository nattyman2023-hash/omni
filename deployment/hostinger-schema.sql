-- Omni Developments temporary Hostinger database schema
-- Initial Hostinger setup: import this file once through phpMyAdmin.
-- Safe to import again: schema creation is conditional and seed rows are guarded.
-- This file is additive only. It does not drop, truncate or delete data.

SET NAMES utf8mb4;

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
  CONSTRAINT fk_service_faqs_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
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
  CONSTRAINT fk_projects_category FOREIGN KEY (category_id) REFERENCES project_categories(id) ON DELETE SET NULL,
  INDEX idx_projects_status (publication_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_media (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  media_kind ENUM('image','document') NOT NULL DEFAULT 'image',
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_project_media_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_media_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  tag VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_project_tags_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_tags_project (project_id)
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
  CONSTRAINT fk_guides_category FOREIGN KEY (category_id) REFERENCES guide_categories(id) ON DELETE SET NULL,
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
  CONSTRAINT fk_quote_request_files_quote FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id) ON DELETE CASCADE,
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
  CONSTRAINT fk_activity_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The three records below are neutral supplied-photo placeholders already used by
-- the application. They do not assert an address, customer, price or accreditation.
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
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.stored_filename = '/images/site-interior.webp');
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
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.stored_filename = '/images/project-renovation-01.webp');
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
  AND NOT EXISTS (SELECT 1 FROM project_media m WHERE m.project_id = p.id AND m.stored_filename = '/images/project-bathroom-01.webp');
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

INSERT IGNORE INTO schema_migrations (version) VALUES
  ('001_initial'),
  ('002_project_content');
