import React, { useState } from 'react';
import { Warehouse } from '../types';
import { WarehouseDeleteDialog } from './WarehouseDeleteDialog';
import { Button, Pagination } from '@/components/ui';
import { usePagination } from '@/shared/hooks/usePagination';
import { httpClient } from '@/shared/api/httpClient';

export const WarehouseTable: React.FC<{ initialData: Warehouse[] }> = ({ initialData }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialData);
  const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
      paginatedData: paginatedWarehouses,
      currentPage,
      totalPages,
      goToPage,
  } = usePagination(warehouses, 5);

  const handleDeleteConfirm = async () => {
    if (!warehouseToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await httpClient.delete<void>(`/api/warehouses/${warehouseToDelete}`);
      // UI Optimista: Actualizamos el estado local para que aparezca inactiva
      setWarehouses(prev => prev.map(w => w.id === warehouseToDelete ? { ...w, isActive: false } : w));
    } catch {
      setDeleteError('No fue posible eliminar la bodega.');
    } finally {
      setIsDeleting(false);
      setWarehouseToDelete(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      {deleteError ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      ) : null}
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
          <tr><th className="p-4">Nombre</th><th className="p-4">Dirección</th><th className="p-4">Estado</th><th className="p-4"></th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {paginatedWarehouses.map((w) => (
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

      <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          className="bg-slate-50/50 border-t border-slate-100"
      />

      <WarehouseDeleteDialog isOpen={!!warehouseToDelete} isLoading={isDeleting} onClose={() => setWarehouseToDelete(null)} onConfirm={handleDeleteConfirm} />
    </div>
  );
};
