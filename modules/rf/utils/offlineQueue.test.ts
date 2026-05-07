import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    enqueueRFConfirmation,
    listRFQueuedConfirmations,
    removeRFQueuedConfirmation,
} from "./offlineQueue";

async function clearQueue(): Promise<void> {
    const items = await listRFQueuedConfirmations();
    await Promise.all(items.map((i) => removeRFQueuedConfirmation(i.id)));
}

describe("offlineQueue", () => {
    beforeEach(async () => {
        await clearQueue();
    });

    afterEach(async () => {
        await clearQueue();
    });

    it("encola, lista y elimina confirmaciones", async () => {
        expect(await listRFQueuedConfirmations()).toHaveLength(0);

        const body = {
            receptionLineId: 1,
            receivedQuantity: 2,
            lotCode: "L-1",
            storageSpaceId: 99,
        };
        const item = await enqueueRFConfirmation(body);
        expect(item.payload).toEqual(body);

        const list = await listRFQueuedConfirmations();
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe(item.id);

        await removeRFQueuedConfirmation(item.id);
        expect(await listRFQueuedConfirmations()).toHaveLength(0);
    });

    it("ordena por queuedAt ascendente (empates permitidos)", async () => {
        await enqueueRFConfirmation({ receptionLineId: 1, receivedQuantity: 1 });
        await new Promise((r) => setTimeout(r, 15));
        await enqueueRFConfirmation({ receptionLineId: 2, receivedQuantity: 1 });
        const list = await listRFQueuedConfirmations();
        expect(list).toHaveLength(2);
        expect(list[0].queuedAt).toBeLessThanOrEqual(list[1].queuedAt);
    });
});
