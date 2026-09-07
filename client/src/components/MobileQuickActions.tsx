import { Link, useLocation } from 'react-router-dom';
import { site } from '../data/content';
import { MSIcon } from './icons';

/** The persistent Call / WhatsApp / Free Quote bar Stitch renders on every page below `xl`. */
export default function MobileQuickActions() {
  const location = useLocation();
  if (location.pathname === '/quote') return null;

  return (
    <nav aria-label="Quick contact actions" className="fixed bottom-0 left-0 right-0 z-40 xl:hidden bg-surface-pure/95 backdrop-blur-lg px-space-md py-space-xs shadow-[0_-2px_10px_rgba(0,0,0,0.06)] flex items-center justify-between gap-space-xs">
      <a className="flex-1 flex items-center justify-center gap-space-2xs py-space-xs bg-surface-subtle text-on-surface rounded font-label-ui text-label-ui" href={site.phoneHref}>
        <MSIcon name="call" size={18} className="text-secondary" />
        Call
      </a>
      <a className="flex-1 flex items-center justify-center gap-space-2xs py-space-xs bg-surface-subtle text-success-green rounded font-label-ui text-label-ui" href={site.whatsappHref} rel="noopener" target="_blank">
        <MSIcon name="chat" size={18} />
        WhatsApp
      </a>
      <Link className="flex-1 flex items-center justify-center gap-space-2xs py-space-xs bg-primary text-on-primary rounded font-label-ui text-label-ui font-semibold" to="/quote">
        Free Quote
      </Link>
    </nav>
  );
}
