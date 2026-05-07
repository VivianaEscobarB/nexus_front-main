import * as React from "react";

type AlertVariant = "success" | "danger" | "warning" | "info";

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
    variant: AlertVariant;
};

const VARIANT_CLASS: Record<AlertVariant, string> = {
    success: "border-success-default bg-success-subtle text-success-strong",
    danger: "border-danger-default bg-danger-subtle text-danger-strong",
    warning: "border-warning-default bg-warning-subtle text-warning-strong",
    info: "border-info-default/40 bg-info-subtle text-info-strong",
};

function Alert({ variant, className = "", children, ...props }: AlertProps) {
    return (
        <div
            role="alert"
            className={[
                "rounded-xl border px-4 py-3 text-sm",
                VARIANT_CLASS[variant],
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...props}
        >
            {children}
        </div>
    );
}

export { Alert };
export type { AlertProps, AlertVariant };
