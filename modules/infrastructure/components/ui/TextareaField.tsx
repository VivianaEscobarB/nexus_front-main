import * as React from "react";

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
}

export function TextareaField({
    label,
    error,
    ...props
}: TextareaFieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
                {label}
            </label>
            <textarea
                className={[
                    "min-h-24 rounded-lg border bg-surface-base px-3 py-2 text-sm text-text-primary transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-brand-default/20",
                    error
                        ? "border-danger-default focus:ring-danger-default/30"
                        : "border-border-default focus:border-border-focus",
                ].join(" ")}
                {...props}
            />
            {error ? <p className="text-xs text-danger-text">{error}</p> : null}
        </div>
    );
}
