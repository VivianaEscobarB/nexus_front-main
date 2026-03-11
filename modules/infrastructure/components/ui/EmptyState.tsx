import * as React from "react";

interface EmptyStateProps {
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-hover)] px-5 py-8 text-center">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {title}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {description}
            </p>
            {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
        </div>
    );
}
