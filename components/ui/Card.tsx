import * as React from "react";

type CardVariant = "default" | "outlined" | "elevated" | "flat" | "ghost";
type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    hoverable?: boolean;
    clickable?: boolean;
    padding?: CardPadding;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: CardPadding;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: "start" | "center" | "end" | "between";
}

interface StatCardProps {
    title: string;
    value: string | number;
    delta?: string;
    deltaType?: "positive" | "negative" | "neutral";
    icon?: React.ReactNode;
    description?: string;
}

// ---------------------------------------------------------------------------
// Estilos con tokens semánticos
// ---------------------------------------------------------------------------

const VARIANT_CLASSES: Record<CardVariant, string> = {
    default: "bg-surface-base border border-border-default shadow-sm",
    outlined: "bg-surface-base border border-border-strong shadow-none",
    elevated: "bg-surface-raised border border-border-subtle shadow-md",
    flat: "bg-surface-sunken border border-transparent shadow-none",
    ghost: "bg-transparent border border-transparent shadow-none",
};

const PADDING_CLASSES: Record<CardPadding, string> = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-7",
};

const FOOTER_ALIGN: Record<NonNullable<CardFooterProps["align"]>, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
};

const DELTA_CLASSES: Record<NonNullable<StatCardProps["deltaType"]>, string> = {
    positive: "text-success-text bg-success-subtle",
    negative: "text-danger-text  bg-danger-subtle",
    neutral: "text-text-tertiary bg-surface-sunken",
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ variant = "default", hoverable = false, clickable = false,
        padding = "md", className = "", children, ...props }, ref) => (
        <div ref={ref} className={[
            "rounded-xl overflow-hidden transition-all duration-200",
            VARIANT_CLASSES[variant],
            padding !== "none" ? PADDING_CLASSES[padding] : "",
            hoverable ? "hover:shadow-md hover:-translate-y-0.5" : "",
            clickable
                ? "cursor-pointer hover:ring-2 hover:ring-brand-default/30 " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-default"
                : "",
            className,
        ].filter(Boolean).join(" ")}
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? "button" : undefined}
            {...props}>
            {children}
        </div>
    )
);

Card.displayName = "Card";

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

function CardHeader({ title, description, action, icon, className = "", ...props }: CardHeaderProps) {
    return (
        <div className={`flex items-start justify-between gap-4 pb-4 ${className}`} {...props}>
            <div className="flex items-center gap-3 min-w-0">
                {icon && (
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-brand-subtle text-brand-strong">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{title}</h3>
                    {description && (
                        <p className="text-xs text-text-tertiary mt-0.5 truncate">{description}</p>
                    )}
                </div>
            </div>
            {action && (
                <div className="flex-shrink-0 flex items-center gap-2">{action}</div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CardBody
// ---------------------------------------------------------------------------

function CardBody({ children, padding = "md", className = "", ...props }: CardBodyProps) {
    return (
        <div className={[PADDING_CLASSES[padding], className].filter(Boolean).join(" ")} {...props}>
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CardDivider
// ---------------------------------------------------------------------------

function CardDivider({ className = "" }: { className?: string }) {
    return <hr className={`border-border-subtle ${className}`} />;
}

// ---------------------------------------------------------------------------
// CardFooter
// ---------------------------------------------------------------------------

function CardFooter({ children, align = "end", className = "", ...props }: CardFooterProps) {
    return (
        <div className={[
            "flex flex-wrap items-center gap-3 pt-4 border-t border-border-subtle",
            FOOTER_ALIGN[align], className,
        ].join(" ")} {...props}>
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({ title, value, delta, deltaType = "neutral", icon, description }: StatCardProps) {
    return (
        <Card variant="default" hoverable>
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{title}</span>
                    <span className="text-2xl font-bold text-text-primary tabular-nums">{value}</span>
                    {description && (
                        <span className="text-xs text-text-disabled truncate">{description}</span>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {icon && (
                        <div className="h-10 w-10 rounded-lg bg-brand-subtle text-brand-strong flex items-center justify-center">
                            {icon}
                        </div>
                    )}
                    {delta && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DELTA_CLASSES[deltaType]}`}>
                            {delta}
                        </span>
                    )}
                </div>
            </div>
        </Card>
    );
}

export { Card, CardHeader, CardBody, CardDivider, CardFooter, StatCard };
export type {
    CardProps, CardVariant, CardPadding, CardHeaderProps,
    CardBodyProps, CardFooterProps, StatCardProps
};
