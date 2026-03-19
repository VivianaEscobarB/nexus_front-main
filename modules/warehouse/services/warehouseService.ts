export const warehouseService = {
  // ... otros métodos (create, getAll)

  deleteWarehouse: async (id: string): Promise<void> => {
    // El front envía petición al endpoint DELETE. 
    // El back se encarga de cambiar el status a inactivo.
    const response = await fetch(`/api/v1/warehouses/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Error al inactivar la bodega');
    }
  }
};
