import React from 'react';
import { Select } from '@/components/ui';

interface LocationSelectsProps {
  location: {
    countryId: string | null;
    departmentId: string | null;
    cityId: string | null;
  };
  countries: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  isLoading: {
    countries: boolean;
    departments: boolean;
    cities: boolean;
  };
  onCountryChange: (id: string) => void;
  onDepartmentChange: (id: string) => void;
  onCityChange: (id: string) => void;
  error?: string; // Optional error for the final city selection
}

export function LocationSelects({
  location,
  countries,
  departments,
  cities,
  isLoading,
  onCountryChange,
  onDepartmentChange,
  onCityChange,
  error
}: LocationSelectsProps) {
  return (
    <>
      <Select
        label="País"
        options={countries.map(c => ({ value: c.id, label: c.name }))}
        value={location.countryId || ""}
        onChange={(e) => onCountryChange(e.target.value)}
        disabled={isLoading.countries}
      />
      <Select
        label="Departamento"
        options={departments.map(d => ({ value: d.id, label: d.name }))}
        value={location.departmentId || ""}
        onChange={(e) => onDepartmentChange(e.target.value)}
        disabled={!location.countryId || isLoading.departments}
      />
      <Select
        label="Ciudad"
        options={cities.map(c => ({ value: c.id, label: c.name }))}
        value={location.cityId || ""}
        onChange={(e) => onCityChange(e.target.value)}
        disabled={!location.departmentId || isLoading.cities}
        error={error}
      />
    </>
  );
}
