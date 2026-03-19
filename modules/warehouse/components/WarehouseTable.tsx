import React, { useState } from 'react';
import { Warehouse } from '../types';
import { warehouseService } from '../services/warehouseService';
import { WarehouseDeleteDialog } from './WarehouseDeleteDialog';
import { Button } from '@/components/ui';

export const WarehouseTable: React.FC<{ initialData: Warehouse[] }> = ({ initialData }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialData);
  const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDeleteConfirm = async () => {
    if (!warehouseToDelete) return;
    try {
      setIsDeleting(true);
      await warehouseService.deleteWarehouse(warehouseToDelete);
      // UI Optimista: Actualizamos el estado local para que aparezca inactiva
      setWarehouses(prev => prev.map(w => w.id === warehouseToDelete ? { ...w, isActive: false } : w));
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
      setWarehouseToDelete(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
          <tr><th className="p-4">Nombre</th><th className="p-4">Dirección</th><th className="p-4">Estado</th><th className="p-4"></th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {warehouses.map((w) => (
            <tr key={w.id} className={`hover:bg-slate-50 ${!w.isActive ? 'opacity-50 grayscale bg-slate-50/50' : ''}`}>
              <td className="p-4 font-medium">{w.name}</td>
              <td className="p-4">{w.address}</td>
              <td className="p-4">
                {w.isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activa</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">Inactiva</span>
                )}
              </td>
              <td className="p-4 text-right">
                {w.isActive && <Button variant="danger" size="sm" onClick={() => setWarehouseToDelete(w.id)}>Eliminar</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <WarehouseDeleteDialog isOpen={!!warehouseToDelete} isLoading={isDeleting} onClose={() => setWarehouseToDelete(null)} onConfirm={handleDeleteConfirm} />
    </div>
  );
};
