import * as React from "react";
import { Label } from "./Label";

interface FormContextValue { disabled: boolean; }
const FormContext = React.createContext<FormContextValue>({ disabled: false });

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    disabled?: boolean;
    gap?: "sm" | "md" | "lg";
}

interface FormFieldProps {
    label?: string;
    htmlFor?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}

interface FormSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

interface FormRowProps {
    cols?: 1 | 2 | 3 | 4;
    children: React.ReactNode;
    className?: string;
}

interface FormActionsProps {
    align?: "start" | "end" | "between";
    children: React.ReactNode;
    className?: string;
}

const GAP_CLASSES = { sm: "gap-3", md: "gap-5", lg: "gap-7" } as const;

const COLS_CLASSES: Record<NonNullable<FormRowProps["cols"]>, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const Form = React.forwardRef<HTMLFormElement, FormProps>(
    ({ disabled = false, gap = "md", className = "", children, ...props }, ref) => (
        <FormContext.Provider value={{ disabled }}>
            <form ref={ref} noValidate className={[
                "flex flex-col", GAP_CLASSES[gap],
                disabled ? "opacity-60 pointer-events-none" : "",
                className,
            ].filter(Boolean).join(" ")} {...props}>
                {children}
            </form>
        </FormContext.Provider>
    )
);
Form.displayName = "Form";

// ---------------------------------------------------------------------------
// FormField
// ---------------------------------------------------------------------------

function FormField({ label, htmlFor, required = false, error, hint, children, className = "" }: FormFieldProps) {
    const errorId = htmlFor ? `${htmlFor}-error` : undefined;
    const hintId = htmlFor ? `${htmlFor}-hint` : undefined;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <Label htmlFor={htmlFor} required={required} size="md">{label}</Label>
            )}
            {React.isValidElement<React.AriaAttributes>(children)
                ? React.cloneElement(children, {
                    "aria-describedby": error ? errorId : hint ? hintId : undefined,
                    "aria-invalid": error ? true : undefined,
                })
                : children}
            {error && (
                <p id={errorId} role="alert"
                    className="text-xs text-danger-text flex items-center gap-1">
                    <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 12 12"
                        fill="currentColor" aria-hidden="true">
                        <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zm-.75 2.5a.75.75 0 0 1 1.5 0v2.75a.75.75 0 0 1-1.5 0V3.5zm.75 6a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75z" />
                    </svg>
                    {error}
                </p>
            )}
            {!error && hint && (
                <p id={hintId} className="text-xs text-text-tertiary">{hint}</p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// FormSection
// ---------------------------------------------------------------------------

function FormSection({ title, description, children, className = "" }: FormSectionProps) {
    return (
        <fieldset className={`flex flex-col gap-4 ${className}`}>
            <div className="pb-2 border-b border-border-default">
                <legend className="text-sm font-semibold text-text-primary">{title}</legend>
                {description && (
                    <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
                )}
            </div>
            {children}
        </fieldset>
    );
}

// ---------------------------------------------------------------------------
// FormRow
// ---------------------------------------------------------------------------

function FormRow({ cols = 2, children, className = "" }: FormRowProps) {
    return (
        <div className={["grid gap-4", COLS_CLASSES[cols], className].join(" ")}>
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// FormActions
// ---------------------------------------------------------------------------

function FormActions({ align = "end", children, className = "" }: FormActionsProps) {
    const alignClass =
        align === "start" ? "justify-start"
            : align === "between" ? "justify-between"
                : "justify-end";

    return (
        <div className={[
            "flex flex-wrap items-center gap-3 pt-4 mt-2",
            "border-t border-border-default",
            alignClass, className,
        ].join(" ")}>
            {children}
        </div>
    );
}

function useFormContext(): FormContextValue {
    return React.useContext(FormContext);
}

export { Form, FormField, FormSection, FormRow, FormActions, useFormContext };
export type { FormProps, FormFieldProps, FormSectionProps, FormRowProps, FormActionsProps };
