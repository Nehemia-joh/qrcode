import { createContext, useContext, useEffect, useState } from 'react';
import { apiJson } from '../api/client';

const SchoolContext = createContext(null);

const STORAGE_KEY = 'ops_selected_school';

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([]);
  const [schoolGroups, setSchoolGroups] = useState([]);
  const [schoolId, setSchoolId] = useState(() => localStorage.getItem(STORAGE_KEY) || 'sl-main');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson('/api/schools')
      .then((data) => {
        setSchools(data.schools || []);
        setSchoolGroups(data.groups || []);
        if (!data.schools?.some((s) => s.id === schoolId)) {
          setSchoolId('sl-main');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolId]);

  const selectSchool = (id) => {
    setSchoolId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const currentSchool = schools.find((s) => s.id === schoolId) ?? {
    id: schoolId,
    name: 'Loading…',
  };

  return (
    <SchoolContext.Provider
      value={{ schools, schoolGroups, schoolId, selectSchool, currentSchool, loading }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider');
  return ctx;
}
