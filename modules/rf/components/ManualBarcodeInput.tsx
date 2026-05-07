import React from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type ManualBarcodeInputProps = {
    id: string;
    value: string;
    disabled?: boolean;
    onChange: (next: string) => void;
    onSubmit: () => void;
};

export function ManualBarcodeInput({ id, value, disabled, onChange, onSubmit }: ManualBarcodeInputProps) {
    return (
        <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-base p-3">
            <Label htmlFor={id}>Código manual</Label>
            <div className="flex gap-2">
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="EAN / Code 128"
                    className="flex-1"
                    disabled={disabled}
                />
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onSubmit}
                    disabled={disabled || !value.trim()}
                >
                    Escanear
                </Button>
            </div>
        </div>
    );
}
