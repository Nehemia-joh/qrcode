import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../api/client';
import FacilitiesNav from '../components/FacilitiesNav';
import DataTable from '../components/DataTable';

const CONDITIONS = ['good', 'fair', 'poor', 'out_of_service'];

export default function FacilitiesAssets() {
  const { schoolId, currentSchool } = useSchool();
  const { isAdmin } = useAuth();
  const [assets, setAssets] = useState([]);
  const [selectedQr, setSelectedQr] = useState(null);
  const [scanTag, setScanTag] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: 'furniture',
    campus: '',
    location: '',
    condition: 'good',
  });

  const load = () => {
    apiJson(`/api/facilities/assets?schoolId=${schoolId}`)
      .then((d) => setAssets(d.assets))
      .catch((e) => setError(e.message));
  };

  useEffect(load, [schoolId]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const data = await apiJson('/api/facilities/assets', {
        method: 'POST',
        body: JSON.stringify({ ...form, schoolId }),
      });
      setMessage(`Asset "${data.asset.name}" registered — tag ${data.asset.assetTag}`);
      setSelectedQr(data.qrDataUrl);
      setForm({ name: '', category: 'furniture', campus: '', location: '', condition: 'good' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function showQr(id) {
    const data = await apiJson(`/api/facilities/assets/${id}`);
    setSelectedQr(data.qrDataUrl);
  }

  async function handleScan(e) {
    e.preventDefault();
    setScanResult(null);
    try {
      const data = await apiJson(`/api/facilities/assets/scan/${encodeURIComponent(scanTag.trim())}`);
      setScanResult(data.asset);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Facilities / Assets
      </p>
      <h2 className="page-title">Asset register — {currentSchool.name}</h2>
      <FacilitiesNav />
      <p className="section-note">
        QR-tagged assets for accountability and maintenance (row 1.9). Admin registers assets;
        scan tag to look up.
      </p>

      {error && <div className="banner banner-warn">{error}</div>}
      {message && <div className="banner banner-info">{message}</div>}

      <section className="section-panel">
        <h2>Scan asset tag</h2>
        <form className="admin-form scan-form" onSubmit={handleScan}>
          <label>
            Asset tag (from QR)
            <input
              value={scanTag}
              onChange={(e) => setScanTag(e.target.value)}
              placeholder="AST-MAIN-0001"
            />
          </label>
          <button type="submit" className="btn-primary">
            Look up
          </button>
        </form>
        {scanResult && (
          <div className="incident-card" style={{ marginTop: '1rem' }}>
            <strong>{scanResult.name}</strong> ({scanResult.assetTag})
            <p className="incident-meta">
              {scanResult.campus} · {scanResult.location} · Condition: {scanResult.condition}
            </p>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="section-panel">
          <h2>Register asset (admin)</h2>
          <form className="admin-form" onSubmit={handleCreate}>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Category
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </label>
            <label>
              Campus
              <input value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
            </label>
            <label>
              Location
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </label>
            <label>
              Condition
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary">
              Register & generate QR
            </button>
          </form>
          {selectedQr && (
            <div className="qr-preview">
              <p>Print this QR and attach to the asset:</p>
              <img src={selectedQr} alt="Asset QR code" width={256} height={256} />
            </div>
          )}
        </section>
      )}

      <section className="section-panel">
        <h2>Assets ({assets.length})</h2>
        <DataTable
          headers={['Tag', 'Name', 'Campus', 'Location', 'Condition', '']}
          rows={assets.map((a) => [
            a.assetTag,
            a.name,
            a.campus || '—',
            a.location || '—',
            a.condition,
            isAdmin ? (
              <button type="button" className="btn-sm" onClick={() => showQr(a.id)}>
                QR
              </button>
            ) : (
              '—'
            ),
          ])}
        />
      </section>
    </>
  );
}
