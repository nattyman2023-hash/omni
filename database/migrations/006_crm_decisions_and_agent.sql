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
