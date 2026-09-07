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
