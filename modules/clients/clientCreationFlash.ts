"use client";

const CLIENT_CREATE_SUCCESS_FLASH_KEY = "nexus.clients.create-success";

export function persistClientCreateSuccessMessage(message: string): void {
    if (typeof window === "undefined") {
        return;
    }

    window.sessionStorage.setItem(CLIENT_CREATE_SUCCESS_FLASH_KEY, message);
}

export function consumeClientCreateSuccessMessage(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    const message = window.sessionStorage.getItem(
        CLIENT_CREATE_SUCCESS_FLASH_KEY
    );

    if (!message) {
        return null;
    }

    window.sessionStorage.removeItem(CLIENT_CREATE_SUCCESS_FLASH_KEY);
    return message;
}
