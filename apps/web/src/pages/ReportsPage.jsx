import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../api/client';

const CATEGORIES = [
  { value: 'transport', label: 'Transport' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'farm', label: 'Farm' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

export default function ReportsPage() {
  const { schoolId, currentSchool } = useSchool();
  const { isAdmin, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'transport', campus: '' });

  const load = () => {
    apiJson(`/api/reports?schoolId=${schoolId}`)
      .then((d) => setReports(d.reports))
      .catch((e) => setError(e.message));
  };

  useEffect(load, [schoolId]);

  async function submitReport(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiJson('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ ...form, schoolId }),
      });
      setMessage('Report submitted to the Operations team.');
      setForm({ title: '', description: '', category: 'transport', campus: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiJson(`/api/reports/${id}`, {
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
        <Link to="/">Overall</Link> / Staff reports
      </p>
      <h2 className="page-title">Operations reports — {currentSchool.name}</h2>
      <p className="section-note">
        Staff raise issues here (replaces phone/email). Administrators triage and close tickets.
      </p>

      {error && <div className="banner banner-warn">{error}</div>}
      {message && <div className="banner banner-info">{message}</div>}

      <section className="section-panel">
        <h2>Submit a report</h2>
        <form className="admin-form" onSubmit={submitReport}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Campus (optional)
            <input
              value={form.campus}
              onChange={(e) => setForm({ ...form, campus: e.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </label>
          <button type="submit" className="btn-primary">
            Submit to Operations
          </button>
        </form>
      </section>

      <section className="section-panel">
        <h2>Open & recent ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="empty-table">No reports yet.</p>
        ) : (
          <ul className="report-list">
            {reports.map((r) => (
              <li key={r.id} className={`report-item status-${r.status}`}>
                <div className="report-head">
                  <strong>{r.title}</strong>
                  <span className="tag tag-stub">{r.category}</span>
                  <span className={`tag status-tag-${r.status}`}>{r.status}</span>
                </div>
                <p>{r.description}</p>
                <p className="incident-meta">
                  By {r.createdByName} · {new Date(r.createdAt).toLocaleString()}
                  {r.campus && ` · ${r.campus}`}
                </p>
                {isAdmin && r.status !== 'closed' && (
                  <div className="report-actions">
                    {r.status === 'open' && (
                      <button type="button" className="btn-sm" onClick={() => updateStatus(r.id, 'in_progress')}>
                        Start
                      </button>
                    )}
                    <button type="button" className="btn-sm" onClick={() => updateStatus(r.id, 'resolved')}>
                      Resolve
                    </button>
                    <button type="button" className="btn-sm" onClick={() => updateStatus(r.id, 'closed')}>
                      Close
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
