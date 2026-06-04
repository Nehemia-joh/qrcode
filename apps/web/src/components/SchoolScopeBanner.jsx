import { useSchool } from '../context/SchoolContext';

export default function SchoolScopeBanner({ viewMode, campusLabel, source }) {
  const { currentSchool } = useSchool();

  if (!viewMode || viewMode === 'school') return null;

  if (viewMode === 'network') {
    return (
      <div className="banner banner-info">
        <strong>Silverleaf group view</strong> — showing all campuses from the master transport
        sheet (Usariver, Arusha Modern, Kijenge, Ilboru, Boma, Mbegu). Select a campus in the
        school dropdown for that site only.
      </div>
    );
  }

  if (viewMode === 'campus') {
    return (
      <div className="banner banner-info">
        <strong>{currentSchool.name}</strong> — data for <strong>{campusLabel}</strong> campus only,
        from the group master sheet. {source && <span className="muted-inline">({source})</span>}
      </div>
    );
  }

  return null;
}
