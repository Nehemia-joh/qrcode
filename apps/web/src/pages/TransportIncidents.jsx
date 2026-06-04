import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';
import TransportNav from '../components/TransportNav';
export default function TransportIncidents() {
  const { schoolId, currentSchool } = useSchool();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    apiJson(`/api/transport/incidents?schoolId=${schoolId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [schoolId]);

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Transport / Incidents
      </p>
      <h2 className="page-title">Bus incidents — {currentSchool.name}</h2>
      <TransportNav />

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="loading">Loading incidents…</p>}

      {data && !data.hasData && (
        <div className="banner banner-warn">No incident data for this school yet.</div>
      )}

      {data?.hasData && (
        <section className="section-panel">
          <h2>Incident log ({data.total})</h2>
          <p className="section-note">From master sheet — Bus Incidence tab.</p>
          <div className="incident-cards">
            {data.records.map((r, i) => (
              <article key={i} className="incident-card">
                <header>
                  <strong>{r.date}</strong>
                  <span className="tag tag-stub">{r.campus}</span>
                  {r.busNo && <span>{r.busNo}</span>}
                </header>
                {r.driverName && <p className="incident-meta">Driver: {r.driverName}</p>}
                {r.location && <p className="incident-meta">Location: {r.location}</p>}
                <p>{r.description}</p>
                {r.solution && (
                  <p className="incident-solution">
                    <strong>Solution:</strong> {r.solution}
                  </p>
                )}
                {r.nextSteps && (
                  <p className="incident-meta">
                    <strong>Next steps:</strong> {r.nextSteps}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
