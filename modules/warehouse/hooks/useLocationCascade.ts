import { useState, useEffect } from 'react';
import { Country, Department, City } from '../types';

export const useLocationCascade = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const [isLoadingCountries, setIsLoadingCountries] = useState<boolean>(true);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState<boolean>(false);
  const [isLoadingCities, setIsLoadingCities] = useState<boolean>(false);

  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      // Mock para ejemplo. Aquí iría tu servicio real.
      setCountries([{ id: 'CO', name: 'Colombia' }]);
      setIsLoadingCountries(false);
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (!selectedCountry) {
      setDepartments([]);
      return;
    }
    const fetchDepartments = async () => {
      setIsLoadingDepartments(true);
      setDepartments([{ id: 'QUI', countryId: 'CO', name: 'Quindío' }]);
      setIsLoadingDepartments(false);
    };
    fetchDepartments();
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedDepartment) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCities([{ id: 'ARM', departmentId: 'QUI', name: 'Armenia' }]);
      setIsLoadingCities(false);
    };
    fetchCities();
  }, [selectedDepartment]);

  const handleCountryChange = (countryId: string) => {
    setSelectedCountry(countryId);
    setSelectedDepartment(null);
    setCities([]); 
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartment(departmentId);
  };

  return {
    countries, departments, cities,
    isLoadingCountries, isLoadingDepartments, isLoadingCities,
    handleCountryChange, handleDepartmentChange,
  };
};
