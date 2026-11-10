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
