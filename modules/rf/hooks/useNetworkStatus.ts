import React from "react";

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = React.useState<boolean>(() => {
        if (typeof navigator === "undefined") return true;
        return navigator.onLine;
    });

    React.useEffect(() => {
        function onOnline() {
            setIsOnline(true);
        }

        function onOffline() {
            setIsOnline(false);
        }

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
        };
    }, []);

    return { isOnline };
}
