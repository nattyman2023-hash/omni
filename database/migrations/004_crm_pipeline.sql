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

ALTER TABLE crm_site_visits
  ADD COLUMN lead_id BIGINT UNSIGNED NULL AFTER id,
  ADD COLUMN address VARCHAR(255) NULL AFTER scheduled_at,
  ADD COLUMN duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60 AFTER address,
  ADD COLUMN assigned_user_id BIGINT UNSIGNED NULL AFTER duration_minutes,
  ADD CONSTRAINT fk_site_visits_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_site_visits_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE crm_tasks
  ADD COLUMN lead_id BIGINT UNSIGNED NULL AFTER id,
  ADD COLUMN completed_at DATETIME NULL AFTER status,
  ADD CONSTRAINT fk_tasks_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;

ALTER TABLE crm_invoices
  ADD COLUMN lead_id BIGINT UNSIGNED NULL AFTER id,
  ADD COLUMN quote_id BIGINT UNSIGNED NULL AFTER lead_id,
  ADD COLUMN notes TEXT NULL AFTER due_at,
  ADD COLUMN issued_at DATETIME NULL AFTER notes,
  ADD COLUMN paid_at DATETIME NULL AFTER issued_at,
  ADD CONSTRAINT fk_invoices_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_invoices_quote FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE SET NULL;

INSERT IGNORE INTO schema_migrations (version) VALUES ('004_crm_pipeline');
