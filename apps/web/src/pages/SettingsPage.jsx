import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, apiDownload } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { schoolId } = useSchool();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [dbTest, setDbTest] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [webhookTest, setWebhookTest] = useState(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  useEffect(() => {
    apiJson('/api/system/notifications').then(setNotifications).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    try {
      await apiJson('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function testWebhook() {
    setWebhookLoading(true);
    setWebhookTest(null);
    try {
      const result = await apiJson('/api/admin/test-webhook', {
        method: 'POST',
        body: JSON.stringify({ isInCredit: true, parentPhone: '0712345678' }),
      });
      setWebhookTest({ ok: true, ...result });
    } catch (err) {
      setWebhookTest({ ok: false, message: err.message });
    } finally {
      setWebhookLoading(false);
    }
  }

  async function testDatabase() {
    setDbLoading(true);
    setDbTest(null);
    try {
      const result = await apiJson('/api/nehemiah/test-db', { method: 'POST' });
      setDbTest(result);
    } catch (err) {
      setDbTest({ ok: false, message: err.message });
    } finally {
      setDbLoading(false);
    }
  }

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Settings
      </p>
      <h2 className="page-title">Account & integrations</h2>
      <p className="section-note">
        Signed in as <strong>{user?.fullName}</strong> ({user?.roleLabel})
      </p>

      {error && <div className="banner banner-warn">{error}</div>}
      {message && <div className="banner banner-info">{message}</div>}

      <section className="section-panel">
        <h2>Change password</h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            New password (min 8 characters)
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn-primary">
            Update password
          </button>
        </form>
      </section>

      {notifications && (
        <section className="section-panel">
          <h2>Email & SMS (production)</h2>
          <ul className="planned-list">
            <li>
              Email: <strong>{notifications.email.provider}</strong>
              {notifications.email.productionReady ? ' — ready' : ' — dev/mock or incomplete SMTP'}
              {notifications.email.missingEnv?.length > 0 &&
                ` (missing: ${notifications.email.missingEnv.join(', ')})`}
            </li>
            <li>
              SMS: <strong>{notifications.sms.provider}</strong>
              {notifications.sms.productionReady ? ' — ready' : ' — dev/mock or missing keys'}
              {notifications.sms.missingEnv?.length > 0 &&
                ` (missing: ${notifications.sms.missingEnv.join(', ')})`}
            </li>
            <li>Ops inbox: {notifications.opsNotifyEmail}</li>
          </ul>
          <p className="section-note">
            Set <code>EMAIL_PROVIDER=smtp</code>, <code>SMS_PROVIDER=twilio</code> (or{' '}
            <code>africas_talking</code>) in <code>.env</code>. See{' '}
            <code>docs/DEPLOYMENT_NOTIFICATIONS.md</code>.
          </p>
        </section>
      )}

      {isAdmin && (
        <section className="section-panel">
          <h2>Attendance webhook (item 1)</h2>
          <p className="section-note">
            Simulates a Nehemiah QR scan into Operations. On the PHP server, copy{' '}
            <code>legacy/qrcode/env.example</code> and set <code>OPS_WEBHOOK_*</code>.
          </p>
          <button type="button" className="btn-primary" onClick={testWebhook} disabled={webhookLoading}>
            {webhookLoading ? 'Sending…' : 'Test webhook scan'}
          </button>
          {webhookTest && (
            <div className={`banner ${webhookTest.ok ? 'banner-info' : 'banner-warn'}`} style={{ marginTop: '1rem' }}>
              {webhookTest.ok ? 'Webhook OK — check Transport live attendance.' : webhookTest.message}
              {webhookTest.notify?.errors?.length > 0 && (
                <ul>
                  {webhookTest.notify.errors.map((e) => (
                    <li key={e.channel}>
                      {e.channel}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="section-panel">
          <h2>Nehemiah database (when ready)</h2>
          <p className="section-note">
            Optional. Until linked, the app uses Google Sheets and webhooks. Set{' '}
            <code>NEHEMIAH_DB_*</code> in <code>.env</code> then test below.
          </p>
          <button type="button" className="btn-primary" onClick={testDatabase} disabled={dbLoading}>
            {dbLoading ? 'Testing…' : 'Test MySQL connection'}
          </button>
          {dbTest && (
            <div className={`banner ${dbTest.ok ? 'banner-info' : 'banner-warn'}`} style={{ marginTop: '1rem' }}>
              {dbTest.message}
              {dbTest.tablesFound && (
                <p>Tables found: {dbTest.tablesFound.join(', ') || 'none'}</p>
              )}
              {dbTest.steps && (
                <ul>
                  {dbTest.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="section-note">
            PHP scans: set <code>OPS_WEBHOOK_URL</code> and <code>OPS_WEBHOOK_SECRET</code> on the Nehemiah
            server (see <code>docs/NEHEMIAH_WEBHOOK.md</code>).
          </p>
        </section>
      )}

      {isAdmin && (
        <section className="section-panel">
          <h2>PDF reports</h2>
          <p className="section-note">Download leadership summaries for the selected school.</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                apiDownload(
                  `/api/operations/export/pdf?schoolId=${schoolId}`,
                  `operations-${schoolId}.pdf`
                )
              }
            >
              Operations overview PDF
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                apiDownload(
                  `/api/transport/export/pdf?schoolId=${schoolId}`,
                  `transport-${schoolId}.pdf`
                )
              }
            >
              Transport summary PDF
            </button>
          </div>
        </section>
      )}
    </>
  );
}
