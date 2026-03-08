"use client";

import { useSyncExternalStore } from "react";
import type { User } from "@/types";

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isSigningIn: boolean;
    initialized: boolean;
    error: string | null;
}

type AuthStateListener = () => void;

const listeners = new Set<AuthStateListener>();

let authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isSigningIn: false,
    initialized: false,
    error: null,
};

function emitChange(): void {
    listeners.forEach((listener) => listener());
}

function updateState(updater: (previous: AuthState) => AuthState): void {
    authState = updater(authState);
    emitChange();
}

export const authStore = {
    subscribe(listener: AuthStateListener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    getState() {
        return authState;
    },

    startRestore() {
        updateState((previous) => ({
            ...previous,
            isLoading: true,
            error: null,
        }));
    },

    finishRestore(user: User | null) {
        updateState((previous) => ({
            ...previous,
            user,
            isAuthenticated: Boolean(user),
            isLoading: false,
            initialized: true,
        }));
    },

    startSignIn() {
        updateState((previous) => ({
            ...previous,
            isLoading: true,
            isSigningIn: true,
            error: null,
        }));
    },

    finishSignIn(user: User | null) {
        updateState((previous) => ({
            ...previous,
            user,
            isAuthenticated: Boolean(user),
            isLoading: false,
            isSigningIn: false,
            initialized: true,
            error: null,
        }));
    },

    clearSession() {
        updateState((previous) => ({
            ...previous,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isSigningIn: false,
            initialized: true,
            error: null,
        }));
    },

    setError(message: string | null) {
        updateState((previous) => ({
            ...previous,
            error: message,
            isLoading: false,
            isSigningIn: false,
        }));
    },
};

export function useAuthStore(): AuthState {
    return useSyncExternalStore(
        authStore.subscribe,
        authStore.getState,
        authStore.getState
    );
}
