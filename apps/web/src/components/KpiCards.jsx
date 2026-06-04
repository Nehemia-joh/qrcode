export function kpiOnTrack(kpi) {
  if (kpi.onTrack != null) return kpi.onTrack;
  if (kpi.actual == null) return null;
  if (kpi.key === 'incidents') return kpi.actual <= kpi.target;
  return kpi.actual >= kpi.target;
}

export default function KpiCards({ kpis }) {
  return (
    <div className="kpi-row">
      {kpis.map((kpi) => {
        const track = kpiOnTrack(kpi);
        const cls =
          track === null ? '' : track ? 'on-track' : 'off-track';
        return (
          <div key={kpi.key} className={`kpi-card ${cls}`}>
            <h3>{kpi.label}</h3>
            <div className="values">
              <span>
                Target:{' '}
                <strong>
                  {kpi.target}
                  {kpi.unit === '%' ? '%' : ''}
                </strong>
              </span>
              <span>
                Actual:{' '}
                <strong>
                  {kpi.actual == null ? '—' : `${kpi.actual}${kpi.unit === '%' ? '%' : ''}`}
                </strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
