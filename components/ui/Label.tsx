import * as React from "react";

type LabelSize = "xs" | "sm" | "md" | "lg";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    children: React.ReactNode;
    size?: LabelSize;
    required?: boolean;
    disabled?: boolean;
    muted?: boolean;
}

const SIZE_CLASSES: Record<LabelSize, string> = {
    xs: "text-xs  leading-4",
    sm: "text-xs  leading-4 tracking-wide uppercase font-semibold",
    md: "text-sm  leading-5",
    lg: "text-base leading-6",
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ children, size = "md", required = false, disabled = false,
        muted = false, className = "", ...props }, ref) => {
        const colorClass = disabled
            ? "text-text-disabled"
            : muted
                ? "text-text-tertiary"
                : "text-text-secondary";

        return (
            <label ref={ref} className={[
                "inline-flex items-center gap-1 font-medium select-none",
                SIZE_CLASSES[size], colorClass, className,
            ].join(" ")} {...props}>
                {children}
                {required && (
                    <span className="text-danger-default leading-none" aria-hidden="true">*</span>
                )}
            </label>
        );
    }
);

Label.displayName = "Label";

export { Label };
export type { LabelProps, LabelSize };
