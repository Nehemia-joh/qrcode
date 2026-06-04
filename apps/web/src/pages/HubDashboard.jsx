import { Link } from 'react-router-dom';

const modules = [
  { id: 'transport', name: 'Transport', path: '/transport', active: true, note: 'Summary live' },
  { id: 'kitchen', name: 'Kitchen', path: '#', active: false, note: 'Phase 2' },
  { id: 'facilities', name: 'Facilities', path: '#', active: false, note: 'Phase 3' },
  { id: 'farm', name: 'Farm', path: '#', active: false, note: 'Phase 4' },
];

export default function HubDashboard() {
  return (
    <>
      <p className="breadcrumb">Home / Hub Dashboard</p>
      <h2 style={{ marginTop: 0 }}>Operations Hub</h2>
      <p style={{ color: '#607d8b', marginBottom: '1.5rem' }}>
        Select a module. Security is handled separately via ID-admin (biometric).
      </p>
      <div className="card-grid">
        {modules.map((m) =>
          m.active ? (
            <Link key={m.id} to={m.path} className="module-card active">
              <strong>{m.name}</strong>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#2e7d32' }}>{m.note}</div>
            </Link>
          ) : (
            <div key={m.id} className="module-card disabled">
              <strong>{m.name}</strong>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#90a4ae' }}>{m.note}</div>
            </div>
          )
        )}
      </div>
    </>
  );
}
