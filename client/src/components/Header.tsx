import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { site, siteSettings } from '../data/content';
import { MSIcon } from './icons';

const NAV = [
  ['Home', '/'],
  ['How It Works', '/how-it-works'],
] as const;

const MEGA_MENUS = {
  services: {
    label: 'Services',
    href: '/services',
    intro: 'Explore the kind of work Omni can help you think through, scope and coordinate.',
    links: [
      ['All services', '/services'],
      ['Home extensions', '/services/home-extensions'],
      ['Loft conversions', '/services/loft-conversions'],
      ['Property renovations', '/services/property-renovations'],
      ['Kitchens & bathrooms', '/services/kitchen-renovations'],
      ['General building work', '/services/general-building-work'],
    ],
  },
  projects: {
    label: 'Projects',
    href: '/projects',
    intro: 'Browse the supplied project photography and the project context approved for publication.',
    links: [
      ['Project gallery', '/projects'],
      ['Open-plan extension', '/projects/open-plan-extension'],
      ['Property improvements', '/projects/property-improvements'],
      ['Bathroom installation', '/projects/bathroom-installation'],
    ],
  },
  about: {
    label: 'About Us',
    href: '/about',
    intro: 'Understand how we approach the brief, the property and the practical route forward.',
    links: [
      ['About Omni', '/about'],
      ['How it works', '/how-it-works'],
      ['Areas covered', '/areas'],
      ['Guides & advice', '/guides'],
      ['Client feedback', '/reviews'],
      ['Contact', '/contact'],
    ],
  },
} as const;

type MegaMenuKey = keyof typeof MEGA_MENUS;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-space-sm sm:gap-space-md whitespace-nowrap" aria-label="Omni Developments home">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container">
        <svg width="20" height="20" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path d="M22 72V35l28-18 28 18v37H62V45H38v27" stroke="#F59E0B" strokeWidth="8" fill="none" />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-headline-sm text-headline-sm tracking-tight text-primary leading-tight">Omni Developments</span>
        <span className="hidden sm:block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
          Manchester Ltd • Design &amp; Build
        </span>
      </span>
    </Link>
  );
}

export default function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MegaMenuKey | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setActiveMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveMenu(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header className="site-header fixed top-0 left-0 w-full z-50 bg-surface-pure/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Desktop information bar */}
      <div className="hidden lg:block bg-surface-slate text-on-primary py-space-2xs text-body-sm font-body-sm">
        <div className="max-w-container-max mx-auto px-gutter-desktop flex items-center justify-between">
          <div className="flex items-center gap-space-lg">
            <span className="flex items-center gap-space-2xs">
              <MSIcon name="location_on" size={16} className="text-amber-highlight" />
              {site.area} Coverage
            </span>
            {siteSettings.ratedGoogleCheckatrade && (
              <span className="flex items-center gap-space-2xs">
                <MSIcon name="verified" size={16} className="text-amber-highlight" />
                Rated 5.0 on Google &amp; Checkatrade
              </span>
            )}
          </div>
          <div className="flex items-center gap-space-lg">
            <a className="flex items-center gap-space-2xs hover:text-amber-highlight transition-colors" href={site.phoneHref}>
              <MSIcon name="call" size={16} />
              {site.phone}
            </a>
            <a className="flex items-center gap-space-2xs hover:text-amber-highlight transition-colors" href={`mailto:${site.email}`}>
              <MSIcon name="mail" size={16} />
              {site.email}
            </a>
            <Link
              className="flex items-center gap-space-2xs pl-space-sm text-amber-highlight hover:text-surface-pure transition-colors font-label-ui text-label-ui"
              to="/staff/login"
            >
              <MSIcon name="lock" size={16} />
              Staff Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="relative h-20 max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop flex items-center justify-between gap-space-xs sm:gap-space-md">
        <Logo />

        <nav className="hidden nav:flex items-center gap-space-2xs" aria-label="Primary navigation">
          {NAV.map(([label, href]) => (
            <Link
              key={href}
              to={href}
              aria-current={isActive(location.pathname, href) ? 'page' : undefined}
              className={`whitespace-nowrap ${
                isActive(location.pathname, href)
                  ? 'border-b-2 border-secondary px-space-xs py-space-2xs font-label-ui text-label-ui font-semibold text-primary transition-colors'
                  : 'px-space-xs py-space-2xs font-label-ui text-label-ui text-on-surface-variant transition-colors hover:text-on-surface'
              }`}
            >
              {label}
            </Link>
          ))}
          {(Object.entries(MEGA_MENUS) as [MegaMenuKey, (typeof MEGA_MENUS)[MegaMenuKey]][]).map(([key, menu]) => (
            <button
              key={key}
              type="button"
              aria-expanded={activeMenu === key}
              aria-controls={`mega-menu-${key}`}
              onClick={() => setActiveMenu(key)}
              onMouseEnter={() => setActiveMenu(key)}
              className={`inline-flex appearance-none cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-0 bg-transparent px-space-xs py-space-2xs font-label-ui text-label-ui shadow-none transition-colors ${
                activeMenu === key || isActive(location.pathname, menu.href)
                  ? 'font-semibold text-primary'
                  : 'text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface'
              }`}
            >
              {menu.label}
              <MSIcon name="expand_more" size={15} />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-space-xs sm:gap-space-sm">
          <a
            className="hidden"
            href={site.whatsappHref}
            rel="noopener"
            target="_blank"
            title="Direct WhatsApp Consultation"
          >
            <MSIcon name="chat" size={20} />
          </a>
          <Link
            className="flex items-center gap-space-2xs bg-primary text-on-primary font-headline-sm text-headline-sm px-space-xs sm:px-space-md nav:px-space-sm nav:font-label-ui nav:text-label-ui py-space-xs rounded-lg hover:bg-surface-slate transition-all shadow-[0_1px_8px_rgba(0,0,0,0.08)] whitespace-nowrap"
            to="/quote"
          >
            <span className="hidden sm:inline">Get Free Quote</span>
            <span className="sm:hidden">Quote</span>
            <MSIcon name="arrow_forward" size={16} className="text-amber-highlight" />
          </Link>
          <div className="hidden 2xl:flex w-8 h-8 rounded-full bg-primary items-center justify-center" aria-hidden="true">
            <MSIcon name="person" size={18} className="text-on-primary" />
          </div>
          <button
            type="button"
            className="nav:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-surface-subtle text-on-surface"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <MSIcon name={mobileOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>

        {activeMenu && (
          <div
            id={`mega-menu-${activeMenu}`}
            className="absolute left-0 right-0 top-full hidden nav:block z-50"
            onMouseLeave={() => setActiveMenu(null)}
          >
            <div className="pt-2">
              <div className="grid grid-cols-12 gap-space-lg rounded-xl border border-border-stone bg-surface-pure p-space-lg shadow-2xl">
                <div className="col-span-4 rounded-lg bg-surface-slate p-space-lg text-on-primary">
                  <span className="font-label-caps text-label-caps uppercase tracking-widest text-amber-highlight">{MEGA_MENUS[activeMenu].label}</span>
                  <h2 className="mt-space-sm font-headline-md text-headline-md font-bold">A clearer route to the right next step.</h2>
                  <p className="mt-space-sm font-body-sm text-body-sm leading-relaxed text-outline-variant">{MEGA_MENUS[activeMenu].intro}</p>
                  <Link to={MEGA_MENUS[activeMenu].href} className="mt-space-lg inline-flex items-center gap-space-2xs font-label-ui text-label-ui font-bold text-amber-highlight hover:text-surface-pure">
                    View {MEGA_MENUS[activeMenu].label.toLowerCase()}
                    <MSIcon name="arrow_forward" size={16} />
                  </Link>
                </div>
                <div className="col-span-8 grid grid-cols-2 gap-x-space-xl gap-y-space-xs content-start">
                  {MEGA_MENUS[activeMenu].links.map(([label, href], index) => (
                    <Link key={href} to={href} className="group flex items-center justify-between gap-space-sm border-b border-border-stone py-space-sm font-label-ui text-label-ui text-on-surface-variant hover:text-primary">
                      <span>{label}</span>
                      <MSIcon name={index === 0 ? 'arrow_forward' : 'chevron_right'} size={16} className="text-secondary transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="nav:hidden min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] overflow-y-auto bg-surface-pure border-t border-border-stone shadow-lg">
          <nav className="flex flex-col px-gutter-mobile py-space-sm" aria-label="Mobile navigation">
            {NAV.map(([label, href]) => (
              <Link
                key={href}
                to={href}
                className={
                  isActive(location.pathname, href)
                    ? 'block px-space-xs py-space-sm rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-headline-sm'
                    : 'block px-space-xs py-space-sm rounded-lg font-label-ui text-label-ui text-on-surface-variant'
                }
              >
                {label}
              </Link>
            ))}
            {(Object.entries(MEGA_MENUS) as [MegaMenuKey, (typeof MEGA_MENUS)[MegaMenuKey]][]).map(([key, menu]) => (
              <div key={key} className="mt-space-xs border-t border-border-stone pt-space-xs">
              <p className="px-space-xs pb-space-2xs pt-space-xs font-label-caps text-label-caps uppercase tracking-widest text-secondary">{menu.label}</p>
              {menu.links.map(([label, href]) => (
                <Link key={href} to={href} className="block px-space-xs py-space-sm rounded-lg font-label-ui text-label-ui text-on-surface-variant">
                  {label}
                </Link>
              ))}
              </div>
            ))}
            <div className="flex items-center gap-space-sm pt-space-sm mt-space-xs border-t border-border-stone">
              <a className="flex-1 flex items-center justify-center gap-space-2xs py-space-sm bg-surface-subtle text-on-surface rounded-lg font-label-ui text-label-ui" href={site.phoneHref}>
                <MSIcon name="call" size={16} className="text-secondary" />
                Call
              </a>
              <a className="flex-1 flex items-center justify-center gap-space-2xs py-space-sm bg-surface-subtle text-success-green rounded-lg font-label-ui text-label-ui" href={site.whatsappHref} rel="noopener" target="_blank">
                <MSIcon name="chat" size={16} />
                WhatsApp
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
