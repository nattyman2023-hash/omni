import { Fragment, useEffect, useRef, useState } from 'react';
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
const MENU_ENTRIES = Object.entries(MEGA_MENUS) as [MegaMenuKey, (typeof MEGA_MENUS)[MegaMenuKey]][];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

const TOP_LEVEL_HREFS: readonly string[] = NAV.map(([, href]) => href);

/**
 * A mega menu is "current" when the route matches its landing page or one of its links.
 * Links that already have their own top-level item (e.g. How It Works) only highlight that item.
 */
function isMenuActive(pathname: string, key: MegaMenuKey) {
  const menu = MEGA_MENUS[key];
  return isActive(pathname, menu.href)
    || menu.links.some(([, href]) => !TOP_LEVEL_HREFS.includes(href) && isActive(pathname, href));
}

export function Logo() {
  return (
    <Link to="/" className="site-logo flex items-center gap-space-sm whitespace-nowrap rounded-lg" aria-label="Omni Developments home">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container">
        <svg width="26" height="26" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path d="M22 72V35l28-18 28 18v37H62V45H38v27" stroke="#F59E0B" strokeWidth="8" fill="none" />
        </svg>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="site-logo-name">Omni Developments</span>
        <span className="site-logo-tagline hidden sm:block">Manchester Ltd • Design &amp; Build</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MegaMenuKey | null>(null);
  const hoverOpenedAt = useRef(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Partial<Record<MegaMenuKey, HTMLButtonElement | null>>>({});
  const navRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setActiveMenu(null);
  }, [location.pathname]);

  // Escape closes whichever menu is open and returns focus to its trigger.
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (activeMenu) {
        triggerRefs.current[activeMenu]?.focus();
        setActiveMenu(null);
      }
      if (mobileOpen) {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [activeMenu, mobileOpen]);

  const openOnHover = (key: MegaMenuKey) => {
    if (activeMenu !== key) hoverOpenedAt.current = Date.now();
    setActiveMenu(key);
  };

  const toggleOnClick = (key: MegaMenuKey) => {
    // A click that immediately follows a hover-open should keep the panel open rather than toggle it shut.
    const justHoverOpened = activeMenu === key && Date.now() - hoverOpenedAt.current < 400;
    setActiveMenu((current) => (current === key && !justHoverOpened ? null : key));
  };

  // Close the desktop panel once keyboard focus leaves the navigation row entirely.
  const closeOnFocusOut = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && navRowRef.current?.contains(next)) return;
    setActiveMenu(null);
  };

  return (
    <header className="site-header fixed top-0 left-0 w-full z-50 bg-surface-pure/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Desktop information bar */}
      <div className="hidden lg:block bg-surface-slate text-on-primary text-body-sm font-body-sm">
        <div className="site-topbar max-w-container-max mx-auto px-gutter-desktop flex items-center justify-between gap-space-lg">
          <div className="flex items-center gap-space-lg">
            <span className="flex items-center gap-space-2xs">
              <MSIcon name="location_on" size={15} className="shrink-0 text-amber-highlight" />
              {site.area} Coverage
            </span>
            {siteSettings.ratedGoogleCheckatrade && (
              <span className="flex items-center gap-space-2xs">
                <MSIcon name="verified" size={15} className="shrink-0 text-amber-highlight" />
                Rated 5.0 on Google &amp; Checkatrade
              </span>
            )}
          </div>
          <div className="flex items-center gap-space-lg">
            <a className="site-topbar-link" href={site.phoneHref}>
              <MSIcon name="call" size={15} className="shrink-0" />
              {site.phone}
            </a>
            <a className="site-topbar-link" href={`mailto:${site.email}`}>
              <MSIcon name="mail" size={15} className="shrink-0" />
              {site.email}
            </a>
            <Link className="site-staff-link" to="/staff/login">
              <MSIcon name="lock" size={14} className="shrink-0" />
              Staff Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div
        ref={navRowRef}
        className="site-nav-row relative max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop flex items-center justify-between gap-space-sm sm:gap-space-md"
        onMouseLeave={() => setActiveMenu(null)}
        onBlur={closeOnFocusOut}
      >
        <Logo />

        <nav className="hidden nav:flex items-center gap-1 xl:gap-space-xs" aria-label="Primary navigation">
          {NAV.map(([label, href]) => (
            <Link
              key={href}
              to={href}
              aria-current={isActive(location.pathname, href) ? 'page' : undefined}
              className="site-nav-link"
              onMouseEnter={() => setActiveMenu(null)}
              onFocus={() => setActiveMenu(null)}
            >
              {label}
            </Link>
          ))}
          {MENU_ENTRIES.map(([key, menu]) => (
            <Fragment key={key}>
              <button
                ref={(node) => { triggerRefs.current[key] = node; }}
                type="button"
                aria-expanded={activeMenu === key}
                aria-controls={activeMenu === key ? `mega-menu-${key}` : undefined}
                data-current={isMenuActive(location.pathname, key) ? 'true' : undefined}
                onClick={() => toggleOnClick(key)}
                onMouseEnter={() => openOnHover(key)}
                className="site-nav-link site-nav-trigger"
              >
                {menu.label}
                <MSIcon name="expand_more" size={16} className="site-nav-chevron shrink-0" />
              </button>
              {/* Rendered straight after its trigger so Tab moves from the trigger into the panel. Positioned against the nav row. */}
              {activeMenu === key && (
                <div id={`mega-menu-${key}`} className="absolute left-0 right-0 top-full z-50 px-gutter-desktop">
                  <div className="pt-2">
                    <div className="grid grid-cols-12 gap-space-lg rounded-xl border border-solid border-border-stone bg-surface-pure p-space-lg shadow-2xl">
                      <div className="col-span-4 rounded-lg bg-surface-slate p-space-lg text-on-primary">
                        <span className="font-label-caps text-label-caps uppercase tracking-widest text-amber-highlight">{menu.label}</span>
                        <p className="mt-space-sm font-headline-md text-headline-md font-bold">A clearer route to the right next step.</p>
                        <p className="mt-space-sm font-body-sm text-body-sm leading-relaxed text-outline-variant">{menu.intro}</p>
                        <Link to={menu.href} className="mt-space-lg inline-flex items-center gap-space-2xs rounded font-label-ui text-label-ui font-bold text-amber-highlight hover:text-surface-pure hover:underline underline-offset-4">
                          View {menu.label.toLowerCase()}
                          <MSIcon name="arrow_forward" size={16} />
                        </Link>
                      </div>
                      <ul className="col-span-8 m-0 grid list-none grid-cols-2 content-start gap-x-space-xl gap-y-space-2xs p-0">
                        {menu.links.map(([label, href], index) => (
                          <li key={href}>
                            <Link
                              to={href}
                              aria-current={location.pathname === href ? 'page' : undefined}
                              className="site-mega-link group"
                            >
                              <span>{label}</span>
                              <MSIcon name={index === 0 ? 'arrow_forward' : 'chevron_right'} size={16} className="shrink-0 text-secondary transition-transform group-hover:translate-x-1" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-space-xs sm:gap-space-sm">
          <Link className="site-quote-cta" to="/quote" onMouseEnter={() => setActiveMenu(null)}>
            <span className="hidden sm:inline">Get Free Quote</span>
            <span className="sm:hidden">Quote</span>
            <MSIcon name="arrow_forward" size={16} className="shrink-0 text-amber-highlight" />
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            className="site-menu-button nav:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <MSIcon name={mobileOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div id="mobile-navigation" className="site-mobile-drawer nav:hidden overflow-y-auto bg-surface-pure border-0 border-t border-solid border-border-stone shadow-lg">
          <nav className="flex flex-col px-gutter-mobile py-space-sm" aria-label="Mobile navigation">
            {NAV.map(([label, href]) => (
              <Link
                key={href}
                to={href}
                aria-current={isActive(location.pathname, href) ? 'page' : undefined}
                className="site-mobile-link"
              >
                {label}
              </Link>
            ))}
            {MENU_ENTRIES.map(([key, menu]) => (
              <div key={key} className="mt-space-xs border-0 border-t border-solid border-border-stone pt-space-xs">
                <p className="px-space-xs pb-space-2xs pt-space-xs font-label-caps text-label-caps uppercase tracking-widest text-secondary">{menu.label}</p>
                {menu.links.map(([label, href]) => (
                  <Link
                    key={href}
                    to={href}
                    aria-current={location.pathname === href ? 'page' : undefined}
                    className="site-mobile-link"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="flex items-center gap-space-sm pt-space-sm mt-space-xs border-0 border-t border-solid border-border-stone">
              <a className="flex-1 flex min-h-11 items-center justify-center gap-space-2xs py-space-sm bg-surface-subtle text-on-surface rounded-lg font-label-ui text-label-ui" href={site.phoneHref}>
                <MSIcon name="call" size={16} className="text-secondary" />
                Call
              </a>
              <a className="flex-1 flex min-h-11 items-center justify-center gap-space-2xs py-space-sm bg-surface-subtle text-success-green rounded-lg font-label-ui text-label-ui" href={site.whatsappHref} rel="noopener" target="_blank">
                <MSIcon name="chat" size={16} />
                WhatsApp
              </a>
            </div>
            <Link className="site-staff-link site-staff-link--light mt-space-sm self-start" to="/staff/login">
              <MSIcon name="lock" size={14} className="shrink-0" />
              Staff Portal
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
