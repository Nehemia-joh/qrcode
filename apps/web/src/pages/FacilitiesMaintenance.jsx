import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../api/client';
import FacilitiesNav from '../components/FacilitiesNav';

export default function FacilitiesMaintenance() {
  const { schoolId, currentSchool } = useSchool();
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    assetId: '',
    priority: 'normal',
    campus: '',
  });

  const load = () => {
    Promise.all([
      apiJson(`/api/facilities/maintenance?schoolId=${schoolId}`),
      apiJson(`/api/facilities/assets?schoolId=${schoolId}`),
    ])
      .then(([m, a]) => {
        setTickets(m.tickets);
        setAssets(a.assets);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [schoolId]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiJson('/api/facilities/maintenance', {
        method: 'POST',
        body: JSON.stringify({ ...form, schoolId, assetId: form.assetId || null }),
      });
      setForm({ title: '', description: '', assetId: '', priority: 'normal', campus: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiJson(`/api/facilities/maintenance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Facilities / Maintenance
      </p>
      <h2 className="page-title">Maintenance — {currentSchool.name}</h2>
      <FacilitiesNav />

      {error && <div className="banner banner-warn">{error}</div>}

      <section className="section-panel">
        <h2>Log maintenance request</h2>
        <form className="admin-form" onSubmit={handleCreate}>
          <label>
            Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label>
            Linked asset (optional)
            <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
              <option value="">— None —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} — {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>
            Campus
            <input value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </label>
          <button type="submit" className="btn-primary">
            Create ticket
          </button>
        </form>
      </section>

      <section className="section-panel">
        <h2>Tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p className="empty-table">No maintenance tickets yet.</p>
        ) : (
          <ul className="report-list">
            {tickets.map((t) => (
              <li key={t.id} className="report-item">
                <div className="report-head">
                  <strong>{t.title}</strong>
                  <span className={`tag status-tag-${t.status}`}>{t.status}</span>
                  <span className="tag tag-stub">{t.priority}</span>
                </div>
                <p>{t.description}</p>
                <p className="incident-meta">
                  {t.assetTag && <>Asset: {t.assetTag} · </>}
                  {t.campus && <>{t.campus} · </>}
                  By {t.createdByName} · {new Date(t.createdAt).toLocaleString()}
                </p>
                {isAdmin && t.status !== 'completed' && t.status !== 'cancelled' && (
                  <div className="report-actions">
                    {t.status === 'open' && (
                      <button type="button" className="btn-sm" onClick={() => updateStatus(t.id, 'in_progress')}>
                        Start work
                      </button>
                    )}
                    <button type="button" className="btn-sm" onClick={() => updateStatus(t.id, 'completed')}>
                      Complete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
