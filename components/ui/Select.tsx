import * as React from "react";

type SelectSize = "sm" | "md" | "lg";

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    selectSize?: SelectSize;
    fullWidth?: boolean;
    wrapperClassName?: string;
}

const SIZE_CLASSES: Record<SelectSize, string> = {
    sm: "h-8  text-xs  px-3",
    md: "h-10 text-sm  px-3",
    lg: "h-12 text-base px-4",
};

/**
 * Select — componente desplegable con tokens semánticos de color.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, hint, options, selectSize = "md",
        fullWidth = true, wrapperClassName = "", id, className = "",
        disabled, ...props }, ref) => {
        const selectId = id ?? React.useId();
        const errorId = `${selectId}-error`;
        const hintId = `${selectId}-hint`;
        const hasError = Boolean(error);

        const selectClasses = [
            "block rounded-lg border bg-surface-base text-text-primary appearance-none",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-disabled",
            SIZE_CLASSES[selectSize],
            hasError
                ? "border-danger-default focus:ring-danger-default/30"
                : "border-border-default focus:border-border-focus focus:ring-brand-default/20",
            fullWidth ? "w-full" : "",
            className,
        ].filter(Boolean).join(" ");

        return (
            <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : ""} ${wrapperClassName}`}>
                {label && (
                    <label htmlFor={selectId}
                        className="text-sm font-medium text-text-secondary">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select ref={ref} id={selectId} disabled={disabled}
                        className={selectClasses} aria-invalid={hasError}
                        aria-describedby={hasError ? errorId : hint ? hintId : undefined}
                        {...props}>
                        <option value="" disabled hidden>Seleccionar opción...</option>
                        {options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                        </svg>
                    </div>
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

Select.displayName = "Select";

export { Select };
