import { useEffect, useState } from 'react';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';

/**
 * Opens legacy/qrcode (Nehemiah Bus QR) with SSO — same-tab navigation for a seamless handoff.
 */
export default function QrcodeLaunchButton({
  returnTo = 'index.php',
  label = 'Open Bus QR system',
  className = 'btn-primary',
  showStatus = true,
  openInNewTab = false,
}) {
  const { schoolId } = useSchool();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiJson('/api/nehemiah/qrcode/config').then(setConfig).catch(() => {});
  }, []);

  async function openSso() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson(
        `/api/nehemiah/sso-url?schoolId=${schoolId}&returnTo=${encodeURIComponent(returnTo)}`
      );
      if (!res.url) throw new Error(res.message || 'SSO not configured');
      if (openInNewTab) {
        const w = window.open(res.url, '_blank', 'noopener,noreferrer');
        if (!w) window.location.assign(res.url);
      } else {
        window.location.assign(res.url);
      }
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  if (!config?.configured) {
    return showStatus ? (
      <p className="section-note">
        Bus QR: set <code>NEHEMIAH_APP_URL</code> in <code>.env</code>, then run{' '}
        <code>bash scripts/sync-env.sh --auto</code>
      </p>
    ) : null;
  }

  return (
    <div className="qrcode-launch">
      <button type="button" className={className} onClick={openSso} disabled={loading}>
        {loading ? 'Opening Bus QR…' : label}
      </button>
      {error && <span className="error-inline">{error}</span>}
      {showStatus && (
        <p className="section-note" style={{ marginTop: '0.5rem' }}>
          Same login — opens <strong>{config.appUrl}</strong> without signing in again.
          {!openInNewTab && ' Use your browser back button to return to Operations.'}
        </p>
      )}
    </div>
  );
}
