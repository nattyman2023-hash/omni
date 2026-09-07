import { Link } from 'react-router-dom';
import { areas, services, site, siteSettings } from '../data/content';
import { MSIcon } from './icons';

/**
 * Matches the Stitch footer export in structure/spacing/tokens.
 * Accreditation badges, address and legal claims are gated behind
 * siteSettings verification flags — unverified claims are NOT rendered.
 * The remaining verified items stay centred and visually balanced.
 * See REAL_CONTENT_REQUIRED.md for the evidence audit.
 */
export default function Footer() {
  const badges: string[] = [];
  if (siteSettings.fmbMember) badges.push('FMB MEMBER');
  if (siteSettings.structuralWarranty10yr) badges.push('10 YR WARRANTY');

  const legalName = siteSettings.legalCompanyName || 'Omni Developments';
  const year = new Date().getFullYear();
  let copyright = `© ${year} ${legalName}. All rights reserved.`;
  if (siteSettings.registeredInEnglandWales) {
    copyright = `© ${year} ${legalName}. Registered in England & Wales.`;
    if (siteSettings.companyRegistrationNumber) {
      copyright = `© ${year} ${legalName}. Registered in England & Wales. Company No. ${siteSettings.companyRegistrationNumber}. All rights reserved.`;
    } else {
      copyright += ' All rights reserved.';
    }
  }

  return (
    <footer className="w-full bg-surface-slate text-on-primary pt-space-3xl pb-space-2xl">
      <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-2xl pb-space-2xl">
        <div className="space-y-space-md">
          <Link to="/" className="flex items-center gap-space-xs" aria-label="Omni Developments home">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-dark">
              <svg width="16" height="16" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <path d="M22 72V35l28-18 28 18v37H62V45H38v27" stroke="#F59E0B" strokeWidth="8" fill="none" />
              </svg>
            </span>
            <span className="font-headline-md text-headline-md tracking-tight text-on-primary">Omni Developments</span>
          </Link>
          <p className="font-body-sm text-body-sm text-outline-variant leading-relaxed">
            Bespoke architectural design, structural extensions, and full property refurbishments across Greater
            Manchester and Cheshire. Built on structural integrity and transparent costing.
          </p>
          {badges.length > 0 && (
            <div className="flex items-center gap-space-xs pt-space-xs">
              {badges.map((b) => (
                <span key={b} className="px-space-xs py-space-2xs bg-surface-dark font-label-caps text-label-caps text-amber-highlight rounded">{b}</span>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-primary">Bespoke Services</h2>
          <ul className="space-y-space-2xs font-body-sm text-body-sm text-outline-variant">
            {services.slice(0, 6).map((service) => (
              <li key={service.slug}>
                <Link className="hover:text-amber-highlight transition-colors" to={`/services/${service.slug}`}>
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-primary">Coverage Areas</h2>
          <p className="font-body-sm text-body-sm text-outline-variant">
            Premier development across key residential sectors:
          </p>
          <div className="grid grid-cols-2 gap-x-space-md gap-y-space-2xs font-body-sm text-body-sm text-outline-variant">
            {areas.map((area) => (
              <Link key={area} className="hover:text-amber-highlight transition-colors" to={`/areas/${area.toLowerCase().replaceAll(' ', '-')}`}>
                • {area}
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-primary">Project Enquiries</h2>
          <div className="space-y-space-xs font-body-sm text-body-sm text-outline-variant">
            <a className="flex items-center gap-space-xs hover:text-amber-highlight transition-colors" href={site.phoneHref}>
              <MSIcon name="call" size={18} className="text-amber-highlight" />
              {site.phone}
            </a>
            <a className="flex items-center gap-space-xs hover:text-amber-highlight transition-colors" href={`mailto:${site.email}`}>
              <MSIcon name="mail" size={18} className="text-amber-highlight" />
              {site.email}
            </a>
            {siteSettings.operationsCentreAddress && (
              <p className="flex items-start gap-space-xs">
                <MSIcon name="pin_drop" size={18} className="text-amber-highlight" />
                <span>{siteSettings.operationsCentreAddress}</span>
              </p>
            )}
          </div>
          <div className="pt-space-xs">
            <Link
              className="inline-flex items-center gap-space-xs font-label-ui text-label-ui px-space-md py-space-xs bg-amber-highlight text-surface-dark font-semibold rounded-lg hover:bg-secondary-container transition-colors"
              to="/quote"
            >
              Request On-Site Survey
            </Link>
          </div>
        </div>
      </div>
      <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop pt-space-lg flex flex-col md:flex-row items-center justify-between text-outline-variant font-body-sm text-body-sm gap-space-md border-t border-border-slate">
        <p>{copyright}</p>
        <div className="flex items-center gap-space-md">
          <Link className="hover:text-on-primary transition-colors" to="/privacy">Privacy Policy</Link>
          <Link className="hover:text-on-primary transition-colors" to="/terms">Terms of Service</Link>
          <Link className="hover:text-amber-highlight transition-colors" to="/staff/login">Staff Portal</Link>
        </div>
      </div>
    </footer>
  );
}
