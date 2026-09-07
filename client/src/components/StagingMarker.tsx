import { useEffect, useState } from 'react';

export default function StagingMarker() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/api/site-settings')
      .then((response) => response.ok ? response.json() as Promise<{ stagingMode?: boolean }> : null)
      .then((settings) => { if (active && settings?.stagingMode) setVisible(true); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return visible ? <span className="staging-marker" role="status">Temporary review site</span> : null;
}
