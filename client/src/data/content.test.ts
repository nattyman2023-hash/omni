import { describe, expect, it } from 'vitest';
import { areas, guides, projects, quoteTypes, services } from './content';

describe('Omni content inventory', () => {
  it('contains the seven required service records', () => {
    expect(services.map(service => service.name)).toEqual(expect.arrayContaining([
      'Home Extensions', 'Loft Conversions', 'Property Renovations', 'Property Refurbishments',
      'Kitchen Renovations', 'Bathroom Renovations & Installations', 'General Building Work',
    ]));
  });

  it('contains the approved coverage areas and quote options', () => {
    expect(areas).toHaveLength(10);
    expect(quoteTypes).toContain('Other');
    expect(quoteTypes).toContain('Bathroom');
  });

  it('keeps project and guide records routable', () => {
    expect(projects.every(project => project.slug && project.image)).toBe(true);
    expect(guides.every(guide => guide.slug && guide.body.length > 0)).toBe(true);
  });
});
