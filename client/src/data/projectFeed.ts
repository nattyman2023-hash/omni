import { useEffect, useState } from 'react';
import { projects as fallbackProjects, Project } from './content';

export type PublicProject = Project;

export type ProjectGalleryImage = {
  src: string;
  alt: string;
};

function isProject(value: unknown): value is PublicProject {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PublicProject>;
  return typeof item.slug === 'string'
    && typeof item.title === 'string'
    && typeof item.location === 'string'
    && typeof item.category === 'string'
    && typeof item.description === 'string'
    && typeof item.image === 'string'
    && Array.isArray(item.gallery)
    && Array.isArray(item.tags);
}

/**
 * Every public project page uses the same ordered gallery contract. The CRM's
 * main image is always first, followed by the gallery entries in the order
 * supplied by the owner. Empty and duplicate paths are removed here so a
 * project can never show a duplicate hero thumbnail or an empty image frame.
 */
export function getProjectGallery(project: Pick<PublicProject, 'title' | 'image' | 'gallery'>): ProjectGalleryImage[] {
  const uniqueSources = [...new Set([project.image, ...project.gallery].map((source) => source.trim()).filter(Boolean))];
  return uniqueSources.map((src, index) => ({
    src,
    alt: index === 0
      ? `${project.title} — supplied project photography`
      : `${project.title} — supplied project photography ${index + 1}`,
  }));
}

export function usePublishedProjects() {
  const [items, setItems] = useState<PublicProject[]>(fallbackProjects);

  useEffect(() => {
    let mounted = true;
    fetch('/api/projects?published=1')
      .then(async (response) => {
        if (!response.ok) throw new Error('Project feed unavailable');
        return response.json() as Promise<{ projects?: unknown }>;
      })
      .then((payload) => {
        if (!mounted || !Array.isArray(payload.projects)) return;
        const next = payload.projects.filter(isProject);
        // An intentionally empty connected feed means no project content is approved.
        // Network/configuration failures retain the supplied local fallback above.
        setItems(next);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  return items;
}

export async function getPublishedProject(slug: string) {
  try {
    const response = await fetch(`/api/projects/${encodeURIComponent(slug)}`);
    if (response.ok) {
      const project = await response.json() as unknown;
      if (isProject(project)) return project;
    }
    if (response.status === 404) return null;
  } catch {
    // The local supplied records keep the public site useful when the optional CMS API is offline.
  }
  return fallbackProjects.find((project) => project.slug === slug) || null;
}
