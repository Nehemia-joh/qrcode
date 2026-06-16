import { useEffect, useState } from 'react';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';

/**
 * Opens legacy/qrcode (Nehemiah Bus QR) with SSO — no second login when usernames match.
 */
export default function QrcodeLaunchButton({
  returnTo = 'index.php',
  label = 'Open Bus QR system',
  className = 'btn-primary',
  showStatus = true,
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
      const w = window.open(res.url, '_blank', 'noopener,noreferrer');
      // If the browser blocks popups, fall back to same-tab navigation.
      if (!w) window.location.href = res.url;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!config?.configured) {
    return showStatus ? (
      <p className="section-note">
        Bus QR (qrcode.zip): set <code>NEHEMIAH_APP_URL</code> in server <code>.env</code> to enable
        one-click login from Transport.
      </p>
    ) : null;
  }

  return (
    <div className="qrcode-launch">
      <button type="button" className={className} onClick={openSso} disabled={loading}>
        {loading ? 'Connecting…' : label}
      </button>
      {error && <span className="error-inline">{error}</span>}
      {showStatus && (
        <p className="section-note" style={{ marginTop: '0.5rem' }}>
          Logged into Operations as you → opens <strong>qrcode</strong> with the same username (
          {config.appUrl}).
        </p>
      )}
    </div>
  );
}
