import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource.js';

const AdminScopeContext = createContext(null);

export function AdminScopeProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: filters } = useApiResource('/admin/students/filters');
  const { data: institution } = useApiResource('/journey/institution');
  const availableYears = useMemo(() => filters?.graduationYears ?? [], [filters?.graduationYears]);
  const configured = institution?.institution?.activeGraduationYear;
  const requested = Number(searchParams.get('year')) || null;
  const graduationYear = requested || configured || availableYears.at(-1) || new Date().getFullYear();

  useEffect(() => {
    if (requested || !graduationYear) return;
    const next = new URLSearchParams(searchParams);
    next.set('year', String(graduationYear));
    setSearchParams(next, { replace: true });
  }, [graduationYear, requested, searchParams, setSearchParams]);

  const value = useMemo(() => ({
    graduationYear,
    availableYears,
    branches: filters?.branches ?? [],
    bands: filters?.bands ?? [],
    seasonName: institution?.institution?.placementSeasonName || `Class of ${graduationYear}`,
    setGraduationYear(year) {
      const next = new URLSearchParams(searchParams);
      next.set('year', String(year));
      setSearchParams(next);
    },
  }), [availableYears, filters?.bands, filters?.branches, graduationYear, institution?.institution?.placementSeasonName, searchParams, setSearchParams]);

  return <AdminScopeContext.Provider value={value}>{children}</AdminScopeContext.Provider>;
}

export function useAdminScope() {
  const value = useContext(AdminScopeContext);
  if (!value) throw new Error('useAdminScope must be used inside AdminScopeProvider');
  return value;
}
