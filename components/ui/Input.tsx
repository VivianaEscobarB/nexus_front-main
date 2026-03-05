import * as React from "react";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leadingIcon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
    inputSize?: InputSize;
    fullWidth?: boolean;
    wrapperClassName?: string;
}

const SIZE_CLASSES: Record<InputSize, string> = {
    sm: "h-8  text-xs  px-3",
    md: "h-10 text-sm  px-3",
    lg: "h-12 text-base px-4",
};

const SIZE_ICON_PADDING: Record<InputSize, { left: string; right: string }> = {
    sm: { left: "pl-8", right: "pr-8" },
    md: { left: "pl-10", right: "pr-10" },
    lg: { left: "pl-12", right: "pr-12" },
};

const SIZE_ICON_POS: Record<InputSize, string> = {
    sm: "top-1.5 h-5 w-5",
    md: "top-2.5 h-5 w-5",
    lg: "top-3   h-6 w-6",
};

/**
 * Input — campo de texto con tokens semánticos de color.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leadingIcon, trailingIcon, inputSize = "md",
        fullWidth = true, wrapperClassName = "", id, className = "",
        disabled, ...props }, ref) => {
        const inputId = id ?? React.useId();
        const errorId = `${inputId}-error`;
        const hintId = `${inputId}-hint`;
        const hasError = Boolean(error);
        const hasLeading = Boolean(leadingIcon);
        const hasTrailing = Boolean(trailingIcon);

        const inputClasses = [
            "block rounded-lg border bg-surface-base text-text-primary",
            "placeholder:text-text-disabled",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-disabled",
            SIZE_CLASSES[inputSize],
            hasLeading ? SIZE_ICON_PADDING[inputSize].left : "",
            hasTrailing ? SIZE_ICON_PADDING[inputSize].right : "",
            hasError
                ? "border-danger-default focus:ring-danger-default/30"
                : "border-border-default focus:border-border-focus focus:ring-brand-default/20",
            fullWidth ? "w-full" : "",
            className,
        ].filter(Boolean).join(" ");

        const iconBase =
            `absolute ${SIZE_ICON_POS[inputSize]} flex items-center pointer-events-none ` +
            (hasError ? "text-danger-default" : "text-text-tertiary");

        return (
            <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : ""} ${wrapperClassName}`}>
                {label && (
                    <label htmlFor={inputId}
                        className="text-sm font-medium text-text-secondary">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {hasLeading && (
                        <span className={`${iconBase} left-3`} aria-hidden="true">
                            {leadingIcon}
                        </span>
                    )}
                    <input ref={ref} id={inputId} disabled={disabled}
                        className={inputClasses} aria-invalid={hasError}
                        aria-describedby={hasError ? errorId : hint ? hintId : undefined}
                        {...props} />
                    {hasTrailing && (
                        <span className={`${iconBase} right-3`} aria-hidden="true">
                            {trailingIcon}
                        </span>
                    )}
                </div>
                {hasError && (
                    <p id={errorId} role="alert" className="text-xs text-danger-text">
                        {error}
                    </p>
                )}
                {!hasError && hint && (
                    <p id={hintId} className="text-xs text-text-tertiary">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

export { Input };
export type { InputProps, InputSize };
