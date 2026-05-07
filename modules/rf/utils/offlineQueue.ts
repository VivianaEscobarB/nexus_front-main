import type { RfConfirmBody } from "@/modules/warehouse/api/operatorInventoryTypes";

const DB_NAME = "nexus-rf";
const STORE_NAME = "offline-confirmations";
const DB_VERSION = 1;

export type RFQueuedConfirmation = {
    id: string;
    payload: RfConfirmBody;
    queuedAt: number;
};

function openDb(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
        return Promise.reject(new Error("IndexedDB no está disponible en este entorno."));
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
    });
}

export async function enqueueRFConfirmation(payload: RfConfirmBody): Promise<RFQueuedConfirmation> {
    const item: RFQueuedConfirmation = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        payload,
        queuedAt: Date.now(),
    };

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("No se pudo guardar en cola offline"));
    });
    db.close();
    return item;
}

export async function listRFQueuedConfirmations(): Promise<RFQueuedConfirmation[]> {
    const db = await openDb();
    const items = await new Promise<RFQueuedConfirmation[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result ?? []) as RFQueuedConfirmation[]);
        req.onerror = () => reject(req.error ?? new Error("No se pudo leer la cola offline"));
    });
    db.close();
    return items.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function removeRFQueuedConfirmation(id: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("No se pudo eliminar de la cola offline"));
    });
    db.close();
}
