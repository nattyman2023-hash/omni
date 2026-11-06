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
