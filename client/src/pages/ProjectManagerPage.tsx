import { useEffect, useState } from 'react';
import { Archive, ArrowDown, ArrowRight, ArrowUp, Check, FileText, Plus, Save, ShieldCheck, Upload, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { projects } from '../data/content';
import StagingMarker from '../components/StagingMarker';

type PublicationStatus = 'draft' | 'published' | 'archived';
type ManagedProject = (typeof projects)[number] & {
  id: number | string;
  published: boolean;
  publicationStatus: PublicationStatus;
};

type ProjectForm = {
  slug: string;
  title: string;
  location: string;
  category: string;
  description: string;
  image: string;
  gallery: string;
  tags: string;
  published: boolean;
};

const EMPTY_FORM: ProjectForm = {
  slug: '',
  title: '',
  location: 'Supplied project gallery',
  category: 'Extensions',
  description: '',
  image: '/images/site-interior.webp',
  gallery: '',
  tags: '',
  published: false,
};

const CATEGORIES = ['Extensions', 'Loft Conversions', 'Kitchens', 'Bathrooms', 'Renovations', 'General Building'];

function formFromProject(project: ManagedProject): ProjectForm {
  return {
    slug: project.slug,
    title: project.title,
    location: project.location,
    category: project.category,
    description: project.description,
    image: project.image,
    gallery: project.gallery.join('\n'),
    tags: project.tags.join(', '),
    published: project.published,
  };
}

function listFromText(value: string) {
  return [...new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

export default function ProjectManagerPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ManagedProject[]>([]);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [database, setDatabase] = useState('unknown');
  const [busy, setBusy] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  const update = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function loadProjects(preferredId?: number | string) {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/projects', { credentials: 'include' });
      const payload = await response.json() as { projects?: ManagedProject[]; database?: string; message?: string };
      if (response.status === 401) {
        navigate('/staff/login', { replace: true });
        return;
      }
      if (!response.ok) throw new Error(payload.message || 'Project records could not be loaded.');
      const next = Array.isArray(payload.projects) ? payload.projects : [];
      setRecords(next);
      setDatabase(payload.database || 'unknown');
      const selected = next.find((item) => String(item.id) === String(preferredId ?? editingId)) || next[0];
      if (selected) {
        setEditingId(selected.id);
        setForm(formFromProject(selected));
      } else {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      setMessage(null);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Project records could not be loaded.' });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void loadProjects(); }, []);

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage({ type: 'info', text: 'New project draft ready. Save it before publishing.' });
  }

  function selectProject(project: ManagedProject) {
    setEditingId(project.id);
    setForm(formFromProject(project));
    setMessage(null);
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    const next = listFromText(form.gallery);
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    update('gallery', next.join('\n'));
  }

  function removeGalleryImage(index: number) {
    update('gallery', listFromText(form.gallery).filter((_, itemIndex) => itemIndex !== index).join('\n'));
  }

  async function uploadImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const supported = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (files.some((file) => !supported.has(file.type))) {
      setMessage({ type: 'error', text: 'Choose JPG, PNG or WebP images only.' });
      return;
    }
    setUploading(true);
    setMessage(null);
    const body = new FormData();
    files.forEach((file) => body.append('images', file));
    try {
      const response = await fetch('/api/admin/project-images', { method: 'POST', credentials: 'include', body });
      const result = await response.json() as { images?: { path: string }[]; message?: string };
      if (!response.ok) throw new Error(result.message || 'Project images could not be uploaded.');
      const uploaded = Array.isArray(result.images) ? result.images.map((image) => image.path).filter(Boolean) : [];
      if (!uploaded.length) throw new Error('The upload completed without returning image paths.');
      const useFirstAsMain = form.image === EMPTY_FORM.image && !form.gallery.trim();
      if (useFirstAsMain) {
        update('image', uploaded[0]);
        update('gallery', uploaded.slice(1).join('\n'));
      } else {
        update('gallery', [...listFromText(form.gallery), ...uploaded].join('\n'));
      }
      setMessage({ type: 'success', text: `${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded. Save the project to publish the changes.` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Project images could not be uploaded.' });
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim() || !form.image.trim()) {
      setMessage({ type: 'error', text: 'Add a title, URL slug, description and main image before saving.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    const payload = {
      ...form,
      slug: form.slug.trim().toLowerCase(),
      title: form.title.trim(),
      location: form.location.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      gallery: listFromText(form.gallery),
      tags: listFromText(form.tags),
    };
    try {
      const response = await fetch(editingId === null ? '/api/admin/projects' : `/api/admin/projects/${editingId}`, {
        method: editingId === null ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { project?: ManagedProject; message?: string };
      if (!response.ok) throw new Error(result.message || 'Project could not be saved.');
      setMessage({ type: 'success', text: 'Project saved. It is visible publicly only when Published is enabled.' });
      await loadProjects(result.project?.id);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Project could not be saved.' });
      setBusy(false);
    }
  }

  async function archive() {
    if (editingId === null || !window.confirm('Archive this project from the public gallery?')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/projects/${editingId}`, { method: 'DELETE', credentials: 'include' });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Project could not be archived.');
      setMessage({ type: 'success', text: 'Project archived. You can select it and publish it again if needed.' });
      setEditingId(null);
      await loadProjects();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Project could not be archived.' });
      setBusy(false);
    }
  }

  return (
    <div className="admin-content">
      <div className="admin-title">
        <div>
          <span className="eyebrow">Projects</span>
          <h1>Project workspace</h1>
          <p>Maintain the approved project records that appear in the public gallery.</p>
        </div>
        <div className="admin-title-actions"><StagingMarker /><button className="button button-amber" type="button" onClick={startNew}><Plus size={16} /> New project</button></div>
      </div>

      <div className="admin-notice">
        <ShieldCheck size={18} />
        <span>
          <strong>{database === 'connected' || database === 'configured' ? 'Database-backed content' : 'Preview storage only'}</strong>
          {database === 'connected' || database === 'configured'
            ? ' Saved project edits are ready to persist through the configured MySQL database.'
            : ' MySQL is not connected. Edits can be previewed in this server session but will not survive a restart until the database is configured.'}
        </span>
      </div>

      {message && <div className={`form-status ${message.type === 'error' ? 'error' : message.type === 'success' ? 'success' : ''}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}

      <div className="project-manager-grid">
        <section className="project-manager-list" aria-labelledby="project-records-heading">
          <div className="panel-heading"><h2 id="project-records-heading">Project records</h2><span>{records.length} records</span></div>
          {busy && records.length === 0 ? <p className="project-manager-empty">Loading project records…</p> : records.length === 0 ? <p className="project-manager-empty">No project records are available yet.</p> : <div className="managed-project-list">
            {records.map((project) => (
              <button key={project.id} type="button" className={`managed-project-row ${String(project.id) === String(editingId) ? 'selected' : ''}`} onClick={() => selectProject(project)}>
                <span><strong>{project.title}</strong><small>{project.category} · {project.location}</small></span>
                <span className={`managed-project-meta ${project.published ? 'is-published' : project.publicationStatus === 'archived' ? '' : 'is-draft'}`}>
                  {project.published ? <><Check size={13} /> Published</> : project.publicationStatus === 'archived' ? <><Archive size={13} /> Archived</> : <><FileText size={13} /> Draft</>}
                </span>
              </button>
            ))}
          </div>}
          <p className="project-manager-help">Only records marked Published are returned to the public website. Use local <code>/images/…</code> assets or approved uploaded media for image paths.</p>
        </section>

        <section className="project-manager-editor" aria-labelledby="project-editor-heading">
          <div className="panel-heading"><h2 id="project-editor-heading">{editingId === null ? 'New project' : 'Edit project'}</h2><span>{busy ? 'Saving…' : 'Owner approval required'}</span></div>
          <form onSubmit={save}>
            <div className="project-manager-fields">
              <label>Project title<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Approved project title" /></label>
              <label>URL slug<input value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="approved-project-slug" /></label>
              <label>Location label<input value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Supplied project gallery" /></label>
              <label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>
            <label>Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Use verified project context only." /></label>
            <label>Main image path<input value={form.image} onChange={(event) => update('image', event.target.value)} placeholder="/images/project.webp" /></label>
            <div className="project-manager-upload">
              <input id="project-image-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || uploading} onChange={(event) => void uploadImages(event)} />
              <label htmlFor="project-image-upload" className="button button-outline"><Upload size={16} /> {uploading ? 'Uploading…' : 'Upload project images'}</label>
              <span>JPG, PNG or WebP up to 8 MB each. New uploads are added to the gallery order; the first upload becomes the main image for a new project.</span>
            </div>
            <label>Gallery image paths<textarea value={form.gallery} onChange={(event) => update('gallery', event.target.value)} placeholder="One local image path per line" aria-describedby="gallery-order-help" /></label>
            <p id="gallery-order-help" className="project-manager-field-help">The main image is always shown first. Gallery paths are shown in this order on the public page; use the controls below to reorder or remove entries.</p>
            {listFromText(form.gallery).length > 0 && (
              <div className="project-manager-gallery-list" aria-label="Ordered gallery images">
                {listFromText(form.gallery).map((path, index, paths) => (
                  <div className="project-manager-gallery-row" key={`${path}-${index}`}>
                    <span className="project-manager-gallery-number" aria-hidden="true">{index + 1}</span>
                    <code>{path}</code>
                    <div className="project-manager-gallery-actions">
                      <button type="button" className="project-manager-icon-button" onClick={() => moveGalleryImage(index, -1)} disabled={index === 0} aria-label={`Move gallery image ${index + 1} up`}><ArrowUp size={14} /></button>
                      <button type="button" className="project-manager-icon-button" onClick={() => moveGalleryImage(index, 1)} disabled={index === paths.length - 1} aria-label={`Move gallery image ${index + 1} down`}><ArrowDown size={14} /></button>
                      <button type="button" className="project-manager-icon-button danger" onClick={() => removeGalleryImage(index)} aria-label={`Remove gallery image ${index + 1}`}><X size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label>Tags<input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="Extension, Structural work" /></label>
            <label className="project-manager-check"><input type="checkbox" checked={form.published} onChange={(event) => update('published', event.target.checked)} /><span>Publish this project on the public website</span></label>
            <div className="project-manager-actions">
              <button className="button button-dark" type="submit" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save project'}</button>
              {editingId !== null && <button className="button button-outline" type="button" onClick={() => void archive()} disabled={busy}><Archive size={16} /> Archive</button>}
              {editingId !== null && <Link className="button button-outline" to={`/projects/${form.slug}`} target="_blank" rel="noreferrer">Preview <ArrowRight size={15} /></Link>}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
