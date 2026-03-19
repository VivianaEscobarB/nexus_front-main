import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useLocationCascade } from '../hooks/useLocationCascade';
import { CreateWarehousePayload, WarehouseType } from '../types';
import { Input, Button, Select } from '@/components/ui';

interface Props {
  warehouseTypes: WarehouseType[];
  onSubmit: (data: CreateWarehousePayload) => Promise<void>;
}

export const WarehouseForm: React.FC<Props> = ({ warehouseTypes, onSubmit }) => {
  const { register, handleSubmit, control, setValue, watch } = useForm<CreateWarehousePayload>();
  const cascade = useLocationCascade();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800">Crear Nueva Bodega</h2>
        <p className="text-sm text-slate-500">Configure los datos generales y la ubicación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-2 md:col-span-2">
          <Input 
            id="name" 
            label="Nombre de la Bodega"
            {...register("name", { required: true })} 
            placeholder="Ej: Bodega Central" 
          />
        </div>

        <div className="space-y-2">
          <Controller
            name="warehouseTypeId"
            control={control}
            render={({ field }) => (
              <Select 
                {...field}
                label="Tipo de Bodega"
                options={warehouseTypes.map(type => ({ value: type.id.toString(), label: type.name }))}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Input 
            id="address" 
            label="Dirección Física"
            {...register("address", { required: true })} 
            placeholder="Ej: Calle 10 # 15-20" 
          />
        </div>

        {/* --- CASCADA --- */}
        <div className="space-y-2">
          <Controller
            name="countryId"
            control={control}
            render={({ field }) => (
              <Select 
                {...field}
                label="País"
                disabled={cascade.isLoadingCountries}
                options={cascade.countries.map(c => ({ value: c.id, label: c.name }))}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val);
                  cascade.handleCountryChange(val);
                  setValue('departmentId', ''); setValue('cityId', '');
                }}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Controller
            name="departmentId"
            control={control}
            render={({ field }) => (
              <Select 
                {...field}
                label="Departamento"
                disabled={!watch('countryId') || cascade.isLoadingDepartments}
                value={watch('departmentId')} 
                options={cascade.departments.map(d => ({ value: d.id, label: d.name }))}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val);
                  cascade.handleDepartmentChange(val);
                  setValue('cityId', '');
                }}
              />
            )}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Controller
            name="cityId"
            control={control}
            render={({ field }) => (
              <Select 
                {...field}
                label="Ciudad"
                disabled={!watch('departmentId') || cascade.isLoadingCities}
                value={watch('cityId')} 
                options={cascade.cities.map(c => ({ value: c.id, label: c.name }))}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
        <Button variant="ghost" type="button">Cancelar</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Guardar Bodega</Button>
      </div>
    </form>
  );
};
