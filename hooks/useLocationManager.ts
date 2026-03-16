import { useState, useEffect } from 'react';
import { Country, Department, City, LocationState } from '../types/location.types';

export const useLocationManager = (initialCityId?: string) => {
  const [location, setLocation] = useState<LocationState>({
    countryId: null,
    departmentId: null,
    cityId: initialCityId || null,
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [isLoading, setIsLoading] = useState({
    countries: false,
    departments: false,
    cities: false
  });

  // Simulated API calls
  useEffect(() => {
    setIsLoading(prev => ({ ...prev, countries: true }));
    setTimeout(() => {
      setCountries([{ id: 'CO', name: 'Colombia' }, { id: 'MX', name: 'México' }]);
      setIsLoading(prev => ({ ...prev, countries: false }));
    }, 500);
  }, []);

  useEffect(() => {
    if (!location.countryId) {
      setDepartments([]);
      return;
    }
    setIsLoading(prev => ({ ...prev, departments: true }));
    setTimeout(() => {
      if (location.countryId === 'CO') {
        setDepartments([
          { id: 'ANT', countryId: 'CO', name: 'Antioquia' },
          { id: 'CUN', countryId: 'CO', name: 'Cundinamarca' }
        ]);
      } else if (location.countryId === 'MX') {
        setDepartments([
          { id: 'CDMX', countryId: 'MX', name: 'Ciudad de México' },
          { id: 'JAL', countryId: 'MX', name: 'Jalisco' }
        ]);
      } else {
        setDepartments([]);
      }
      setIsLoading(prev => ({ ...prev, departments: false }));
    }, 500);
  }, [location.countryId]);

  useEffect(() => {
    if (!location.departmentId) {
      setCities([]);
      return;
    }
    setIsLoading(prev => ({ ...prev, cities: true }));
    setTimeout(() => {
      if (location.departmentId === 'ANT') {
        setCities([
          { id: 'MED', departmentId: 'ANT', name: 'Medellín' },
          { id: 'ENV', departmentId: 'ANT', name: 'Envigado' }
        ]);
      } else if (location.departmentId === 'CUN') {
        setCities([
          { id: 'BOG', departmentId: 'CUN', name: 'Bogotá' }
        ]);
      } else {
        setCities([]);
      }
      setIsLoading(prev => ({ ...prev, cities: false }));
    }, 500);
  }, [location.departmentId]);

  const handleCountryChange = (countryId: string) => {
    setLocation({ countryId, departmentId: null, cityId: null });
  };

  const handleDepartmentChange = (departmentId: string) => {
    setLocation(prev => ({ ...prev, departmentId, cityId: null }));
  };

  const handleCityChange = (cityId: string) => {
    setLocation(prev => ({ ...prev, cityId }));
  };

  return {
    location,
    countries,
    departments,
    cities,
    isLoading,
    handleCountryChange,
    handleDepartmentChange,
    handleCityChange
  };
};
