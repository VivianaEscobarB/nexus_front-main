import React from 'react';
import { Button } from '@/components/ui';

interface Props { isOpen: boolean; isLoading: boolean; onClose: () => void; onConfirm: () => void; }

export const WarehouseDeleteDialog: React.FC<Props> = ({ isOpen, isLoading, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h3 className="text-xl font-bold">¿Inactivar Bodega?</h3>
          <p className="text-sm text-slate-500">La bodega será marcada como inactiva mediante el endpoint DELETE.</p>
        </div>
        <div className="flex justify-center gap-4 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={isLoading}>Sí, Inactivar</Button>
        </div>
      </div>
    </div>
  );
};
