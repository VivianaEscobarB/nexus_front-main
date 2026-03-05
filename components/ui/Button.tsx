import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

// ---------------------------------------------------------------------------
// Estilos usando tokens semánticos
// ---------------------------------------------------------------------------

const BASE =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg " +
    "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 " +
    "select-none whitespace-nowrap";

const VARIANTS: Record<ButtonVariant, string> = {
    primary:
        "bg-brand-strong text-text-onbrand " +
        "hover:bg-brand-stronger active:bg-brand-dark " +
        "focus-visible:ring-brand-default shadow-sm",
    secondary:
        "bg-surface-sunken text-text-primary border border-border-default " +
        "hover:bg-surface-hover active:bg-surface-active " +
        "focus-visible:ring-border-focus",
    danger:
        "bg-danger-strong text-text-inverse " +
        "hover:bg-danger-text active:bg-danger-text " +
        "focus-visible:ring-danger-default shadow-sm",
    ghost:
        "text-text-secondary " +
        "hover:bg-surface-hover active:bg-surface-active " +
        "focus-visible:ring-border-focus",
    outline:
        "border border-border-strong text-text-secondary bg-transparent " +
        "hover:bg-surface-hover active:bg-surface-active " +
        "focus-visible:ring-border-focus",
};

const SIZES: Record<ButtonSize, string> = {
    sm: "h-8  px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10 p-0",
};

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
    );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = "primary", size = "md", isLoading = false, leftIcon,
        rightIcon, fullWidth = false, disabled, className = "", children, ...props }, ref) => {
        const classes = [BASE, VARIANTS[variant], SIZES[size],
            fullWidth ? "w-full" : "", className].filter(Boolean).join(" ");
        return (
            <button ref={ref} disabled={disabled ?? isLoading}
                className={classes} aria-busy={isLoading} {...props}>
                {isLoading ? <Spinner /> : leftIcon}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button };
export type { ButtonVariant, ButtonSize, ButtonProps };
