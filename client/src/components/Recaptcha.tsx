import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

type Grecaptcha = {
  render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => number;
  reset: (widgetId?: number) => void;
};
declare global { interface Window { grecaptcha?: Grecaptcha; omniRecaptchaLoaded?: () => void } }

export type RecaptchaHandle = { reset: () => void };

let siteKeyRequest: Promise<string> | null = null;
let scriptRequest: Promise<void> | null = null;

/** The public site key comes from /api/site-settings, which only sends it when the server can verify tokens. */
function loadSiteKey() {
  siteKeyRequest ??= fetch('/api/site-settings')
    .then(response => response.ok ? response.json() as Promise<{ recaptchaSiteKey?: string }> : {})
    .then(settings => String((settings as { recaptchaSiteKey?: string }).recaptchaSiteKey || ''))
    .catch(() => '');
  return siteKeyRequest;
}

function loadScript() {
  scriptRequest ??= new Promise<void>((resolve, reject) => {
    if (window.grecaptcha?.render) { resolve(); return; }
    window.omniRecaptchaLoaded = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=omniRecaptchaLoaded&render=explicit&hl=en-GB';
    script.async = true;
    script.defer = true;
    script.onerror = () => { scriptRequest = null; reject(new Error('reCAPTCHA failed to load')); };
    document.head.appendChild(script);
  });
  return scriptRequest;
}

/**
 * Google reCAPTCHA v2 "I'm not a robot" tickbox. Renders nothing when the server has no keys configured,
 * so forms keep working in local development. `onChange` receives the token, or '' when it expires.
 */
const Recaptcha = forwardRef<RecaptchaHandle, { onChange: (token: string) => void }>(function Recaptcha({ onChange }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [status, setStatus] = useState<'loading' | 'ready' | 'disabled' | 'error'>('loading');

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
      onChangeRef.current('');
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    void loadSiteKey().then(async siteKey => {
      if (cancelled) return;
      if (!siteKey) { setStatus('disabled'); return; }
      await loadScript();
      if (cancelled || !container.current || !window.grecaptcha || widgetId.current !== null) return;
      widgetId.current = window.grecaptcha.render(container.current, {
        sitekey: siteKey,
        callback: token => onChangeRef.current(token),
        'expired-callback': () => onChangeRef.current(''),
        'error-callback': () => onChangeRef.current(''),
      });
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; onChangeRef.current(''); };
  }, []);

  if (status === 'disabled') return null;
  return (
    <div className="recaptcha-field">
      <div ref={container} />
      {status === 'error' && <p className="recaptcha-note" role="alert">The robot check could not load. Please check your connection, or call us instead.</p>}
    </div>
  );
});

export default Recaptcha;
