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
