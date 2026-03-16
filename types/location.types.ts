export interface Country {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  countryId: string;
  name: string;
}

export interface City {
  id: string;
  departmentId: string;
  name: string;
}

export interface LocationState {
  countryId: string | null;
  departmentId: string | null;
  cityId: string | null;
}

export interface CreateWarehousePayload {
  name: string;
  capacity?: number;
  location: LocationState;
}
