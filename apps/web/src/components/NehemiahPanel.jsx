import { useEffect, useState } from 'react';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../api/client';

function formatTzs(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(n);
}

export default function NehemiahPanel() {
  const { schoolId } = useSchool();
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connection, setConnection] = useState(null);
  const [smsConfig, setSmsConfig] = useState(null);
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsMessage, setSmsMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      apiJson(`/api/nehemiah/stats?schoolId=${schoolId}`),
      apiJson(`/api/attendance/live?limit=6&schoolId=${schoolId}`).catch(() => null),
      apiJson(`/api/nehemiah/attendance/recent?limit=6&schoolId=${schoolId}`).catch(() => ({ records: [] })),
      apiJson('/api/nehemiah/finance-alerts?limit=10').catch(() => ({ alerts: [] })),
      apiJson('/api/nehemiah/sms/config').catch(() => ({ provider: 'mock' })),
    ])
      .then(([s, live, sheet, a, sms]) => {
        const records = live?.records?.length ? live.records : sheet.records || [];
        setStats({
          ...s,
          todayAttendance: {
            ...s.todayAttendance,
            total: live?.todayCount ?? s.todayAttendance?.total,
          },
          source: live?.records?.length ? 'live feed' : s.source,
        });
        setRecent(records);
        setAlerts(a.alerts || []);
        setConnection(live?.records?.length ? { connected: true, mode: 'live_feed' } : null);
        setSmsConfig(sms);
      })
      .catch((e) => setError(e.message));
  }, [schoolId]);

  async function notifyOne(alert) {
    setSmsBusy(true);
    setSmsMessage(null);
    try {
      await apiJson('/api/nehemiah/sms/notify', {
        method: 'POST',
        body: JSON.stringify({
          studentId: alert.studentId,
          parentPhone: alert.parentPhone,
          fullName: alert.fullName,
          balance: alert.balance,
        }),
      });
      setSmsMessage(`SMS queued to ${alert.parentPhone} (${smsConfig?.provider})`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSmsBusy(false);
    }
  }

  async function notifyBatch() {
    setSmsBusy(true);
    setSmsMessage(null);
    try {
      const res = await apiJson('/api/nehemiah/sms/notify-batch', { method: 'POST' });
      setSmsMessage(`Sent ${res.sent} messages, ${res.failed} failed (${res.provider})`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSmsBusy(false);
    }
  }

  if (error && !stats) return <p className="error">{error}</p>;
  if (!stats) return <p className="loading">Loading QR attendance…</p>;

  return (
    <section className="section-panel nehemiah-panel">
      <h2>QR attendance & finance (Nehemiah)</h2>
      <p className="section-note">
        Data: <strong>{stats.source}</strong>
        {connection && (
          <> · Bridge: {connection.connected ? connection.mode : 'sheet fallback'}</>
        )}
        {smsConfig && <> · SMS: <strong>{smsConfig.provider}</strong></>}
        {stats.note && <> — {stats.note}</>}
      </p>

      {smsMessage && <div className="banner banner-info">{smsMessage}</div>}

      <div className="overview-stats">
        <div className="stat-chip">
          <span className="stat-label">Scans today</span>
          <span className="stat-value">{stats.todayAttendance?.total ?? '—'}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Active students</span>
          <span className="stat-value">{stats.students?.active ?? '—'}</span>
        </div>
        <div className="stat-chip off-track">
          <span className="stat-label">Fee alerts</span>
          <span className="stat-value">{stats.financeAlerts ?? alerts.length ?? '—'}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Active buses</span>
          <span className="stat-value">{stats.buses?.active ?? '—'}</span>
        </div>
      </div>

      {recent.length > 0 && (
        <>
          <h3 className="section-heading">Recent scans</h3>
          <ul className="scan-list">
            {recent.map((r, i) => (
              <li key={i}>
                <strong>{r.full_name}</strong>
                <span>{r.attendance_time}</span>
                {r.is_in_credit ? <span className="tag tag-warn">Credit</span> : null}
              </li>
            ))}
          </ul>
        </>
      )}

      {isAdmin && alerts.length > 0 && (
        <>
          <h3 className="section-heading">Parent fee alerts</h3>
          <div className="report-actions" style={{ marginBottom: '0.75rem' }}>
            <button type="button" className="btn-sm btn-primary-inline" disabled={smsBusy} onClick={notifyBatch}>
              Notify all (batch)
            </button>
            <span className="section-note" style={{ margin: 0 }}>
              {smsConfig?.provider === 'mock'
                ? 'Mock mode — check data/sms-log.json'
                : 'Requires Twilio or Africa\'s Talking in .env'}
            </span>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Balance</th>
                  <th>Parent phone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.studentId}>
                    <td>{a.fullName}</td>
                    <td>{formatTzs(a.balance)}</td>
                    <td>{a.parentPhone || '—'}</td>
                    <td>
                      {a.parentPhone && (
                        <button
                          type="button"
                          className="btn-sm"
                          disabled={smsBusy}
                          onClick={() => notifyOne(a)}
                        >
                          SMS
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
